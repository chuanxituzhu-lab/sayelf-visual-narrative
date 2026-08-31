import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkills } from './registry.mjs';
import { routeIntent } from './router.mjs';
import { loadSchemaSet, validateAgainstSchema } from './schema-validator.mjs';
import { planStoryboard } from './storyboard-planner.mjs';
import { assertMatchingPromptCounts, buildVisualOutputPackage } from './output-package.mjs';
import { buildConsistencyState, validateConsistencyState } from '../consistency-state.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('../../', import.meta.url));

export async function createDualOutputRuntime(rootDir = DEFAULT_ROOT) {
  const registry = await discoverSkills(rootDir);
  const schemas = await loadSchemaSet(path.join(rootDir, 'schemas'));
  return {
    registry,
    listSkills() {
      return registry.skills.map(({ id, priority, manifest, origin }) => ({
        id,
        priority,
        origin: origin || 'builtin',
        name: manifest.name,
        version: manifest.version,
        capabilities: manifest.capabilities,
        tags: manifest.router.tags,
        source: manifest.source
      }));
    },
    route(input) { return routeIntent(input, registry); },
    async execute(input) {
      validateRequest(input);
      const route = routeIntent(input, registry);
      const skill = registry.byId.get(route.selectedSkillId);
      const consistencyState = buildConsistencyState(input);
      const consistencyValidation = validateConsistencyState(consistencyState);
      if (!consistencyValidation.valid) throw new Error(`Invalid consistency state:\n${consistencyValidation.errors.map((error) => `- ${error}`).join('\n')}`);
      const productAnchor = consistencyState.product?.identity || '';
      const plan = planStoryboard({ ...input, consistency_state: consistencyState, product_anchor: productAnchor });
      const output = await skill.execute({ ...input, consistency_state: consistencyState, product_anchor: productAnchor, environment: plan.scene.selected, aspect_ratio: plan.aspect_ratio, duration_seconds: plan.duration_seconds, plan }, { manifest: skill.manifest });
      const validation = validateDualOutput(output, schemas);
      if (!validation.valid) throw new Error(`Skill ${skill.id} returned an invalid Dual Output:\n${validation.errors.map((error) => `- ${error}`).join('\n')}`);
      const outputPackage = buildVisualOutputPackage({
        output,
        plan,
        mode: input.mode || 'story_sequence',
        language: input.language || output.video_storyboard.language,
        imagePlatform: input.image_platform_profile || '',
        consistencyState
      });
      assertMatchingPromptCounts(outputPackage);
      return { input, route, plan, consistency_state: consistencyState, output, output_package: outputPackage, validation, consistency_validation: consistencyValidation };
    }
  };
}

export function validateDualOutput(output, schemas) {
  const errors = [];
  const dual = validateAgainstSchema(output, schemas.get('dual-output/1.0/dual-output'), schemas);
  errors.push(...dual.errors.map((error) => `dual-output ${error}`));
  if (output && typeof output === 'object') {
    const image = validateAgainstSchema(output.image_prompt, schemas.get('dual-output/1.0/image-prompt'), schemas);
    const video = validateAgainstSchema(output.video_storyboard, schemas.get('dual-output/1.0/video-storyboard'), schemas);
    errors.push(...image.errors.map((error) => `image_prompt ${error}`));
    errors.push(...video.errors.map((error) => `video_storyboard ${error}`));
    const coreId = output.narrative_core?.id;
    if (coreId && output.image_prompt?.narrative_core_id !== coreId) errors.push('image_prompt narrative_core_id must equal narrative_core.id');
    if (coreId && output.video_storyboard?.narrative_core_id !== coreId) errors.push('video_storyboard narrative_core_id must equal narrative_core.id');
    if (output.image_prompt?.contract_version !== output.video_storyboard?.contract_version) errors.push('image_prompt and video_storyboard must use the same contract_version');
    const shots = output.video_storyboard?.shots;
    if (Array.isArray(shots)) {
      shots.forEach((shot, index) => { if (shot.order !== index + 1) errors.push(`video_storyboard.shots[${index}].order must be ${index + 1}`); });
      const shotDuration = shots.reduce((total, shot) => total + (Number(shot.duration_seconds) || 0), 0);
      if (shotDuration !== output.video_storyboard.duration_seconds) errors.push('video_storyboard.duration_seconds must equal the sum of shot durations');
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateRequest(input) {
  if (!input || typeof input !== 'object') throw new TypeError('execute requires an input object');
  if (typeof input.idea !== 'string' || input.idea.trim().length === 0) throw new TypeError('execute requires a non-empty input.idea');
  if (input.language !== undefined && !['zh', 'en', 'bilingual'].includes(input.language)) throw new TypeError('input.language must be zh, en, or bilingual');
  if (input.aspect_ratio !== undefined && !['1:1', '3:4', '4:5', '9:16', '16:9'].includes(input.aspect_ratio)) throw new TypeError('input.aspect_ratio is not supported');
  if (input.duration_seconds !== undefined && (!Number.isInteger(input.duration_seconds) || input.duration_seconds < 6 || input.duration_seconds > 60)) throw new TypeError('input.duration_seconds must be an integer between 6 and 60');
}
