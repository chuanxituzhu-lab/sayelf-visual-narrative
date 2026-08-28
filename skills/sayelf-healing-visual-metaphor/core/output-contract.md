# Unified Input → Dual Output Contract

This is the v0.2.5 interface. Keep the field names stable so image and video prompts share one semantic source of truth.

## Input

Accepted input:

```text
one sentence | one feeling | one life insight | one short story | one local reference image
```

If multiple ideas are present, choose one dominant proposition and note the assumption in one short line. Do not expand into multiple stories.

## Shared semantic block

```text
[CORE]       one non-preaching proposition
[FEEL]       one dominant feeling
[WOUND]      one unresolved starting condition
[AVATAR]     one anonymous audience proxy
[CHARACTER_PROFILE] one account profile ID plus its immutable identity block, repeated across Hero Image and all five shots
[WORLD]      one believable environment
[METAPHOR]   one meaning-bearing physical carrier
[TENSION]    one relationship between avatar and world/metaphor
[TURN]       one small relational change
[MOMENT]     one exact frame of that change
[AFTERGLOW]  one unfinished truth after the change
[SILENCE]    what is intentionally removed
```

## Hero Image output

Produce one complete copy-ready prompt containing:

```text
format/aspect → account character profile → world → avatar → metaphor → relationship → moment
→ light → color → composition → depth → style contrast → silence
→ negative constraints
```

The prompt must freeze the `MOMENT`, preserve the chosen style, and exclude explanatory text and platform UI unless explicitly requested.

## Storyboard output

Produce exactly five shots:

| Shot | Function | Required question |
| --- | --- | --- |
| 01 `WORLD` | establish | Where is the character? |
| 02 `WOUND` | reveal pressure | What is the character facing? |
| 03 `TENSION` | concentrate relation | What gets harder or closer? |
| 04 `TURN` | make one change | What changes once? |
| 05 `AFTERGLOW` | leave space | What remains unresolved? |

Every shot contains:

```text
duration / framing / camera / visual beat / primary motion
environment micro-motions / video prompt / sound / continuity note
```

Default total duration is 10–12 seconds, with 2–3 seconds per shot. Adjust only when the user's target requires it; retain five functional shots.

## Video prompt output

Write one independent prompt for each shot. It may rely on a shared `CONTINUITY LOCK`, but it must state the shot's action and one camera choice. For image-to-video use, describe motion and preservation first; do not redescribe unrelated still details or add new events.

## Global sections

After the five shots, return:

```text
[ACCOUNT CHARACTER LOCK] selected profile / fixed identity, body framework, and limb grammar / natural pose variation / forbidden drift
[CONTINUITY LOCK] identity / style / wardrobe or line treatment / world / weather
                  metaphor / light direction / palette / camera grammar
[SOUND]           ambience / decisive sound / music entry and exit
[NEGATIVE]        only relevant unwanted artifacts and narrative violations
[AFTERGLOW]       final held image and the truth left unresolved
```

## Contract validation

The package is invalid if any required field is missing, if no single account character profile is selected, if more than one emotional peak is introduced, if a shot contains multiple locations or time jumps, or if the ending explains the lesson instead of showing its changed relationship.
