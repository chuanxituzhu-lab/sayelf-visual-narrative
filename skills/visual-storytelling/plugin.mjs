import { planStoryboard } from '../../core/dual-output/storyboard-planner.mjs';

const manifestId = 'visual-storytelling';

export function execute(input) {
  const language = input.language ?? 'zh';
  const plan = input.plan ?? planStoryboard(input);
  const aspectRatio = plan.aspect_ratio;
  const t = (zh, en) => language === 'en' ? en : language === 'bilingual' ? `${zh}\n${en}` : zh;
  const idea = input.idea.trim();
  const world = input.environment ?? '临山的小屋，雨刚刚停，窗外有一片新叶';
  const life = input.life ?? '一束穿过窗缝的光';
  const character = input.character ?? '门边的一片新叶';
  const characterAnchor = input.character_anchor ?? character;
  const characterType = input.character_type ?? 'human';
  const product = input.consistency_state?.product || {};
  const productAnchor = input.product_anchor || product.identity || product.name || '';
  const time = input.time ?? '雨后的午后';
  const emotion = input.emotion ?? '释然';
  const actionAnchor = input.action_anchor ?? `${life}落在${character}上，空间第一次重新呼吸`;
  const performanceAnchor = input.performance_anchor ?? '动作克制，视线和重心稳定';
  const naturalAction = plan.natural_action_rule || t('同一空间内动作从上一镜头的姿态、重心、视线和手部方向自然接续；空间切换时用动作、视线或声音桥接，不突然换装、不改变人物数量。', 'Within one space, continue naturally from the previous pose, weight, eyeline, and hand direction; when the space changes, bridge it with movement, eyeline, or sound without changing wardrobe or subject count.');
  const core = { id: 'visual-storytelling-core', idea, theme: idea, emotion, world, life, relation: t('封闭 → 呼吸 → 松开', 'Closed → breathing → release'), decisive_moment: actionAnchor, afterglow: t('光继续移动，未被解释的安静留给观看者', 'The light keeps moving; the unexplained quiet is left to the viewer') };
  const continuity = [
    world,
    `${t('人物一致性锚点：', 'Character continuity anchor: ')}${characterAnchor}（${characterType}）`,
    t(`${time}的色彩与材质在所有镜头保持一致`, `Keep the color and material of ${time} consistent across every shot`),
    naturalAction,
    productAnchor ? `${t('产品一致性锚点：', 'Product continuity anchor: ')}${productAnchor}${product.appearance ? `；${product.appearance}` : ''}` : ''
  ].filter(Boolean).join(language === 'en' ? '; ' : '；');
  const prompt = [
    `${t('高纯度、明亮、克制的手工绘画式视觉叙事，竖幅', 'High-chroma, bright, restrained handcrafted visual storytelling, vertical frame')} ${aspectRatio}.`,
    `${world}.`,
    `${t('人物/拟人化人物保持连续：', 'Keep the character/anthropomorphic character continuous: ')}${characterAnchor}.`,
    productAnchor ? `${t('产品保持连续：', 'Keep the product continuous: ')}${productAnchor}${product.appearance ? `，${product.appearance}` : ''}.` : '',
    t(`一个低刺激、拥有大面积呼吸空间的构图；${life}成为唯一视觉钩子，${character}承接它的光。`, `Use a low-stimulation composition with generous breathing space; ${life} is the sole visual hook, and ${character} carries its light.`),
    `${t('捕捉决定性瞬间：', 'Capture the decisive moment: ')}${actionAnchor}.`,
    `${performanceAnchor}.`,
    t('保留未解决的余韵，颜色鲜明但情绪安静，材质真实可感。', 'Leave an unresolved afterglow; keep the colors vivid, the emotion quiet, and the materials tangible.')
  ].join(language === 'en' ? ' ' : '');
  const negative = t('文字、数字、标题、印章、签名、水印、标志、灰雾、复古褪色、杂乱装饰、普通摄影、塑料 3D、多个焦点、人物身份漂移、突然换装、肢体数量变化、动作跳变', 'text, numbers, title, seal, signature, watermark, logo, gray cast, vintage fading, decorative clutter, ordinary photography, plastic 3D, multiple focal points, character identity drift, sudden wardrobe change, changing character count, discontinuous motion');
  const shots = plan.shots.map((shot, index) => createShot({ shot, index, plan, world, character, characterAnchor, characterType, productAnchor, time, actionAnchor, performanceAnchor, naturalAction, core, t, language }));
  return { contract_version: 'dual-output/1.0', skill_id: manifestId, narrative_core: core, image_prompt: { contract_version: 'dual-output/1.0', type: 'image_prompt', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, prompt, negative_prompt: negative, keyframe: { title: t('决定性瞬间', 'The decisive moment'), decisive_moment: core.decisive_moment, foreground: t('真实材质与少量留白形成柔和入口', 'Real material and a small area of negative space form a gentle entrance'), midground: t(`${life}与${character}之间的光影关系`, `The light relationship between ${life} and ${character}`), background: world, continuity_anchor: continuity } }, video_storyboard: { contract_version: 'dual-output/1.0', type: 'video_storyboard', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, duration_seconds: plan.duration_seconds, continuity_anchor: continuity, shots } };
}

