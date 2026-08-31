import { planStoryboard } from '../../core/dual-output/storyboard-planner.mjs';

const manifestId = 'life-comes-closer';

export function execute(input) {
  const language = input.language ?? 'zh';
  const plan = input.plan ?? planStoryboard(input);
  const aspectRatio = plan.aspect_ratio;
  const t = (zh, en) => language === 'en' ? en : language === 'bilingual' ? `${zh}\n${en}` : zh;
  const idea = input.idea.trim();
  const world = input.environment ?? '高原花海，远处是安静的雪山';
  const life = input.life ?? '一头温和的牛';
  const character = input.character ?? '一只停在空气中的手';
  const characterAnchor = input.character_anchor ?? character;
  const characterType = input.character_type ?? 'human-nature encounter';
  const product = input.consistency_state?.product || {};
  const productAnchor = input.product_anchor || product.identity || product.name || '';
  const time = input.time ?? '清晨';
  const emotion = input.emotion ?? '信任';
  const actionAnchor = input.action_anchor ?? `${life}主动靠近，鼻尖第一次触到${character}的指尖`;
  const naturalAction = plan.natural_action_rule || t('同一空间内主体从上一镜头的重心、步幅、视线和接触点自然接续；空间切换时用动作、视线或声音桥接，不改变外观或主体数量。', 'Within one space, continue naturally from the previous shot\'s weight, stride, eyeline, and contact point; when the space changes, bridge it with movement, eyeline, or sound without appearance or subject-count drift.');
  const core = { id: 'life-comes-closer-core', idea, theme: idea, emotion, world, life, relation: t('陌生 → 注意 → 靠近', 'Stranger → attention → approach'), decisive_moment: actionAnchor, afterglow: t('人慢慢收回手，生命恢复自己的节奏，世界重新安静', 'The hand slowly withdraws; life returns to its own rhythm and the world grows quiet again') };
  const continuity = [
    world,
    `${t('主体一致性锚点：', 'Subject continuity anchor: ')}${characterAnchor}（${characterType}）`,
    t(`${life}、${character}、${time}的自然光与材质在所有镜头保持一致`, `Keep the natural light and material of ${life}, ${character}, and ${time} consistent across every shot`),
    naturalAction,
    productAnchor ? `${t('产品一致性锚点：', 'Product continuity anchor: ')}${productAnchor}${product.appearance ? `；${product.appearance}` : ''}` : ''
  ].filter(Boolean).join(language === 'en' ? '; ' : '；');
  const prompt = [
    `${t('纪实自然摄影，竖幅', 'Photorealistic documentary nature photography, vertical frame')} ${aspectRatio}.`,
    `${world}.`,
    `${t('保持主体连续：', 'Keep the subject continuous: ')}${characterAnchor}.`,
    productAnchor ? `${t('保持产品连续：', 'Keep the product continuous: ')}${productAnchor}${product.appearance ? `，${product.appearance}` : ''}.` : '',
    t(`镜头贴近地面，前景有真实花草遮挡；中景是${life}与${character}之间即将发生的接触；背景保留呼吸感。`, `Stay close to the ground with real flowers and grass occluding the foreground; the midground holds the coming contact between ${life} and ${character}; keep breathing space in the background.`),
    `${t('捕捉决定性瞬间：', 'Capture the decisive moment: ')}${actionAnchor}.`,
    t('自然光、真实材质、单一视觉焦点、克制而温柔的信任感。', 'Use natural light, tangible materials, one visual focus, and a restrained, tender sense of trust.')
  ].join(language === 'en' ? ' ' : '');
  const negative = t('文字、数字、标志、水印、摆拍、塑料质感、过度 HDR、虚假光晕、杂乱背景、第二个视觉焦点、主体外观漂移、动作跳变、主体数量变化', 'text, numbers, logos, watermark, staged pose, plastic texture, excessive HDR, fake glow, cluttered background, second focal point, subject appearance drift, discontinuous motion, changing subject count');
  const shots = plan.shots.map((shot) => createShot({ shot, plan, world, life, character, characterAnchor, characterType, productAnchor, actionAnchor, naturalAction, core, t, language }));
  return { contract_version: 'dual-output/1.0', skill_id: manifestId, narrative_core: core, image_prompt: { contract_version: 'dual-output/1.0', type: 'image_prompt', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, prompt, negative_prompt: negative, keyframe: { title: t('接触发生之前', 'Before the contact'), decisive_moment: core.decisive_moment, foreground: t('贴近镜头的花草与少量露珠形成自然遮挡', 'Near flowers and a few dew drops create natural foreground occlusion'), midground: t(`${life}、${character}与即将发生的触碰`, `${life}, ${character}, and the coming contact`), background: world, continuity_anchor: continuity } }, video_storyboard: { contract_version: 'dual-output/1.0', type: 'video_storyboard', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, duration_seconds: plan.duration_seconds, continuity_anchor: continuity, shots } };
}

