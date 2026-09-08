// High-Saturation Hand-Drawn Hook — distilled from sayelf-illustrator.
//
// What was kept from sayelf-illustrator (the parts with real, non-duplicated value):
//   - Style DNA: 高纯度 · 高饱和 · 高明度 · 零灰污 · 暖象牙白基底 · 深炭黑结构线 · 低视觉噪音 · 大留白
//   - Narrative law: 一图一情绪 · 一图一故事 · 一图一瞬间 · 一图一Hook
//   - Four-panel 起承转合 (setup-development-turn-resolution) sequence mode
// What was discarded:
//   - Its own prompt-compiler and VisualSpec-equivalent (duplicated
//     sayelf-visual-narrative's compiler.mjs almost field-for-field)
//   - Its own multi-model degradation routing implementation (now lives in
//     config/media-providers.json + plugins/media-providers/*, shared by
//     every skill instead of being reimplemented per skill)
//
// This plugin only supplies the *style preset + narrative pattern*; it reuses
// the Core's Director/Art-Direction/Continuity gates and dual-output
// contract exactly like every other skill in skills/registry.json.

const STYLE_DNA = {
  zh: '高纯度、高饱和、高明度、零灰污，暖象牙白基底配深炭黑结构线，低视觉噪音，大量留白',
  en: 'high-chroma, high-saturation, high-brightness, zero gray cast, warm ivory base with deep charcoal structural lines, low visual noise, generous negative space'
};

const NARRATIVE_LAW = {
  zh: '一图一情绪、一图一故事、一图一瞬间、一图一钩子',
  en: 'one image, one emotion, one story, one moment, one hook'
};

const manifestId = 'high-saturation-hook';

export function execute(input) {
  const language = input.language ?? 'zh';
  const t = (zh, en) => (language === 'en' ? en : language === 'bilingual' ? `${zh}\n${en}` : zh);
  const idea = String(input.idea ?? '').trim();
  if (!idea) throw new Error('high-saturation-hook requires a non-empty "idea" field');

  const emotion = input.emotion ?? t('释然', 'release');
  const quote = input.quote ?? idea;
  const beats = Array.isArray(input.sequence_beats) && input.sequence_beats.length === 4 ? input.sequence_beats : null;
  const aspectRatio = input.aspect_ratio ?? '3:4';
  // video-storyboard.schema.json requires an integer 6-60 total and at least
  // 2 shots, even for a single-hook image — so a non-sequence hook still
  // gets a minimal 2-shot "hold" storyboard instead of a single frame.
  const durationSeconds = input.duration_seconds ?? (beats ? 12 : 6);

  const decisiveMoment = beats
    ? t(`四格起承转合：${beats.join(' → ')}`, `Four-panel setup-development-turn-resolution: ${beats.join(' -> ')}`)
    : t(`一句"${quote}"被翻译成一个动作 + 一件道具 + 一处痕迹`, `The line "${quote}" translated into one action, one prop, one trace`);

  const core = {
    id: `${manifestId}-core`,
    idea,
    theme: idea,
    emotion,
    world: t('暖象牙白留白背景', 'warm ivory negative-space background'),
    life: quote,
    relation: t('抽象感受 → 具体证据', 'abstract feeling -> concrete evidence'),
    decisive_moment: decisiveMoment,
    afterglow: t('画面停在钩子上，不解释，不收尾', 'The image holds on the hook — unexplained, unresolved')
  };

  const continuity = [
    STYLE_DNA[language === 'en' ? 'en' : 'zh'],
    NARRATIVE_LAW[language === 'en' ? 'en' : 'zh']
  ].join(language === 'en' ? '; ' : '；');

  const prompt = [
    `${STYLE_DNA[language === 'en' ? 'en' : 'zh']}.`,
    `${NARRATIVE_LAW[language === 'en' ? 'en' : 'zh']}.`,
    `${decisiveMoment}.`,
    t('钢笔线描或马克笔线框，色块高亮，不透明水粉质感可选。', 'Pen-and-ink or marker linework, highlighted color blocks, optional opaque gouache texture.')
  ].join(language === 'en' ? ' ' : '');

  const negative = t(
    '灰调、多焦点、堆满背景、照片写实、渐变阴影、水印、文字（除非明确要求）',
    'gray tones, multiple focal points, cluttered background, photorealism, gradient shading, watermark, text unless explicitly requested'
  );

  const imagePrompt = {
    contract_version: 'dual-output/1.0',
    type: 'image_prompt',
    narrative_core_id: core.id,
    language,
    aspect_ratio: aspectRatio,
    prompt,
    negative_prompt: negative,
    keyframe: {
      title: t('钩子瞬间', 'The hook moment'),
      decisive_moment: decisiveMoment,
      foreground: t('唯一的动作与道具', 'the single action and prop'),
      midground: t('痕迹与留白的呼吸关系', 'the breathing relationship between trace and negative space'),
      background: t('暖象牙白基底', 'warm ivory base'),
      continuity_anchor: continuity
    }
  };

  // schemas/video-storyboard.schema.json: frame_role is one of
  // start | development | end, shot ids match ^shot-[0-9]+$, and there must
  // be at least 2 shots — so a plain single-hook idea (no beats) is expanded
  // into a 2-shot "hold" sequence rather than one frame.
  const panels = beats ?? [idea, core.afterglow];
  const frameRoleFor = (index, total) => (index === 0 ? 'start' : index === total - 1 ? 'end' : 'development');
  // Clamp the *requested* total to the schema's [6, 60] bound first, then
  // derive a per-shot duration from the clamped value — so the top-level
  // duration_seconds and sum(shots[].duration_seconds) can never disagree,
  // even at extreme inputs (e.g. duration_seconds: 1 or duration_seconds: 999).
  const clampedTotal = Math.min(60, Math.max(6, durationSeconds));
  const perShotSeconds = Math.max(1, Math.round(clampedTotal / panels.length));

  const shots = panels.map((beat, index) => ({
    id: `shot-${index + 1}`,
    order: index + 1,
    duration_seconds: perShotSeconds,
    frame_role: frameRoleFor(index, panels.length),
    visual_action: beats
      ? t(`第${index + 1}格：${beat}`, `Panel ${index + 1}: ${beat}`)
      : t(`钩子画面保持不变，${beat}`, `The hook image holds; ${beat}`),
    camera: t('固定机位，构图不变，仅角色/道具姿态变化', 'Locked camera, unchanged composition, only pose/prop changes'),
    transition: t('硬切，无淡入淡出', 'Hard cut, no fade'),
    audio: t('无环境音，保持安静', 'No ambience, kept silent'),
    continuity
  }));

  // The top-level total is always exactly the sum of the (rounded) shot
  // durations built above — never a separately-clamped number — so the two
  // can never drift apart, at any input extreme.
  const actualTotalSeconds = perShotSeconds * panels.length;

  const videoStoryboard = {
    contract_version: 'dual-output/1.0',
    type: 'video_storyboard',
    narrative_core_id: core.id,
    language,
    aspect_ratio: aspectRatio,
    duration_seconds: actualTotalSeconds,
    continuity_anchor: continuity,
    shots
  };

  return {
    contract_version: 'dual-output/1.0',
    skill_id: manifestId,
    narrative_core: core,
    image_prompt: imagePrompt,
    video_storyboard: videoStoryboard
  };
}
