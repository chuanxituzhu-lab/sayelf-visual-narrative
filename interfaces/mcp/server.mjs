#!/usr/bin/env node
import readline from 'node:readline';
import { validateVisualSpec } from '../../core/compiler.mjs';
import { genericProvider } from '../../adapters/providers/generic.mjs';
import { openAIProvider } from '../../adapters/providers/openai.mjs';
import { compareContinuity } from '../../core/continuity.mjs';

const protocolVersion = '2025-11-25';
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

const tools = [
  {
    name: 'validate_visual_spec',
    description: 'Validate a VisualSpec through director, art-direction, and continuity gates.',
    inputSchema: {
      type: 'object',
      required: ['spec'],
      properties: { spec: { type: 'object' }, previous: { type: ['object', 'null'] } }
    }
  },
  {
    name: 'compile_visual_prompt',
    description: 'Compile a validated VisualSpec into a provider-ready image prompt/request without generating an image.',
    inputSchema: {
      type: 'object',
      required: ['spec'],
      properties: {
        spec: { type: 'object' },
        provider: { enum: ['generic', 'openai'] },
        options: { type: 'object' }
      }
    }
  },
  {
    name: 'check_continuity',
    description: 'Compare the current shot with a previous shot and report story-level continuity drift.',
    inputSchema: {
      type: 'object',
      required: ['previous', 'spec'],
      properties: { previous: { type: 'object' }, spec: { type: 'object' } }
    }
  },
  {
    name: 'generate_openai_image',
    description: 'Generate an image using the OpenAI Images API. Requires OPENAI_API_KEY in the server environment.',
    inputSchema: {
      type: 'object',
      required: ['spec'],
      properties: { spec: { type: 'object' }, options: { type: 'object' } }
    }
  }
];

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return writeError(null, -32700, 'Parse error');
  }

  if (!Object.prototype.hasOwnProperty.call(message, 'id')) return;

  try {
    switch (message.method) {
      case 'initialize':
        return writeResult(message.id, {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: 'sayelf-visual-narrative', version: '0.2.0' }
        });
      case 'tools/list':
        return writeResult(message.id, { tools });
      case 'tools/call':
        return writeResult(message.id, await callTool(message.params?.name, message.params?.arguments || {}));
      case 'ping':
        return writeResult(message.id, {});
      default:
        return writeError(message.id, -32601, `Method not found: ${message.method}`);
    }
  } catch (error) {
    return writeResult(message.id, {
      content: [{ type: 'text', text: JSON.stringify({ error: error.message, validation: error.validation }) }],
      isError: true
    });
  }
});

async function callTool(name, args) {
  let result;
  if (name === 'validate_visual_spec') result = validateVisualSpec(args.spec, args.previous || null);
  else if (name === 'compile_visual_prompt') {
    const provider = args.provider === 'openai' ? openAIProvider : genericProvider;
    result = provider.compile(args.spec, args.options || {});
  } else if (name === 'check_continuity') result = compareContinuity(args.previous, args.spec);
  else if (name === 'generate_openai_image') {
    const generated = await openAIProvider.generate(args.spec, args.options || {});
    result = {
      provider: generated.provider,
      model: generated.model,
      images: generated.images.map(({ index, url, b64_json }) => ({ index, url, has_base64: Boolean(b64_json) })),
      usage: generated.usage
    };
  } else throw new Error(`Unknown tool: ${name}`);

  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

function writeResult(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function writeError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}
