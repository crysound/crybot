# Model providers

Use Settings → Engines to connect an engine and choose its models. The setup below is for services exposed through an engine's own provider configuration.

## OpenCode 2.x

OpenCode 2.x uses the same provider configuration as OpenCode 1.x. Cry Bot reads the model list from an ACP session on both OpenCode 1.x and 2.x, and each model's effort levels the same way.

## Provider configuration

### Claude Code

Put `ANTHROPIC_BASE_URL` and your key in the `env` block of `~/.claude/settings.json`.

OpenRouter's and DeepSeek's guides use shell exports, which the desktop app doesn't see, so copy those lines into the `env` block.

On a server, use the `env` block too, not exports in the terminal that starts the server.

If you also set `ANTHROPIC_MODEL` there, that model appears under **Use a local model** in the Claude model picker; pick it.

FireConnect's model list doesn't show up in Cry Bot, so add `ANTHROPIC_MODEL` yourself.

So do `ANTHROPIC_CUSTOM_MODEL_OPTION` and each `ANTHROPIC_DEFAULT_*_MODEL` that isn't a Claude model.

`ANTHROPIC_DEFAULT_*_MODEL` and `CLAUDE_CODE_SUBAGENT_MODEL` aren't carried over.

It applies only while no Anthropic API key is saved in Connections.

To use a separate service, add a **custom endpoint** in Settings → Engines, in the Claude card. It never reads or writes this computer's `~/.claude`, and the Claude Code on this computer keeps its own sign-in. Each bot can choose a different model from the endpoint's catalog. The token is saved in Cry Bot's own `config.json` and sent only to the base URL you enter. Removing an endpoint removes only that entry.

### OpenCode

Save provider settings in `~/.config/opencode/opencode.json`. Replace the example service URL and model ID below with your provider's values. The API key comes from `MY_ROUTER_API_KEY` in the environment where OpenCode runs.

Cry Bot reads the model list from an ACP session on both OpenCode 1.x and 2.x, and each model's effort levels the same way. Keep this file plain JSON, with no comments or trailing commas. Cry Bot edits it when an OpenCode bot uses a model running on this computer.

```json
{
  "provider": {
    "myrouter": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My router",
      "options": {
        "baseURL": "https://example.test/v1",
        "apiKey": "{env:MY_ROUTER_API_KEY}"
      },
      "models": { "my-model": { "name": "My model" } }
    }
  }
}
```

Keys exported this way reach every engine on that server, and any bot that can run commands can read them. `OPENROUTER_API_KEY`, `FIREWORKS_API_KEY`, and `TOGETHER_API_KEY` are examples.

`CLINE_API_KEY` is scoped to the Cline and OpenCode engines.

### Cline engine

Run `cline auth` to sign in. **Cline default (configured)** is available only after setup. An unconfigured account remains unavailable.

### Free OpenRouter models

Free models are marked **(free)**. The chat engine may report "This model needs OpenRouter credit" or "OpenRouter's privacy settings block this free model".
