export type KeyProvider = "anthropic" | "openai" | "openrouter" | "openai_compat" | "xai" | "mistral" | "cerebras" | "groq" | "greenference" | "modelgo" | "meta" | "boat" | "composio" | "opencode_go" | "custom_endpoint" | "elevenlabs" | "fish_audio" | "gemini_tts" | "jev" | "openrouter_decider" | "openai_image" | "custom_image" | "openai_live" | "onepassword" | "treg" | "deepseek" | "postiz";
export type KeyVia = "settings" | "computer_panel" | "chat_request" | "apps" | "model_picker";
export type KeyResult = "ok" | "rejected" | "unverified" | "error";
export type BotSource = "blank" | "template" | "preset";
export type ConnectorResult = "connected" | "failed" | "expired" | "timed_out";
