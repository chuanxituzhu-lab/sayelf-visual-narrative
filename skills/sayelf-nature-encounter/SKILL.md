---
name: sayelf-nature-encounter
description: "Turn a natural subject-and-plant idea into one shared Nature Event Core with exactly two coordinated outputs: an image-generation prompt and a five-shot video storyboard with per-shot prompts. Use when the visual focus is a quiet relationship between living things; do not use for generic nature wallpapers, unrelated subject catalogs, or finished media rendering."
---

# sayelf-nature-encounter

自然相遇不是把生命放进背景，而是等待两个生命的关系发生一次。

This skill is a prompt-production skill. It does not generate images or videos, choose a provider, call an API, build a UI, or render media. It compiles one shared event into two handoff-ready outputs.

## Optional validation environment

The core workflow and the bundled Node validator do not require PyYAML. PyYAML is only used by the external `quick_validate.py` checker for Skill frontmatter. Standard Skill installation does not run arbitrary package-install hooks, so do not silently install dependencies when this Skill is activated.

When official frontmatter validation is needed after copying the Skill, run `python scripts/bootstrap_validation.py`. The bootstrap is idempotent: it reuses an available `yaml` import, otherwise installs the pinned `PyYAML==6.0.3` into `.deps/python` inside the Skill. Use `--target <local-directory>` when the installed Skill directory is read-only. The script changes only the selected local target and then verifies the import.

The dependency manifest is [requirements-validation.txt](requirements-validation.txt); the setup helper is [scripts/bootstrap_validation.py](scripts/bootstrap_validation.py). Neither is part of the Nature Event Core or the two-output contract.

## Non-negotiable contract

Build exactly one `Nature Event Core`, then derive exactly two outputs in this order:

```text
01 IMAGE
02 VIDEO
```

The image prompt and every video shot must describe the same event, subject, plant, habitat, light logic, and decisive relationship. Do not invent a second story for the video.

The frozen grammar is always:

```text
DWELL → MEET → TOUCH → BREATHE → TRACE
栖      遇      触       息        留
```

Do not rename, reorder, remove, or replace these five stages.

## Workflow

### 1. Compile the Nature Event Core once

Extract or carefully infer only the minimum fields needed to stage one believable encounter:

- subject: one primary animal, insect, bird, or other living subject;
- plant: one botanical anchor;
- habitat: the small place where both already belong;
- relationship: how the subject enters the plant's physical or visual range;
- decisive_moment: the single instant with the most tension;
- moment_phase: `before_touch`, `during_touch`, or `after_touch`;
- physical_trace: a small consequence such as a bent stem, pollen, moving leaf, or falling dew;
- camera and light: a physically plausible position, optics, and natural light source;
- silence_layer: the low-information background that lets the encounter be seen;
- locks: Reality, Continuity, and Negative constraints shared by both outputs.

If species or ecological facts are not supplied, use observable visual language instead of asserting unsupported natural-history facts. A creative premise is not a verified fact.

### 2. Apply the grammar

- `DWELL`: establish the living micro-habitat before the encounter is noticed. Keep natural irregularity, damage, gaps, moisture, and imperfect growth.
- `MEET`: put the subject and plant in one believable spatial relationship. They must affect each other's framing, gaze, path, balance, or contact—not merely coexist in a list.
- `TOUCH`: choose one decisive threshold. Prefer just-before-contact when it creates more time tension; never stack multiple climaxes.
- `BREATHE`: lower background information density. Preserve negative space, optical depth, and a quiet `SILENCE LAYER`.
- `TRACE`: leave one small physical after-effect so the event is not fully closed.

### 3. Produce `01 IMAGE`

Create one image-generation prompt from the same Core. Use the image template in `templates/image_prompt/` for the requested language.

The image must contain one main living subject, one botanical anchor, one decisive moment, a believable camera position, natural optical depth, and the shared four locks. It is a decisive still, not a storyboard sheet and not a generic list of beautiful objects.

### 4. Produce `02 VIDEO`

Create exactly five storyboard shots, one per grammar stage and in grammar order. Each shot needs:

`shot_id` · `stage` · `duration_s` · `frame` · `camera` · `action` · `transition_in` · `transition_out` · `prompt`

The video begins from the image event, advances one physical change at a time, and ends with the same `physical_trace` described by the Core. Keep one primary camera movement per shot, preserve screen geography and light direction, and do not add a new subject, prop, season, or emotional resolution.

Use the video template in `templates/video_storyboard/` for the requested language. The `prompt` on each shot is the actual per-shot handoff prompt; do not replace it with a summary.

### 5. Attach and check the locks

Every output repeats the same lock values from the Core:

- `SILENCE LAYER`: what remains quiet and low-information in the background;
- `Reality Lock`: physical, optical, botanical, and animal plausibility constraints;
- `Continuity Lock`: invariants that must stay unchanged between the image and all shots;
- `Negative Lock`: explicit exclusions for invented subjects, fantasy effects, staging, text, and visual artifacts.

The locks are constraints, not extra story beats. Never use them to add a competing focal point.

## Output shape

For structured consumers, follow `schemas/output-contract.schema.json`. For conversational use, render only the two headings `01 IMAGE` and `02 VIDEO`; keep the Core and lock details inside those outputs unless the user asks to inspect the Core.

Before returning, verify:

1. the grammar is exactly `DWELL, MEET, TOUCH, BREATHE, TRACE` everywhere;
2. both outputs share the same `event_id` and all four lock values;
3. the image has one prompt;
4. the video has exactly five ordered shots and one per-shot prompt per shot;
5. no output claims that an image or video was generated.
