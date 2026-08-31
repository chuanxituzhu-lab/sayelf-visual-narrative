# Plugin surfaces

This repository has three intentionally separate plugin surfaces:

- `plugins/visual-skills/<id>/` — visual-domain intelligence. Export `execute()` and return `dual-output/1.0`.
- `plugins/media-providers/<id>/` — text-to-image, image-to-video, or text-to-video API mapping. Export `createProvider()`; see the local README in that directory.
- `plugins/*/plugin.json` — AI assistant / Harness integrations for fallback collaboration.

The director core owns routing, the three decision gates, output validation,
job state, local assets, and safe preview/download URLs. Plugin code owns only
its declared domain or transport capability.

## Assist tool plugins

Each subdirectory is an independent assistant plugin. Add a `plugin.json` with:

- `type`: `sayelf-assist-plugin`
- `id`, `name`, `version`, `description`
- `transport`: `cli`, `mcp`, or `api`
- `enabled`: keep `false` until the server-side command or endpoint is trusted
- `entry`: transport-specific `command`/`args`, `tool`, `url`, `method`, `headers`, `required_env`, or `header_env`
- `capabilities`: strings or objects such as `{ "id": "review", "name": "审阅", "description": "检查结果" }`

The API discovers plugins at startup. `config/harnesses.json` can override a plugin with the same `id`, which keeps local secrets and machine-specific commands out of the plugin manifest.

Arguments may use `{prompt}`, `{compiledPrompt}`, `{capability}`, and `{specJson}` placeholders. Browser clients only see safe metadata and cannot submit commands, URLs, or credentials.

For an HTTP/API plugin, put environment variable names in `required_env` and `header_env`, not API key values. The server injects those headers only when the user runs a selected capability. A missing variable keeps the plugin unavailable and is reported by `/v1/harnesses` and the WebUI.
