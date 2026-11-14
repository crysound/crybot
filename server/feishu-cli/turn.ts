import { provenRequestPerson } from "../shared-computers.ts";
import { identityList } from "../feishu-login.ts";
import { brokerToken, BrokerAuthorizationError } from "./protocol.ts";
import { cleanFeishuEnvironment } from "./wrapper.ts";

export interface FeishuCliAccess {
  environment(): Promise<NodeJS.ProcessEnv>;
  prompt(): string;
}

export function directFeishuCliAccess(
  request: Parameters<typeof provenRequestPerson>[0], generation: string,
  personOf: (messageId: string) => string | undefined,
  unionIdForPerson: (person: string | undefined) => string | undefined,
  env: NodeJS.ProcessEnv = process.env, language = "en",
): FeishuCliAccess | undefined {
  return feishuCliAccess(unionIdForPerson(provenRequestPerson(request, generation, personOf) ?? undefined), env, language);
}

export function feishuCliAccess(unionId: string | undefined, env: NodeJS.ProcessEnv = process.env, language = "en"): FeishuCliAccess | undefined {
  const users = identityList(env.CRYBOT_FEISHU_CLI_USERS, "CRYBOT_FEISHU_CLI_USERS", false);
  const socket = env.CRYBOT_FEISHU_BROKER_SOCKET;
  if (!unionId || !users.includes(unionId) || !socket) return undefined;
  let unavailable: string | undefined;
  return {
    prompt: () => unavailable ?? feishuCliPrompt(language),
    async environment() {
      try {
        const token = await brokerToken(socket);
        unavailable = undefined;
        return {
          CRYBOT_FEISHU_USER_TOKEN: token.user_access_token,
          CRYBOT_FEISHU_APP_ID: token.app_id,
          CRYBOT_FEISHU_EXPIRES_AT: String(token.expires_at),
          CRYBOT_FEISHU_BROKER_SOCKET: socket,
          ...(env.CRYBOT_FEISHU_AUTHORIZATION_URL ? { CRYBOT_FEISHU_AUTHORIZATION_URL: env.CRYBOT_FEISHU_AUTHORIZATION_URL } : {}),
        };
      } catch (error) {
        unavailable = language.startsWith("zh") ? "飞书暂不可用。" : "Feishu is temporarily unavailable.";
        if (error instanceof BrokerAuthorizationError && error.authorizationUrl) {
          unavailable += language.startsWith("zh")
            ? ` 请在回复中告诉用户去此链接重新授权：${error.authorizationUrl}`
            : ` Tell the user in your reply to reauthorize at this link: ${error.authorizationUrl}`;
        }
        return {};
      }
    },
  };
}

export function feishuCliPrompt(language = "en"): string {
  return language.startsWith("zh")
    ? "可以使用 lark-cli 以这位用户本人的身份读写飞书（日程、文档、消息、多维表格等）。先运行 lark-cli --help 或子命令 --help 查看用法。写操作和发消息之前必须先询问用户，得到明确同意后才执行，即使其他说明允许自动执行。时间一律带 +08:00 时区，例如 2026-11-15T09:00:00+08:00。不要运行 lark-cli update；不要读取或寻找任何凭证文件。"
    : "Use lark-cli to read and write this user's Feishu calendars, documents, messages and bitables as the user. First check lark-cli --help or subcommand --help. Before every write or message, ask the user for confirmation and execute only after explicit consent, even if other instructions allow automatic actions. Always use the +08:00 time zone, for example 2026-11-15T09:00:00+08:00. Never run lark-cli update. Never read or search for credential files.";
}

export { cleanFeishuEnvironment };
