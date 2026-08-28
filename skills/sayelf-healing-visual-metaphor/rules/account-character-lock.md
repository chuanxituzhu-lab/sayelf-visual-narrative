# Frozen Rule: ACCOUNT CHARACTER LOCK

This is the account-level extension of `CONTINUITY LOCK`. It protects recognition
across different stories and settings while allowing the account to have two
different cartoon characters.

## Selection

Choose exactly one profile from [styles/account-character-system.md](../styles/account-character-system.md):

```text
NEON-LINE-01  or  INK-PERSON-02
```

Write the selected profile in `[CHARACTER_PROFILE]` and in the final
`[ACCOUNT CHARACTER LOCK]`. Never leave the choice implicit.

## Immutable identity block

Once selected, keep these fields unchanged across the Hero Image and all five
shots:

```text
profile ID
silhouette and body proportions
line / fill treatment
face complexity
signature palette and glow or accent logic
limb grammar and major body framework
animal-versus-human boundary
```

For `NEON-LINE-01`, the signature identity is specifically: a small smooth teardrop
body, compact proportions, cyan-blue outer neon contour, restrained violet inner glow,
two light-dot eyes, one curved smile, and fixed limb grammar of upper arm/forearm/palm
and thigh/shin/foot. Joints may bend naturally for action, but the body silhouette,
line treatment, face, limb grammar, and proportions do not change. This identity
applies in every setting, not only at night.

For `INK-PERSON-02`, the signature identity is specifically: cream round face,
teal body, coral-red short scarf/accent, mustard-yellow feet, black ink outline,
the same simple joyful smile, and simple ink limbs using upper arm/forearm/palm and
thigh/shin/foot segments. The head-to-body ratio, scarf accent, foot shape, and line
weight stay fixed in every setting.

## Natural pose rule

The clothing or line treatment, silhouette, proportions, signature colors, face,
limb grammar, and major body framework are immutable. Pose may deform naturally
through joint angles, torso lean, weight shift, foreshortening, occlusion, and
perspective compression. Keep enough identity cues visible for the chosen framing;
do not redesign the person to explain an action.

## Allowed variation

Change only pose or action, camera relationship, and the character's relationship
to the scene when the `TURN` requires it. Environmental metaphor accents may change;
the character's appearance may not. A change in pose or action is not permission to
change the character's appearance.

## Failure conditions

The package fails if it mixes profiles, adds realistic anatomy, introduces a fox or
other animal into `INK-PERSON-02`, changes a fixed color, smile, accessory, body
framework, or limb grammar between scenes, changes line/fill treatment between
shots, or makes a supplied reference image the character's identity. Revise the
profile decision before returning the package.
