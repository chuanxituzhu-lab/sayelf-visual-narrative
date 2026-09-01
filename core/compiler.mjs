import { loadJsonProviders, loadComposer } from "./plugin-loader.mjs";
import { compileOutputs } from "./output-dispatcher.mjs";
import {
  OUTPUT_TYPES as CONTRACT_OUTPUT_TYPES,
  normalizeOutput,
  VISUAL_GRAMMAR as FROZEN_VISUAL_GRAMMAR
} from "./contracts.mjs";

export const LANGUAGES = ["zh", "en", "bilingual"];
export const OUTPUT_TYPES = CONTRACT_OUTPUT_TYPES;
export const VISUAL_GRAMMAR = FROZEN_VISUAL_GRAMMAR;
export { NEGATIVE_ZH, NEGATIVE_EN, ASPECT_RATIOS, VISUAL_STYLES } from "../plugins/outputs/image/index.mjs";
export { renderOutputContract } from "./contracts.mjs";

export function loadScenes() {
  return loadJsonProviders("scene-provider");
}
export function loadVariations() {
  return loadJsonProviders("variation-provider");
}

export function listScenes() {
  const scenes = loadScenes();
  return Object.entries(scenes).map(([id, scene]) => ({
    id,
    name_zh: scene.name_zh,
    name_en: scene.name_en
  }));
}

export function resolveScene(sceneId, overrides = {}) {
  const scenes = loadScenes();
  const base = scenes[sceneId];
  if (!base) {
    const err = new Error(`Unknown scene: ${sceneId}`);
    err.code = "UNKNOWN_SCENE";
    throw err;
  }

  const map = {
    plant: ["plant_zh", "plant_en"],
    entry: ["entry_zh", "entry_en"],
    enclosure: ["enclosure_zh", "enclosure_en"],
    window: ["window_zh", "window_en"],
    hook: ["hook_zh", "hook_en"],
    light: ["light_zh", "light_en"],
    emotion: ["emotion_zh", "emotion_en"],
    dominant: ["dominant_zh", "dominant_en"]
  };

  const scene = { ...base };
  for (const [key, value] of Object.entries(overrides || {})) {
    if (value == null || value === "") continue;
    if (key in scene) {
      scene[key] = value;
      continue;
    }
    if (map[key]) {
      scene[map[key][0]] = value;
      scene[map[key][1]] = value;
    }
  }
  return scene;
}

function hashSeed(value) {
  const s = String(value ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick(arr, seed, salt) {
  return arr[(hashSeed(`${seed}:${salt}`)) % arr.length];
}

export function buildVariation(seed = Date.now()) {
  const v = loadVariations();
  return {
    time: pick(v.time, seed, "time"),
    weather: pick(v.weather, seed, "weather"),
    camera_micro: pick(v.camera_micro, seed, "camera"),
    window_shape: pick(v.window_shape, seed, "window"),
    moment: pick(v.moment, seed, "moment"),
    seasonal_trace: pick(v.seasonal_trace, seed, "season"),
    foreground_occlusion: pick(v.foreground_occlusion, seed, "foreground"),
    depth_rhythm: pick(v.depth_rhythm, seed, "depth"),
    hook_state: pick(v.hook_state, seed, "hookstate"),
    upward_sky: pick(v.upward_sky, seed, "upward-sky")
  };
}

export function generateOutput({
  scene,
  output = "image",
  language = "zh",
  overrides = {},
  seed = Date.now(),
  visualStyle = "natural",
  aspectRatio = "9:16"
} = {}) {
  if (!scene) throw new Error("scene is required");
  if (!LANGUAGES.includes(language)) throw new Error(`Unsupported language: ${language}`);
  const selectedOutput = normalizeOutput(output);
  const resolved = resolveScene(scene, overrides);
  const variation = buildVariation(seed);
  return compileOutputs({
    source: "preset",
    scene_id: scene,
    scene: resolved,
    seed,
    variation,
    language,
    visualStyle,
    aspectRatio,
    overrides,
    version: "0.14.0"
  }, { output: selectedOutput });
}

function legacyImageShape(contract) {
  const image = contract.outputs?.image;
  if (!image) return contract;
  return {
    ...contract,
    ...image,
    prompt: image.prompt,
    prompt_zh: image.prompt_zh,
    prompt_en: image.prompt_en,
    negative_zh: image.negative_zh,
    negative_en: image.negative_en,
    visual_style: image.visual_style,
    visual_style_name: image.visual_style_name,
    aspect_ratio: image.aspect_ratio,
    aspect_ratio_name: image.aspect_ratio_name,
    upward_motif: image.upward_motif,
    auto_match: image.auto_match,
    color_plan: image.color_plan,
    visual_grammar: contract.visual_grammar
  };
}

export function generatePrompt(args = {}) {
  return legacyImageShape(generateOutput({ ...args, output: "image" }));
}

export async function composeSceneSpec(input = {}) {
  const composer = await loadComposer();
  return composer.composeScene(input);
}

export async function generateComposedOutput({
  input = {},
  output = "image",
  language = "zh",
  seed = Date.now(),
  visualStyle = "natural",
  aspectRatio = "9:16"
} = {}) {
  if (!LANGUAGES.includes(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }
  const selectedOutput = normalizeOutput(output);
  const scene = await composeSceneSpec({ ...input, seed });
  const variation = buildVariation(seed);
  return compileOutputs({
    source: "composed",
    scene,
    seed,
    variation,
    language,
    visualStyle,
    aspectRatio,
    overrides: input,
    composition_mode: scene.composition_mode,
    composition_selection: scene.composition_selection,
    version: "0.14.0"
  }, { output: selectedOutput });
}

export async function generateComposedPrompt(args = {}) {
  return legacyImageShape(await generateComposedOutput({ ...args, output: "image" }));
}

export function oneClick({
  output = "image",
  language = "zh",
  seed = Date.now(),
  visualStyle = "natural",
  aspectRatio = "9:16"
} = {}) {
  const ids = listScenes().map(item => item.id);
  const sceneIndex = hashSeed(`${seed}:scene`) % ids.length;
  const contract = generateOutput({
    scene: ids[sceneIndex],
    output,
    language,
    seed,
    visualStyle,
    aspectRatio
  });
  return output === "image" ? legacyImageShape(contract) : contract;
}

export function series({
  scene,
  output = "image",
  language = "zh",
  count = 6,
  seed = 1,
  overrides = {},
  visualStyle = "natural",
  aspectRatio = "9:16"
} = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new Error("count must be an integer between 1 and 50");
  }
  return Array.from({ length: count }, (_, index) => {
    const contract = generateOutput({
      scene,
      output,
      language,
      overrides,
      visualStyle,
      aspectRatio,
      seed: hashSeed(`${seed}:series:${index}`)
    });
    return output === "image" ? legacyImageShape(contract) : contract;
  });
}
