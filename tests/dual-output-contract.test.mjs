import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDualOutputRuntime, validateDualOutput } from '../core/dual-output/runtime.mjs';
import { loadSchemaSet, validateAgainstSchema } from '../core/dual-output/schema-validator.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('discovers and validates the two registered Dual Output Skills', async () => {
  const runtime = await createDualOutputRuntime(root);
  assert.deepEqual(runtime.registry.skills.map((skill) => skill.id), ['life-comes-closer', 'visual-storytelling']);
  for (const skill of runtime.registry.skills) {
    assert.equal(skill.manifest.contract_version, 'dual-output/1.0');
    assert.deepEqual([...skill.manifest.capabilities].sort(), ['image_prompt', 'video_storyboard']);
  }
});

test('routes and executes Life Comes Closer into one same-source dual output', async () => {
  const runtime = await createDualOutputRuntime(root);
  const result = await runtime.execute({ idea: '动物主动靠近人的信任瞬间' });
  assert.equal(result.route.selectedSkillId, 'life-comes-closer');
  assert.equal(result.validation.valid, true);
  assert.equal(result.output.image_prompt.narrative_core_id, result.output.narrative_core.id);
  assert.equal(result.output.video_storyboard.narrative_core_id, result.output.narrative_core.id);
  assert.equal(result.output.video_storyboard.shots.length, 3);
});

test('executes the migrated Visual Storytelling Skill through the same contract', async () => {
  const runtime = await createDualOutputRuntime(root);
  const result = await runtime.execute({ idea: '一束光穿过窗缝，表达放下', preferred_skill_id: 'visual-storytelling', duration_seconds: 12 });
  assert.equal(result.route.selectedSkillId, 'visual-storytelling');
  assert.equal(result.validation.valid, true);
  assert.equal(result.output.video_storyboard.duration_seconds, 12);
});

test('rejects split Narrative Cores and duration drift', async () => {
  const runtime = await createDualOutputRuntime(root);
  const result = await runtime.execute({ idea: '人与自然相遇' });
  const invalid = structuredClone(result.output);
  invalid.image_prompt.narrative_core_id = 'different-core';
  invalid.video_storyboard.shots[0].duration_seconds += 1;
  const schemas = await loadSchemaSet(path.join(root, 'schemas'));
  const validation = validateDualOutput(invalid, schemas);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('narrative_core_id')));
  assert.ok(validation.errors.some((error) => error.includes('sum of shot durations')));
});

test('manifest schema rejects a Skill that does not declare both outputs', async () => {
  const schemas = await loadSchemaSet(path.join(root, 'schemas'));
  const invalid = {
    contract_version: 'dual-output/1.0', id: 'broken-skill', name: { zh: '坏 Skill', en: 'Broken Skill' }, version: '1.0.0', kind: 'visual-narrative-skill',
    capabilities: ['image_prompt'], input: { required: ['idea'], optional: [] }, router: { tags: ['broken'], examples: ['broken'] },
    plugin: { module: './plugin.mjs', entrypoint: 'execute' }, source: { label: 'test' }
  };
  const result = validateAgainstSchema(invalid, schemas.get('dual-output/1.0/skill-manifest'), schemas);
  assert.equal(result.valid, false);
});
