const CONSISTENCY_VERSION = 'consistency/1.0';

/**
 * Build the shared identity state passed to every Visual Skill. Identity,
 * product, style, world, motion, camera, and narrative relationship are
 * stable inputs; world context is carried as variable context and becomes
 * continuous only when the current and previous spaces are the same.
 */
export function buildConsistencyState(input = {}) {
  if (input.consistency_state?.version === CONSISTENCY_VERSION) {
    return {
      ...input.consistency_state,
      product: input.consistency_state.product || {},
      characters: Array.isArray(input.consistency_state.characters) ? input.consistency_state.characters : [],
      space_continuity: normalizeSpaceContinuity(input.consistency_state.space_continuity)
    };
  }
  const source = input.consistency || {};
  const productSource = source.product || input.product || (input.product_anchor ? { identity: input.product_anchor } : {});
  const characterSource = source.characters || input.characters || (isPlainObject(input.character) ? input.character : input.character_anchor ? { identity: input.character_anchor, type: input.character_type } : {});
  const characters = normalizeCollection(characterSource).map((item, index) => normalizeCharacter(item, index)).filter(Boolean);
  const product = normalizeProduct(productSource);
  const style = cleanObject(source.style || input.style || {
    visual_philosophy: input.visual_philosophy,
    medium: input.medium,
    shape_language: input.shape_language,
    material_language: input.material_language,
    color_strategy: input.color_strategy
  });
  const world = cleanObject(source.world || input.world || {
    location: input.environment,
    spatial_rules: input.spatial_rules,
    materials: input.world_materials
  });
  const motion = cleanObject(source.motion || input.motion || {
    natural_action_rule: input.natural_action_rule,
    performance_anchor: input.performance_anchor,
    action_anchor: input.action_anchor
  });
  const camera = cleanObject(source.camera || input.camera || {
    axis: input.camera_axis,
    height: input.camera_height,
    lens: input.lens_tendency,
    spatial_rule: input.spatial_rule
  });
  const narrative = cleanObject(source.narrative || input.narrative || {
    relationship: input.relationship,
    story_state: input.story_state,
    subject_count: input.subject_count
  });
  const spaceContinuity = normalizeSpaceContinuity(source.space_continuity || input.space_continuity || input.scene_continuity);
  return {
    version: CONSISTENCY_VERSION,
    product,
    characters,
    style,
    world,
    motion,
    camera,
    narrative,
    space_continuity: spaceContinuity,
    locked_layers: ['product', 'characters', 'style', 'camera', 'narrative'],
    variable_layers: ['space', 'world', 'scene', 'shot', 'action_progression']
  };
}

export function validateConsistencyState(state) {
  const errors = [];
  if (!state || state.version !== CONSISTENCY_VERSION) errors.push('consistency_state.version must be consistency/1.0');
  if (state?.product && !isPlainObject(state.product)) errors.push('consistency_state.product must be an object');
  if (state?.characters && !Array.isArray(state.characters)) errors.push('consistency_state.characters must be an array');
  if (state?.characters?.some((character) => !character.id || !character.identity)) errors.push('each consistency character needs id and identity');
  if (state?.space_continuity && !['auto', 'same_place', 'free'].includes(state.space_continuity.mode)) errors.push('consistency_state.space_continuity.mode must be auto, same_place, or free');
  return { valid: errors.length === 0, errors };
}

export function consistencyPrompt(state, language = 'zh') {
  const locale = normalizeLanguage(language);
  const sections = [];
  if (hasContent(state?.product)) sections.push(`${label('Product', locale)}: ${renderObject(state.product)}`);
  if (state?.characters?.length) sections.push(`${label('Characters', locale)}: ${state.characters.map(renderObject).join(' | ')}`);
  for (const [key, value] of [['Style DNA', state?.style], ['World context', state?.world], ['Space continuity', state?.space_continuity], ['Motion continuity', state?.motion], ['Camera continuity', state?.camera], ['Narrative relationship', state?.narrative]]) {
    if (hasContent(value)) sections.push(`${label(key, locale)}: ${renderObject(value)}`);
  }
  if (!sections.length) return '';
  return `${label('Consistency locks', locale)}:\n${sections.join('\n')}`;
}

function normalizeSpaceContinuity(value) {
  const source = typeof value === 'string' ? { mode: value } : isPlainObject(value) ? value : {};
  const mode = ['auto', 'same_place', 'free'].includes(source.mode) ? source.mode : 'auto';
  return cleanObject({
    mode,
    transition_policy: source.transition_policy || source.transitionPolicy || 'switch_when_space_changes'
  });
}

function normalizeProduct(value) {
  if (!isPlainObject(value)) return {};
  return cleanObject({
    id: value.id || value.identity || value.sku,
    name: value.name,
    category: value.category,
    identity: value.identity || value.name,
    appearance: value.appearance,
    material: value.material || value.materials,
    dimensions: value.dimensions,
    colors: value.colors || value.color,
    markings: value.markings || value.logo,
    function: value.function,
    locked_features: value.locked_features || value.lockedFeatures
  });
}

function normalizeCharacter(value, index) {
  if (!isPlainObject(value)) return null;
  const identity = firstText(value.identity, value.name, value.id);
  if (!identity) return null;
  return cleanObject({
    id: firstText(value.id, identity, `character-${index + 1}`),
    type: value.type,
    identity,
    appearance: value.appearance,
    costume: value.costume,
    body: value.body,
    age: value.age,
    markings: value.markings,
    locked_features: value.locked_features || value.lockedFeatures
  });
}

function normalizeCollection(value) {
  if (Array.isArray(value)) return value;
  return isPlainObject(value) ? [value] : [];
}

function cleanObject(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined && child !== null && child !== '' && !(Array.isArray(child) && child.length === 0)));
}

function renderObject(value) {
  return Object.entries(value).map(([key, child]) => `${key}=${Array.isArray(child) ? child.join(', ') : child}`).join('; ');
}

function hasContent(value) { return isPlainObject(value) && Object.keys(value).length > 0; }
function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function firstText(...values) { return values.find((value) => typeof value === 'string' && value.trim())?.trim() || ''; }
function normalizeLanguage(language) { return ['zh', 'en', 'bilingual'].includes(language) ? language : 'zh'; }

function label(key, language) {
  const values = {
    'Consistency locks': ['一致性锁定', 'Consistency locks'],
    Product: ['产品', 'Product'],
    Characters: ['人物', 'Characters'],
    'Style DNA': ['风格 DNA', 'Style DNA'],
    World: ['世界', 'World'],
    'World context': ['世界环境', 'World context'],
    'Space continuity': ['空间连续性', 'Space continuity'],
    'Motion continuity': ['动作连续性', 'Motion continuity'],
    'Camera continuity': ['摄影机连续性', 'Camera continuity'],
    'Narrative relationship': ['叙事关系', 'Narrative relationship']
  }[key] || [key, key];
  if (language === 'zh') return values[0];
  if (language === 'bilingual') return `${values[0]} / ${values[1]}`;
  return values[1];
}
