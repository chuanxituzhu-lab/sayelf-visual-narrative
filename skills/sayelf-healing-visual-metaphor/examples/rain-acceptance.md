# Example 01: 雨中快乐 / 接纳

Regression source: the local rain reference from the current conversation. The supplied image is a vertical social screenshot; platform controls, counters, caption text, and watermark-like UI are excluded from the visual package.

## Input

> 有时候真正的快乐，不是等雨停，而是学会在雨里玩。

## Semantic distillation

```text
[CORE]       真正的快乐不要求环境先变好；关系改变就足够了。
[FEEL]       接纳中的纯粹快乐
[WOUND]      仍在躲避无法控制的暴雨
[AVATAR]     很小的匿名手绘小孩，简单黑色线稿，黄黑条纹上衣
[WORLD]      黄昏的深色森林道路，真实雨幕与浅积水
[METAPHOR]   暴雨，代表无法控制的处境
[TENSION]    PRESSURE → EMBRACE：人物从躲避雨转为站进雨里
[TURN]       人物不再缩起身体，随一次水面撞击张开双臂
[MOMENT]     大雨滴刚击中水面，皇冠状透明水花托住张开双臂的小孩
[AFTERGLOW]  雨仍在下，人物保持姿势，远处暖灯没有变成太阳
[SILENCE]    去除字幕、社交 UI、第二人物、额外符号和多余光效
```

## Visual director decisions

```text
style        realistic dark world + deliberately simple hand-drawn cartoon avatar
light        cool dark forest; one restrained warm circular light in the distance
color        deep green / black / wet grey, warm yellow on shirt and distant light
composition  vertical 9:16, low puddle-level camera, centered tiny subject, symmetry
depth        foreground water texture, midground figure/splash, soft forest background
silence      large dark upper space; no text or platform interface
```

## HERO IMAGE

```text
Vertical 9:16 cinematic visual metaphor. A photorealistic dark forest road at dusk during heavy rain, wet black asphalt and a shallow puddle, deep green forest fading into soft natural depth. In the center stands a tiny anonymous hand-drawn childlike character with simple black ink outlines, sparse messy hair, closed smiling eyes, rosy cheeks, a warm yellow-and-black striped shirt, and arms stretched wide. Keep the character deliberately 2D and simple while the forest, rain, asphalt, and water remain physically believable. The character is standing inside the rain instead of hiding from it. Freeze the exact instant one large raindrop strikes the puddle and a transparent crown-shaped splash rises symmetrically around the small body; individual droplets hang in the air. Extremely low camera at puddle level, strong vertical symmetry, tiny character against a large dark world, generous quiet space above. Cool dark environment with one distant soft warm circular light behind the character; transparent water catches subtle highlights. The image should express that the rain did not stop, but the relationship with the rain changed. No text, subtitles, logo, social-media UI, watermark, extra characters, realistic human face, plastic water, fantasy particles, excessive glow, clutter, or multiple competing light sources.
```

## STORYBOARD + VIDEO PROMPTS

### Shot 01 · WORLD · 0–2s

```text
Visual beat: low camera close to the wet road; the tiny child stands centered in the rain.
Primary motion: steady rainfall descending through frame.
Micro-motions: small puddle rings; distant foliage barely shifting.
Camera: fixed ultra-low wide shot.
Sound: soft continuous rain and distant forest air.
Continuity: establish the same tiny hand-drawn child, yellow-black shirt, dark green forest, cool dusk, and distant warm light.
Video prompt: Preserve the reference composition, the simple 2D child, realistic rain, colors, and lighting. Hold an ultra-low wide shot near the wet road while steady rain falls around the still centered character. Add only small puddle rings and barely moving distant foliage. Quiet pacing, no text, no UI, no new objects, no camera shake.
```

### Shot 02 · WOUND · 2–4s

