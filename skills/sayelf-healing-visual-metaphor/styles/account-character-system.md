# Style: Account Character System

Use this file when the Skill is used for a recurring account. The account has two
deliberately different cartoon identities, but one shared visual grammar. Select
exactly one profile for each Hero Image and its five-shot video package. These two
profile blocks are the account's character bible and apply in daylight, night,
interiors, weather changes, and every other setting.

## Shared account grammar

```text
realistic or materially believable world
+ one small symbolic 2D character
+ fixed identity cues, silhouette, and body framework
+ natural pose deformation without redesign
+ one readable gesture at the decisive moment
+ vertical 9:16 by default
+ no copied character, no platform UI, no explanatory text
```

The two profiles are original slots, not references to reproduce. A scene may
change, but the selected profile's identity block must not drift between the Hero
Image and the five shots.

## Profile A · NEON-LINE-01 · 霓虹小人物

```text
identity     tiny anonymous neon raindrop person, unchanged across every setting
silhouette   small smooth teardrop body, compact torso, articulated short limbs
treatment    bright cyan-blue outer contour with a restrained violet inner glow
face         two tiny light-dot eyes and one curved smile
limb grammar upper arm → forearm → palm; thigh → shin → foot
scale        small fixed body-to-limb ratio; no costume or added anatomy
use          distance, hope, choice, persistence, an unseen destination
```

Keep the body small and compact. The elbow, wrist, knee, ankle, palm, and foot may
bend, turn, overlap, or foreshorten naturally, but the teardrop body, line colors,
line weight, face, and limb proportions remain fixed. Do not add realistic anatomy,
hair, clothing, buttons, star emblems, or decorative light trails attached to the
body. The environment can carry a separate metaphor light; it is not part of the
character identity.

Actions may change from scene to scene—walking, sitting, reaching, holding, turning,
or dancing—but the teardrop silhouette, cyan/violet line treatment, face, limb
grammar, and proportions must remain unchanged. Pose geometry is flexible; character
design is not.

## Profile B · INK-PERSON-02 · 手绘小人物

```text
identity     tiny original hand-drawn account mascot, unchanged across every setting
silhouette   round cream head, one soft teal body shape, short simple limbs
treatment    clean black ink-like outline with flat colors: cream face, teal body,
             coral-red short scarf/accent, mustard-yellow feet
face         two dot eyes and one clear joyful curved smile; sparse, non-realistic features
limb grammar upper arm → forearm → small palm; thigh → shin → mustard foot
scale        fixed head-to-body ratio, scarf size, foot shape, and simple line weight
use          pressure, acceptance, release, gentle joy, everyday resilience
```

Remove animal traits and realistic-human traits: no ears, tail, muzzle, fur, paws,
whiskers, skin texture, detailed anatomy, complex clothing, or props. Keep the scarf
as a tiny simple accent, never a detailed costume; keep arms and legs as simple
readable cartoon segments. This profile is a new account mascot design; it must not
imitate a supplied reference character.

## Cross-scene identity lock

Carry the selected character into daylight, city streets, mountains, interiors, and
other worlds without recoloring or redesigning it. The two profiles are alternatives,
not interchangeable parts:

```text
NEON-LINE-01 = teardrop body + cyan outer contour + violet inner glow
               + two light dots + curved smile + articulated line limbs

INK-PERSON-02 = cream round face + teal rounded body + coral-red short scarf/accent
                + mustard-yellow feet + black ink outline + joyful simple smile
                + articulated ink limbs
```

Only the surrounding world, lighting, pose, and metaphor relationship may change.
The chosen profile ID and its complete identity block must be repeated consistently
in the Hero Image prompt, every video prompt, and the final `ACCOUNT CHARACTER LOCK`.

## Fixed appearance, natural motion

For both profiles, freeze the character's clothing or line treatment, silhouette,
head-to-body proportions, signature colors, face, limb grammar, and major body
framework. When an action changes, allow natural joint angles, torso lean, weight
shift, foreshortening, occlusion, and perspective compression. The character may
bend, sit, reach, turn, or jump, but the fixed identity must remain recognizable.

```text
appearance = fixed
pose geometry = naturally variable
identity cues = always visible when framing allows
```

Never redraw the costume, replace the body with a new design, or use motion as a
reason to add realistic anatomy.

## Allowed variation

```text
pose / action / framing scale / scene / weather / light
```

Variation is allowed only when it serves the semantic chain. The profile name,
silhouette logic, line or fill treatment, face, signature colors, limb grammar, and
simplicity level remain fixed. Framing scale means composition scale, not changing
body proportions.

## Forbidden drift

```text
mixing both profiles in one package
switching profile during the five shots
turning either profile into a realistic person
adding animal anatomy to INK-PERSON-02
copying a supplied image or recognizable existing mascot
```
