import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareContinuity } from '../core/continuity.mjs';
import { validateVisualSpec } from '../core/compiler.mjs';

const shot1 = JSON.parse(fs.readFileSync(new URL('../examples/story-sequence/shot-01.json', import.meta.url), 'utf8'));
const shot2 = JSON.parse(fs.readFileSync(new URL('../examples/story-sequence/shot-02.json', import.meta.url), 'utf8'));

test('story sequence retains story-level continuity while shot state changes', () => {
  assert.equal(validateVisualSpec(shot1).status, 'PASS');
  assert.equal(validateVisualSpec(shot2, shot1).status, 'PASS');
  assert.equal(compareContinuity(shot1, shot2).status, 'PASS');
  assert.notEqual(shot1.scene.decisive_moment, shot2.scene.decisive_moment);
  assert.notEqual(shot1.camera.shot_size, shot2.camera.shot_size);
});

test('continuity gate catches character identity drift', () => {
  const drifted = structuredClone(shot2);
  drifted.character.identity = 'elderly-man-99';
  const report = compareContinuity(shot1, drifted);
  assert.equal(report.status, 'REVISE');
  assert.ok(report.drifts.some((item) => item.path === 'character.identity'));
});
