import type { NewBotDefaults } from "../../shared/new-bot-defaults";
import { api, type Action, type Bot, type ModelSelection } from "@/state/store";
import { teamChats } from "@/state/team-chats";
import { currentTeamPeople, departmentOwner, type TeamPeople } from "@/state/team-people";
import { openBot } from "@/state/thread-navigation";
import type { BotSource } from "./setup-types";
import { BotCreationDraft } from "./bot-creation-draft";
import { isBotLimitRefusal, showCreatedPaused } from "./bot-limit";
import { createConfiguredBot } from "./create-configured-bot";
import { activeLocale, t } from "./i18n";


export interface BotDefaultsAnswer { defaults: NewBotDefaults; modelSelection: ModelSelection; suggestedName: string }

/** The saved New bot defaults, with the workspace's default AI when they name none; `named` also gives the bot a name. */
export function startingTemplate(answer: BotDefaultsAnswer, named: boolean): NewBotDefaults {
  const template = structuredClone(answer.defaults);
  const selection = template.profile.modelSelection;
  if (!selection || (selection.instanceId === "" && selection.model === "")) template.profile.modelSelection = answer.modelSelection;
  if (named) template.profile.name = template.profile.name?.trim() || answer.suggestedName;
  return template;
}

/** `name`, or the first "name 2", "name 3"… that no bot here has. */
export function freeName(name: string, bots: ReadonlyArray<Pick<Bot, "name">>): string {
  const taken = new Set(bots.map((bot) => bot.name.trim().toLowerCase()));
  if (!taken.has(name.trim().toLowerCase())) return name;
  for (let next = 2; ; next++) if (!taken.has(`${name} ${next}`.toLowerCase())) return `${name} ${next}`;
}

/** Who a new team bot reports to: the person chosen, else whoever every bot of its department reports to, else this
 * person. */
export function reportsToFor(chosen: string | null, section: string | undefined, bots: readonly Bot[], team: TeamPeople): string | null {
  if (chosen) return chosen;
  const department = bots.filter((bot) => !bot.hidden && (bot.section?.trim() || "") === (section?.trim() || ""));
  return departmentOwner(department, team)?.email ?? team.me?.email ?? null;
}

/** A bot just made joins the sidebar and, unless the caller keeps its own place, its chat opens: on a team's Cloud the
 * creator's own conversation, never the main chat every member reads. One that starts paused offers to swap it in. */
export function announceNewBot(dispatch: (action: Action) => void, bot: Bot, warnings: readonly string[],
  { preserveSelection = false, showThreads, paused }: { preserveSelection?: boolean; showThreads: boolean; source: BotSource; role?: string; paused?: boolean }) {

  dispatch({ type: "botAdded", bot, preserveSelection });
  if (!preserveSelection && teamChats()) openBot(dispatch, bot, showThreads);
  if (warnings.length) dispatch({ type: "error", message: warnings.join("\n") });
  if (paused) showCreatedPaused(bot.id);
}

export interface NewBotNameRequest {
  suggestedName: string;
  randomName(current: string): Promise<string>;
}

type NameAsker = (request: NewBotNameRequest) => Promise<string | null>;
let nameAsker: NameAsker | null = null;
export function setNewBotNameAsker(ask: NameAsker | null): void { nameAsker = ask; }

/** A team's User makes a bot of their own, which takes the server's own defaults: its department, whom it answers to
 * and what it may do are an admin's. A paired device may not read the host's New bot defaults: the host applies them to
 * an empty request. Auto on this computer needs the person's own OK, so a bot whose defaults ask for it starts on Ask.
 * `name`: the person's own choice, in place of a suggested one. */
async function createNewBot(section: string | undefined, bots: readonly Bot[], team: TeamPeople | null, request: typeof api, name?: string, defaults?: BotDefaultsAnswer) {
  if (team?.admin === false) {
    const { bot, paused } = await request<{ bot: Bot; paused?: true }>("/api/bots", { method: "POST", body: JSON.stringify({ ...(name ? { name } : {}), language: activeLocale() }) });
    return { bot, warnings: [] as string[], startsOnAsk: false, ...(paused ? { paused } : {}) };
  }
  if (typeof window !== "undefined" && window.cry?.remoteClient?.active) {
    const { bot, paused } = await request<{ bot: Bot; paused?: true }>("/api/bots", { method: "POST", body: JSON.stringify({ ...(name ? { name } : {}), language: activeLocale() }) });
    return { bot, warnings: [] as string[], startsOnAsk: false, ...(paused ? { paused } : {}) };
  }
  const template = startingTemplate(defaults ?? await request<BotDefaultsAnswer>("/api/bot-defaults"), true);
  template.profile.name = name ?? freeName(template.profile.name!, bots);
  if (section !== undefined) template.profile.section = section;
  const draft = new BotCreationDraft(template, () => {}, request);
  const startsOnAsk = draft.bot.approvalMode === "auto" && draft.bot.computer === "local";
  if (startsOnAsk) draft.patch({ approvalMode: "ask" });
  const reportsTo = team ? reportsToFor(null, draft.bot.section, bots, team) ?? undefined : undefined;
  try {
    return { ...await createConfiguredBot(draft, request, undefined, undefined, undefined, reportsTo), startsOnAsk };
  } finally {
    draft.dispose();
  }
}

export async function makeNewBot(action: Extract<Action, { type: "newBot" }>, bots: readonly Bot[], dispatch: (action: Action) => void,
  showThreads: boolean, request: typeof api = api): Promise<void> {
  const team = currentTeamPeople();
  let made: Awaited<ReturnType<typeof createNewBot>>;
  try {
    let name: string | undefined;
    let defaults: BotDefaultsAnswer | undefined;
    if (nameAsker) {
      const hostDefaults = team?.admin === false || (typeof window !== "undefined" && window.cry?.remoteClient?.active);
      const suggestion = hostDefaults
        ? await request<{ suggestedName: string }>("/api/bot-name")
        : (defaults = await request<BotDefaultsAnswer>("/api/bot-defaults"));
      dispatch({ type: "botCreationPending", on: false });
      const asked = await nameAsker({
        suggestedName: freeName(suggestion.suggestedName, bots),
        randomName: async (current) => {
          const next = await request<{ suggestedName: string }>(`/api/bot-name?exclude=${encodeURIComponent(current)}`);
          return freeName(next.suggestedName, [...bots, { name: current }]);
        },
      });
      if (asked === null || !asked.trim()) return;
      name = asked.trim();
      dispatch({ type: "botCreationPending", on: true });
    }
    made = await createNewBot(action.section, bots, team, request, name, defaults);
  } catch (cause) {
    if (isBotLimitRefusal(cause)) return;
    const message = t("newBot.failed", { error: cause instanceof Error ? cause.message : String(cause) });
    if (action.onError) action.onError(message);
    else dispatch({ type: "error", message });
    return;
  }
  announceNewBot(dispatch, made.bot, made.warnings, { preserveSelection: action.preserveSelection, showThreads, source: "blank", paused: made.paused });
  if (made.startsOnAsk) dispatch({ type: "notice", notice: { kind: "note", botName: null, text: t("newBot.startsOnAsk", { name: made.bot.name }) } });
  action.onCreated?.(made.bot);
}
