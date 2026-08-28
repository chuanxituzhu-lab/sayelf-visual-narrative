# 02 VIDEO — English video storyboard and per-shot prompts

Treat `01 IMAGE` as the keyframe anchor for the same Nature Event Core. Use exactly five shots in this order:

```text
S01 DWELL → S02 MEET → S03 TOUCH → S04 BREATHE → S05 TRACE
```

For every shot, write the required fields:

```text
shot_id · stage · duration_s · frame · camera · action · transition_in · transition_out · prompt
```

One shot has one main physical change and at most one primary camera movement. Preserve subject identity, plant geometry, screen direction, camera side, time of day, light direction, and the same `event_id`.

Global video handoff prompt:

```text
Start from the same keyframe defined by 01 IMAGE and unfold the same natural event across five continuous shots. Allow only these stages, in order: DWELL → MEET → TOUCH → BREATHE → TRACE. Obey the Reality Lock for physical behavior, the Continuity Lock for visual invariants, and the Negative Lock for exclusions. Keep the SILENCE LAYER low-information, with only small environment sound and movement relevant to the event. Do not add a new living subject, plant species, prop, season, time of day, text, or dramatic resolution.
```

Per-shot prompt pattern:

```text
Shot {{shot_id}} | {{stage}} | {{duration_s}} seconds
Frame: {{frame}}
Camera and movement: {{camera}}
Action: {{action}}
Transition in: {{transition_in}}
Transition out: {{transition_out}}
Keep the SILENCE LAYER: {{nature_event.silence_layer}}
Reality Lock: {{locks.reality_lock}}
Continuity Lock: {{locks.continuity_lock}}
Negative Lock: {{locks.negative_lock}}
Per-shot prompt: execute only this shot's action; do not complete the next stage early or change the subject, plant, light, or spatial direction.
```

Return exactly five shot cards under `02 VIDEO`, each with its own finished `prompt`.
