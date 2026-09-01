const SHOT_STAGES = Object.freeze(["ENTER", "ENCLOSE", "GUIDE", "REVEAL", "HOLD"]);
const DURATIONS = Object.freeze([3, 3, 3, 3, 3]);

function selectLanguage(language, zh, en) {
  if (language === "zh") return zh;
  if (language === "en") return en;
  return `【中文】\n${zh}\n\n【English】\n${en}`;
}

function shotCopy(stage, scene, variation) {
  const copies = {
    ENTER: {
      zh: `镜头从${scene.entry_zh}开始，缓慢贴近自然结构；${variation.camera_micro.zh}。`,
      en: `The camera begins with ${scene.entry_en}, slowly approaching the natural structure; ${variation.camera_micro.en}.`,
      motion_zh: "慢速、连续的微距推进，保持真实机位和稳定视线。",
      motion_en: "A slow continuous macro push-in keeps the physical camera position believable and the gaze stable."
    },
    ENCLOSE: {
      zh: `镜头继续进入${scene.enclosure_zh}，近景自然元素擦过镜头并形成真实遮挡；${variation.foreground_occlusion.zh}。`,
      en: `The camera continues into ${scene.enclosure_en}; near natural elements pass close to the lens and create authentic occlusion; ${variation.foreground_occlusion.en}.`,
      motion_zh: "前景植物以轻微自然风产生小幅运动，不切换到外部观察视角。",
      motion_en: "Foreground plants move slightly in a natural breeze without cutting to an outside observer viewpoint."
    },
    GUIDE: {
      zh: `茎秆、枝条和叶片方向开始引导视线，${variation.depth_rhythm.zh}；让中景结构逐渐清晰。`,
      en: `Stems, branches and leaf directions begin to guide the eye; ${variation.depth_rhythm.en}; let the midground structure become gradually legible.`,
      motion_zh: "镜头沿自然通道轻微偏移，运动方向与植物线条一致，节奏不跳跃。",
      motion_en: "The camera shifts gently along the natural corridor, following the plant lines without an abrupt rhythm change."
    },
    REVEAL: {
      zh: `前景遮挡让出一个克制的隐藏窗口：${scene.window_zh}；${variation.window_shape.zh}。唯一视觉钩子是${scene.hook_zh}。`,
      en: `The foreground parts to reveal a restrained hidden window: ${scene.window_en}; ${variation.window_shape.en}. The single visual hook is ${scene.hook_en}.`,
      motion_zh: `以${variation.moment.zh}作为显露瞬间，光线保持${scene.light_zh}。`,
      motion_en: `Use ${variation.moment.en} as the reveal moment while keeping ${scene.light_en}.`
    },
    HOLD: {
      zh: `停留在隐藏窗口、单一视觉钩子和三层空间关系上；${variation.hook_state.zh}。情绪：${scene.emotion_zh}。`,
      en: `Hold on the hidden window, the single visual hook and the three-layer depth relationship; ${variation.hook_state.en}. Emotion: ${scene.emotion_en}.`,
      motion_zh: "最后保持画面稳定三秒，只保留真实植物和光线的细微运动。",
      motion_en: "Hold the final composition for three seconds, retaining only subtle real movement in plants and light."
    }
  };
  return copies[stage];
}

function formatText(language, shots) {
  return shots.map(shot => {
    const title = `SHOT ${shot.index} — ${shot.stage} (${shot.duration_seconds}s)`;
    const zh = `图片分镜：${shot.image_prompt_zh}\n视频分镜：${shot.video_prompt_zh}`;
    const en = `Image storyboard frame: ${shot.image_prompt_en}\nVideo direction: ${shot.video_prompt_en}`;
    return language === "zh" ? `${title}\n${zh}` : language === "en" ? `${title}\n${en}` : `${title}\n【中文】\n${zh}\n\n【English】\n${en}`;
  }).join("\n\n");
}

export const id = "storyboard";
export const outputType = "storyboard";

function continuityLine(language, continuity, stage) {
  const zh = `连续性锚点：保持${continuity?.subject?.zh}、${continuity?.palette?.zh}、隐藏窗口${continuity?.window?.zh}和视觉钩子${continuity?.visual_hook?.zh}不变；本镜只推进 ${stage} 阶段。`;
  const en = `Continuity anchor: keep ${continuity?.subject?.en}, ${continuity?.palette?.en}, the hidden window ${continuity?.window?.en} and the visual hook ${continuity?.visual_hook?.en} unchanged; this shot only advances the ${stage} stage.`;
  return selectLanguage(language, zh, en);
}

export function compile({ scene, variation, language, continuity }) {
  const shots = SHOT_STAGES.map((stage, index) => {
    const copy = shotCopy(stage, scene, variation);
    const anchorZh = continuityLine("zh", continuity, stage);
    const anchorEn = continuityLine("en", continuity, stage);
    const imageZh = `${copy.zh} 画面保持${scene.dominant_zh}主色、真实光学景深和唯一出口。${anchorZh}`;
    const imageEn = `${copy.en} Keep ${scene.dominant_en} as the dominant field, with real optical depth and one visual exit. ${anchorEn}`;
    const videoZh = `${copy.zh} ${copy.motion_zh} ${anchorZh}`;
    const videoEn = `${copy.en} ${copy.motion_en} ${anchorEn}`;
    return {
      id: `shot-${String(index + 1).padStart(2, "0")}`,
      index: index + 1,
      stage,
      duration_seconds: DURATIONS[index],
      image_prompt_zh: imageZh,
      image_prompt_en: imageEn,
      video_prompt_zh: videoZh,
      video_prompt_en: videoEn,
      image_prompt: selectLanguage(language, imageZh, imageEn),
      video_prompt: selectLanguage(language, videoZh, videoEn),
      prompt: selectLanguage(language, imageZh, imageEn)
    };
  });

  return {
    type: outputType,
    format: "five-shot-storyboard",
    shot_count: shots.length,
    duration_seconds: DURATIONS.reduce((sum, value) => sum + value, 0),
    stages: [...SHOT_STAGES],
    shots,
    continuity_id: continuity?.continuity_id,
    consistency_anchor: continuity,
    text: formatText(language, shots)
  };
}
