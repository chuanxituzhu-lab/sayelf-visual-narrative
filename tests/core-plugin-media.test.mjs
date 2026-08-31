import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDualOutputInput } from '../interfaces/api/web/prompt-output.mjs';
import { createDualOutputRuntime } from '../core/dual-output/runtime.mjs';
import { createMediaRuntime } from '../core/media/runtime.mjs';
import { discoverSkills } from '../core/dual-output/registry.mjs';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const storyShot = JSON.parse(fs.readFileSync(new URL('../examples/story-sequence/shot-01.json', import.meta.url), 'utf8'));

test('core output package keeps image prompts and video shots one-to-one', async () => {
  const runtime = await createDualOutputRuntime(rootDir);
  const input = buildDualOutputInput({ ...storyShot, mode: 'story_sequence' });
  const result = await runtime.execute(input);
  assert.equal(result.output_package.counts.matched, true);
  assert.equal(result.output_package.image_prompts.length, result.output_package.video_storyboard.shots.length);
  result.output_package.image_prompts.forEach((image, index) => {
    assert.equal(image.order, result.output_package.video_storyboard.shots[index].order);
    assert.equal(image.shot_id, result.output_package.video_storyboard.shots[index].id);
  });
});

test('media runtime exposes local fallback and never requires a credential', async () => {
  const runtime = await createMediaRuntime(rootDir);
  const providers = runtime.listProviders();
  const fallback = providers.find((provider) => provider.id === 'local-preview');
  assert.equal(fallback.status, 'fallback_only');
  assert.deepEqual(fallback.missing_env, []);
  const job = await runtime.submit({ provider_id: 'local-preview', asset_type: 'image', mode: 'text_to_image', prompts: ['image one', 'image two'], count: 2, options: { model: 'safe', apiKey: 'should-not-appear' } });
  assert.equal(job.status, 'awaiting_assistant');
  assert.equal(job.request.prompts.length, 2);
  assert.match(job.assistant_prompt, /image one/);
  assert.equal(job.request.options.apiKey, undefined);
  assert.doesNotMatch(JSON.stringify(job), /OPENAI_API_KEY/);
});

test('visual Skill registry discovers an external plugin directory without core edits', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'sayelf-visual-skill-'));
  try {
    await cp(path.join(rootDir, 'schemas'), path.join(tempRoot, 'schemas'), { recursive: true });
    await mkdir(path.join(tempRoot, 'skills'), { recursive: true });
    await mkdir(path.join(tempRoot, 'plugins', 'visual-skills', 'external-test'), { recursive: true });
    await writeFile(path.join(tempRoot, 'skills', 'registry.json'), JSON.stringify({
      contract_version: 'dual-output/1.0',
      plugin_directories: ['../plugins/visual-skills'],
      skills: [{ id: 'disabled-example', manifest: './disabled.json', enabled: false, priority: 0 }]
    }));
    await writeFile(path.join(tempRoot, 'plugins', 'visual-skills', 'external-test', 'manifest.json'), JSON.stringify({
      contract_version: 'dual-output/1.0', id: 'external-test', name: { zh: '外部测试', en: 'External test' }, version: '1.0.0', kind: 'visual-narrative-skill', capabilities: ['image_prompt', 'video_storyboard'], input: { required: ['idea'], optional: [] }, router: { tags: ['external'], examples: ['external example'] }, plugin: { module: './plugin.mjs', entrypoint: 'execute' }, source: { label: 'local test plugin' }
    }));
    await writeFile(path.join(tempRoot, 'plugins', 'visual-skills', 'external-test', 'plugin.mjs'), 'export function execute() { return null; }');
    const registry = await discoverSkills(tempRoot);
    assert.equal(registry.skills[0].id, 'external-test');
    assert.equal(registry.skills[0].origin, 'plugin');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