function createShot({ shot, plan, world, character, characterAnchor, characterType, productAnchor, time, actionAnchor, performanceAnchor, naturalAction, core, t, language }) {
  const isStart = shot.frame_role === 'start';
  const isEnd = shot.frame_role === 'end';
  const shotWorld = shot.scene || plan.scene?.selected || world;
  const sceneChange = Boolean(shot.space_transition);
  const visualAction = isStart
    ? t(`${shotWorld}在${time}保持安静，${characterAnchor}自然进入画面，先让观众理解人物与环境的关系。`, `In ${shotWorld}, the scene stays quiet in ${time}; ${characterAnchor} enters naturally so the viewer understands the relation between character and environment.`)
    : isEnd
      ? t(`${characterAnchor}沿着上一镜头的姿态自然完成动作：${actionAnchor}。${core.afterglow}。`, `${characterAnchor} completes the action naturally from the previous pose: ${actionAnchor}. ${core.afterglow}.`)
      : t(`动作从上一镜头自然延续，${characterAnchor}保持身份、体态和视线一致；${performanceAnchor}，逐步靠近决定性瞬间。`, `Continue the action naturally from the previous shot; ${characterAnchor} keeps the same identity, body, and eyeline; ${performanceAnchor}, gradually approaching the decisive moment.`);
  const camera = isStart
    ? t('固定近景，留出大面积呼吸空间，先建立人物与环境关系。', 'A locked close view with generous breathing space, first establishing the character and environment.')
    : isEnd
      ? t('停留在决定性关键帧，保持人物比例、服装、视线和构图连续。', 'Hold on the decisive keyframe, preserving character scale, wardrobe, eyeline, and composition.')
      : t('沿上一镜头的运动方向做微幅跟随，不增加新的主体，不打断人物动作。', 'Follow the previous movement direction with a restrained drift; add no new subject and do not break the character action.');
  return {
    id: shot.id,
    order: shot.order,
    duration_seconds: shot.duration_seconds,
    frame_role: shot.frame_role,
    visual_action: visualAction,
    camera,
    transition: sceneChange ? t(`空间切换：由${shot.previous_scene}进入${shotWorld}，用动作方向、视线或声音完成桥接。`, `Space transition: move from ${shot.previous_scene} into ${shotWorld}, bridged by movement direction, eyeline, or sound.`) : isStart ? t('用环境中的自然变化引出动作。', 'Let a natural environmental change lead into the action.') : isEnd ? t('以自然的光影余韵结束，不使用戏剧性淡出。', 'End on the natural afterglow without dramatic fading.') : t('保持动作方向连续，直接连接下一镜。', 'Keep the action direction continuous into the next shot.'),
    audio: sceneChange ? t('用前一空间的环境声渐变到新空间，保留动作声音作为桥。', 'Bridge the previous space ambience into the new space, keeping the action sound as a bridge.') : isStart ? t('连续的环境底噪与极轻的空气声。', 'Continuous ambient sound with very soft air.') : t('环境声保持连续，给人物动作和情绪变化留出时间。', 'Keep the ambience continuous and leave time for the character action and emotional change.'),
    continuity: [naturalAction, `${t('人物锚点：', 'Character anchor: ')}${characterAnchor}（${characterType}）`, productAnchor ? `${t('产品锚点：', 'Product anchor: ')}${productAnchor}` : '', sceneChange ? `${t('空间切换：', 'Space transition: ')}${shot.previous_scene} → ${shotWorld}` : `${t('场景：', 'Scene: ')}${shotWorld}`, `${t('关键对象：', 'Key object: ')}${character}`].filter(Boolean).join(language === 'en' ? '; ' : '；')
  };
}
