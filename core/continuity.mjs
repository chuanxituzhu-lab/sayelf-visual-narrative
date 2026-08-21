const stablePaths = [
  ['character', 'identity'],
  ['character', 'appearance'],
  ['character', 'costume'],
  ['style', 'visual_philosophy'],
  ['style', 'medium'],
  ['style', 'shape_language'],
  ['style', 'material_language'],
  ['style', 'color_strategy'],
  ['world', 'location'],
  ['world', 'spatial_rules']
];

export function compareContinuity(previous, current) {
  if (!previous) return { status: 'PASS', drifts: [] };

  const drifts = [];
  for (const path of stablePaths) {
    const before = get(previous, path);
    const after = get(current, path);
    if (before !== undefined && after !== undefined && !same(before, after)) {
      drifts.push({ path: path.join('.'), previous: before, current: after });
    }
  }

  return { status: drifts.length ? 'REVISE' : 'PASS', drifts };
}

export function inheritStoryState(base, shot) {
  return {
    ...shot,
    story: shot.story || base.story,
    style: { ...(base.style || {}), ...(shot.style || {}) },
    character: { ...(base.character || {}), ...(shot.character || {}) },
    world: { ...(base.world || {}), ...(shot.world || {}) }
  };
}

function get(object, path) {
  return path.reduce((value, key) => value?.[key], object);
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
