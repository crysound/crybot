import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "@/lib/i18n";
import { setNewBotNameAsker, type NewBotNameRequest } from "@/lib/new-bot";
import { imeComposing } from "@/lib/send-key";
import { BOT_PROFILE_LIMITS } from "../../shared/bot-profile";

export function NewBotNameHost() {
  const [answer, setAnswer] = useState<((name: string | null) => void) | null>(null);
  const [name, setName] = useState("");
  const [request, setRequest] = useState<NewBotNameRequest | null>(null);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setNewBotNameAsker((request) => new Promise((resolve) => { generation.current++; setRequest(request); setName(request.suggestedName); setChanging(false); setError(""); setAnswer(() => resolve); }));
    return () => setNewBotNameAsker(null);
  }, []);
  const open = answer !== null;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.current?.focus();
    input.current?.select();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, [open]);
  if (!answer) return null;
  const done = (value: string | null) => { generation.current++; setAnswer(null); answer(value); };
  const create = () => { if (name.trim()) done(name.trim()); };
  const randomise = async () => {
    if (!request || changing) return;
    const current = generation.current;
    setChanging(true);
    setError("");
    try {
      const next = await request.randomName(name);
      if (current !== generation.current) return;
      setName(next);
    } catch {
      if (current === generation.current) setError(t("newBot.anotherNameFailed"));
    } finally {
      if (current === generation.current) setChanging(false);
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) done(null); }}>
      <form data-new-bot-name role="dialog" aria-modal="true" aria-labelledby="new-bot-name-title"
        className="w-full max-w-[400px] rounded-2xl border border-hairline/50 bg-panel p-5 text-ink shadow-2xl"
        onSubmit={(event) => { event.preventDefault(); create(); }}
        onKeyDown={(event) => {
          if (imeComposing(event.nativeEvent)) { if (event.key === "Enter") event.preventDefault(); event.stopPropagation(); return; }
          if (event.key === "Enter" && event.target === input.current) { event.preventDefault(); create(); }
          if (event.key === "Escape") { event.stopPropagation(); done(null); }
          if (event.key !== "Tab") return;
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("input, button:enabled")];
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <h2 id="new-bot-name-title" className="mb-3 text-[17px] font-semibold">{t("sidebar.newBotSimple")}</h2>
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[13px] text-ink-secondary">{t("botSettings.simple.name")}
            <input ref={input} value={name} maxLength={BOT_PROFILE_LIMITS.name} onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline/50 bg-inset px-3 py-2 text-[14px] text-ink" />
          </label>
          <button type="button" disabled={changing} onClick={() => void randomise()} className="shrink-0 rounded-lg px-3 py-2 text-[13px] text-ink-secondary hover:bg-raised disabled:opacity-40">{t("newBot.anotherName")}</button>
        </div>
        {error && <p role="alert" className="mt-2 text-[13px] text-ink-secondary">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => done(null)} className="rounded-lg px-3 py-2 text-[13px] text-ink-secondary hover:bg-raised">{t("common.cancel")}</button>
          <button type="submit" disabled={!name.trim()} className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40">{t("newBot.create")}</button>
        </div>
      </form>
    </div>, document.body,
  );
}
