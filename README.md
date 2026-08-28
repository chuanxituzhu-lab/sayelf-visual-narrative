# sayelf-visual-narrative

![Sayelf Visual Narrative](assets/readme-hero.png)

> **好画面不是生成出来的，是决定出来的。**

[中文说明](README.zh-CN.md)

Sayelf Visual Narrative is a model-agnostic **AI Visual Director Skill** that turns creative intent into structured story, art-direction, cinematic, and continuity decisions before compiling provider-specific prompts.

## Why

Most image-generation workflows jump from an idea straight to a prompt. This project inserts a directorial layer in between:

`Creative Intent → Directorial Decisions → VisualSpec → Prompt Compilation → Image Model`

The core is intentionally provider-independent. OpenAI, Gemini, Flux, Midjourney-style workflows, or future image models are adapters—not the architecture.

## Core

1. **Story Director** — intent, theme, beat, decisive moment.
2. **Art Director** — visual philosophy, style DNA, color/material/shape strategy, restraint.
3. **Cinematic Director** — performance, evidence, blocking, eyeline, information routing, camera and light.
4. **Continuity Director** — character, costume, prop, world, time and style consistency.
5. **Prompt Compiler** — converts validated VisualSpec into provider-ready prompts.

## Modes

- `single_image`
- `story_sequence`
- `storyboard`

Story-level identity and style remain stable inside one story. Scene-level visual state can change with narrative reasons. Shot-level composition and camera remain dynamic.

## MVP flow

```text
Intent
  ↓
Story Director
  ↓
Art Director
  ↓
Cinematic Director
  ↓
Director Gate
  ↓
Art Direction Gate
  ↓
Continuity Gate
  ↓
VisualSpec v1
  ↓
Prompt Compiler
  ↓
Provider Adapter
```

## Quick start

```bash
npm test
node interfaces/cli/index.mjs compile examples/single-image/input.json
```

## Repository status

`v0.1.0 MVP scaffold` — architecture frozen, implementation beginning.

## License

MIT

## v0.2.0 MVP runtime

The frozen directing architecture now has a runnable local runtime:

```bash
npm test
npm run api
npm run mcp
node interfaces/cli/index.mjs validate examples/single-image/input.json
node interfaces/cli/index.mjs compile examples/single-image/input.json --provider openai
```

### Runtime interfaces

- **CLI** — validate, continuity check, compile, and generate.
- **HTTP API** — local endpoints for validation, continuity, prompt compilation, and generation.
- **MCP stdio** — exposes validation, compilation, continuity, and OpenAI image-generation tools to compatible AI hosts.

### Provider adapters

- `generic` — model-agnostic canonical prompt output.
- `openai` — compiles to the OpenAI Images API and can generate images when `OPENAI_API_KEY` is present.

The project keeps provider credentials outside VisualSpec and outside repository files.

## v0.3.0 · Dual Output Contract v1.0

The repository now exposes a provider-independent visual narrative contract:

> **One sentence → automatically select a visual-narrative Skill → same-source image keyframe + video storyboard.**

The Core only discovers enabled Skills, routes intent through manifest tags, executes the selected plugin, and validates the result. Each plugin owns its visual-domain intelligence. The two registered Skills are:

- `life-comes-closer` / `自然靠近你`
- `visual-storytelling` / `视觉叙事`

Both outputs carry the same `narrative_core_id`, and the local runtime rejects invalid schemas, broken shot order, or duration drift. See `schemas/dual-output.schema.json`, `skills/registry.json`, and `core/dual-output/`.

Run the focused contract checks with:

```bash
npm run test:dual-output
```

### AI Harness Bridge

The WebUI includes a server-side adapter bridge for collaborating with AI coding harnesses and auxiliary tools without exposing commands or credentials to the browser.

- Presets: Codex CLI, Claude Code CLI, and WorkBuddy CLI.
- Extension transports: stdio MCP, local/remote HTTP API, and CLI.
- Configuration: `config/harnesses.json`, or set `SAYELF_HARNESS_CONFIG` to an external JSON file.
- HTTP endpoints: `GET /v1/harnesses` and `POST /v1/harness/run`.

Adapters are disabled by default. Enable only installed and trusted server-side tools. The browser can select registered adapters and send the current VisualSpec, compiled prompt, and collaboration request, but it cannot provide arbitrary commands or target URLs.

### Codex plugin and API-key-optional mode

The repository is also packaged as a local Codex plugin through `.codex-plugin/plugin.json` and `.mcp.json`. The bundled stdio MCP server exposes VisualSpec validation, prompt compilation, continuity checks, and optional OpenAI image generation. Validation, continuity, and prompt compilation run locally and do not require `OPENAI_API_KEY`; only the OpenAI image provider requires that credential.

To use the local MCP server directly:

```bash
npm run mcp
```

The plugin skill is in `skills/visual-narrative-director/SKILL.md`. Codex, Claude Code, WorkBuddy, and other compatible hosts can use the MCP server with their own login or authorization flow. Keep provider credentials in the host environment, never in VisualSpec or browser requests.

### Story continuity MVP

`examples/story-sequence/shot-01.json` and `shot-02.json` demonstrate the frozen rule:

> Story state stays stable; scene and shot state may change for a reason.

The continuity layer currently guards identity, appearance, costume, visual philosophy, medium, shape/material/color language, world location, and spatial rules.
