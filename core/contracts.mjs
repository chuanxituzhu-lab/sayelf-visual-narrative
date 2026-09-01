export const OUTPUT_TYPES = Object.freeze(["image", "storyboard", "both"]);
export const OUTPUT_CONTRACT = "hidden-nature-window.output";
export const OUTPUT_VERSION = "0.6.0";
export const VISUAL_GRAMMAR = Object.freeze(["enter", "enclose", "guide", "reveal"]);
export const CONTINUITY_SHOT_ORDER = Object.freeze(["ENTER", "ENCLOSE", "GUIDE", "REVEAL", "HOLD"]);

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value ?? "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createContinuityAnchor({ scene, variation, scene_id, source = "preset" }) {
  const descriptor = {
    scene_id: scene_id || "composed",
    source,
    subject: scene?.plant_en,
    window: scene?.window_en,
    hook: scene?.hook_en,
    palette: scene?.dominant_en,
    camera: variation?.camera_micro?.en,
    light: scene?.light_en,
    sky: variation?.upward_sky?.en
  };
  const continuity_id = `nw-${hashText(JSON.stringify(descriptor)).toString(16).padStart(8, "0")}`;
  return {
    continuity_id,
    scene_identity: { zh: scene?.name_zh || "自然窗口", en: scene?.name_en || "Nature Window" },
    subject: { zh: scene?.plant_zh || "自然主体", en: scene?.plant_en || "the natural subject" },
    environment: { zh: scene?.enclosure_zh || "自然环境", en: scene?.enclosure_en || "the natural environment" },
    window: { zh: scene?.window_zh || "隐藏窗口", en: scene?.window_en || "the hidden window" },
    visual_hook: { zh: scene?.hook_zh || "唯一视觉钩子", en: scene?.hook_en || "the single visual hook" },
    palette: { zh: scene?.dominant_zh || "自然主色", en: scene?.dominant_en || "the dominant natural palette" },
    camera_anchor: variation?.camera_micro || { zh: "可信低位机位", en: "a believable low camera position" },
    light_anchor: { zh: scene?.light_zh || "自然光", en: scene?.light_en || "natural light" },
    motion_anchor: variation?.depth_rhythm || { zh: "连续推进", en: "continuous forward motion" },
    shot_order: [...CONTINUITY_SHOT_ORDER],
    image_keyframe: "REVEAL",
    final_hold: "HOLD",
    rule_zh: "五个镜头保持同一主体、环境、窗口、视觉钩子、色彩、光线和镜头身份；只推进从进入到显露的发现过程。",
    rule_en: "Keep the same subject, environment, window, hook, palette, light and camera identity across all five shots; only advance the discovery from entry to reveal."
  };
}

export function normalizeOutput(value = "image") {
  if (!OUTPUT_TYPES.includes(value)) {
    const error = new Error(`Unsupported output: ${value}`);
    error.code = "UNSUPPORTED_OUTPUT";
    throw error;
  }
  return value;
}

export function selectedOutputTypes(output) {
  return normalizeOutput(output) === "both" ? ["image", "storyboard"] : [output];
}

export function createOutputContract({
  output,
  language,
  source = "preset",
  scene_id,
  scene,
  seed,
  variation,
  outputs,
  continuity,
  errors = []
}) {
  const resolvedContinuity = continuity || (scene && variation ? createContinuityAnchor({ scene, variation, scene_id, source }) : undefined);
  const contract = {
    contract: OUTPUT_CONTRACT,
    version: OUTPUT_VERSION,
    output: normalizeOutput(output),
    language,
    source,
    scene,
    seed,
    variation,
    visual_grammar: [...VISUAL_GRAMMAR],
    outputs,
    continuity: resolvedContinuity,
    errors
  };
  if (scene_id) contract.scene_id = scene_id;
  return validateOutputContract(contract);
}

export function validateOutputContract(contract) {
  if (contract.contract !== OUTPUT_CONTRACT) throw new Error("Invalid output contract name");
  if (!OUTPUT_TYPES.includes(contract.output)) throw new Error("Invalid output contract selection");
  if (JSON.stringify(contract.visual_grammar) !== JSON.stringify(VISUAL_GRAMMAR)) {
    throw new Error("Output contract changed the frozen visual grammar");
  }
  const selected = new Set(selectedOutputTypes(contract.output));
  for (const type of Object.keys(contract.outputs || {})) {
    if (!selected.has(type)) throw new Error(`Unexpected output fragment: ${type}`);
  }
  if (!Array.isArray(contract.errors)) throw new Error("Output contract errors must be an array");
  if (!contract.continuity?.continuity_id) throw new Error("Output contract requires a continuity anchor");
  return contract;
}

export function renderOutputContract(contract) {
  return Object.values(contract.outputs || {})
    .map(output => output.text || output.prompt || JSON.stringify(output, null, 2))
    .join("\n\n");
}
