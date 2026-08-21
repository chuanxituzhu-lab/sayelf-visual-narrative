#!/usr/bin/env node
import http from 'node:http';
import { validateVisualSpec } from '../../core/compiler.mjs';
import { genericProvider } from '../../adapters/providers/generic.mjs';
import { openAIProvider } from '../../adapters/providers/openai.mjs';
import { compareContinuity } from '../../core/continuity.mjs';

const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || '127.0.0.1';
const maxBodyBytes = Number(process.env.SAYELF_MAX_BODY_BYTES || 2_000_000);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true, service: 'sayelf-visual-narrative', version: '0.2.0' });
    }

    if (req.method !== 'POST') return json(res, 404, { error: 'not_found' });
    const body = await readJson(req, maxBodyBytes);

    if (req.url === '/v1/validate') {
      return json(res, 200, validateVisualSpec(body.spec, body.previous || null));
    }

    if (req.url === '/v1/continuity') {
      return json(res, 200, compareContinuity(body.previous || null, body.spec));
    }

    if (req.url === '/v1/compile') {
      const provider = body.provider === 'openai' ? openAIProvider : genericProvider;
      return json(res, 200, provider.compile(body.spec, body.options || {}));
    }

    if (req.url === '/v1/generate') {
      if (body.provider !== 'openai') {
        return json(res, 400, { error: 'unsupported_provider', supported: ['openai'] });
      }
      const result = await openAIProvider.generate(body.spec, body.options || {});
      return json(res, 200, sanitizeGeneration(result));
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
    images: result.images.map(({ index, url, b64_json }) => ({ index, url, has_base64: Boolean(b64_json) })),
    usage: result.usage
  };
}
