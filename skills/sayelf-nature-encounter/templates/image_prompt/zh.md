# 01 IMAGE — 中文图片生成提示词

Use the one shared Nature Event Core. Fill every placeholder from that Core; do not create a new event.

```text
真实自然摄影，竖幅 {{ratio}}，只表现一个安静而真实的生命相遇。

[DWELL｜栖]
{{nature_event.habitat}}。让环境先作为活着的微型栖息地存在，保留自然生长的不规则、缺口、潮湿、轻微损伤与真实遮挡。

[MEET｜遇]
{{nature_event.subject}} 与 {{nature_event.plant}} 在同一物理空间相遇。关系：{{nature_event.relationship}}。不要把它们当作并列装饰。

[TOUCH｜触]
决定性瞬间：{{nature_event.decisive_moment}}。时间相位：{{nature_event.moment_phase}}。只保留一个主要关系张力。

[BREATHE｜息]
保留大面积自然负空间与真实光学景深。SILENCE LAYER：{{nature_event.silence_layer}}。背景信息密度低于相遇关系，避免满屏植物争夺注意力。

[TRACE｜留]
保留物理痕迹：{{nature_event.physical_trace}}。让动作没有被解释完，留下下一秒仍会发生的感觉。

机位：{{nature_event.camera.position}}；镜头质感：{{nature_event.camera.lens_feel}}；构图：{{nature_event.camera.composition}}；光线：{{nature_event.light}}。

Reality Lock：{{locks.reality_lock}}
Continuity Lock：{{locks.continuity_lock}}
Negative Lock：{{locks.negative_lock}}

五段语法固定为 DWELL → MEET → TOUCH → BREATHE → TRACE。自然光、真实材质、可信比例、眼睛或关系发生点关键对焦；不要生成文字、标志、水印或第二个竞争主体。
```

Return one finished image-generation prompt only under `01 IMAGE`.
