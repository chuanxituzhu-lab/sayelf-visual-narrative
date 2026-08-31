import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDualOutputInput, buildPromptPackage, formatVideoStoryboard } from '../interfaces/api/web/prompt-output.mjs';
import { createDualOutputRuntime } from '../core/dual-output/runtime.mjs';
import { planStoryboard } from '../core/dual-output/storyboard-planner.mjs';

const singleImage = JSON.parse(fs.readFileSync(new URL('../examples/single-image/input.json', import.meta.url), 'utf8'));
const storyShot = JSON.parse(fs.readFileSync(new URL('../examples/story-sequence/shot-01.json', import.meta.url), 'utf8'));

test('single image mode exposes one independently copyable image prompt', () => {
  const result = buildPromptPackage({ spec: singleImage, compiledPrompt: 'single image prompt' });
  assert.equal(result.imagePrompts.length, 1);
  assert.equal(result.imagePrompts[0].prompt, 'single image prompt');
  assert.equal(result.videoStoryboard, null);
});

test('single image prompts carry the selected image publishing platform', () => {
  const spec = { ...singleImage, constraints: { ...singleImage.constraints, image_platform_profile: 'facebook_image' } };
  const result = buildPromptPackage({ spec, compiledPrompt: 'single image prompt' });
  assert.equal(result.imagePrompts[0].platform, 'Facebook 图片');
  assert.match(result.imagePrompts[0].title, /Facebook 图片/);
});

test('story mode turns the same dual output into one image prompt per video shot', async () => {
  const runtime = await createDualOutputRuntime();
  const dual = await runtime.execute(buildDualOutputInput({ ...storyShot, mode: 'story_sequence' }));
  const result = buildPromptPackage({ spec: { ...storyShot, mode: 'story_sequence' }, compiledPrompt: 'story base prompt', dualOutput: dual.output, planning: dual.plan });
  assert.equal(result.imagePrompts.length, dual.output.video_storyboard.shots.length);
  assert.match(result.imagePrompts[0].prompt, /故事镜头 1/);
  assert.match(result.imagePrompts[0].prompt, /story base prompt/);
  assert.match(result.videoStoryboard.prompt, /镜头 1/);
  assert.match(result.videoStoryboard.prompt, /平台策略建议/);
  assert.equal(formatVideoStoryboard(dual.output.video_storyboard, dual.plan), result.videoStoryboard.prompt);
});

test('story input preserves intent and normalizes the unsupported 4:3 storyboard ratio', () => {
  const input = buildDualOutputInput({ ...storyShot, constraints: { ...storyShot.constraints, aspect_ratio: '4:3' } });
  assert.equal(input.idea, storyShot.story.intent);
  assert.equal(input.aspect_ratio, '16:9');
  assert.equal(input.preferred_skill_id, 'visual-storytelling');
});

test('story input carries person anchors, scene strategy, and platform planning controls', () => {
  const input = buildDualOutputInput({
    ...storyShot,
    character: {
      type: 'anthropomorphic',
      identity: 'fox-guide-01',
      appearance: 'small red fox, amber eyes',
      costume: 'blue scarf'
    },
    performance: { body: 'low center of gravity, natural eyeline' },
    scene: { ...storyShot.scene, scene_mode: 'random', scene_options: ['bamboo path', 'river walk'], scene_seed: 'seed-1' },
    constraints: { ...storyShot.constraints, platform_profile: 'douyin', duration_seconds: 30 }
  });
  assert.equal(input.character_type, 'anthropomorphic');
  assert.match(input.character_anchor, /fox-guide-01/);
  assert.equal(input.scene_mode, 'random');
  assert.deepEqual(input.scene_options, ['bamboo path', 'river walk']);
  assert.equal(input.platform_profile, 'douyin');
  assert.equal(input.duration_seconds, 30);
});

test('story input defaults to automatic space continuity and passes a scene sequence', () => {
  const input = buildDualOutputInput({
    ...storyShot,
    scene: { ...storyShot.scene, scene_sequence: ['旷野', '室内', '舞台'] }
  });
  assert.equal(input.scene_mode, 'auto');
  assert.deepEqual(input.scene_sequence, ['旷野', '室内', '舞台']);
  assert.equal(input.consistency_state.space_continuity.mode, 'auto');
});

test('requested video platforms resolve to adaptive, localized planning profiles', () => {
  const platforms = ['xiaohongshu_video', 'youtube_shorts', 'instagram_reels', 'tiktok', 'douyin', 'bilibili', 'wechat_channels', 'facebook_reels', 'kuaishou'];
  for (const platform of platforms) {
    const plan = planStoryboard({ idea: 'A quiet character crosses a rainy street', platform_profile: platform, language: 'en' });
    assert.equal(plan.platform_profile, platform);
    assert.match(plan.platform_label, /[A-Za-z]/);
    assert.ok(plan.guidance.length >= 3);
    assert.ok(plan.guidance.every((item) => !/[\u4e00-\u9fff]/.test(item)));
  }
});

test('story planning metadata follows the selected output language', async () => {
  const runtime = await createDualOutputRuntime();
  const input = buildDualOutputInput({ ...storyShot, mode: 'story_sequence', constraints: { ...storyShot.constraints, platform_profile: 'bilibili' } }, 'en');
  const dual = await runtime.execute(input);
  const result = buildPromptPackage({ spec: { ...storyShot, mode: 'story_sequence' }, compiledPrompt: 'story base prompt', dualOutput: dual.output, planning: dual.plan, language: 'en' });
  assert.match(result.videoStoryboard.prompt, /Platform guidance/);
  assert.doesNotMatch(result.videoStoryboard.prompt, /平台策略建议/);
  assert.match(result.imagePrompts[0].title, /Story image/);
});
