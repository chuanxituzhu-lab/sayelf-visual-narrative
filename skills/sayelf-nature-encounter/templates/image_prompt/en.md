# 01 IMAGE — English image-generation prompt

Use the one shared Nature Event Core. Fill every placeholder from that Core; do not create a new event.

```text
Photorealistic intimate nature photography, vertical {{ratio}}, showing one quiet and believable encounter between living things.

[DWELL]
{{nature_event.habitat}}. Let the place exist as a living micro-habitat first, with irregular growth, small gaps, moisture, natural wear, and believable foreground occlusion.

[MEET]
{{nature_event.subject}} and {{nature_event.plant}} meet in the same physical space. Relationship: {{nature_event.relationship}}. They must not read as parallel decorative objects.

[TOUCH]
Decisive moment: {{nature_event.decisive_moment}}. Moment phase: {{nature_event.moment_phase}}. Keep one primary relationship tension.

[BREATHE]
Preserve generous natural negative space and real optical depth. SILENCE LAYER: {{nature_event.silence_layer}}. Keep background information density lower than the encounter; do not fill the frame with competing plants.

[TRACE]
Preserve the physical trace: {{nature_event.physical_trace}}. Leave the action slightly unresolved, as if the next second still matters.

Camera position: {{nature_event.camera.position}}; lens feel: {{nature_event.camera.lens_feel}}; composition: {{nature_event.camera.composition}}; light: {{nature_event.light}}.

Reality Lock: {{locks.reality_lock}}
Continuity Lock: {{locks.continuity_lock}}
Negative Lock: {{locks.negative_lock}}

The five-stage grammar is fixed: DWELL → MEET → TOUCH → BREATHE → TRACE. Use natural light, honest materials, believable proportions, and critical focus on the eye or relationship point; no text, logos, watermarks, or second competing subject.
```

Return one finished image-generation prompt only under `01 IMAGE`.
