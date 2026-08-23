---
name: visual-narrative-director
description: Turn a creative idea into validated VisualSpec decisions and a provider-ready visual prompt.
---

# Sayelf Visual Narrative

Use this workflow for painting, photography, visual storytelling, shot design, image prompts, and storyboard requests.

## Default workflow

1. Interpret the user's creative intent.
2. Build the story, art-direction, cinematic, and continuity decisions required by VisualSpec.
3. Call `validate_visual_spec` before presenting a final prompt.
4. Call `compile_visual_prompt` after the gates pass.
5. For a sequence, call `check_continuity` with the previous shot.
6. Call `generate_openai_image` only when the user explicitly asks for image generation and the image provider is configured.

Keep the internal VisualSpec JSON hidden unless the user explicitly asks for it. Return the decisions, gate status, and compiled prompt in clear natural language. Never require an OpenAI API key for validation, continuity, or prompt compilation; image generation is an optional provider capability.
