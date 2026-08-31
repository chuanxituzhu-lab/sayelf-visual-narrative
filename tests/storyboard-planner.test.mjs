import test from 'node:test';
import assert from 'node:assert/strict';
import { planStoryboard } from '../core/dual-output/storyboard-planner.mjs';
import { createDualOutputRuntime } from '../core/dual-output/runtime.mjs';

test('storyboard shot count adapts to duration and narrative complexity', () => {
  const short = planStoryboard({ idea: '一个人回头', duration_seconds: 6 });
  const long = planStoryboard({
    idea: '一个人先在旧屋门口犹豫，然后走进房间，发现童年留下的痕迹，但是没有马上触碰，最终接受时间并离开',
    emotion: '从犹豫到发现再到接受',
    duration_seconds: 36
  });
  assert.equal(short.shot_count, 2);
  assert.ok(long.shot_count > short.shot_count);
  assert.ok(long.shot_count <= 6);
  assert.equal(long.shots.reduce((total, shot) => total + shot.duration_seconds, 0), 36);
});

test('random scene selection is deterministic for a seed and uses the candidate pool', () => {
  const candidates = ['旧屋走廊', '河岸步道', '清晨街角'];
  const selections = ['seed-a', 'seed-b', 'seed-c', 'seed-d'].map((scene_seed) => planStoryboard({ idea: '寻找记忆', scene_mode: 'random', scene_options: candidates, scene_seed }).scene.selected);
  assert.ok(selections.every((scene) => candidates.includes(scene)));
  assert.equal(planStoryboard({ idea: '寻找记忆', scene_mode: 'random', scene_options: candidates, scene_seed: 'seed-a' }).scene.selected, selections[0]);
  assert.ok(new Set(selections).size > 1);
});

test('auto scene flow switches spaces without treating them as continuity drift', () => {
  const plan = planStoryboard({
    idea: '从旷野到室内，然后登上舞台',
    scene_mode: 'auto',
    scene_options: ['旷野', '室内', '舞台'],
    duration_seconds: 60
  });
  assert.deepEqual(plan.scene.sequence, ['旷野', '室内', '舞台']);
  assert.equal(plan.scene.transitions.length, 2);
  assert.deepEqual(plan.shots.map((shot) => shot.scene), ['旷野', '旷野', '室内', '室内', '舞台', '舞台']);
  assert.ok(plan.shots.some((shot) => shot.space_transition));
});

test('person and anthropomorphic character continuity reaches every generated shot', async () => {
  const runtime = await createDualOutputRuntime();
  const result = await runtime.execute({
    idea: '拟人化狐狸在雨后寻找回家的路',
    character_anchor: '拟人化狐狸，橙色毛发，蓝色外套，左耳缺口',
    character_type: 'anthropomorphic',
    performance_anchor: '右手提灯，步幅小，视线沿着路标移动',
    action_anchor: '狐狸抬头确认门牌后推开木门',
    scene_mode: 'random',
    scene_options: ['旧屋门口', '林间小路'],
    scene_seed: 'fox-01',
    duration_seconds: 24
  });
  assert.equal(result.validation.valid, true);
  assert.equal(result.plan.scene.mode, 'random');
  assert.equal(result.output.video_storyboard.shots.length, result.plan.shot_count);
  for (const shot of result.output.video_storyboard.shots) {
    assert.match(shot.continuity, /拟人化狐狸，橙色毛发，蓝色外套，左耳缺口/);
    assert.match(shot.continuity, /同一空间内|动作从上一镜头|主体从上一镜头/);
  }
});
