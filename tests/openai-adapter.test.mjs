import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openAIProvider, aspectRatioToSize } from '../adapters/providers/openai.mjs';

const spec = JSON.parse(fs.readFileSync(new URL('../examples/single-image/input.json', import.meta.url), 'utf8'));

test('OpenAI adapter compiles a provider-ready request without network access', () => {
  const compiled = openAIProvider.compile(spec, { model: 'gpt-image-2' });
  assert.equal(compiled.provider, 'openai');
  assert.equal(compiled.request.model, 'gpt-image-2');
  assert.equal(compiled.request.size, '1024x1536');
  assert.match(compiled.request.prompt, /Decisive moment:/);
});

test('aspect ratios map to supported orientation sizes', () => {
  assert.equal(aspectRatioToSize('9:16'), '1024x1536');
  assert.equal(aspectRatioToSize('16:9'), '1536x1024');
  assert.equal(aspectRatioToSize('1:1'), '1024x1024');
});
