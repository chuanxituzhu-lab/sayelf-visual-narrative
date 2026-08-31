const STORY_MODES = new Set(['story_sequence', 'storyboard']);

export function isStoryMode(mode) {
  return STORY_MODES.has(mode);
}

export function buildDualOutputInput(spec, language = 'zh') {
  const story = spec?.story || {};
  const scene = spec?.scene || {};
  const world = spec?.world || {};
  const character = spec?.character || {};
  const evidence = spec?.evidence || {};
  const composition = spec?.composition || {};
  const lightColor = spec?.light_color || {};
  const performance = spec?.performance || {};
  const constraints = spec?.constraints || {};
  const characterAnchor = joinText(character.identity, character.appearance, character.costume, character.body);
  const consistency = spec?.consistency || {};
  const consistencyCharacters = Array.isArray(consistency.characters) && consistency.characters.length
    ? consistency.characters
    : character.identity ? [{
      id: character.id || character.identity,
      type: character.type,
      identity: character.identity,
      appearance: character.appearance,
      costume: character.costume,
      body: character.body
    }] : [];

  return {
    mode: spec?.mode || 'single_image',
    idea: firstText(story.intent, story.theme, scene.decisive_moment, '视觉叙事'),
    emotion: firstText(scene.emotional_state, story.emotional_arc),
    environment: joinText(world.location, world.materials, world.spatial_rules),
    life: firstText(lightColor.key_direction, lightColor.value_structure, evidence.action),
    character: firstText(composition.secondary, evidence.temporal, evidence.action, composition.primary),
    character_anchor: firstText(characterAnchor, character.appearance, character.identity),
    character_type: firstText(character.type, inferCharacterType(characterAnchor)),
    performance_anchor: joinText(performance.body, performance.head, performance.eyes, performance.hands, performance.posture),
    action_anchor: firstText(scene.decisive_moment, evidence.action),
    time: firstText(scene.visual_state, lightColor.palette_state),
    aspect_ratio: normalizeStoryAspectRatio(spec?.constraints?.aspect_ratio),
    duration_seconds: constraints.duration_seconds || 18,
    platform_profile: constraints.platform_profile || 'generic_short',
    image_platform_profile: constraints.image_platform_profile || 'xiaohongshu_image',
    scene_mode: scene.scene_mode || 'auto',
    scene_options: scene.scene_options || [],
    scene_sequence: scene.scene_sequence || scene.space_sequence || [],
    scene_seed: scene.scene_seed || story.intent || '',
    consistency_state: {
      version: 'consistency/1.0',
      product: consistency.product || {},
      characters: consistencyCharacters,
      style: consistency.style || spec?.style || {},
      world: consistency.world || spec?.world || {},
      motion: consistency.motion || { ...performance, action_anchor: scene.decisive_moment || evidence.action },
      camera: consistency.camera || spec?.camera || {},
      narrative: consistency.narrative || { relationship: evidence.relationship, subject_count: constraints.people_count },
      space_continuity: consistency.space_continuity || { mode: scene.scene_mode === 'auto' || !scene.scene_mode ? 'auto' : 'same_place', transition_policy: 'switch_when_space_changes' }
    },
    language: normalizeOutputLanguage(language),
    preferred_skill_id: spec?.skill_id || constraints.skill_id || 'visual-storytelling'
  };
}

