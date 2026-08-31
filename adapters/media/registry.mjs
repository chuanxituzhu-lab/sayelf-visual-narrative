import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertValid, loadSchemaSet } from '../../core/dual-output/schema-validator.mjs';
import { createProvider as createLocalPreviewProvider } from './local-preview.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BUILTIN_MANIFESTS = [{
  contract_version: 'media/1.0',
  id: 'local-preview',
  name: { zh: 'AI 辅助回退', en: 'AI assistant fallback' },
  version: '1.0.0',
  kind: 'media-provider',
  transport: 'local',
  capabilities: ['text_to_image', 'image_to_video', 'text_to_video'],
  plugin: { module: './local-preview.mjs', entrypoint: 'createProvider' },
  source: { label: 'Built-in local fallback; no media bytes are generated' }
}, {
  contract_version: 'media/1.0',
  id: 'openai-images',
  name: { zh: 'OpenAI 图片', en: 'OpenAI Images' },
  version: '1.0.0',
  kind: 'media-provider',
  transport: 'api',
  capabilities: ['text_to_image'],
  config: { required_env: ['OPENAI_API_KEY'] },
  plugin: { module: './openai-images.mjs', entrypoint: 'createProvider' },
  source: { label: 'OpenAI Images API adapter; key remains in the local environment' }
}];

export async function discoverMediaProviders(rootDir = DEFAULT_ROOT) {
  const schemas = await loadSchemaSet(path.join(rootDir, 'schemas'));
  const registryPath = path.join(rootDir, 'config', 'media-providers.json');
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  assertValid(registry, schemas.get('media/1.0/providers-registry'), schemas, 'media providers registry');
  const providers = [];
  const seenIds = new Set();

  for (const manifest of BUILTIN_MANIFESTS) {
    assertValid(manifest, schemas.get('media/1.0/provider-manifest'), schemas, `${manifest.id} manifest`);
    await loadProvider({ manifest, manifestPath: path.join(rootDir, 'adapters', 'media', manifest.id === 'local-preview' ? 'local-preview.mjs' : 'openai-images.mjs'), origin: 'builtin', priority: manifest.id === 'local-preview' ? 0 : 20, rootDir, schemas, providers, seenIds });
  }

  for (const entry of registry.providers.filter((item) => item.enabled)) {
    const manifestPath = path.resolve(rootDir, 'config', entry.manifest);
    await loadProvider({ manifest: null, manifestPath, origin: 'configured', priority: entry.priority, rootDir, schemas, providers, seenIds, expectedId: entry.id });
  }
  for (const directoryPath of registry.provider_directories || []) {
    const directory = path.resolve(path.dirname(registryPath), directoryPath);
    for (const entry of await discoverPluginEntries(directory)) {
      await loadProvider({ manifest: null, manifestPath: entry.manifestPath, origin: 'plugin', priority: entry.priority, rootDir, schemas, providers, seenIds, expectedId: entry.id });
    }
  }

  return { rootDir, registry, providers: providers.sort((left, right) => right.priority - left.priority), byId: new Map(providers.map((provider) => [provider.id, provider])) };
}

export function describeMediaProvider(provider) {
  return {
    id: provider.id,
    name: provider.manifest.name,
    version: provider.manifest.version,
    transport: provider.manifest.transport || provider.instance.transport || 'local',
    capabilities: provider.manifest.capabilities,
    origin: provider.origin,
    configured: provider.configured,
    ready: provider.ready,
    status: provider.ready ? 'ready' : provider.configured ? 'fallback_only' : 'configuration_required',
    missing_env: provider.missingEnv,
    source: provider.manifest.source
  };
}

async function discoverPluginEntries(directory) {
  try { await access(directory); } catch { return []; }
  const entries = [];
  const children = (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
  for (const child of children) {
    if (!child.isDirectory()) continue;
    const manifestPath = path.join(directory, child.name, 'manifest.json');
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      entries.push({ id: manifest.id, manifestPath, priority: Number.isInteger(manifest.priority) ? manifest.priority : 50 });
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Unable to load media provider ${manifestPath}: ${error.message}`);
    }
  }
  return entries;
}

async function loadProvider({ manifest, manifestPath, origin, priority, rootDir, schemas, providers, seenIds, expectedId }) {
  if (!manifest) manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assertValid(manifest, schemas.get('media/1.0/provider-manifest'), schemas, `${manifest.id} manifest`);
  if (expectedId && manifest.id !== expectedId) throw new Error(`Registry id ${expectedId} does not match manifest id ${manifest.id}`);
  if (seenIds.has(manifest.id)) throw new Error(`Duplicate enabled media provider id: ${manifest.id}`);
  seenIds.add(manifest.id);
  const modulePath = path.resolve(path.dirname(manifestPath), manifest.plugin.module);
  const plugin = await import(`${pathToFileURL(modulePath).href}?provider=${manifest.id}`);
  const factory = plugin[manifest.plugin.entrypoint];
  if (typeof factory !== 'function') throw new Error(`${manifest.id} must export ${manifest.plugin.entrypoint}()`);
  const instance = await factory({ rootDir, manifest });
  const requiredEnv = manifest.config?.required_env || [];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  const configured = instance.configured !== undefined ? Boolean(instance.configured) : missingEnv.length === 0;
  const ready = instance.ready !== undefined ? Boolean(instance.ready) : configured;
  providers.push({ id: manifest.id, priority, manifest, instance, origin, configured, ready, missingEnv });
}
