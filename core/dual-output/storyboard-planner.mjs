const DEFAULT_SCENES = ['清晨的街角', '安静的室内窗边', '雨后的公园', '旧屋走廊', '河岸步道', '社区小店门口'];

const PLATFORM_PROFILES = {
  generic_short: profile('通用短视频', 'Generic short video', 2, ['首屏尽早交代主体和关系', '动作连续且每镜有明确变化', '结尾保留余韵或回环空间', '保持原创、无水印'], ['Establish the subject and relationship early', 'Keep motion continuous with a clear change in every shot', 'Leave room for an afterglow or loop at the end', 'Keep it original and watermark-free']),
  xiaohongshu_video: profile('小红书视频', 'Xiaohongshu video', 3, ['前 3 秒交代主题和观看理由', '画面主体清晰、细节可读', '保留真实质感，避免无意义快切', '保持原创、无水印'], ['Establish the topic and reason to watch within 3 seconds', 'Keep the subject clear and details legible', 'Preserve an authentic feel and avoid meaningless fast cuts', 'Keep it original and watermark-free']),
  youtube_shorts: profile('YouTube Shorts', 'YouTube Shorts', 2, ['第一画面就让主题可理解', '用连续动作支撑观看完成度', '结尾完成故事或自然回环', '保持原创、无水印'], ['Make the topic understandable from the first frame', 'Use continuous action to support completion', 'Complete the story or create a natural loop at the end', 'Keep it original and watermark-free']),
  instagram_reels: profile('Instagram Reels', 'Instagram Reels', 2, ['开头快速建立视觉关系', '动作和情绪保持连续', '结尾自然回环或留下余味', '保持原创、无水印'], ['Establish the visual relationship quickly', 'Keep action and emotion continuous', 'End with a natural loop or lingering feeling', 'Keep it original and watermark-free']),
  tiktok: profile('TikTok', 'TikTok', 2, ['前 1–2 秒出现主体或动作钩子', '按信息量自动调整节奏密度', '结尾保留互动或回环空间', '保持原创、无水印'], ['Show the subject or action hook in the first 1–2 seconds', 'Adjust pacing density to the information load', 'Leave room for interaction or a loop at the end', 'Keep it original and watermark-free']),
  douyin: profile('抖音短视频', 'Douyin short video', 2, ['前 1–2 秒出现主体或动作钩子', '按信息量自动调整节奏密度', '结尾保留互动或回环空间', '保持原创、无水印'], ['Show the subject or action hook in the first 1–2 seconds', 'Adjust pacing density to the information load', 'Leave room for interaction or a loop at the end', 'Keep it original and watermark-free']),
  bilibili: profile('B站视频', 'Bilibili video', 3, ['开头快速交代主题与观看收益', '保留叙事铺垫，不为快切牺牲理解', '结尾完成信息闭环并留下讨论空间', '保持原创、无水印'], ['Quickly establish the topic and viewer payoff', 'Keep narrative setup instead of sacrificing clarity for fast cuts', 'Close the information loop and leave room for discussion', 'Keep it original and watermark-free']),
  wechat_channels: profile('视频号', 'WeChat Channels', 2, ['开头直接交代人物、场景和关系', '动作清楚、节奏稳定、信息不过载', '结尾保留自然分享或回环空间', '保持原创、无水印'], ['Establish the character, scene, and relationship directly', 'Keep action clear, pacing steady, and information light', 'Leave room for natural sharing or a loop at the end', 'Keep it original and watermark-free']),
  facebook_reels: profile('Facebook Reels', 'Facebook Reels', 2, ['开头快速呈现可理解的视觉事件', '让动作在移动端小画面中仍然清楚', '结尾形成完整情绪或自然回环', '保持原创、无水印'], ['Present an understandable visual event quickly', 'Keep action clear on a small mobile screen', 'End with a complete emotional beat or natural loop', 'Keep it original and watermark-free']),
  kuaishou: profile('快手短视频', 'Kuaishou short video', 2, ['前几秒建立真实、可亲近的观看入口', '动作连贯，保留人物真实反应', '结尾留下互动或生活化余韵', '保持原创、无水印'], ['Create an authentic, approachable entry in the first seconds', 'Keep action coherent and preserve genuine reactions', 'Leave room for interaction or an everyday afterglow', 'Keep it original and watermark-free'])
};

