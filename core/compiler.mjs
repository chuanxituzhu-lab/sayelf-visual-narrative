import { directorGate, artDirectionGate, continuityGate } from './gates.mjs';
import { consistencyPrompt } from './consistency-state.mjs';

export function validateVisualSpec(spec, previous = null) {
  const gates = [directorGate(spec), artDirectionGate(spec), continuityGate(spec, previous)];
  return {
    status: gates.every((g) => g.status === 'PASS') ? 'PASS' : 'REVISE',
    gates
  };
}

export function compileCanonicalPrompt(spec, language = 'en') {
  const validation = validateVisualSpec(spec);
  if (validation.status !== 'PASS') {
    const error = new Error('VisualSpec failed quality gates');
    error.validation = validation;
    throw error;
  }

  const parts = [
    spec.story?.intent,
    consistencyPromptFromSpec(spec, language),
    renderObject('Character continuity', spec.character, language),
    renderObject('World', spec.world, language),
    renderObject('Scene', spec.scene, language),
    spec.scene?.decisive_moment ? `${localizedLabel('Decisive moment', language)}: ${spec.scene.decisive_moment}` : '',
    renderObject('Performance', spec.performance, language),
    renderObject('Visible evidence', spec.evidence, language),
    renderObject('Staging', spec.staging, language),
    `${localizedLabel('Primary visual focus', language)}: ${spec.composition.primary}`,
    `${localizedLabel('Visual reading order', language)}: ${(spec.composition.information_route || []).join(' -> ')}`,
    renderObject('Camera', spec.camera, language),
    renderObject('Light and color', spec.light_color, language),
    `${localizedLabel('Visual philosophy', language)}: ${spec.style.visual_philosophy}`,
    renderObject('Style', spec.style, language),
    renderObject('Constraints', spec.constraints, language)
  ];

  return parts.filter(Boolean).join('\n');
}

function consistencyPromptFromSpec(spec, language) {
  const state = spec?.consistency ? { ...spec.consistency, version: 'consistency/1.0' } : null;
  return state ? consistencyPrompt(state, language) : '';
}

function renderObject(label, value, language) {
  if (!value || typeof value !== 'object' || Object.keys(value).length === 0) return '';
  return `${localizedLabel(label, language)}: ${Object.entries(value)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(', ') : v}`)
    .join('; ')}`;
}

function localizedLabel(label, language = 'en') {
  const zh = {
    'Character continuity': '人物连续性',
    World: '世界',
    Scene: '场景',
    'Decisive moment': '决定性瞬间',
    Performance: '表演',
    'Visible evidence': '可见证据',
    Staging: '调度',
    'Primary visual focus': '主要视觉焦点',
    'Visual reading order': '视觉阅读顺序',
    Camera: '摄影机',
    'Light and color': '光线与色彩',
    'Visual philosophy': '视觉哲学',
    Style: '风格',
    Constraints: '约束'
  }[label] || label;
  if (language === 'zh') return zh;
  if (language === 'bilingual') return `${zh} / ${label}`;
  return label;
}
