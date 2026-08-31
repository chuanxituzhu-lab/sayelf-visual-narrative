#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVisualSpec } from '../../core/compiler.mjs';
import { optimizeCreativeIntent } from '../../core/creative-optimizer.mjs';
import { compareContinuity } from '../../core/continuity.mjs';
import { genericProvider } from '../../adapters/providers/generic.mjs';
import { openAIProvider } from '../../adapters/providers/openai.mjs';
import { createDualOutputRuntime } from '../../core/dual-output/runtime.mjs';
import { createMediaRuntime } from '../../core/media/runtime.mjs';

const [, , command, inputPath, ...rest] = process.argv;
if (!command) usage(1);

if (command === 'skills') {
  console.log(JSON.stringify((await createDualOutputRuntime(fileURLToPath(new URL('../../', import.meta.url)))).listSkills(), null, 2));
  process.exit(0);
}

if (command === 'providers') {
  console.log(JSON.stringify((await createMediaRuntime(fileURLToPath(new URL('../../', import.meta.url)))).listProviders(), null, 2));
  process.exit(0);
}

if (!inputPath) usage(1);

const spec = readJson(inputPath);
const flags = parseFlags(rest);

if (command === 'validate') {
  const previous = flags.previous ? readJson(flags.previous) : null;
  console.log(JSON.stringify(validateVisualSpec(spec, previous), null, 2));
  process.exit(0);
}

if (command === 'continuity') {
  if (!flags.previous) fail('--previous <file> is required for continuity');
  console.log(JSON.stringify(compareContinuity(readJson(flags.previous), spec), null, 2));
  process.exit(0);
}

if (command === 'compile') {
  const provider = flags.provider === 'openai' ? openAIProvider : genericProvider;
  try {
    console.log(JSON.stringify(provider.compile(spec, flags), null, 2));
  } catch (error) {
    console.error(JSON.stringify(error.validation || { error: error.message }, null, 2));
    process.exit(2);
  }
  process.exit(0);
}

if (command === 'run') {
  try {
    const runtime = await createDualOutputRuntime(fileURLToPath(new URL('../../', import.meta.url)));
    console.log(JSON.stringify(await runtime.execute(spec), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message, validation: error.validation }, null, 2));
    process.exit(2);
  }
  process.exit(0);
}

if (command === 'optimize') {
  try {
    console.log(JSON.stringify(optimizeCreativeIntent({ intent: spec.story?.intent || spec.intent, language: flags.language || 'zh', spec }), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(2);
  }
  process.exit(0);
}

if (command === 'generate') {
  if ((flags.provider || 'openai') !== 'openai') fail('generate currently supports --provider openai only');
  try {
    const result = await openAIProvider.generate(spec, flags);
    const outputDir = path.resolve(process.cwd(), flags.output || 'output');
    fs.mkdirSync(outputDir, { recursive: true });
    const files = [];
    for (const image of result.images) {
      if (!image.b64_json) continue;
      const ext = flags.outputFormat || 'png';
      const file = path.join(outputDir, `image-${image.index + 1}.${ext}`);
      fs.writeFileSync(file, Buffer.from(image.b64_json, 'base64'));
      files.push(file);
    }
    console.log(JSON.stringify({ provider: result.provider, model: result.model, files, usage: result.usage }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message, status: error.status }, null, 2));
    process.exit(2);
  }
  process.exit(0);
}

usage(1);

function readJson(file) {
  const resolved = path.resolve(process.cwd(), file);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function parseFlags(args) {
  const values = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = args[i + 1];
    if (!next || next.startsWith('--')) values[key] = true;
    else {
      values[key] = next;
      i += 1;
    }
  }
  if (values.n) values.n = Number(values.n);
  return values;
}

function fail(message) {
  console.error(message);
  usage(1);
}

function usage(code = 0) {
  const script = path.basename(fileURLToPath(import.meta.url));
  console.log(`Usage:\n  node ${script} skills\n  node ${script} providers\n  node ${script} validate <visual-spec.json> [--previous previous.json]\n  node ${script} continuity <visual-spec.json> --previous previous.json\n  node ${script} compile <visual-spec.json> [--provider generic|openai] [--model MODEL]\n  node ${script} optimize <visual-spec.json> [--language zh|en|bilingual]\n  node ${script} run <visual-input.json>\n  node ${script} generate <visual-spec.json> --provider openai [--output DIR] [--model MODEL]`);
  process.exit(code);
}
