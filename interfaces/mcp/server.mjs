#!/usr/bin/env node
import readline from 'node:readline';
import { validateVisualSpec } from '../../core/compiler.mjs';
import { optimizeCreativeIntent } from '../../core/creative-optimizer.mjs';
import { genericProvider } from '../../adapters/providers/generic.mjs';
import { openAIProvider } from '../../adapters/providers/openai.mjs';
import { compareContinuity } from '../../core/continuity.mjs';
import { createDualOutputRuntime } from '../../core/dual-output/runtime.mjs';
import { createMediaRuntime } from '../../core/media/runtime.mjs';
import { fileURLToPath } from 'node:url';

const protocolVersion = '2025-11-25';
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const dualOutputRuntime = createDualOutputRuntime(rootDir);
const mediaRuntime = createMediaRuntime(rootDir);

const tools = [
  {
    name: 'list_visual_skills',
    description: 'List the enabled built-in and external Visual Skill plugins available to the director core.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'run_visual_skill',
    description: 'Run a routed Visual Skill and return validated synchronized image prompts plus a video storyboard.',
    inputSchema: {
      type: 'object',
      required: ['input'],
      properties: { input: { type: 'object' } }
    }
  },
  {
    name: 'optimize_creative_intent',
    description: 'Locally optimize customer creative intent into a director-ready brief while preserving the original intent and consistency locks.',
    inputSchema: {
      type: 'object',
      required: ['intent'],
      properties: { intent: { type: 'string' }, language: { enum: ['zh', 'en', 'bilingual'] }, spec: { type: 'object' } }
    }
  },
  {
    name: 'list_media_providers',
    description: 'List local and configured media providers without exposing credentials.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'submit_media_job',
    description: 'Submit a text-to-image, image-to-video, or text-to-video job to a configured provider, or receive an AI assistant fallback task.',
    inputSchema: { type: 'object', required: ['asset_type', 'mode'], properties: { asset_type: { enum: ['image', 'video'] }, mode: { enum: ['text_to_image', 'image_to_video', 'text_to_video'] }, provider_id: { type: 'string' }, prompt: { type: 'string' }, prompts: { type: 'array', items: { type: 'string' } }, options: { type: 'object' } } }
  },
  {
    name: 'get_media_job',
    description: 'Get the local state, preview URLs, and download URLs for a media job.',
    inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } }
  },
  {
    name: 'refresh_media_job',
    description: 'Poll an asynchronous media provider once and return the updated local job state.',
    inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } }
  },
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
          serverInfo: { name: 'sayelf-visual-narrative', version: '0.3.0' }
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
  if (name === 'list_visual_skills') result = (await dualOutputRuntime).listSkills();
  else if (name === 'run_visual_skill') result = await (await dualOutputRuntime).execute(args.input);
  else if (name === 'optimize_creative_intent') result = optimizeCreativeIntent(args);
  else if (name === 'list_media_providers') result = (await mediaRuntime).listProviders();
  else if (name === 'submit_media_job') result = await (await mediaRuntime).submit(args);
  else if (name === 'get_media_job') result = (await mediaRuntime).getJob(args.job_id);
  else if (name === 'refresh_media_job') result = await (await mediaRuntime).refreshJob(args.job_id);
  else if (name === 'validate_visual_spec') result = validateVisualSpec(args.spec, args.previous || null);
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