export function buildPromptPackage({ spec, compiledPrompt, dualOutput = null, planning = null, language = 'zh' }) {
  const locale = normalizeOutputLanguage(language);
  const canonicalPrompt = String(compiledPrompt || '').trim();
  const story = isStoryMode(spec?.mode);
  const imagePrompt = dualOutput?.image_prompt;
  const storyboard = dualOutput?.video_storyboard;
  const imagePlatform = imagePlatformLabel(spec?.constraints?.image_platform_profile, locale);

  if (!story || !imagePrompt || !storyboard?.shots?.length) {
    return {
      contractVersion: 'visual-output-package/1.0',
      mode: spec?.mode || 'single_image',
      counts: { image_prompts: canonicalPrompt ? 1 : 0, video_shots: 0, matched: null, rule: 'single_image_has_no_video_storyboard' },
      imagePrompts: canonicalPrompt ? [{ id: 'image-1', order: 1, shotId: null, title: imagePlatform ? `${imagePlatform} · ${label('Image Prompt', locale)}` : label('Image Prompt', locale), prompt: canonicalPrompt, negativePrompt: '', platform: imagePlatform }] : [],
      videoStoryboard: null,
      language: locale
    };
  }

  const basePrompt = canonicalPrompt || imagePrompt.prompt;
  const negativePrompt = imagePrompt.negative_prompt || '';
  const continuity = storyboard.continuity_anchor || imagePrompt.keyframe?.continuity_anchor || '';
  const imagePrompts = storyboard.shots.map((shot, index) => ({
    id: shot.id || `image-${index + 1}`,
    order: shot.order || index + 1,
    shotId: shot.id || `shot-${index + 1}`,
    title: `${imagePlatform ? `${imagePlatform} · ` : ''}${label('Story image', locale)} ${shot.order || index + 1} · ${frameRoleLabel(shot.frame_role, locale)}`,
    prompt: [basePrompt, `${label('Story shot', locale)} ${shot.order || index + 1}: ${shot.visual_action}`, `${label('Still-frame composition', locale)}: ${shot.camera}`, continuity ? `${label('Continuity anchor', locale)}: ${continuity}` : ''].filter(Boolean).join('\n'),
    negativePrompt,
    platform: imagePlatform
  }));
  if (imagePrompts.length !== storyboard.shots.length) throw new Error('Image prompt count must match video storyboard shot count');
  return {
    contractVersion: 'visual-output-package/1.0',
    mode: spec?.mode || 'story_sequence',
    narrativeCore: dualOutput.narrative_core || null,
    counts: { image_prompts: imagePrompts.length, video_shots: storyboard.shots.length, matched: true, rule: 'one_image_prompt_per_video_storyboard_shot' },
    imagePrompts,
    language: locale,
    videoStoryboard: { ...storyboard, planning, prompt: formatVideoStoryboard(storyboard, planning, locale) }
  };
}

export function formatVideoStoryboard(storyboard, planning = null, language = 'zh') {
  if (!storyboard) return '';
  const locale = normalizeOutputLanguage(language);
  const header = [
    `${label('Aspect ratio', locale)}: ${storyboard.aspect_ratio || label('unspecified', locale)}`,
    `${label('Total duration', locale)}: ${storyboard.duration_seconds || 0} ${label('seconds', locale)}`,
    planning?.platform_label ? `${label('Publishing strategy', locale)}: ${planning.platform_label}` : '',
    planning?.shot_count ? `${label('Adaptive shot count', locale)}: ${planning.shot_count}` : '',
    planning?.hook_seconds ? `${label('Opening hook', locale)}: ${label('first', locale)} ${planning.hook_seconds} ${label('seconds', locale)}` : '',
    planning?.guidance?.length ? `${label('Platform guidance', locale)}: ${planning.guidance.join(locale === 'en' ? '; ' : '；')}` : '',
    planning?.reasons?.length ? `${label('Planning basis', locale)}: ${planning.reasons.join(locale === 'en' ? '; ' : '；')}` : '',
    planning?.scene?.selected ? `${label('Scene strategy', locale)}: ${planning.scene.mode === 'random' ? label('reproducible random', locale) : planning.scene.mode === 'auto' ? label('automatic space flow', locale) : label('user selected', locale)} → ${planning.scene.selected}` : '',
    planning?.scene?.transitions?.length ? `${label('Space transitions', locale)}: ${planning.scene.transitions.map((transition) => `${transition.from} → ${transition.to}`).join(locale === 'en' ? '; ' : '；')}` : '',
    planning?.character_anchor ? `${label('Character continuity', locale)}: ${planning.character_anchor}` : '',
    planning?.natural_action_rule ? `${label('Natural action', locale)}: ${planning.natural_action_rule}` : '',
    storyboard.continuity_anchor ? `${label('Continuity anchor', locale)}: ${storyboard.continuity_anchor}` : ''
  ].filter(Boolean);
  const shots = (storyboard.shots || []).map((shot) => [
    `${label('Shot', locale)} ${shot.order} | ${frameRoleLabel(shot.frame_role, locale)} | ${shot.duration_seconds} ${label('seconds', locale)}`,
    `${label('Visual action', locale)}: ${shot.visual_action}`,
    `${label('Camera', locale)}: ${shot.camera}`,
    `${label('Transition', locale)}: ${shot.transition}`,
    `${label('Audio', locale)}: ${shot.audio}`,
    `${label('Continuity', locale)}: ${shot.continuity}`
  ].join('\n'));
  return [...header, ...shots].join('\n\n');
}

