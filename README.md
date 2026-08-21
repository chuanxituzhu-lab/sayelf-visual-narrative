# sayelf-visual-narrative

![Sayelf Visual Narrative](assets/readme-hero.png)

> **好画面不是生成出来的，是决定出来的。**

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

### Story continuity MVP

`examples/story-sequence/shot-01.json` and `shot-02.json` demonstrate the frozen rule:

> Story state stays stable; scene and shot state may change for a reason.

The continuity layer currently guards identity, appearance, costume, visual philosophy, medium, shape/material/color language, world location, and spatial rules.
