import type { ComponentProps } from "react";
import { lazyScreen } from "./lazy-screens";
import type { ChatMarkdown } from "./ChatMarkdown";

type ChatMarkdownProps = ComponentProps<typeof ChatMarkdown>;

export const LazyChatMarkdown = lazyScreen<ChatMarkdownProps>("ChatMarkdown", async () => (await import("./ChatMarkdown")).ChatMarkdown);