const PLATFORM_ALIASES = { xiaohongshu: 'xiaohongshu_video', reels: 'instagram_reels' };

export function planStoryboard(input = {}) {
  const duration = clampInteger(input.duration_seconds ?? 18, 6, 60);
  const language = normalizeLanguage(input.language);
  const platformProfile = normalizePlatformProfile(input.platform_profile);
  const profile = PLATFORM_PROFILES[platformProfile];
  const complexity = estimateComplexity(input);
  const shotCount = chooseShotCount(duration, complexity);
  const scene = resolveScene(input, shotCount);
  const shots = allocateShots(duration, shotCount).map((shot, index) => ({
    ...shot,
    scene: scene.shot_scenes[index] || scene.selected,
    previous_scene: index > 0 ? scene.shot_scenes[index - 1] || scene.selected : '',
    space_transition: index > 0 && (scene.shot_scenes[index] || scene.selected) !== (scene.shot_scenes[index - 1] || scene.selected)
  }));
  const explicitRatio = ['1:1', '3:4', '4:5', '9:16', '16:9'].includes(input.aspect_ratio) ? input.aspect_ratio : profile.aspect_ratio;
  const characterAnchor = firstText(input.character_anchor, input.character, '主体身份、外观、服装与体态');
  const platformLabel = localized(profile.label, profile.label_en, language);
  const guidance = profile.guidance.map((item, index) => localized(item, profile.guidance_en[index], language));

  return {
    version: 'storyboard-plan/1.0',
    platform_profile: platformProfile,
    platform_label: platformLabel,
    duration_seconds: duration,
    aspect_ratio: explicitRatio,
    shot_count: shotCount,
    narrative_complexity: complexity,
    scene,
    hook_seconds: Math.min(profile.hook_seconds, shots[0].duration_seconds),
    guidance,
    character_anchor: characterAnchor,
    product_anchor: firstText(input.product_anchor, input.consistency_state?.product?.identity, input.consistency_state?.product?.name),
    natural_action_rule: localized('同一空间内保持姿态、重心、视线和手部方向自然接续；空间切换时用动作方向、视线或声音做桥接，不强行保持背景；不突然换装、不改变人物数量。', 'Within one space, continue pose, weight, eyeline, and hand direction naturally; when the space changes, bridge it through movement, eyeline, or sound instead of forcing the old background; do not change wardrobe or subject count.', language),
    reasons: [
      language === 'en' ? `${duration} seconds` : language === 'bilingual' ? `${duration} 秒 / ${duration} seconds` : `时长 ${duration} 秒`,
      language === 'en' ? `Narrative complexity ${complexity}/5` : language === 'bilingual' ? `叙事复杂度 ${complexity}/5 / Narrative complexity ${complexity}/5` : `叙事复杂度 ${complexity}/5`,
      localized(`按 ${profile.label} 策略保留首屏钩子、连续动作和结尾回环`, `Use the ${profile.label_en} strategy for an opening hook, continuous action, and an ending loop`, language),
      scene.mode === 'random'
        ? localized(`场景由 seed ${scene.seed} 可复现选择`, `Scene selected reproducibly from seed ${scene.seed}`, language)
        : scene.mode === 'auto'
          ? localized(`空间按故事中的使用顺序自动安排${scene.transitions.length ? `，包含 ${scene.transitions.length} 次空间切换` : ''}`, `Spaces follow the story order automatically${scene.transitions.length ? `, with ${scene.transitions.length} space transition(s)` : ''}`, language)
          : localized('场景使用用户选择', 'Scene uses the user selection', language)
    ],
    shots
  };
}

function profile(label, label_en, hook_seconds, guidance, guidance_en) {
  return { label, label_en, aspect_ratio: '9:16', hook_seconds, guidance, guidance_en };
}

function normalizePlatformProfile(value) {
  const candidate = PLATFORM_ALIASES[value] || value;
  return PLATFORM_PROFILES[candidate] ? candidate : 'generic_short';
}

function normalizeLanguage(value) {
  return ['zh', 'en', 'bilingual'].includes(value) ? value : 'zh';
}

function localized(zh, en, language) {
  if (language === 'en') return en;
  if (language === 'bilingual') return `${zh} / ${en}`;
  return zh;
}

