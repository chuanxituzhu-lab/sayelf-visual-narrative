const STORY_MODES = new Set(['story_sequence', 'storyboard']);

/**
 * Normalize the validated Dual Output into the package shared by the API,
 * CLI, MCP, and WebUI. A story always produces one still-image prompt for
 * every video storyboard shot. Single-image mode intentionally has no video
 * storyboard, so the match is not applicable there.
 */
export function buildVisualOutputPackage({ output, plan = null, mode = 'single_image', compiledPrompt = '', language = 'zh', imagePlatform = '', consistencyState = null } = {}) {
  const locale = normalizeLanguage(language);
  const storyboard = output?.video_storyboard;
  const imagePrompt = output?.image_prompt;
  const basePrompt = String(compiledPrompt || imagePrompt?.prompt || '').trim();
  const isStory = STORY_MODES.has(mode);

  if (!isStory || !Array.isArray(storyboard?.shots) || !storyboard.shots.length || !imagePrompt) {
    return {
      contract_version: 'visual-output-package/1.0',
      mode,
      narrative_core: output?.narrative_core || null,
      consistency_state: consistencyState,
      image_prompts: basePrompt ? [{
        id: 'image-1',
        order: 1,
        shot_id: null,
        title: imagePlatform ? `${imagePlatform} · ${label('Image Prompt', locale)}` : label('Image Prompt', locale),
        prompt: basePrompt,
        negative_prompt: imagePrompt?.negative_prompt || '',
        aspect_ratio: imagePrompt?.aspect_ratio || storyboard?.aspect_ratio || null,
        platform: imagePlatform || null
      }] : [],
      video_storyboard: null,
      counts: { image_prompts: basePrompt ? 1 : 0, video_shots: 0, matched: null, rule: 'single_image_has_no_video_storyboard' },
      language: locale
    };
  }

  const continuity = storyboard.continuity_anchor || imagePrompt.keyframe?.continuity_anchor || '';
  const imagePrompts = storyboard.shots.map((shot, index) => ({
    id: shot.id || `image-${index + 1}`,
    order: shot.order || index + 1,
    shot_id: shot.id || `shot-${index + 1}`,
    title: `${imagePlatform ? `${imagePlatform} · ` : ''}${label('Story image', locale)} ${shot.order || index + 1} · ${frameRoleLabel(shot.frame_role, locale)}`,
    prompt: [
      basePrompt,
      `${label('Story shot', locale)} ${shot.order || index + 1}: ${shot.visual_action}`,
      `${label('Still-frame composition', locale)}: ${shot.camera}`,
      continuity ? `${label('Continuity anchor', locale)}: ${continuity}` : ''
    ].filter(Boolean).join('\n'),
    negative_prompt: imagePrompt.negative_prompt || '',
    aspect_ratio: imagePrompt.aspect_ratio || storyboard.aspect_ratio,
    platform: imagePlatform || null
  }));

  const videoStoryboard = {
    ...storyboard,
    planning: plan,
    prompt: formatVideoStoryboard(storyboard, plan, locale)
  };

  return {
    contract_version: 'visual-output-package/1.0',
    mode,
    narrative_core: output.narrative_core || null,
    consistency_state: consistencyState,
    image_prompts: imagePrompts,
    video_storyboard: videoStoryboard,
    counts: {
      image_prompts: imagePrompts.length,
      video_shots: storyboard.shots.length,
      matched: imagePrompts.length === storyboard.shots.length,
      rule: 'one_image_prompt_per_video_storyboard_shot'
    },
    language: locale
  };
}

export function assertMatchingPromptCounts(outputPackage) {
  if (!outputPackage || !outputPackage.video_storyboard) return true;
  const imageCount = outputPackage.image_prompts?.length || 0;
  const videoCount = outputPackage.video_storyboard.shots?.length || 0;
  if (imageCount !== videoCount) throw new Error(`Image prompt count ${imageCount} must match video storyboard shot count ${videoCount}`);
  for (let index = 0; index < videoCount; index += 1) {
    const image = outputPackage.image_prompts[index];
    const shot = outputPackage.video_storyboard.shots[index];
    if (image.order !== shot.order || image.shot_id !== shot.id) throw new Error(`Image prompt ${index + 1} must map to video shot ${index + 1}`);
  }
  return true;
}

export function formatVideoStoryboard(storyboard, plan = null, language = 'zh') {
  if (!storyboard) return '';
  const locale = normalizeLanguage(language);
  const header = [
    `${label('Aspect ratio', locale)}: ${storyboard.aspect_ratio || label('unspecified', locale)}`,
    `${label('Total duration', locale)}: ${storyboard.duration_seconds || 0} ${label('seconds', locale)}`,
    plan?.platform_label ? `${label('Publishing strategy', locale)}: ${plan.platform_label}` : '',
    plan?.shot_count ? `${label('Adaptive shot count', locale)}: ${plan.shot_count}` : '',
    plan?.hook_seconds ? `${label('Opening hook', locale)}: ${label('first', locale)} ${plan.hook_seconds} ${label('seconds', locale)}` : '',
    plan?.guidance?.length ? `${label('Platform guidance', locale)}: ${plan.guidance.join(locale === 'en' ? '; ' : '；')}` : '',
    plan?.reasons?.length ? `${label('Planning basis', locale)}: ${plan.reasons.join(locale === 'en' ? '; ' : '；')}` : '',
    plan?.scene?.selected ? `${label('Scene strategy', locale)}: ${plan.scene.mode === 'random' ? label('reproducible random', locale) : plan.scene.mode === 'auto' ? label('automatic space flow', locale) : label('user selected', locale)} → ${plan.scene.selected}` : '',
    plan?.scene?.transitions?.length ? `${label('Space transitions', locale)}: ${plan.scene.transitions.map((transition) => `${transition.from} → ${transition.to}`).join(locale === 'en' ? '; ' : '；')}` : '',
    plan?.character_anchor ? `${label('Character continuity', locale)}: ${plan.character_anchor}` : '',
    plan?.natural_action_rule ? `${label('Natural action', locale)}: ${plan.natural_action_rule}` : '',
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

function frameRoleLabel(role, language) {
  const labels = language === 'en'
    ? { start: 'opening', development: 'development', end: 'ending' }
    : { start: '开场', development: '发展', end: '结尾' };
  return labels[role] || role || (language === 'en' ? 'shot' : '镜头');
}

function normalizeLanguage(language) {
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
    'reproducible random': ['可复现随机', 'reproducible random'],
    'user selected': ['用户选择', 'user selected'],
    'Character continuity': ['人物一致性', 'Character continuity'],
    'Natural action': ['自然动作', 'Natural action'],
    Shot: ['镜头', 'Shot'],
    'Visual action': ['画面动作', 'Visual action'],
    Camera: ['摄影机', 'Camera'],
    Transition: ['转场', 'Transition'],
    Audio: ['声音', 'Audio'],
    Continuity: ['连续性', 'Continuity']
  }[key] || [key, key];
  if (language === 'zh') return values[0];
  if (language === 'bilingual') return `${values[0]} / ${values[1]}`;
  return values[1];
}
