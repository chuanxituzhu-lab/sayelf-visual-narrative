const manifestId = 'life-comes-closer';

export function execute(input) {
  const language = input.language ?? 'zh';
  const aspectRatio = input.aspect_ratio ?? '9:16';
  const duration = input.duration_seconds ?? 18;
  const t = (zh, en) => language === 'en' ? en : language === 'bilingual' ? `${zh}\n${en}` : zh;
  const idea = input.idea.trim();
  const world = input.environment ?? '高原花海，远处是安静的雪山';
  const life = input.life ?? '一头温和的牛';
  const character = input.character ?? '一只停在空气中的手';
  const time = input.time ?? '清晨';
  const emotion = input.emotion ?? '信任';
  const core = { id: 'life-comes-closer-core', idea, theme: idea, emotion, world, life, relation: '陌生 → 注意 → 靠近', decisive_moment: `${life}主动靠近，鼻尖第一次触到${character}的指尖`, afterglow: '人慢慢收回手，生命重新低头吃草，世界恢复安静' };
  const continuity = `${world}；${life}、${character}、${time}的自然光在所有镜头保持一致`;
  const prompt = `${t('纪实自然摄影，竖幅', 'Photorealistic documentary nature photography, vertical frame')} ${aspectRatio}。${world}。镜头贴近地面，前景有真实花草遮挡；中景是${life}与${character}之间即将发生的接触；背景保留雪山与呼吸感。捕捉决定性瞬间：${core.decisive_moment}。自然光、真实材质、单一视觉焦点、克制而温柔的信任感。`;
  const negative = t('文字、数字、标志、水印、摆拍、塑料质感、过度 HDR、虚假光晕、杂乱背景、第二个视觉焦点', 'text, numbers, logos, watermark, staged pose, plastic texture, excessive HDR, fake glow, cluttered background, second focal point');
  const [first, second, third] = splitDuration(duration);
  return { contract_version: 'dual-output/1.0', skill_id: manifestId, narrative_core: core, image_prompt: { contract_version: 'dual-output/1.0', type: 'image_prompt', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, prompt, negative_prompt: negative, keyframe: { title: t('鼻尖与指尖之间', 'Between the nose and the fingertip'), decisive_moment: core.decisive_moment, foreground: t('贴近镜头的花草与少量露珠形成自然遮挡', 'Near flowers and a few dew drops create natural foreground occlusion'), midground: `${life}、${character}与即将发生的触碰`, background: world, continuity_anchor: continuity } }, video_storyboard: { contract_version: 'dual-output/1.0', type: 'video_storyboard', narrative_core_id: core.id, language, aspect_ratio: aspectRatio, duration_seconds: duration, continuity_anchor: continuity, shots: [
    { id: 'shot-1', order: 1, duration_seconds: first, frame_role: 'start', visual_action: t('镜头从花草内部缓慢向前，远处的牛只抬头注意到人。', 'The camera moves slowly through the flowers as the cow notices the person.'), camera: t('离地约 20 厘米，低机位，轻微呼吸感推进。', 'About 20 cm above ground, low angle, a gentle breathing push-in.'), transition: t('从花叶遮挡中自然显露中景。', 'Reveal the middle ground naturally through the leaves.'), audio: t('风声、草叶摩擦声，远处无方向性的环境声。', 'Wind, grass brushing, and distant non-directional ambience.'), continuity },
    { id: 'shot-2', order: 2, duration_seconds: second, frame_role: 'development', visual_action: t('牛放慢脚步，沿着花草留下的视觉通道靠近，人的手保持不动。', 'The cow slows down and follows the visual path through the flowers while the hand stays still.'), camera: t('保持同一高度，微幅跟随，不切断人与动物的视线关系。', 'Keep the same height and follow gently without breaking the sightline.'), transition: t('用一步靠近连接到决定性接触。', 'Use the final step forward to connect to the decisive contact.'), audio: t('脚步压过草地的细响，环境声保持连续。', 'Soft steps on grass; ambience remains continuous.'), continuity },
    { id: 'shot-3', order: 3, duration_seconds: third, frame_role: 'end', visual_action: t(`${life}的鼻尖第一次轻触指尖，随后人收回手，${life}重新低头吃草。`, "The cow's nose gently touches the fingertip for the first time; the hand withdraws and the cow returns to grazing."), camera: t('停在关键帧构图，留出花海与雪山的安静余韵。', 'Settle into the keyframe composition and leave the flowers and snow mountain in quiet afterglow.'), transition: t('接触后停留，再以自然动作结束，不制造戏剧性剪辑。', 'Hold after contact, then end on the natural action without dramatic cutting.'), audio: t('轻微呼吸声与草叶声，最后回到风声。', 'A soft breath and grass; return to wind at the end.'), continuity }
  ] } };
}

function splitDuration(duration) {
  const first = Math.max(1, Math.floor(duration * 0.28));
  const second = Math.max(1, Math.floor(duration * 0.38));
  return [first, second, duration - first - second];
}
