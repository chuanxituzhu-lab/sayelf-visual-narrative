# 02 VIDEO — 中文视频分镜与逐镜头提示词

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
从 01 IMAGE 的同一关键帧开始，把同一个自然事件连续展开为五个镜头。只允许以下阶段按顺序发生：DWELL → MEET → TOUCH → BREATHE → TRACE。动作遵守 Reality Lock，画面连续性遵守 Continuity Lock，所有排除项遵守 Negative Lock。SILENCE LAYER 保持低信息密度，只留下与事件相关的微小环境声和运动。不要新增生命主体、植物种类、道具、季节、时间、文字或戏剧性结局。
```

Per-shot prompt pattern:

```text
镜头 {{shot_id}}｜{{stage}}｜{{duration_s}} 秒
画面：{{frame}}
机位与运动：{{camera}}
动作：{{action}}
入场衔接：{{transition_in}}
出场衔接：{{transition_out}}
保持 SILENCE LAYER：{{nature_event.silence_layer}}
Reality Lock：{{locks.reality_lock}}
Continuity Lock：{{locks.continuity_lock}}
Negative Lock：{{locks.negative_lock}}
逐镜头提示词：只执行本镜头动作，不提前完成下一阶段，不改变主体、植物、光线或空间方向。
```

Return exactly five shot cards under `02 VIDEO`, each with its own finished `prompt`.
