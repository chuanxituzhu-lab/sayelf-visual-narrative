# MCP stdio server

The MVP MCP server uses newline-delimited JSON-RPC over stdin/stdout and keeps stdout protocol-clean.

## Start

```bash
npm run mcp
```

## Tools

- `list_visual_skills`
- `run_visual_skill`
- `optimize_creative_intent`
- `list_media_providers`
- `submit_media_job`
- `get_media_job`
- `refresh_media_job`
- `validate_visual_spec`
- `compile_visual_prompt`
- `check_continuity`
- `generate_openai_image`

Image generation requires `OPENAI_API_KEY` in the MCP server environment.

## Host configuration example

```json
{
  "command": "node",
  "args": ["/absolute/path/to/sayelf-visual-narrative/interfaces/mcp/server.mjs"]
}
```
