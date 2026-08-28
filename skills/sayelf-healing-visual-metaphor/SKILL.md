---
name: sayelf-healing-visual-metaphor
description: Turn a healing thought, life insight, emotion, or short story into one visual metaphor, one decisive Hero Image prompt, and a restrained five-shot video storyboard with copy-ready video prompts. Use for healing, hope, loneliness, persistence, letting go, choice, growth, or acceptance; not for generic plot-heavy storyboarding or single-image prompt polishing.
metadata:
  short-description: 一瞬治愈：视觉隐喻与五镜头微叙事
---

# 一瞬治愈｜Healing Visual Metaphor v0.2

> 不说大道理，让一个瞬间替你说。

## Purpose

Convert one abstract feeling into one visible relationship between an anonymous character and a believable world. The relationship changes once, at a decisive moment. Return both:

1. one `HERO IMAGE` prompt that freezes the highest-density `MOMENT`;
2. one five-shot video storyboard that explains how that moment happens.

The first version covers the semantic domains `治愈 / 人生感悟 / 希望 / 孤独 / 坚持 / 放下 / 选择 / 成长 / 接纳`. These are input labels, not separate templates.

## Frozen generation chain

```text
INPUT
  → CORE → FEEL → WOUND → AVATAR → CHARACTER PROFILE → WORLD → METAPHOR
  → TENSION → TURN → MOMENT → AFTERGLOW → SILENCE
  → HERO IMAGE + 5-SHOT VIDEO
```

The governing idea is:

```text
healing visual = one feeling × one metaphor × one relationship
                  × one small change × one unfinished moment
```

## Operating procedure

1. **Read the input.** If a reference image is present, separate visible `Observation` from director `Inference` and candidate `Hypothesis`. Ignore social-app chrome, captions, watermarks, and engagement counters unless the user explicitly asks to preserve them.
2. **Distill the meaning.** Choose one `CORE`, one `FEEL`, and one unresolved `WOUND`. Read [core/emotion-engine.md](core/emotion-engine.md) and [core/visual-metaphor.md](core/visual-metaphor.md).
3. **Make the relationship visible.** Choose one anonymous `AVATAR`, one believable `WORLD`, one `METAPHOR`, and one `TENSION`. Read [core/metaphor-engine.md](core/metaphor-engine.md) and [core/tension-engine.md](core/tension-engine.md).
4. **Find the change.** Define one `TURN`, freeze its most meaningful `MOMENT`, and leave an `AFTERGLOW`. Read [core/decisive-moment.md](core/decisive-moment.md).
5. **Choose the account character.** Read [styles/account-character-system.md](styles/account-character-system.md) and select exactly one profile: `NEON-LINE-01` or `INK-PERSON-02`. Record it as `[CHARACTER_PROFILE]`; do not mix the two profiles in one package.
6. **Choose one visual style.** Use one of the style references in [styles/](styles/); do not mix style systems unless the input itself requires the contrast. The account profile is an identity lock, not an invitation to add complexity.
7. **Build the dual output.** Follow [core/output-contract.md](core/output-contract.md). Produce one Hero Image prompt and exactly five storyboard shots, each with an independent video prompt.
8. **Apply the frozen locks.** Read and enforce [rules/frozen-locks.md](rules/frozen-locks.md), including [rules/account-character-lock.md](rules/account-character-lock.md), then use the focused references when needed: `CONTINUITY LOCK`, `MOTION BUDGET`, `EMOTIONAL PEAK LOCK`, and `NO PREACHING`. A lock failure requires revising the decision before returning the package.

## Required final package

Return these sections in this order, in the user's language unless a prompt is clearer in English:

```text
01 SEMANTIC DISTILLATION
   CORE / FEEL / WOUND / AVATAR / CHARACTER_PROFILE / WORLD / METAPHOR / TENSION / TURN / MOMENT

02 VISUAL DIRECTOR DECISIONS
   style / light / color / composition / depth / silence

03 HERO IMAGE
   one complete copy-ready image-generation prompt

04 STORYBOARD
   Shot 01 WORLD
   Shot 02 WOUND
   Shot 03 TENSION
   Shot 04 TURN
   Shot 05 AFTERGLOW

05 VIDEO PROMPTS
   one copy-ready prompt per shot; motion-led, not a restatement of the still

06 CONTINUITY LOCK
07 SOUND
08 NEGATIVE
09 AFTERGLOW
```

## Quality gate before return

- There is exactly one dominant `FEEL`, one main `METAPHOR`, one `TENSION`, and one `TURN`.
- The image freezes the `MOMENT`; it does not merely show a pretty setting or a generic character pose.
- The storyboard has exactly five functional shots and one emotional peak at `TURN`.
- Each shot has one primary motion and no more than two environmental micro-motions.
- Character, wardrobe/line treatment, world, weather, prop, light direction, and color logic remain locked across shots.
- Exactly one account character profile is selected; its silhouette and treatment do not drift across the package.
- The final state is changed but unresolved; the world does not magically become perfect.
- Removing all explanatory text still leaves the relationship and change legible.
- No preaching, moral caption, therapy claim, diagnosis, forced happy ending, clutter, or platform UI is added.
- The hand-drawn profile remains a symbolic cartoon person, never a realistic human or copied animal mascot.

## Boundaries

This is a text-only directing and prompt-writing Skill. It does not call image/video generators, select a vendor, render clips, edit media, publish content, or create a WebUI. Use a separate media tool only after the user chooses one and supplies any required authorization or references.

The package has no runtime dependencies. Its optional maintainer check, [scripts/validate.py](scripts/validate.py), uses only the Python standard library; installation must not run package downloads or change the host environment.

For a supplied local reference image, keep the image and any extracted details inside the local task context. Do not upload it or search for an external copy by default.

## References by need

- Semantic distillation: [core/](core/)
- Style selection: [styles/](styles/)
- Frozen constraints: [rules/](rules/)
- Text, image, or video workflow: [workflows/](workflows/)
- Regression examples: [examples/rain-acceptance.md](examples/rain-acceptance.md) and [examples/cliff-hope.md](examples/cliff-hope.md)
- Account characters: [styles/account-character-system.md](styles/account-character-system.md) and [rules/account-character-lock.md](rules/account-character-lock.md)
