# Visual Skill plugins

Put one external visual Skill in its own directory under this folder:

```text
plugins/visual-skills/my-skill/
  manifest.json
  plugin.mjs
```

The manifest follows `schemas/skill-manifest.schema.json`. The module must
export the manifest entrypoint (`execute`) and return the validated
`dual-output/1.0` contract. The core discovers these folders at startup,
routes to them by `preferred_skill_id` or manifest tags/examples, and keeps
the three director gates plus the image/video output contract in the core.

Plugin code is local by default. Any network transfer must be implemented and
configured by the plugin owner; do not put credentials in manifests or source.
