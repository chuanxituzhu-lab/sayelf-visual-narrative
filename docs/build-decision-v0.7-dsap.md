# Build Decision Record — v0.7 DSAP

## Idea / real task
Apply the workflow principles and the eight foundation build principles to the existing local visual-prompt compiler, and add a small DSAP execution record so every generation result exposes its decision, state, action, and proof.

## Closest existing projects or capabilities
The repository already has a deterministic `OutputContract`, replaceable Scene/Variation/Composer/Output plugins, failure isolation, and the WebUI path `Open → Input → Execute → Result`. The workflow-principles skill supplies the execution-contract and evidence-ledger requirements. Public search found multiple unrelated meanings of DSAP rather than one matching agent standard, so no external DSAP implementation is reused.

## Step 0 decision
**Improve** — reuse the existing contract and add the smallest local evidence envelope that closes the workflow-state gap. This is not a new visual Core or orchestration engine.

## Measurable improvement or differentiator
Every successful generation returns a deterministic DSAP record with `decision`, `state`, `action`, `proof`, an append-only four-event ledger, and an explicit downstream handoff. The same SceneSpec and seed produce the same DSAP record; plugin degradation becomes `NEEDS_REVIEW` without corrupting a healthy sibling output. The WebUI exposes only the human-relevant state and next action.

## Success measure and required evidence
Unit tests verify DSAP presence, deterministic run identity, state transitions, proof linkage to the OutputContract and continuity anchor, and degraded-plugin handling. API and browser smoke tests verify that the record travels through the existing interfaces and that the WebUI shows status without exposing raw internals by default.

## Minimum Core
A pure `createDsapRecord` function and a stable DSAP schema. It records orchestration evidence only; `Enter → Enclose → Guide → Reveal` and the five storyboard stages remain unchanged.

## Plugin boundaries
Output plugins remain responsible for image and storyboard content. DSAP consumes their accepted result metadata and errors after dispatch; it does not own prompt prose, provider calls, or scene logic.

## Local-first boundary
DSAP is computed in-process beside the existing compiler. No network, model, telemetry, database, or background polling is added.

## Data classification and local trust boundary
The contract shape, sanitized SceneSpec fields, deterministic result IDs, and test fixtures are `Public`. Credentials, local paths, private prompts, runtime logs, and unknown data remain local and are not included in the public release.

## GitHub/public release decision
**Allowed — pending staged-diff review.** Only source, tests, schema, and public documentation are eligible. The staged diff must pass leak checks before push.

## External transfer plan
Push only the reviewed public feature commit to the existing repository branch. No other external transfer is required.

## State, change signals, and next-check rule
A run is synchronous: `READY → RUNNING → COMPLETED` or `READY → RUNNING → NEEDS_REVIEW`. The next check occurs on a new request or changed input/seed/plugin result; unchanged completed state is not polled.

## Observation / inference / hypothesis / fact boundary
Observation is the actual plugin result/error and test/browser output. Inference is the derived current state from ledger events. Hypothesis is that a compact DSAP record improves handoff reliability. Fact is promoted only after tests and interface smoke checks pass.

## Evolution, validation, canary, version, and rollback plan
Validate locally, canary through the HTTP and WebUI paths, promote by versioning the contract and package, and roll back by reverting the feature commit. DSAP remains optional at the adapter boundary only through the existing contract; plugin failure stays isolated.

## WebUI decision
**Required** — this project is a visual human-facing tool. Keep `Open → Input → Execute → Result`; show current status, produced outputs, failures, and next action while hiding event IDs and raw schemas by default.

## Simplest reliable implementation
One pure core module, one contract property, one JSON schema section, a compact WebUI status line, and focused tests. No new dependency.

## Explicitly not building
No public-standard claim for DSAP, no agent loop, no authorization service, no cryptographic signing, no remote event store, no scheduler, no new visual grammar, and no provider integration.
