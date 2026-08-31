import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { describeMediaProvider, discoverMediaProviders } from '../../adapters/media/registry.mjs';

const MEDIA_STATES = new Set(['submitted', 'processing', 'completed', 'failed', 'awaiting_assistant']);

export async function createMediaRuntime(rootDir) {
  const registry = await discoverMediaProviders(rootDir);
  const jobs = new Map();
  const assets = new Map();
  const mediaDir = path.join(rootDir, 'data', 'media');
  await mkdir(mediaDir, { recursive: true });

  return {
    listProviders() { return registry.providers.map(describeMediaProvider); },
    async submit(input = {}) {
      const request = normalizeRequest(input);
      const provider = selectProvider(registry, request);
      const job = {
        contract_version: 'media-job/1.0',
        id: `media-${randomUUID()}`,
        status: 'submitted',
        provider_id: provider.id,
        created_at: new Date().toISOString(),
        request,
        assets: [],
        message: ''
      };
      jobs.set(job.id, job);
      if (!provider.ready) {
        job.status = 'awaiting_assistant';
        job.message = 'Media provider is not configured. Use the AI assistant fallback or configure the provider locally.';
        job.assistant_prompt = request.prompts.join('\n\n');
        return publicJob(job);
      }
      try {
        const result = await provider.instance.submit({ jobId: job.id, request });
        await applyProviderResult(job, result, provider, { mediaDir, assets });
      } catch (error) {
        job.status = 'failed';
        job.message = error.message;
      }
      return publicJob(job);
    },
    getJob(id) {
      const job = jobs.get(id);
      if (!job) return null;
      return publicJob(job);
    },
    async refreshJob(id) {
      const job = jobs.get(id);
      if (!job) return null;
      if (!['submitted', 'processing'].includes(job.status)) return publicJob(job);
      const provider = registry.byId.get(job.provider_id);
      if (!provider?.instance.poll || !job.provider_job_id) return publicJob(job);
      try {
        const result = await provider.instance.poll({ jobId: job.id, providerJobId: job.provider_job_id, request: job.request });
        await applyProviderResult(job, result, provider, { mediaDir, assets });
      } catch (error) {
        job.status = 'failed';
        job.message = error.message;
      }
      return publicJob(job);
    },
    getAsset(id) {
      const asset = assets.get(id);
      return asset ? { ...asset } : null;
    }
  };
}

function normalizeRequest(input) {
  const assetType = input.asset_type || (input.mode === 'text_to_image' ? 'image' : 'video');
  const mode = input.mode || (assetType === 'image' ? 'text_to_image' : 'text_to_video');
  if (!['image', 'video'].includes(assetType)) throw new TypeError('asset_type must be image or video');
  if (!['text_to_image', 'image_to_video', 'text_to_video'].includes(mode)) throw new TypeError('unsupported media mode');
  if (assetType === 'image' && mode !== 'text_to_image') throw new TypeError('image jobs only support text_to_image');
  if (assetType === 'video' && mode === 'text_to_image') throw new TypeError('video jobs require image_to_video or text_to_video');
  const prompts = Array.isArray(input.prompts) ? input.prompts.map((prompt) => String(prompt).trim()).filter(Boolean) : [input.prompt].map((prompt) => String(prompt || '').trim()).filter(Boolean);
  if (!prompts.length) throw new TypeError('media job requires prompt or prompts');
  const count = Number.isInteger(input.count) ? input.count : prompts.length;
  if (count < 1 || count > 12) throw new TypeError('media job count must be between 1 and 12');
  return {
    provider_id: input.provider_id || input.provider || null,
    asset_type: assetType,
    mode,
    prompts,
    count,
    source_asset_ids: Array.isArray(input.source_asset_ids) ? input.source_asset_ids.map(String) : [],
    aspect_ratio: input.aspect_ratio || null,
    duration_seconds: input.duration_seconds || null,
    options: isPlainObject(input.options) ? redactObject(input.options) : {},
    metadata: isPlainObject(input.metadata) ? redactObject(input.metadata) : {}
  };
}

function selectProvider(registry, request) {
  const explicitId = request.provider_id || request.provider;
  if (explicitId) {
    const provider = registry.byId.get(explicitId);
    if (!provider) throw new Error(`Unknown media provider: ${explicitId}`);
    if (!provider.manifest.capabilities.includes(request.mode)) throw new Error(`Media provider ${explicitId} does not support ${request.mode}`);
    return provider;
  }
  return registry.providers.find((provider) => provider.ready && provider.manifest.capabilities.includes(request.mode))
    || registry.providers.find((provider) => provider.id === 'local-preview' && provider.manifest.capabilities.includes(request.mode))
    || registry.providers.find((provider) => provider.manifest.capabilities.includes(request.mode));
}

async function applyProviderResult(job, result = {}, provider, context) {
  const status = result.status || 'processing';
  if (!MEDIA_STATES.has(status)) throw new Error(`Unsupported media job state: ${status}`);
  job.status = status;
  job.message = result.message || '';
  if (result.provider_job_id) job.provider_job_id = result.provider_job_id;
  if (result.assistant_prompt) job.assistant_prompt = result.assistant_prompt;
  if (Array.isArray(result.assets)) {
    job.assets = [];
    for (const [index, asset] of result.assets.entries()) job.assets.push(await persistAsset(asset, job, provider, index, context));
  }
}

async function persistAsset(asset, job, provider, index, { mediaDir, assets }) {
  const id = `asset-${randomUUID()}`;
  const mimeType = asset.mime_type || (job.request.asset_type === 'video' ? 'video/mp4' : 'image/png');
  const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : 'png';
  let localPath = '';
  if (asset.data) {
    localPath = path.join(mediaDir, `${job.id}-${index + 1}.${extension}`);
    await writeFile(localPath, Buffer.from(asset.data, 'base64'));
  } else if (asset.local_path) {
    localPath = path.resolve(asset.local_path);
    if (!isWithin(localPath, mediaDir)) throw new Error('Provider asset path must stay inside the local media directory');
  }
  const stored = { id, type: job.request.asset_type, mime_type: mimeType, index, local_path: localPath, url: asset.url || '', file_name: `${job.id}-${index + 1}.${extension}` };
  assets.set(id, stored);
  return publicAsset(stored);
}

function publicJob(job) {
  return {
    contract_version: job.contract_version,
    id: job.id,
    status: job.status,
    provider_id: job.provider_id,
    created_at: job.created_at,
    request: job.request,
    assets: job.assets,
    message: job.message,
    assistant_prompt: job.assistant_prompt,
    provider_job_id: job.provider_job_id
  };
}

function publicAsset(asset) {
  return {
    id: asset.id,
    type: asset.type,
    mime_type: asset.mime_type,
    index: asset.index,
    file_name: asset.file_name,
    preview_url: asset.local_path ? `/v1/media/assets/${asset.id}` : asset.url || null,
    download_url: asset.local_path ? `/v1/media/assets/${asset.id}/download` : asset.url || null
  };
}

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

function redactObject(value) {
  if (Array.isArray(value)) return value.map(redactObject);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/(api[-_]?key|token|secret|authorization|password)/i.test(key)).map(([key, child]) => [key, redactObject(child)]));
}

function isWithin(filePath, directory) {
  const relative = path.relative(path.resolve(directory), path.resolve(filePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
