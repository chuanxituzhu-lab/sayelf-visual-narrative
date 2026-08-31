const stablePaths = [
  ['character', 'identity'],
  ['character', 'appearance'],
  ['character', 'costume'],
  ['style', 'visual_philosophy'],
  ['style', 'medium'],
  ['style', 'shape_language'],
  ['style', 'material_language'],
  ['style', 'color_strategy']
];

export function compareContinuity(previous, current) {
  const space = resolveSpaceContinuity(previous, current);
  if (!previous) return { status: 'PASS', drifts: [], space };

  const drifts = [];
  for (const path of stablePaths) {
    const before = get(previous, path);
    const after = get(current, path);
    if (before !== undefined && after !== undefined && !same(before, after)) {
      drifts.push({ path: path.join('.'), previous: before, current: after });
    }
  }

  for (const path of [['consistency', 'product'], ['consistency', 'characters'], ['consistency', 'style'], ['consistency', 'camera'], ['consistency', 'narrative']]) {
    const before = get(previous, path);
    const after = get(current, path);
    if (before !== undefined && after !== undefined && !same(before, after)) drifts.push({ path: path.join('.'), previous: before, current: after });
  }

  if (space.same_place) {
    for (const path of [['world', 'location'], ['world', 'spatial_rules'], ['consistency', 'world']]) {
      const before = get(previous, path);
      const after = get(current, path);
      if (before !== undefined && after !== undefined && !same(before, after)) drifts.push({ path: path.join('.'), previous: before, current: after });
    }
  }

  return { status: drifts.length ? 'REVISE' : 'PASS', drifts, space };
}

export function resolveSpaceContinuity(previous, current) {
  const previousConfig = spaceConfig(previous);
  const currentConfig = spaceConfig(current);
  const mode = ['auto', 'same_place', 'free'].includes(currentConfig.mode)
    ? currentConfig.mode
    : ['auto', 'same_place', 'free'].includes(previousConfig.mode) ? previousConfig.mode : 'auto';
  const previousLocation = spaceLocation(previous);
  const currentLocation = spaceLocation(current);
  const knownSame = Boolean(previousLocation && currentLocation && normalizeSpace(previousLocation) === normalizeSpace(currentLocation));
  const same_place = mode === 'same_place' || (mode === 'auto' && knownSame);
  return {
    mode,
    same_place,
    transition: Boolean(previousLocation && currentLocation && !knownSame),
    previous: previousLocation,
    current: currentLocation,
    reason: !previous ? 'first_shot' : mode === 'same_place' ? 'explicit_same_place' : mode === 'free' ? 'explicit_free_space' : knownSame ? 'same_location' : previousLocation && currentLocation ? 'different_location' : 'location_unknown'
  };
}

export function inheritStoryState(base, shot) {
  const space = resolveSpaceContinuity(base, shot);
  return {
    ...shot,
    story: shot.story || base.story,
    style: { ...(base.style || {}), ...(shot.style || {}) },
    character: { ...(base.character || {}), ...(shot.character || {}) },
    world: space.same_place ? { ...(base.world || {}), ...(shot.world || {}) } : (shot.world || {}),
    consistency: { ...(base.consistency || {}), ...(shot.consistency || {}) }
  };
}

function spaceConfig(spec) {
  return get(spec, ['space_continuity']) || get(spec, ['consistency', 'space_continuity']) || {};
}

function spaceLocation(spec) {
  return get(spec, ['scene', 'location']) || get(spec, ['world', 'location']) || get(spec, ['space', 'location']) || get(spec, ['environment']) || '';
}

function normalizeSpace(value) {
  return String(value).toLocaleLowerCase().replace(/[\s\u3000]/g, '').replace(/[，,。.!！?？;；:：]/g, '');
}

function get(object, path) {
  return path.reduce((value, key) => value?.[key], object);
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
