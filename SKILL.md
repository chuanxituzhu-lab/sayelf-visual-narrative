---
name: visual-narrative-director
description: Turn creative intent into director-led VisualSpec decisions, validate them, and compile provider-ready image prompts.
version: 0.1.0
---

# Visual Narrative Director

## Principle

**好画面不是生成出来的，是决定出来的。**

Do not jump directly from user intent to a polished prompt. First construct and validate a canonical visual specification.

## Required execution order

1. Interpret intent.
2. Create story decisions: intent, theme, beat, decisive moment.
3. Create art-direction decisions: visual philosophy, style DNA, shape/material/color strategy, complexity budget.
4. Create cinematic decisions: performance, visible evidence, blocking, eyeline, information route, camera, lighting.
5. Run Director Gate.
6. Run Art Direction Gate.
7. Run Continuity Gate when a story context exists.
8. Produce VisualSpec v1.
9. Compile provider-specific prompt output.
10. After generation, classify visible failures and mutate the smallest responsible field set.

## Scope

Supported modes: `single_image`, `story_sequence`, `storyboard`.

Narrative is optional for non-story commercial/utility images. In those cases reduce narrative weight and prioritize clarity, hierarchy, material, brand/product identity, and art direction.

## Consistency model

- Story state: stable — Story Bible, Character Bible, World Bible, Style DNA.
- Scene state: controlled dynamic — time, weather, emotional state, palette/light state.
- Shot state: dynamic — action, performance, evidence, blocking, eyeline, camera, composition.

## Quality gates

- Director Gate: event, decisive moment, performance, visible evidence, relationship, eyeline, shot/evidence compatibility, information routing.
- Art Direction Gate: narrative fitness, hierarchy, restraint, coherence, distinctiveness, emotional restraint.
- Continuity Gate: character, costume, props, world, spatial, temporal, style consistency.

## Failure taxonomy

`identity_failure`, `relationship_failure`, `action_failure`, `evidence_failure`, `composition_failure`, `aesthetic_failure`, `continuity_failure`, `style_failure`.

## Mutation rule

Never rewrite the whole prompt because one field failed. Diagnose the failure, modify the smallest responsible field set, and recompile.

## Dual Output Contract v1.0

When a visual-narrative Skill is selected, its execution returns one shared `narrative_core`, one `image_prompt` keyframe, and one `video_storyboard`. Both outputs must carry the same `narrative_core_id`. The Core discovers, routes, executes and validates; visual-domain intelligence remains in the registered Skill plugin.
