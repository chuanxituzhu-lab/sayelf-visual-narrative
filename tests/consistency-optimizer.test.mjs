import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConsistencyState, consistencyPrompt } from '../core/consistency-state.mjs';
import { optimizeCreativeIntent } from '../core/creative-optimizer.mjs';
import { compareContinuity } from '../core/continuity.mjs';
import { createDualOutputRuntime } from '../core/dual-output/runtime.mjs';

test('builds one reusable consistency base for products and people', () => {
  const state = buildConsistencyState({
    consistency: {
      product: { identity: 'A01 camera', appearance: 'silver compact body', material: 'brushed aluminum' },
      characters: [{ id: 'fox-01', type: 'anthropomorphic', identity: 'red fox courier', appearance: 'amber eyes', costume: 'navy coat' }],
      style: { medium: 'cinematic still' }
    }
  });
  assert.equal(state.product.identity, 'A01 camera');
  assert.equal(state.characters[0].identity, 'red fox courier');
  assert.deepEqual(state.locked_layers, ['product', 'characters', 'style', 'camera', 'narrative']);
  assert.match(consistencyPrompt(state), /A01 camera/);
});

test('passes consistency state through every story output', async () => {
  const runtime = await createDualOutputRuntime();
  const result = await runtime.execute({
    idea: '产品在雨后被递到人物手中',
    preferred_skill_id: 'visual-storytelling',
    product_anchor: 'A01 camera',
    character_anchor: 'red fox courier',
    character_type: 'anthropomorphic'
  });
  assert.equal(result.consistency_state.product.identity, 'A01 camera');
  assert.equal(result.consistency_state.characters[0].identity, 'red fox courier');
  assert.match(result.output.image_prompt.prompt, /A01 camera/);
  assert.match(result.output.video_storyboard.continuity_anchor, /A01 camera/);
  assert.equal(result.output_package.counts.matched, true);
});

test('reports product and character drift as continuity revision', () => {
  const previous = { consistency: { product: { identity: 'A01' }, characters: [{ id: 'p1', identity: 'fox' }] } };
  const current = { consistency: { product: { identity: 'B02' }, characters: [{ id: 'p1', identity: 'wolf' }] } };
  const result = compareContinuity(previous, current);
  assert.equal(result.status, 'REVISE');
  assert.ok(result.drifts.some((drift) => drift.path === 'consistency.product'));
  assert.ok(result.drifts.some((drift) => drift.path === 'consistency.characters'));
});

test('one-click optimization preserves the customer intent and does not invent anchors', () => {
  const original = '一只猫在雨后的窗边等主人回家';
  const result = optimizeCreativeIntent({ intent: original, spec: { consistency: { product: { identity: 'A01' } } } });
  assert.equal(result.original_intent, original);
  assert.match(result.optimized_intent, /一只猫在雨后的窗边等主人回家/);
  assert.match(result.optimized_intent, /A01/);
  assert.equal(result.contract_version, 'creative-optimization/1.0');
  assert.deepEqual(result.changes.slice(0, 2), ['preserved_customer_intent', 'focused_on_one_decisive_visual_event']);
});
