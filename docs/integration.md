# Agent Integration

## Codex

Use the repository-local `.mcp.json`, or run:

```bash
npm run mcp
```

Codex should call:
- `hidden_window_list_scenes`
- `hidden_window_generate_prompt`
- `hidden_window_one_click`
- `hidden_window_generate_series`
- `hidden_window_compose_scene`

Generation tools accept `output: image`, `storyboard`, or `both`. They return the unified `OutputContract`; image-only callers can read `outputs.image.prompt`. Every contract also includes the local DSAP execution record at `dsap` (`decision`, `state`, `action`, `proof`, `ledger`, and `handoff`). Adapters should pass it through unchanged and surface `dsap.state.status`, `dsap.proof.failed_outputs`, and `dsap.state.next_check` when a human needs to act.

生成工具接受 `output: image`、`storyboard` 或 `both`，并返回统一 `OutputContract`；只需要图片的调用方读取 `outputs.image.prompt` 即可。每份契约还包含本地 DSAP 执行记录 `dsap`（`decision`、`state`、`action`、`proof`、`ledger`、`handoff`）。适配器应原样传递它；需要人工介入时，展示 `dsap.state.status`、`dsap.proof.failed_outputs` 和 `dsap.state.next_check`。

## Claude Code

Point Claude Code's MCP configuration to:

```text
node interfaces/mcp/server.mjs
```

## WorkBuddy

Use MCP when its host supports stdio MCP. Otherwise use the local HTTP API:

```bash
npm run api
```

Then, choose the output in the JSON request:
- `GET http://127.0.0.1:4178/v1/scenes`
- `POST http://127.0.0.1:4178/v1/prompt` with `{ "scene": "bamboo_forest", "output": "both", "language": "bilingual", "seed": 77 }`
- `POST http://127.0.0.1:4178/v1/one-click` with `{ "output": "storyboard", "seed": 77 }`

## CLI universal fallback

Any agent capable of executing local commands can use:

```bash
node interfaces/cli/index.mjs generate --scene bamboo_forest --output both --lang bilingual --seed 77
```
