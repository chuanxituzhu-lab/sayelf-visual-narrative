# Frozen Rule: ACCOUNT CHARACTER LOCK

This is the account-level extension of `CONTINUITY LOCK`. It protects recognition
across different stories while allowing the account to have two different cartoon
characters.

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
animal-versus-human boundary
```

## Allowed variation

Change only pose, expression, scene relationship, and one small narrative accent
when the `TURN` requires it. A change in pose is not a new character.

## Failure conditions

The package fails if it mixes profiles, adds realistic anatomy, introduces a fox or
other animal into `INK-PERSON-02`, changes line treatment between shots, or makes a
supplied reference image the character's identity. Revise the profile decision
before returning the package.
