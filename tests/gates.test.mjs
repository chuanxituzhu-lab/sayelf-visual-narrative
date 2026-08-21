import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateVisualSpec, compileCanonicalPrompt } from '../core/compiler.mjs';

const spec = JSON.parse(fs.readFileSync(new URL('../examples/single-image/input.json', import.meta.url), 'utf8'));

test('valid example passes all gates', () => {
  const result = validateVisualSpec(spec);
  assert.equal(result.status, 'PASS');
  assert.ok(result.gates.every((g) => g.status === 'PASS'));
});

test('compiler emits a canonical prompt', () => {
  const prompt = compileCanonicalPrompt(spec);
  assert.match(prompt, /Visual philosophy:/);
  assert.match(prompt, /decisive/i);
});
