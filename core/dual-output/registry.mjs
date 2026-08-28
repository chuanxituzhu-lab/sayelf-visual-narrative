import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertValid, loadSchemaSet } from './schema-validator.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('../../', import.meta.url));

export async function discoverSkills(rootDir = DEFAULT_ROOT) {
  const schemas = await loadSchemaSet(path.join(rootDir, 'schemas'));
  const registryPath = path.join(rootDir, 'skills', 'registry.json');
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  assertValid(registry, schemas.get('dual-output/1.0/skills-registry'), schemas, 'skills registry');

  const skills = [];
  const seenIds = new Set();
  for (const entry of registry.skills.filter((item) => item.enabled)) {
    if (seenIds.has(entry.id)) throw new Error(`Duplicate enabled Skill id: ${entry.id}`);
    seenIds.add(entry.id);
    const manifestPath = path.resolve(rootDir, 'skills', entry.manifest);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assertValid(manifest, schemas.get('dual-output/1.0/skill-manifest'), schemas, `${entry.id} manifest`);
    if (manifest.id !== entry.id) throw new Error(`Registry id ${entry.id} does not match manifest id ${manifest.id}`);
    const modulePath = path.resolve(path.dirname(manifestPath), manifest.plugin.module);
    const plugin = await import(`${pathToFileURL(modulePath).href}?skill=${manifest.id}`);
    const execute = plugin[manifest.plugin.entrypoint];
    if (typeof execute !== 'function') throw new Error(`${manifest.id} must export ${manifest.plugin.entrypoint}()`);
    skills.push({ id: manifest.id, priority: entry.priority, manifest, execute });
  }
  return { rootDir, registry, skills, byId: new Map(skills.map((skill) => [skill.id, skill])) };
}