function createShot({ shot, plan, world, life, character, characterAnchor, characterType, productAnchor, actionAnchor, naturalAction, core, t, language }) {
  const isStart = shot.frame_role === 'start';
  const isEnd = shot.frame_role === 'end';
  const shotWorld = shot.scene || plan.scene?.selected || world;
  const sceneChange = Boolean(shot.space_transition);
  const visualAction = isStart
    ? t(`${shotWorld}保持安静，${characterAnchor}先被环境注意到。`, `In ${shotWorld}, the scene stays quiet as the environment first notices ${characterAnchor}.`)
    : isEnd
      ? t(`${characterAnchor}沿着上一镜头的动作自然完成接触：${actionAnchor}；${core.afterglow}。`, `${characterAnchor} completes the contact naturally from the previous action: ${actionAnchor}; ${core.afterglow}.`)
      : t(`${characterAnchor}放慢动作，沿着上一镜头的视线和运动方向靠近；人的手或陪伴者保持稳定，逐步进入决定性接触。`, `${characterAnchor} slows down and approaches along the previous eyeline and movement direction; the person's hand or companion stays steady, gradually entering the decisive contact.`);
  return {
    id: shot.id,
    order: shot.order,
    duration_seconds: shot.duration_seconds,
    frame_role: shot.frame_role,
    visual_action: visualAction,
    camera: isStart ? t('离地约 20 厘米，低机位，轻微呼吸感推进。', 'About 20 cm above ground, low angle, a gentle breathing push-in.') : isEnd ? t('停在关键帧构图，保持主体比例、外观和接触点连续。', 'Settle into the keyframe while preserving subject scale, appearance, and contact point.') : t('保持同一高度，微幅跟随，不切断人物与主体的视线关系。', 'Keep the same height and follow gently without breaking the sightline between person and subject.'),
    transition: sceneChange ? t(`空间切换：由${shot.previous_scene}进入${shotWorld}，用靠近动作、视线或声音完成桥接。`, `Space transition: move from ${shot.previous_scene} into ${shotWorld}, bridged by approach, eyeline, or sound.`) : isStart ? t('从环境的自然变化中显露主体。', 'Reveal the subject through a natural environmental change.') : isEnd ? t('接触后停留，再以自然动作结束，不制造戏剧性剪辑。', 'Hold after contact, then end on the natural action without dramatic cutting.') : t('用下一步靠近连接到下一镜，保持运动方向连续。', 'Use the next step to connect to the next shot while preserving movement direction.'),
    audio: sceneChange ? t('前一空间的环境声渐变到新空间，保留步伐或呼吸作为桥。', 'Bridge the previous space ambience into the new space, keeping steps or breathing as the bridge.') : isStart ? t('风声、环境底噪与细微材质声。', 'Wind, ambient bed, and subtle material sounds.') : t('环境声保持连续，突出自然步伐与呼吸。', 'Keep the ambience continuous, with natural steps and breathing.'),
    continuity: [naturalAction, `${t('主体锚点：', 'Subject anchor: ')}${characterAnchor}（${characterType}）`, productAnchor ? `${t('产品锚点：', 'Product anchor: ')}${productAnchor}` : '', sceneChange ? `${t('空间切换：', 'Space transition: ')}${shot.previous_scene} → ${shotWorld}` : `${t('场景：', 'Scene: ')}${shotWorld}`, `${t('生命主体：', 'Living subject: ')}${life}`, `${t('接触点：', 'Contact point: ')}${character}`].filter(Boolean).join(language === 'en' ? '; ' : '；')
  };
}