export function estimateComplexity(input = {}) {
  const text = [input.idea, input.emotion, input.environment, input.life, input.character, input.time].filter((value) => typeof value === 'string').join(' ');
  const transitionMatches = text.match(/然后|随后|之后|但是|同时|最终|从.+到|and then|after|but|finally/gi) || [];
  let score = 1 + Math.min(3, transitionMatches.length);
  if (text.length > 160) score += 1;
  if (input.character_anchor && input.action_anchor) score += 1;
  return Math.min(5, score);
}

function chooseShotCount(duration, complexity) {
  let count = 2;
  if (duration >= 12) count += 1;
  if (duration >= 24) count += 1;
  if (duration >= 40) count += 1;
  if (complexity >= 3) count += 1;
  if (complexity >= 5) count += 1;
  return Math.min(6, count);
}

function allocateShots(duration, count) {
  const hook = Math.max(1, Math.round(duration * 0.12));
  const ending = Math.max(1, Math.round(duration * 0.18));
  const middleCount = count - 2;
  const middleTotal = duration - hook - ending;
  const middleBase = middleCount ? Math.floor(middleTotal / middleCount) : 0;
  let remainder = middleCount ? middleTotal - middleBase * middleCount : 0;
  const durations = [hook];
  for (let index = 0; index < middleCount; index += 1) {
    durations.push(middleBase + (remainder > 0 ? 1 : 0));
    remainder -= 1;
  }
  durations.push(ending);
  return durations.map((duration_seconds, index) => ({
    id: `shot-${index + 1}`,
    order: index + 1,
    duration_seconds,
    frame_role: index === 0 ? 'start' : index === count - 1 ? 'end' : 'development',
    phase: index === 0 ? 'hook' : index === count - 1 ? 'payoff' : 'development'
  }));
}

function resolveScene(input, shotCount = 1) {
  const requestedMode = ['selected', 'random', 'auto'].includes(input.scene_mode) ? input.scene_mode : 'auto';
  const candidates = normalizeList(input.scene_options);
  if (requestedMode === 'selected') {
    const selected = firstText(input.environment, '用户选择场景');
    return { mode: requestedMode, selected, sequence: [selected], shot_scenes: Array(shotCount).fill(selected), transitions: [], candidates, seed: '' };
  }
  if (requestedMode === 'random') {
    const pool = candidates.length ? candidates : DEFAULT_SCENES;
    const seed = firstText(input.scene_seed, input.idea, 'story');
    const selected = pool[stableIndex(seed, pool.length)];
    return { mode: requestedMode, selected, sequence: [selected], shot_scenes: Array(shotCount).fill(selected), transitions: [], candidates: pool, seed };
  }

  const sequence = inferSceneSequence(input);
  const shotScenes = distributeSpaces(sequence, shotCount);
  const transitions = shotScenes.reduce((items, scene, index) => {
    if (index > 0 && scene !== shotScenes[index - 1]) items.push({ after_shot: index, from: shotScenes[index - 1], to: scene });
    return items;
  }, []);
  return { mode: 'auto', selected: shotScenes[0], sequence, shot_scenes: shotScenes, transitions, candidates: sequence, seed: firstText(input.scene_seed, input.idea, 'story') };
}

function inferSceneSequence(input) {
  const explicit = normalizeList(input.scene_sequence || input.space_sequence);
  if (explicit.length) return unique(explicit);
  const candidates = normalizeList(input.scene_options);
  if (candidates.length) return unique(candidates);
  const environmentSequence = splitSequence(firstText(input.environment));
  if (environmentSequence.length) return unique(environmentSequence);
  return [firstText(input.environment, '用户选择场景')];
}

function splitSequence(value) {
  if (!value) return [];
  return value.split(/\s*(?:->|→|=>)\s*/).map((item) => item.trim()).filter(Boolean);
}

function distributeSpaces(sequence, shotCount) {
  const spaces = unique(sequence).length ? unique(sequence) : ['用户选择场景'];
  return Array.from({ length: shotCount }, (_, index) => spaces[Math.min(spaces.length - 1, Math.floor(index * spaces.length / shotCount))]);
}

function unique(values) { return [...new Set(values)]; }

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function stableIndex(value, length) {
  let hash = 2166136261;
  for (const character of String(value)) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return Math.abs(hash) % length;
}

function clampInteger(value, minimum, maximum) {
  const integer = Number.isInteger(value) ? value : Number.parseInt(value, 10);
  return Number.isFinite(integer) ? Math.max(minimum, Math.min(maximum, integer)) : minimum;
}

function firstText(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}