export function formatPromptPackageForHarness(promptPackage) {
  if (!promptPackage) return '';
  const locale = normalizeOutputLanguage(promptPackage.language);
  const imageText = promptPackage.imagePrompts.map((item) => `${item.title}\n${item.prompt}${item.negativePrompt ? `\n${label('Negative prompt', locale)}: ${item.negativePrompt}` : ''}`);
  const videoText = promptPackage.videoStoryboard?.prompt ? [`${label('Video storyboard prompt', locale)}\n${promptPackage.videoStoryboard.prompt}`] : [];
  return [...imageText, ...videoText].join('\n\n');
}

function normalizeStoryAspectRatio(ratio) {
  if (['1:1', '3:4', '4:5', '9:16', '16:9'].includes(ratio)) return ratio;
  return ratio === '4:3' ? '16:9' : '9:16';
}

function firstText(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

function joinText(...values) {
  return values.map((value) => typeof value === 'string' ? value.trim() : '').filter(Boolean).join('；');
}

function inferCharacterType(text) {
  return /拟人|anthropom|动物|animal|牛|猫|狗|鸟|兔|狐/.test(text) ? 'anthropomorphic' : 'human';
}

function frameRoleLabel(role, language = 'zh') {
  const labels = language === 'en'
    ? { start: 'opening', development: 'development', end: 'ending' }
    : { start: '开场', development: '发展', end: '结尾' };
  return labels[role] || role || (language === 'en' ? 'shot' : '镜头');
}

function normalizeOutputLanguage(language) {
  return ['zh', 'en', 'bilingual'].includes(language) ? language : 'zh';
}

function label(key, language) {
  const values = {
    'Image Prompt': ['图片 Prompt', 'Image Prompt'],
    'Story image': ['故事图片', 'Story image'],
    'Story shot': ['故事镜头', 'Story shot'],
    'Still-frame composition': ['静帧构图', 'Still-frame composition'],
    'Continuity anchor': ['连续性锚点', 'Continuity anchor'],
    'Aspect ratio': ['画面比例', 'Aspect ratio'],
    'unspecified': ['未指定', 'unspecified'],
    'Total duration': ['总时长', 'Total duration'],
    seconds: ['秒', 'seconds'],
    'Publishing strategy': ['发布策略', 'Publishing strategy'],
    'Adaptive shot count': ['智能镜头数', 'Adaptive shot count'],
    'Opening hook': ['首屏钩子', 'Opening hook'],
    first: ['前', 'first'],
    'Platform guidance': ['平台策略建议', 'Platform guidance'],
    'Planning basis': ['规划依据', 'Planning basis'],
    'Scene strategy': ['场景策略', 'Scene strategy'],
    'automatic space flow': ['空间自动流转', 'automatic space flow'],
    'Space transitions': ['空间切换', 'Space transitions'],
    'reproducible random': ['可复现随机', 'reproducible random'],
    'user selected': ['用户选择', 'user selected'],
    'Character continuity': ['人物一致性', 'Character continuity'],
    'Natural action': ['自然动作', 'Natural action'],
    Shot: ['镜头', 'Shot'],
    'Visual action': ['画面动作', 'Visual action'],
    Camera: ['摄影机', 'Camera'],
    Transition: ['转场', 'Transition'],
    Audio: ['声音', 'Audio'],
    Continuity: ['连续性', 'Continuity'],
    'Negative prompt': ['反向提示词', 'Negative prompt'],
    'Video storyboard prompt': ['视频分镜 Prompt', 'Video storyboard prompt']
  }[key] || [key, key];
  if (language === 'zh') return values[0];
  if (language === 'bilingual') return `${values[0]} / ${values[1]}`;
  return values[1];
}

function imagePlatformLabel(profile, language) {
  const values = {
    xiaohongshu_image: ['小红书图片', 'Xiaohongshu image'],
    facebook_image: ['Facebook 图片', 'Facebook image'],
    instagram_image: ['Instagram 图片', 'Instagram image'],
    pinterest_image: ['Pinterest 图片', 'Pinterest image'],
    generic_image: ['通用图片', 'Generic image']
  }[profile];
  if (!values) return '';
  if (language === 'zh') return values[0];
  if (language === 'bilingual') return `${values[0]} / ${values[1]}`;
  return values[1];
}
