# Build Decision Record — v0.6 One Core, Two Outputs

## Real task
Expose the same SceneSpec as two independently usable prompt outputs in the WebUI: an image prompt and a five-shot video storyboard. Add a global Chinese/English switch and make the image prompt explicitly align with the storyboard continuity.

## Step 0 — search, compare, distill, gap, decide
The local project already has the frozen `Enter → Enclose → Guide → Reveal` Core, `OutputContract`, image/storyboard output plugins, and failure-isolated dispatch. Comparable open-source patterns include StoryMind's cross-shot story consistency workflow, Storyboard's structured grid/list/timeline presentation, and PromptForge's modality-oriented prompt workspace.
Decision: **Improve**. Reuse the existing contract and plugins; add only a shared continuity anchor and a lightweight dual-column WebUI presentation. Do not rebuild the Core or introduce a new orchestration framework.

## Measurable difference
- The default WebUI result has two visible output columns when `both` is selected.
- Each column has an independent copy action.
- The language switch updates the visible controls and re-renders cached results in Chinese, English, or bilingual form.
- Image and storyboard outputs share one deterministic `continuity_id`, the same subject/window/hook/palette anchors, and the fixed `ENTER / ENCLOSE / GUIDE / REVEAL / HOLD` order.

## Success evidence
Unit tests cover the continuity contract, output alignment, deterministic seed behavior, grammar invariants, and plugin failure isolation. The WebUI smoke check covers dual-column rendering, independent copy buttons, language switching, and non-empty image/storyboard results.

## Boundaries
- Core: unchanged grammar and stage count; continuity is metadata and prompt context only.
- Plugins: image remains responsible for image prompt compilation; storyboard remains responsible for five-shot timing and video direction.
- Interfaces: MCP, CLI, HTTP API, WebUI, and external Agents continue selecting `image`, `storyboard`, or `both` through `OutputContract`.
- Local-first: generation and cached result switching remain local. Only public source code and documentation are eligible for the existing GitHub branch.

## Data and release
SceneSpec examples and generated prompt structure are public project data. No credentials, private files, local paths, or runtime secrets enter the release. Before pushing, review the staged diff and run leak checks.

## State, evidence, and rollback
Observed behavior is recorded by tests and the browser smoke check; inferred design benefits remain hypotheses until those checks pass. The change is isolated to the feature branch and can be reverted as one commit if needed.

## WebUI decision
A WebUI is required because the requested workflow is visual and interactive: Open → Input → Execute → Result. Use existing HTML/CSS/JS and progressive disclosure; do not add a frontend framework or timeline editor.

## Explicitly not building
No new Core stage, no provider API calls, no new i18n dependency, no free-form timeline editor, no unrelated image/video generation feature, and no change to the frozen grammar.
