import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GRAMMAR = ["DWELL", "MEET", "TOUCH", "BREATHE", "TRACE"];
const PROMPT_MARKERS = [
  "DWELL",
  "MEET",
  "TOUCH",
  "BREATHE",
  "TRACE",
  "SILENCE LAYER",
  "Reality Lock",
  "Continuity Lock",
  "Negative Lock"
];
const REQUIRED_FILES = [
  "SKILL.md",
  "schemas/nature-event.schema.json",
  "schemas/output-contract.schema.json",
  "templates/image_prompt/zh.md",
  "templates/image_prompt/en.md",
  "templates/video_storyboard/zh.md",
  "templates/video_storyboard/en.md",
  "requirements-validation.txt",
  "scripts/bootstrap_validation.py",
  "examples/dragonfly-reed.json",
  "tests/fixtures/dragonfly-reed.json",
  "tests/fixtures/during-touch.json"
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function equalJson(left, right, label) {
  assert.deepEqual(left, right, `${label} must stay identical`);
}

function assertPromptMarkers(prompt, label) {
  for (const marker of PROMPT_MARKERS) {
    assert.match(
      prompt,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${label}: prompt missing ${marker}`
    );
  }
}

function validateCore(event, label) {
  assert.match(event.event_id, /^NE-[0-9]{3}$/, `${label}: event_id`);
  assert.deepEqual(event.grammar, GRAMMAR, `${label}: grammar`);
  for (const field of [
    "title",
    "subject",
    "plant",
    "habitat",
    "relationship",
    "decisive_moment",
    "physical_trace",
    "silence_layer"
  ]) {
    assert.equal(typeof event[field], "string", `${label}: ${field} must be text`);
    assert.ok(event[field].trim(), `${label}: ${field} must not be empty`);
  }
  assert.ok(["before_touch", "during_touch", "after_touch"].includes(event.moment_phase));
  for (const field of ["position", "lens_feel", "composition"]) {
    assert.equal(typeof event.camera?.[field], "string", `${label}: camera.${field}`);
  }
  assert.ok(event.locks, `${label}: locks are required`);
  assert.ok(event.locks.reality_lock.length >= 3);
  assert.ok(event.locks.continuity_lock.length >= 3);
  assert.ok(event.locks.negative_lock.length >= 5);
}

function validateOutput(output, expectedId, expectedKind, event, label) {
  assert.equal(output.id, expectedId, `${label}: fixed output id`);
  assert.equal(output.kind, expectedKind, `${label}: fixed output kind`);
  assert.equal(output.event_id, event.event_id, `${label}: event_id continuity`);
  assert.deepEqual(output.grammar, GRAMMAR, `${label}: grammar continuity`);
  assert.ok(output.prompt.trim(), `${label}: prompt must not be empty`);
  assertPromptMarkers(output.prompt, label);
  equalJson(output.silence_layer, event.silence_layer, `${label}: SILENCE LAYER`);
  equalJson(output.reality_lock, event.locks.reality_lock, `${label}: Reality Lock`);
  equalJson(output.continuity_lock, event.locks.continuity_lock, `${label}: Continuity Lock`);
  equalJson(output.negative_lock, event.locks.negative_lock, `${label}: Negative Lock`);
}

function validatePackage(pkg, label) {
  assert.equal(pkg.skill, "sayelf-nature-encounter", `${label}: skill`);
  assert.equal(pkg.version, "0.1.1", `${label}: version`);
  validateCore(pkg.nature_event, `${label}: Nature Event Core`);
  assert.deepEqual(Object.keys(pkg.outputs).sort(), ["image", "video"], `${label}: exactly two outputs`);

  validateOutput(pkg.outputs.image, "01 IMAGE", "IMAGE", pkg.nature_event, `${label}: IMAGE`);
  validateOutput(pkg.outputs.video, "02 VIDEO", "VIDEO", pkg.nature_event, `${label}: VIDEO`);

  const storyboard = pkg.outputs.video.storyboard;
  assert.equal(storyboard.length, 5, `${label}: exactly five video shots`);
  equalJson(storyboard.map((shot) => shot.stage), GRAMMAR, `${label}: shot stage order`);
  equalJson(
    storyboard.map((shot) => shot.shot_id),
    ["S01", "S02", "S03", "S04", "S05"],
    `${label}: shot ids`
  );
  for (const shot of storyboard) {
    assert.ok(shot.duration_s >= 0.5 && shot.duration_s <= 10);
    for (const field of ["frame", "camera", "action", "transition_in", "transition_out", "prompt"]) {
      assert.equal(typeof shot[field], "string", `${label}: ${shot.shot_id}.${field}`);
      assert.ok(shot[field].trim(), `${label}: ${shot.shot_id}.${field} must not be empty`);
    }
    assert.match(shot.prompt, new RegExp(shot.stage), `${label}: ${shot.shot_id} must name its stage`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateNegativeCases(pkg) {
  const cases = [
    ["event id drift", (candidate) => { candidate.outputs.video.event_id = "NE-999"; }],
    ["lock drift", (candidate) => { candidate.outputs.image.continuity_lock[0] = "changed lock"; }],
    ["shot order drift", (candidate) => {
      [candidate.outputs.video.storyboard[1].stage, candidate.outputs.video.storyboard[2].stage] = [
        candidate.outputs.video.storyboard[2].stage,
        candidate.outputs.video.storyboard[1].stage
      ];
    }],
    ["missing image prompt", (candidate) => { delete candidate.outputs.image.prompt; }]
  ];
  for (const [name, mutate] of cases) {
    const candidate = clone(pkg);
    mutate(candidate);
    assert.throws(() => validatePackage(candidate, `negative: ${name}`), undefined, `${name} must be rejected`);
  }
  console.log(`- ${cases.length} negative cases rejected`);
}

function validateSkillText() {
  const skill = read("SKILL.md");
  assert.match(skill, /^---\r?\nname: sayelf-nature-encounter\r?\n/);
  assert.match(skill, /description:\s+.+/);
  for (const token of ["DWELL", "MEET", "TOUCH", "BREATHE", "TRACE", "SILENCE LAYER", "Reality Lock", "Continuity Lock", "Negative Lock"]) {
    assert.match(skill, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `SKILL.md missing ${token}`);
  }
}

function validateSchemas() {
  const natureSchema = readJson("schemas/nature-event.schema.json");
  const outputSchema = readJson("schemas/output-contract.schema.json");
  assert.equal(natureSchema.$id, "sayelf-nature-encounter.nature-event.0.1.1");
  assert.equal(outputSchema.$id, "sayelf-nature-encounter.output-contract.0.1.1");
  assert.deepEqual(natureSchema.properties.grammar.prefixItems.map((item) => item.const), GRAMMAR);
  assert.deepEqual(outputSchema.$defs.grammar.prefixItems.map((item) => item.const), GRAMMAR);
  assert.equal(outputSchema.properties.outputs.properties.image.properties.id.const, "01 IMAGE");
  assert.equal(outputSchema.properties.outputs.properties.video.properties.id.const, "02 VIDEO");
  assert.equal(outputSchema.$defs.shot.properties.prompt.type, "string");
}

function validateTemplates() {
  const templatePaths = [
    "templates/image_prompt/zh.md",
    "templates/image_prompt/en.md",
    "templates/video_storyboard/zh.md",
    "templates/video_storyboard/en.md"
  ];
  for (const relativePath of templatePaths) {
    const content = read(relativePath);
    for (const token of ["DWELL", "MEET", "TOUCH", "BREATHE", "TRACE", "SILENCE LAYER", "Reality Lock", "Continuity Lock", "Negative Lock"]) {
      assert.match(content, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${relativePath} missing ${token}`);
    }
    assert.match(content, /\{\{nature_event\./, `${relativePath} must use Nature Event placeholders`);
    assert.match(content, /\{\{locks\./, `${relativePath} must use lock placeholders`);
  }
}

function validateOptionalValidationSetup() {
  assert.equal(read("requirements-validation.txt").trim(), "PyYAML==6.0.3");
  const bootstrap = read("scripts/bootstrap_validation.py");
  for (const token of ["--target", "--no-input", "--no-deps", "requirements-validation.txt", "python_with_yaml"]) {
    assert.match(bootstrap, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `bootstrap missing ${token}`);
  }
}

for (const relativePath of REQUIRED_FILES) {
  assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `missing required file: ${relativePath}`);
}

validateSkillText();
validateSchemas();
validateTemplates();
validateOptionalValidationSetup();
const dragonflyFixture = readJson("tests/fixtures/dragonfly-reed.json");
validatePackage(dragonflyFixture, "fixture: dragonfly-reed");
validatePackage(readJson("tests/fixtures/during-touch.json"), "fixture: during-touch");
validatePackage(readJson("examples/dragonfly-reed.json"), "example");
validateNegativeCases(dragonflyFixture);

console.log("sayelf-nature-encounter validation passed");
console.log("- version 0.1.1");
console.log("- optional PyYAML validation bootstrap contract");
console.log("- one Nature Event Core");
console.log("- exactly two outputs: 01 IMAGE and 02 VIDEO");
console.log("- five ordered video shots");
console.log("- shared grammar, SILENCE LAYER, Reality Lock, Continuity Lock, Negative Lock");
