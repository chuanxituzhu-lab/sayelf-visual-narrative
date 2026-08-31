import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { invokeHarness, listHarnesses } from '../adapters/harnesses/registry.mjs';

test('plugin registry exposes normalized capabilities without exposing secrets', async () => {
  const harnesses = await listHarnesses();
  const codex = harnesses.find((item) => item.id === 'codex');
  const apiTemplate = harnesses.find((item) => item.id === 'custom-api');
  assert.deepEqual(codex.capabilities.map((item) => item.id), ['assist', 'review', 'refine']);
  assert.equal(apiTemplate.plugin, true);
  assert.ok(apiTemplate.missing_env.includes('SAYELF_CUSTOM_API_KEY'));
  assert.equal(JSON.stringify(apiTemplate).includes('Authorization'), false);
  assert.equal(JSON.stringify(apiTemplate).includes('local-test-token'), false);
});

test('configured API plugin receives the selected capability and env-backed header', async () => {
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ capability: JSON.parse(Buffer.concat(chunks).toString()).capability, authorization: request.headers.authorization }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const tempDir = await mkdtemp(path.join(tmpdir(), 'sayelf-harness-'));
  const configPath = path.join(tempDir, 'harnesses.json');
  const previousConfig = process.env.SAYELF_HARNESS_CONFIG;
  const previousKey = process.env.SAYELF_TEST_API_KEY;
  try {
    await writeFile(configPath, JSON.stringify({ harnesses: [{
      id: 'test-api', name: 'Test API', transport: 'api', enabled: true,
      url: `http://127.0.0.1:${address.port}/assist`,
      required_env: ['SAYELF_TEST_API_KEY'],
      header_env: { Authorization: 'SAYELF_TEST_API_KEY' },
      capabilities: [{ id: 'review', name: '审阅' }]
    }] }));
    process.env.SAYELF_HARNESS_CONFIG = configPath;
    delete process.env.SAYELF_TEST_API_KEY;
    await assert.rejects(() => invokeHarness('test-api', { prompt: 'hello', capability: 'review' }), (error) => error.status === 409);
    process.env.SAYELF_TEST_API_KEY = 'local-test-token';
    const result = await invokeHarness('test-api', { prompt: 'hello', capability: 'review' });
    assert.equal(result.transport, 'api');
    assert.deepEqual(JSON.parse(result.output), { capability: 'review', authorization: 'local-test-token' });
    await assert.rejects(() => invokeHarness('test-api', { prompt: 'hello', capability: 'assist' }), (error) => error.status === 400);
  } finally {
    if (previousConfig === undefined) delete process.env.SAYELF_HARNESS_CONFIG;
    else process.env.SAYELF_HARNESS_CONFIG = previousConfig;
    if (previousKey === undefined) delete process.env.SAYELF_TEST_API_KEY;
    else process.env.SAYELF_TEST_API_KEY = previousKey;
    await new Promise((resolve) => server.close(resolve));
    await rm(tempDir, { recursive: true, force: true });
  }
});
