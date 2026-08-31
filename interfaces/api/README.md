# HTTP API

Local-first HTTP interface implemented with Node.js built-ins.

## Start

```bash
npm run api
```

Default address: `http://127.0.0.1:4174`.

## Endpoints

- `GET /health`
- `GET /v1/harnesses` — safe plugin/platform metadata, declared capabilities, and missing local environment variable names
- `GET /v1/skills` — enabled built-in and external Visual Skill metadata
- `GET /v1/media/providers` — safe media Provider metadata and local configuration status
- `POST /v1/validate` — `{ "spec": VisualSpec, "previous"?: VisualSpec }`
- `POST /v1/optimize` — `{ "intent": string, "language"?: "zh" | "en" | "bilingual", "spec"?: VisualSpec }`; returns the preserved original, a local director version, changes, and an optional assistant review prompt.
- `POST /v1/continuity` — `{ "previous": VisualSpec, "spec": VisualSpec }`
- `POST /v1/compile` — `{ "provider": "generic" | "openai", "spec": VisualSpec, "language"?: "zh" | "en" | "bilingual", "options"?: {} }`
- `POST /v1/dual-output` — `{ "input": Dual Output input }`; returns validated Dual Output plus `output_package`. In story mode, `output_package.image_prompts.length` always equals `output_package.video_storyboard.shots.length` and each image prompt carries its matching `shot_id`.
- `POST /v1/media/jobs` — `{ "provider_id"?: string, "asset_type": "image" | "video", "mode": "text_to_image" | "image_to_video" | "text_to_video", "prompt"?: string, "prompts"?: string[], "count"?: number, "options"?: {} }`; submits to a configured Provider or returns `awaiting_assistant` with an `assistant_prompt`.
- `GET /v1/media/jobs/:id` — read local job state and sanitized assets.
- `POST /v1/media/jobs/:id/refresh` — poll one asynchronous Provider job once.
- `GET /v1/media/assets/:id` — local inline preview when an asset is available.
- `GET /v1/media/assets/:id/download` — local single-asset download.

`Dual Output` 的故事规划会按故事复杂度、时长和 `platform_profile` 动态决定 2–6 个镜头，并支持 `scene_mode` (`auto`/`selected`/`random`)、`scene_options`、`scene_sequence`、`scene_seed`、人物一致性锚点和自然动作接续规则。`auto` 会按空间序列为镜头分配旷野、室内、舞台等地点，并在不同地点之间生成动作/视线/声音桥接；连续性检查只在同一地点时检查世界空间规则。平台配置是本地启发式策略模板，不是平台算法结果保证。

`consistency_state` 是所有 Skill、图片 Prompt 和视频分镜共用的底座，包含产品、人物/拟人化人物、Style DNA、世界、动作、摄影机和叙事关系。产品与人物是锁定锚点；场景、镜头和动作推进是可变化层。WebUI 的“一键优化”默认只在本地整理创意，不需要 API Key，采用前必须由用户确认。

WebUI 的 `image_platform_profile` 支持小红书、Facebook、Instagram、Pinterest 和通用图片；`platform_profile` 支持小红书、YouTube Shorts、Instagram Reels、TikTok、抖音、B站、视频号、Facebook Reels、快手和通用短视频。WebUI 的语言切换覆盖界面和系统生成标签；用户自己输入的故事正文保持原文。
- `POST /v1/harness/connect` — `{ "harness": string }`; starts local CLI authorization or reports API configuration state.
- `POST /v1/harness/confirm` — `{ "harness": string }`; verifies local CLI/API readiness without returning credentials.
- `POST /v1/harness/run` — `{ "harness": string, "input": { "prompt": string, "capability"?: string, "spec"?: VisualSpec, "compiledPrompt"?: string } }`
- `POST /v1/generate` — `{ "provider": "openai", "spec": VisualSpec, "options"?: {} }`

`/v1/generate` requires `OPENAI_API_KEY` in the process environment. The key is never accepted as a request field or written to logs.

The provider-neutral media interface is the preferred integration surface for new providers. The legacy `/v1/generate` route remains for compatibility with the earlier OpenAI image adapter.
