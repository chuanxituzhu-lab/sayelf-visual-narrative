#!/usr/bin/env node
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVisualSpec } from '../../core/compiler.mjs';
import { optimizeCreativeIntent } from '../../core/creative-optimizer.mjs';
import { createDualOutputRuntime } from '../../core/dual-output/runtime.mjs';
import { createMediaRuntime } from '../../core/media/runtime.mjs';
import { genericProvider } from '../../adapters/providers/generic.mjs';
import { openAIProvider } from '../../adapters/providers/openai.mjs';
import { compareContinuity } from '../../core/continuity.mjs';
import { confirmHarness, connectHarness, invokeHarness, listHarnesses } from '../../adapters/harnesses/registry.mjs';
import { attachRealtimeEvents, createRealtimeSession, sendRealtimeMessage } from './realtime.mjs';

const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || '127.0.0.1';
const maxBodyBytes = Number(process.env.SAYELF_MAX_BODY_BYTES || 2_000_000);
const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, 'web');
const examplePath = join(here, '..', '..', 'examples', 'single-image', 'input.json');
const dualOutputRuntime = createDualOutputRuntime(join(here, '..', '..'));
const mediaRuntime = createMediaRuntime(join(here, '..', '..'));
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']]
  ,['/harness.css', ['harness.css', 'text/css; charset=utf-8']]
  ,['/director.css', ['director.css', 'text/css; charset=utf-8']]
  ,['/prompt-output.mjs', ['prompt-output.mjs', 'text/javascript; charset=utf-8']]
  ,['/modules/local-state.mjs', ['modules/local-state.mjs', 'text/javascript; charset=utf-8']]
]);
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true, service: 'sayelf-visual-narrative', version: '0.3.0' });
    }

    if (req.method === 'GET' && req.url === '/v1/example') {
      return send(res, 200, await readFile(examplePath), 'application/json; charset=utf-8');
    }

    if (req.method === 'GET' && req.url === '/v1/harnesses') {
      return json(res, 200, { harnesses: await listHarnesses() });
    }

    if (req.method === 'GET' && req.url === '/v1/skills') {
      return json(res, 200, { skills: (await dualOutputRuntime).listSkills() });
    }

    if (req.method === 'GET' && req.url === '/v1/media/providers') {
      return json(res, 200, { providers: (await mediaRuntime).listProviders() });
    }

    if (req.method === 'GET' && req.url.startsWith('/v1/media/jobs/')) {
      const id = req.url.split('/')[4];
      const result = (await mediaRuntime).getJob(id);
      return result ? json(res, 200, result) : json(res, 404, { error: 'media_job_not_found' });
    }

    if (req.method === 'GET' && req.url.startsWith('/v1/media/assets/')) {
      return serveAsset(req, res, await mediaRuntime);
    }

    if (req.method === 'GET' && req.url.startsWith('/v1/realtime/') && req.url.endsWith('/events')) {
      return attachRealtimeEvents(req.url.split('/')[3], res);
    }

    if (req.method === 'GET' && staticFiles.has(req.url)) {
      const [file, type] = staticFiles.get(req.url);
      return send(res, 200, await readFile(join(webRoot, file)), type);
    }

    if (req.method !== 'POST') return json(res, 404, { error: 'not_found' });
    const body = await readJson(req, maxBodyBytes);

    if (req.url === '/v1/realtime/session') return json(res, 200, createRealtimeSession());
    if (req.url.startsWith('/v1/realtime/session/') && req.url.endsWith('/send')) {
      sendRealtimeMessage(req.url.split('/')[3], body.message);
      return json(res, 202, { ok: true });
    }

    if (req.url === '/v1/validate') {
      return json(res, 200, validateVisualSpec(body.spec, body.previous || null));
    }

    if (req.url === '/v1/optimize') {
      return json(res, 200, optimizeCreativeIntent({
        intent: body.intent || body.spec?.story?.intent,
        language: body.language || 'zh',
        spec: body.spec || null
      }));
    }

    if (req.url === '/v1/continuity') {
      return json(res, 200, compareContinuity(body.previous || null, body.spec));
    }

    if (req.url === '/v1/compile') {
      const provider = body.provider === 'openai' ? openAIProvider : genericProvider;
      return json(res, 200, provider.compile(body.spec, { ...(body.options || {}), language: body.language || body.options?.language || 'en' }));
    }

    if (req.url === '/v1/dual-output') {
      const result = await (await dualOutputRuntime).execute(body.input);
      return json(res, 200, result);
    }

    if (req.url === '/v1/media/jobs') {
      return json(res, 200, await (await mediaRuntime).submit(body));
    }

    if (req.url.startsWith('/v1/media/jobs/') && req.url.endsWith('/refresh')) {
      const id = req.url.split('/')[4];
      const result = await (await mediaRuntime).refreshJob(id);
      return result ? json(res, 200, result) : json(res, 404, { error: 'media_job_not_found' });
    }

    if (req.url === '/v1/generate') {
      if (body.provider !== 'openai') {
        return json(res, 400, { error: 'unsupported_provider', supported: ['openai'] });
      }
      const { apiKey: _ignoredApiKey, ...safeOptions } = body.options || {};
      const result = await openAIProvider.generate(body.spec, { ...safeOptions, language: body.language || body.options?.language || 'en' });
      return json(res, 200, sanitizeGeneration(result));
    }

    if (req.url === '/v1/harness/run') {
      return json(res, 200, await invokeHarness(body.harness, body.input));
    }

    if (req.url === '/v1/harness/connect') {
      return json(res, 200, await connectHarness(body.harness));
    }

    if (req.url === '/v1/harness/confirm') {
      return json(res, 200, await confirmHarness(body.harness));
    }

    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    const status = error.code === 'BODY_TOO_LARGE' ? 413 : error instanceof SyntaxError ? 400 : error.status || 500;
    json(res, status, {
      error: error.message,
      validation: error.validation,
      details: error.payload?.error ? { type: error.payload.error.type, code: error.payload.error.code } : undefined
    });
  }
});

server.listen(port, host, () => {
  console.error(`sayelf-visual-narrative API listening on http://${host}:${port}`);
});

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function send(res, status, payload, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
}

async function readJson(req, limit) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) {
      const error = new Error('request body too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sanitizeGeneration(result) {
  return {
    provider: result.provider,
    model: result.model,
    request: result.request,
    images: result.images.map(({ index, url, b64_json }) => ({
      index,
      url,
      preview: url || (b64_json ? `data:image/png;base64,${b64_json}` : undefined),
      has_base64: Boolean(b64_json)
    })),
    usage: result.usage
  };
}

async function serveAsset(req, res, media) {
  const parts = req.url.split('/');
  const assetId = parts[4];
  const asset = media.getAsset(assetId);
  if (!asset) return json(res, 404, { error: 'media_asset_not_found' });
  if (!asset.local_path) return json(res, 404, { error: 'media_asset_is_remote', url: asset.url });
  const payload = await readFile(asset.local_path);
  const disposition = parts[5] === 'download' ? `attachment; filename="${asset.file_name}"` : 'inline';
  res.writeHead(200, {
    'Content-Type': asset.mime_type,
    'Content-Length': payload.length,
    'Content-Disposition': disposition,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
}
