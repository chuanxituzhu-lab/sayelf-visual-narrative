---
name: visual-narrative-director
description: Turn a creative idea into validated VisualSpec decisions and a provider-ready visual prompt.
---

# Sayelf Visual Narrative

Use this workflow for painting, photography, visual storytelling, shot design, image prompts, and storyboard requests.

## Default workflow

1. Preserve the customer's original creative intent and, when it is rough or ambiguous, call `optimize_creative_intent` to produce a director version for review. Never silently replace the original.
2. Create one reusable consistency base before story expansion: product identity, person or anthropomorphic-person identity, Style DNA, world context, space-continuity mode, motion/performance rules, camera/spatial axis, and narrative relationships. Product and character anchors are locked. In `auto` space mode, inherit world rules only when the location is the same; allow a planned space transition when the story moves elsewhere. Scene details, shot composition, and action progression may vary.
3. Build the story, art-direction, cinematic, and continuity decisions required by VisualSpec. Pass the same consistency state to every Skill and every shot.
4. Call `validate_visual_spec` before presenting a final prompt.
5. Call `compile_visual_prompt` after the gates pass. For a sequence, use `run_visual_skill` so image prompts and storyboard shots come from one Narrative Core and remain one-to-one.
6. For a sequence, call `check_continuity` with the previous shot and revise any product or character drift.
7. Call `generate_openai_image` only when the user explicitly asks for image generation and the image provider is configured.

Keep the internal VisualSpec JSON hidden unless the user explicitly asks for it. Return the decisions, gate status, and compiled prompt in clear natural language. Never require an OpenAI API key for validation, continuity, or prompt compilation; image generation is an optional provider capability.
