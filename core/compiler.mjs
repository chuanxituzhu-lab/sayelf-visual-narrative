import { directorGate, artDirectionGate, continuityGate } from './gates.mjs';

export function validateVisualSpec(spec, previous = null) {
  const gates = [directorGate(spec), artDirectionGate(spec), continuityGate(spec, previous)];
  return {
    status: gates.every((g) => g.status === 'PASS') ? 'PASS' : 'REVISE',
    gates
  };
}

export function compileCanonicalPrompt(spec) {
  const validation = validateVisualSpec(spec);
  if (validation.status !== 'PASS') {
    const error = new Error('VisualSpec failed quality gates');
    error.validation = validation;
    throw error;
  }

  const parts = [
    spec.story?.intent,
    spec.scene?.decisive_moment ? `Decisive moment: ${spec.scene.decisive_moment}` : '',
    renderObject('Performance', spec.performance),
    renderObject('Visible evidence', spec.evidence),
    renderObject('Staging', spec.staging),
    `Primary visual focus: ${spec.composition.primary}`,
    `Visual reading order: ${(spec.composition.information_route || []).join(' -> ')}`,
    renderObject('Camera', spec.camera),
    renderObject('Light and color', spec.light_color),
    `Visual philosophy: ${spec.style.visual_philosophy}`,
    renderObject('Style', spec.style),
    renderObject('Constraints', spec.constraints)
  ];

  return parts.filter(Boolean).join('\n');
}

function renderObject(label, value) {
  if (!value || typeof value !== 'object' || Object.keys(value).length === 0) return '';
  return `${label}: ${Object.entries(value)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(', ') : v}`)
    .join('; ')}`;
}
