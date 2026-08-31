import { buildConsistencyState, consistencyPrompt } from './consistency-state.mjs';

/**
 * Local-first creative optimization. It never invents a product, character,
 * scene, or claim; it preserves the customer's words and adds the minimum
 * decision scaffolding needed by the Visual Narrative director.
 */
export function optimizeCreativeIntent({ intent, language = 'zh', spec = null } = {}) {
  const original = String(intent || spec?.story?.intent || '').trim();
  if (!original) throw new TypeError('optimize requires a non-empty creative intent');
  const locale = normalizeLanguage(language);
  const state = buildConsistencyState(spec || {});
  const locks = consistencyPrompt(state, locale);
  const optimized = [
    `${label('Creative core', locale)}: ${original}`,
    `${label('Visual task', locale)}: ${sentence('Turn the creative core into one clear visual event; do not stack unrelated events.', '将创意核心收束为一个清晰的可视事件，不堆叠无关事件。', locale)}`,
    `${label('Decisive moment', locale)}: ${sentence('Choose one visible action or relationship change that carries the meaning.', '选择一个承载意义的可见动作或关系变化。', locale)}`,
    `${label('Evidence', locale)}: ${sentence('Use action, space, light, material, or gesture as visible evidence instead of explanation.', '用动作、空间、光线、材质或手势提供可见证据，不用解释代替画面。', locale)}`,
    `${label('Restraint', locale)}: ${sentence('Keep one primary visual focus and leave room for a natural afterglow.', '只保留一个主要视觉焦点，并为自然余韵留出空间。', locale)}`,
    locks ? locks : `${label('Consistency locks', locale)}: ${sentence('If a product or person appears, define its reusable identity anchor before changing scene or action.', '如果出现产品或人物，先定义可复用的身份锚点，再改变场景或动作。', locale)}`
  ].join('\n');
  return {
    contract_version: 'creative-optimization/1.0',
    language: locale,
    original_intent: original,
    optimized_intent: optimized,
    changes: [
      'preserved_customer_intent',
      'focused_on_one_decisive_visual_event',
      'added_visible_evidence',
      locks ? 'carried_consistency_locks' : 'reserved_consistency_locks'
    ],
    assistant_prompt: `请在不改变客户原意的前提下，审阅并进一步优化以下导演版创意：\n\n${optimized}`
  };
}

function normalizeLanguage(language) { return ['zh', 'en', 'bilingual'].includes(language) ? language : 'zh'; }
function sentence(en, zh, language) { return language === 'en' ? en : language === 'bilingual' ? `${zh} / ${en}` : zh; }
function label(key, language) {
  const values = {
    'Creative core': ['创意核心', 'Creative core'],
    'Visual task': ['画面任务', 'Visual task'],
    'Decisive moment': ['决定性瞬间', 'Decisive moment'],
    Evidence: ['可见证据', 'Evidence'],
    Restraint: ['视觉取舍', 'Restraint'],
    'Consistency locks': ['一致性锁定', 'Consistency locks']
  }[key] || [key, key];
  if (language === 'zh') return values[0];
  if (language === 'bilingual') return `${values[0]} / ${values[1]}`;
  return values[1];
}
