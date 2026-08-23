# Assist tool plugins

Each subdirectory is an independent assistant plugin. Add a `plugin.json` with:

- `type`: `sayelf-assist-plugin`
- `id`, `name`, `version`, `description`
- `transport`: `cli`, `mcp`, or `api`
- `enabled`: keep `false` until the server-side command or endpoint is trusted
- `entry`: transport-specific `command`/`args`, `tool`, `url`, or `headers`

The API discovers plugins at startup. `config/harnesses.json` can override a plugin with the same `id`, which keeps local secrets and machine-specific commands out of the plugin manifest.

Arguments may use `{prompt}`, `{compiledPrompt}`, and `{specJson}` placeholders. Browser clients only see safe metadata and cannot submit commands, URLs, or credentials.
