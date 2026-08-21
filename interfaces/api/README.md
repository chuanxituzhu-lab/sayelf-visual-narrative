# HTTP API

Local-first HTTP interface implemented with Node.js built-ins.

## Start

```bash
npm run api
```

Default address: `http://127.0.0.1:4174`.

## Endpoints

- `GET /health`
- `POST /v1/validate` — `{ "spec": VisualSpec, "previous"?: VisualSpec }`
- `POST /v1/continuity` — `{ "previous": VisualSpec, "spec": VisualSpec }`
- `POST /v1/compile` — `{ "provider": "generic" | "openai", "spec": VisualSpec, "options"?: {} }`
- `POST /v1/generate` — `{ "provider": "openai", "spec": VisualSpec, "options"?: {} }`

`/v1/generate` requires `OPENAI_API_KEY` in the process environment. The key is never accepted as a request field or written to logs.
