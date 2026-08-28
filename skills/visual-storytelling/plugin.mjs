const manifestId = 'visual-storytelling';

export function execute(input) {
  const language = input.language ?? 'zh';
  const aspectRatio = input.aspect_ratio ?? '9:16';
  const duration = input.duration_seconds ?? 18;
  const t = (zh, en) => language === 'en' ? en : language === 'bilingual' ? `${zh}\n${en}` : zh;
  const idea = input.idea.trim();
  const world = input.environment ?? '临山的小屋，雨刚刚停，窗外有一片新叶';
  const life = input.life ?? '一束穿过窗缝的光';
  const character = input.character ?? '门边的一片新叶';
  const time = input.time ?? '雨后的午后';
  const emotion = input.emotion ?? '释然';
  const core = { id: 'visual-storytelling-core', idea, theme: idea, emotion, world, life, relation: '封闭 → 呼吸 → 松开', decisive_moment: `${life}落在${character}上，空间第一次重新呼吸`, afterglow: '光继续移动，未被解释的安静留给观看者' };
  const continuity = `${world}；${life}、${character}、${time}的色彩与材质在所有镜头保持一致`;
  const prompt = `${t('高纯度、明亮、克制的手工绘画式视觉叙事，竖幅', 'High-chroma, bright, restrained handcrafted visual storytelling, vertical frame')} ${aspectRatio}。${world}。一个低刺激、拥有大面积呼吸空间的构图；${life}成为唯一视觉钩子，${character}承接它的光。捕捉决定性瞬间：${core.decisive_moment}。保留未解决的余韵，颜色鲜明但情绪安静，材质真实可感。`;
  const negative = t('文字、数字、标题、印章、签名、水印、标志、灰雾、复古褪色、杂乱装饰、普通摄影、塑料 3D、多个焦点', 'text, numbers, title, seal, signature, watermark, logo, gray cast, vintage fading, decorative clutter, ordinary photography, plastic 3D, multiple focal points');
  const [first, second, third] = splitDuration(duration);
  return { contract_version: 'dual-output/1.0', skill_id: manifestId, narrative_core: core, image_prompt: { contract_version: 'dual-output/1.0', type: 'image_prompt', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, prompt, negative_prompt: negative, keyframe: { title: t('窗缝里的第一束光', 'The first light through the window'), decisive_moment: core.decisive_moment, foreground: t('湿润窗台与一小片留白形成柔和入口', 'A damp windowsill and a small area of negative space form a gentle entrance'), midground: `${life}与${character}之间的光影关系`, background: world, continuity_anchor: continuity } }, video_storyboard: { contract_version: 'dual-output/1.0', type: 'video_storyboard', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, duration_seconds: duration, continuity_anchor: continuity, shots: [
    { id: 'shot-1', order: 1, duration_seconds: first, frame_role: 'start', visual_action: t('画面从安静的暗部开始，雨滴沿窗面缓慢滑落。', 'Begin in a quiet shadow; raindrops move slowly down the window.'), camera: t('固定近景，留出大面积暗部与呼吸空间。', 'A locked close view with generous shadow and breathing space.'), transition: t('一滴雨落下后，窗缝进入微光。', 'After one drop falls, a thin line of light enters.'), audio: t('雨后滴水声与极轻的室内空气声。', 'After-rain drops and very soft indoor air.'), continuity },
    { id: 'shot-2', order: 2, duration_seconds: second, frame_role: 'development', visual_action: t(`光线沿窗台移动，慢慢触到${character}，颜色从暗部恢复。`, `Light travels across the sill and reaches ${character} as color returns from the shadow.`), camera: t('保持安静的横向微移，不增加新的主体。', 'A quiet lateral drift; introduce no new subject.'), transition: t('让光的移动直接连续到关键帧。', 'Let the movement of light carry directly into the keyframe.'), audio: t('滴水声变稀，留出光线变化的时间。', 'The drops thin out, leaving time for the light to change.'), continuity },
    { id: 'shot-3', order: 3, duration_seconds: third, frame_role: 'end', visual_action: t(`${life}落在${character}上，光继续移动，画面不解释下一步。`, `${life} rests on ${character}; the light keeps moving and the frame does not explain what comes next.`), camera: t('停留在决定性关键帧，保持高亮颜色与低密度构图。', 'Hold on the decisive keyframe with bright color and low-density composition.'), transition: t('以自然的光影余韵结束，不使用戏剧性淡出。', 'End on the natural afterglow without a dramatic fade.'), audio: t('雨停后的风声，最后保留一小段安静。', 'Wind after rain, ending with a small pocket of silence.'), continuity }
  ] } };
}

function splitDuration(duration) {
  const first = Math.max(1, Math.floor(duration * 0.28));
  const second = Math.max(1, Math.floor(duration * 0.38));
  return [first, second, duration - first - second];
}
