const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

export function directorGate(spec) {
  const issues = [];
  if (!nonEmpty(spec?.story?.intent)) issues.push('story.intent is required');
  if (!nonEmpty(spec?.scene?.decisive_moment)) issues.push('scene.decisive_moment is required');
  if (!nonEmpty(spec?.composition?.primary)) issues.push('composition.primary is required');
  if (!Array.isArray(spec?.composition?.information_route) || spec.composition.information_route.length === 0) {
    issues.push('composition.information_route must contain at least one visual stop');
  }
  if (!nonEmpty(spec?.camera?.shot_size)) issues.push('camera.shot_size is required');
  return result('director', issues);
}

export function artDirectionGate(spec) {
  const issues = [];
  if (!nonEmpty(spec?.style?.visual_philosophy)) issues.push('style.visual_philosophy is required');
  const budget = spec?.composition?.complexity_budget;
  if (budget && !['low', 'medium', 'high', 'controlled'].includes(String(budget).toLowerCase())) {
    issues.push('composition.complexity_budget should be low, medium, high, or controlled');
  }
  const forbidden = spec?.style?.forbidden_patterns;
  if (forbidden && !Array.isArray(forbidden)) issues.push('style.forbidden_patterns must be an array');
  return result('art_direction', issues);
}

export function continuityGate(spec, previous = null) {
  const issues = [];
  if (!previous) return result('continuity', issues);
  if (previous?.character?.identity && spec?.character?.identity && previous.character.identity !== spec.character.identity) {
    issues.push('character identity drift detected');
  }
  if (previous?.style?.visual_philosophy && spec?.style?.visual_philosophy && previous.style.visual_philosophy !== spec.style.visual_philosophy) {
    issues.push('visual philosophy drift detected');
  }
  if (previous?.consistency?.product && spec?.consistency?.product && JSON.stringify(previous.consistency.product) !== JSON.stringify(spec.consistency.product)) {
    issues.push('product consistency drift detected');
  }
  if (previous?.consistency?.characters && spec?.consistency?.characters && JSON.stringify(previous.consistency.characters) !== JSON.stringify(spec.consistency.characters)) {
    issues.push('character consistency drift detected');
  }
  return result('continuity', issues);
}

function result(gate, issues) {
  return {
    gate,
    status: issues.length ? 'REVISE' : 'PASS',
    issues
  };
}