```text
Visual beat: the child remains small as rain thickens around the body.
Primary motion: extremely slow camera push-in.
Micro-motions: rainfall; shallow water ripples.
Camera: low centered dolly-in.
Sound: rain grows slightly fuller, no music yet.
Continuity: same character, clothing, road, weather, light position, and palette.
Video prompt: Preserve the same child, wardrobe, realistic dark forest road, rain, palette, and distant warm light. Make one extremely slow centered push-in as the character stays still and small inside the large wet world. Let rainfall and shallow ripples remain the only environmental motion. No expression change, no extra event, no text, no UI.
```

### Shot 03 · TENSION · 4–6s

```text
Visual beat: one visibly larger raindrop separates from the rain field and approaches the puddle at the child's feet.
Primary motion: the single large raindrop descends toward the water.
Micro-motions: background rainfall; faint water tremor.
Camera: locked low frame, no reframing.
Sound: general rain narrows into the approach of one drop.
Continuity: the larger drop is part of the same rain; no new light or prop.
Video prompt: Preserve composition and continuity. Hold the low camera completely steady while one larger raindrop slowly enters from above and descends toward the puddle at the same child's feet. Keep the surrounding rain soft and secondary, with only a faint water tremor. Build anticipation without adding a second action, camera move, character change, text, or UI.
```

### Shot 04 · TURN · 6–8s

```text
Visual beat: the large drop strikes; one causal peak lifts a transparent crown splash as the child's arms open once.
Primary motion: one synchronized impact beat—raindrop impact → crown splash → arms opening.
Micro-motions: suspended droplets; distant warm light shimmer kept nearly imperceptible.
Camera: locked and centered to protect the peak.
Sound: one clear water impact; a small warm musical note may enter after the impact.
Continuity: same body proportions, shirt, rain, forest, and light; no magical transformation.
Video prompt: Preserve the exact character identity, hand-drawn treatment, realistic rain, centered low composition, colors, and light. At the single emotional peak, the large raindrop hits the puddle and one transparent crown-shaped splash rises around the child as the child opens both arms once in the same causal beat. Keep the camera locked, droplets briefly suspended, and all other motion subdued. No second effect, no transformation, no text, no UI, no exaggerated glow.
```

### Shot 05 · AFTERGLOW · 8–10s

```text
Visual beat: water falls back; the child holds the open-armed pose while rain continues.
Primary motion: suspended splash droplets descend and settle.
Micro-motions: steady rainfall; distant warm light remains still.
Camera: no movement; hold the final image for the last second.
Sound: water settles back into the rain; the small musical note fades, leaving ambience.
Continuity: preserve every lock; the rain does not stop and the world is not solved.
Video prompt: Preserve the same centered low composition, child, clothing, forest, rain, colors, and light. Let the splash droplets slowly fall and settle while the child holds the open-armed pose. Keep the camera completely still for the final second; rain continues unchanged. End in quiet unresolved acceptance, with no new event, caption, logo, or interface.
```

## CONTINUITY LOCK

```text
same tiny anonymous hand-drawn child; same black outline and yellow-black striped shirt;
same realistic dark green forest road and shallow puddle; same heavy dusk rain;
same distant warm circular light behind the character; same cool green-black palette;
same vertical 9:16 low puddle-level camera language; only the causal water impact and
the child's single arm-opening beat change.
```

## FROZEN LOCK CHECKS

```text
CONTINUITY LOCK       pass: child, shirt, forest, rain, light, palette, and camera persist
MOTION BUDGET         pass: each shot names 1 primary motion and at most 2 micro-motions
EMOTIONAL PEAK LOCK   pass: the only peak is the causal impact/arms-opening beat in Shot 04
NO PREACHING          pass: no moral text, therapy claim, narration, or forced resolution
```

## SOUND

Continuous rain → narrowed attention to one raindrop → one water impact → restrained single note after the peak → rain and silence. No narration or explanatory caption.

## NEGATIVE

```text
no text, subtitles, social UI, watermark, logo, extra characters, realistic human face,
plastic water, fantasy particles, multiple simultaneous camera moves, extra emotional
peaks, sunshine, stopped rain, forced celebration, clutter, or moral slogan
```

## AFTERGLOW

The rain continues. The child keeps smiling with arms open. The environment has not improved; only the child's relation to it has shifted.
