# Build Decision Record · Dual Output Contract v1.0

- **Real task:** One sentence in, automatically route to a visual-narrative Skill, then return a same-source image keyframe prompt and video storyboard.
- **Closest capabilities:** Existing VisualSpec, director gates, continuity checks and provider adapters in this repository; the historical `visual-storytelling` Skill; the Life Comes Closer direction; public storyboard/prompt and skill-manifest patterns.
- **Step 0 decision:** **Integrate**.
- **Measurable improvement:** Every registered Skill exposes the same `dual-output/1.0` surface; the Core has one adapter path for N Skills; both outputs must reference the same `narrative_core.id`.
- **Success evidence:** Registry discovery, deterministic routing, execution, schema validation, semantic continuity validation and `npm test`.
- **Minimum Core:** discover registry → route intent → execute selected plugin → validate manifest and outputs.
- **Plugin boundaries:** Visual composition, material, emotional timing, camera language and prompt content remain inside each Skill plugin.
- **Local/data boundary:** Runtime is local-only. Source and generated data stay local during development; no model, network client, credential, telemetry or upload is embedded.
- **Public release:** This document and source are intended as public project code; no secrets, personal data, local paths or credentials are included.
- **State rule:** Registry changes are read on runtime creation; there is no background polling.
- **Evidence labels:** Input/plugin return is observation; route score is inference; selected Skill is a routing hypothesis; schema- and semantic-passing output is fact.
- **Evolution/rollback:** Contract version remains `dual-output/1.0`; new Skills are tested before registration and can be disabled in the registry.
- **WebUI:** Not required for this slice; existing repository interfaces remain unchanged.
- **Not building:** Marketplace, account system, cloud model calls, media generation, new WebUI, complex NLP, learning ranking or publishing workflow.
