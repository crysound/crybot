import { SHARED_CHAT_TITLE } from "../../shared/wire";
import { INCIDENTS_THREAD_TITLE, OLD_INCIDENTS_THREAD_TITLE } from "../../shared/thread-titles";
import { t } from "./i18n";

/** Localize the factory title while preserving titles chosen by the user. */
export function localizedTaskTitle(title: string): string {
  if (title === SHARED_CHAT_TITLE) return t("task.sharedChat");
  if (title === INCIDENTS_THREAD_TITLE || title === OLD_INCIDENTS_THREAD_TITLE) return t("task.incidents");
  return title === "New thread" ? t("task.untitledChat") : title;
}
