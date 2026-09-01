import test from "node:test";
import assert from "node:assert/strict";
import {
  generatePrompt,
  generateOutput,
  listScenes,
  oneClick,
  series,
  VISUAL_GRAMMAR,
  ASPECT_RATIOS,
  generateComposedPrompt,
  generateComposedOutput,
  composeSceneSpec
} from "../core/compiler.mjs";
import { compileOutputs } from "../core/output-dispatcher.mjs";
import * as imageOutput from "../plugins/outputs/image/index.mjs";

test("scene catalog is non-empty", () => {
  assert.ok(listScenes().length >= 24);
});

test("visual grammar remains frozen", () => {
  assert.deepEqual(VISUAL_GRAMMAR, ["enter", "enclose", "guide", "reveal"]);
});

test("Chinese prompt compiles", () => {
  const out = generatePrompt({ scene: "wildflower_meadow", language: "zh" });
  assert.equal(out.language, "zh");
  assert.match(out.prompt, /【进入】/);
  assert.match(out.prompt, /隐藏窗口/);
  assert.match(out.prompt, /单一视觉钩子/);
});

test("English prompt compiles", () => {
  const out = generatePrompt({ scene: "lotus_pond", language: "en" });
  assert.equal(out.language, "en");
  assert.match(out.prompt, /Hidden window/);
  assert.match(out.prompt, /Single visual hook/);
});

test("upward sky motif adds insect-scale vertical discovery without changing the core", () => {
  const zh = generatePrompt({ scene: "lotus_pond", language: "zh", seed: 23 });
  assert.ok(zh.variation.upward_sky);
  assert.ok(zh.upward_motif);
  assert.match(zh.prompt, /【向上】/);
  assert.match(zh.prompt, /小昆虫|蓝天|朝霞|晚霞|雨后/);
  assert.match(zh.prompt, /管中窥豹|向上|光亮/);
  assert.deepEqual(zh.visual_grammar, ["enter", "enclose", "guide", "reveal"]);

  const en = generatePrompt({ scene: "lotus_pond", language: "en", seed: 23 });
  assert.match(en.prompt, /\[LOOK UP\]/);
  assert.match(en.prompt, /insect-scale|dawn|sunset|sky/i);
});

test("aspect ratio is selectable across prompts and falls back safely", () => {
  assert.deepEqual(Object.keys(ASPECT_RATIOS), ["1:1", "4:5", "3:4", "9:16", "16:9"]);
  const square = generatePrompt({ scene: "lotus_pond", language: "zh", aspectRatio: "1:1", seed: 24 });
  assert.equal(square.aspect_ratio, "1:1");
  assert.match(square.prompt, /1:1方形画幅/);
  assert.deepEqual(square.visual_grammar, ["enter", "enclose", "guide", "reveal"]);

  const wide = generatePrompt({ scene: "lotus_pond", language: "en", aspectRatio: "16:9", seed: 24 });
  assert.equal(wide.aspect_ratio, "16:9");
  assert.match(wide.prompt, /widescreen 16:9 frame/);

  const fallback = generatePrompt({ scene: "lotus_pond", language: "zh", aspectRatio: "2:3", seed: 24 });
  assert.equal(fallback.aspect_ratio, "9:16");
});

test("visual impact profiles strengthen treatment without changing the core grammar", () => {
  const out = generatePrompt({ scene: "lotus_pond", language: "zh", visualStyle: "impact", seed: 19 });
  assert.equal(out.visual_style, "impact");
  assert.match(out.prompt, /视觉表现（视觉冲击）/);
  assert.match(out.prompt, /强烈但可信的明暗对比/);
  assert.deepEqual(out.visual_grammar, ["enter", "enclose", "guide", "reveal"]);
});
test("color plan adapts to scene hue family and exposes saturation, hue and brightness", () => {
  const green = generatePrompt({ scene: "lotus_pond", language: "zh", visualStyle: "impact", seed: 20 });
  assert.equal(green.color_plan.family, "green");
  assert.ok(green.color_plan.saturation.zh);
  assert.ok(green.color_plan.hue.zh);
  assert.ok(green.color_plan.brightness.zh);
  assert.match(green.prompt, /智能色彩调整：饱和度/);

  const warm = generatePrompt({ scene: "autumn_maple", language: "en", visualStyle: "contrast", seed: 21 });
  assert.equal(warm.color_plan.family, "warm");
  assert.match(warm.prompt, /Smart color adjustment: saturation/);
  assert.match(warm.prompt, /cool blue, teal or cyan/);
});

test("automatic matching is the default and manual overrides remain optional", () => {
  const automatic = generatePrompt({ scene: "lotus_pond", language: "zh", seed: 22 });
  assert.equal(automatic.auto_match.mode, "automatic");
  assert.equal(automatic.auto_match.visual_hook.zh, automatic.scene.hook_zh);
  assert.equal(automatic.auto_match.emotion.zh, automatic.scene.emotion_zh);
  assert.equal(automatic.auto_match.hidden_window.zh, automatic.scene.window_zh);

  const manual = generatePrompt({
    scene: "lotus_pond",
    language: "zh",
    overrides: { hook: "一只停在荷叶边的小蜻蜓" }
  });
  assert.equal(manual.auto_match.mode, "automatic_with_manual_overrides");
  assert.deepEqual(manual.auto_match.manual_overrides, ["hook"]);
});

test("overrides are applied", () => {
  const out = generatePrompt({
    scene: "winter_branches",
    language: "zh",
    overrides: { hook: "一只停在枝头的小鸟" }
  });
  assert.match(out.prompt, /一只停在枝头的小鸟/);
});

test("one-click can be deterministic with seed", () => {
  const a = oneClick({ language: "en", seed: 3 });
  const b = oneClick({ language: "en", seed: 3 });
  assert.equal(a.scene_id, b.scene_id);
  assert.equal(a.prompt, b.prompt);
});


test("same scene can produce different series prompts while grammar stays frozen", () => {
  const items = series({ scene: "lotus_pond", language: "zh", count: 5, seed: 2026 });
  assert.equal(items.length, 5);
  assert.equal(new Set(items.map(x => x.prompt)).size, 5);
  for (const item of items) {
    assert.deepEqual(item.visual_grammar, ["enter", "enclose", "guide", "reveal"]);
    assert.match(item.prompt, /核心机制固定不变：进入 → 包围 → 引导 → 显露/);
  }
});

test("same scene + same seed stays reproducible", () => {
  const a = generatePrompt({ scene: "bamboo_forest", language: "en", seed: 77 });
  const b = generatePrompt({ scene: "bamboo_forest", language: "en", seed: 77 });
  assert.equal(a.prompt, b.prompt);
});


test("expanded scene library contains distinct ecosystems", () => {
  const ids = new Set(listScenes().map(x => x.id));
  for (const id of ["wheat_field","rice_field","sunflower_field","cherry_blossom","wisteria","fern_forest","pine_forest","banana_grove","tea_garden","coastal_grass","alpine_meadow"]) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
});

test("expanded variations never mutate frozen grammar", () => {
  const items = series({ scene: "wheat_field", language: "zh", count: 20, seed: 3030 });
  for (const item of items) {
    assert.deepEqual(item.visual_grammar, ["enter","enclose","guide","reveal"]);
    assert.match(item.prompt, /【进入】/);
    assert.match(item.prompt, /【包围】/);
    assert.match(item.prompt, /【引导】/);
    assert.match(item.prompt, /【显露】/);
  }
});


test("scene catalog now loads through plugin registry", () => {
  assert.ok(listScenes().length >= 24);
});

test("dynamic composer creates a valid scene without touching core grammar", async () => {
  const scene = await composeSceneSpec({
    plant: "bamboo",
    location: "mountain",
    emotion: "longing"
  });
  assert.match(scene.name_zh, /隐藏窗口/);
  assert.ok(scene.entry_zh);
  assert.ok(scene.enclosure_zh);
  assert.ok(scene.window_zh);
  assert.ok(scene.hook_zh);
});

test("dynamic composer supports automatic, random and manual selection modes", async () => {
  const autoA = await composeSceneSpec({ mode: "auto", seed: 12 });
  const autoB = await composeSceneSpec({ mode: "auto", seed: 12 });
  assert.equal(autoA.composition_mode.id, "auto");
  assert.deepEqual(autoA.composition_selection, autoB.composition_selection);

  const randomSelections = new Set();
  for (let seed = 1; seed <= 8; seed++) {
    const random = await composeSceneSpec({ mode: "random", seed });
    assert.equal(random.composition_mode.id, "random");
    randomSelections.add(JSON.stringify(random.composition_selection));
  }
  assert.ok(randomSelections.size > 1);

  const manual = await composeSceneSpec({
    mode: "manual",
    plant: "fern",
    location: "forest",
    emotion: "mystery",
    seed: 12
  });
  assert.equal(manual.composition_mode.id, "manual");
  assert.deepEqual(manual.composition_selection, { plant: "fern", location: "forest", emotion: "mystery" });
});

test("composed prompt preserves frozen core grammar", async () => {
  const out = await generateComposedPrompt({
    input: {
      plant: "fern",
      location: "forest",
      emotion: "mystery",
      window: "蕨叶之间一小束远处自然光",
      hook: "一枚刚展开的嫩蕨叶"
    },
    language: "zh",
    seed: 4040
  });
  assert.deepEqual(out.visual_grammar, ["enter","enclose","guide","reveal"]);
  assert.equal(out.source, "composed");
  assert.match(out.prompt, /【进入】/);
  assert.match(out.prompt, /【包围】/);
  assert.match(out.prompt, /【引导】/);
  assert.match(out.prompt, /【显露】/);
});

test("composer supports reproducible series diversity by seed", async () => {
  const a = await generateComposedPrompt({
    input: { plant: "grass", location: "coast", emotion: "freedom" },
    language: "en",
    seed: 1
  });
  const b = await generateComposedPrompt({
    input: { plant: "grass", location: "coast", emotion: "freedom" },
    language: "en",
    seed: 2
  });
  assert.notEqual(a.prompt, b.prompt);
  assert.deepEqual(a.visual_grammar, b.visual_grammar);
});


test("unified output contract selects image, storyboard, or both", () => {
  const image = generateOutput({ scene: "lotus_pond", output: "image", language: "en", seed: 5050 });
  const storyboard = generateOutput({ scene: "lotus_pond", output: "storyboard", language: "en", seed: 5050 });
  const both = generateOutput({ scene: "lotus_pond", output: "both", language: "en", seed: 5050 });

  assert.equal(image.contract, "hidden-nature-window.output");
  assert.deepEqual(Object.keys(image.outputs), ["image"]);
  assert.deepEqual(Object.keys(storyboard.outputs), ["storyboard"]);
  assert.deepEqual(Object.keys(both.outputs), ["image", "storyboard"]);
  assert.deepEqual(both.errors, []);
  assert.deepEqual(both.visual_grammar, ["enter", "enclose", "guide", "reveal"]);
  assert.ok(both.continuity.continuity_id);
  assert.deepEqual(both.continuity.shot_order, ["ENTER", "ENCLOSE", "GUIDE", "REVEAL", "HOLD"]);
  assert.equal(both.outputs.image.continuity_id, both.continuity.continuity_id);
  assert.equal(both.outputs.storyboard.continuity_id, both.continuity.continuity_id);
});

test("storyboard output is exactly five ordered shots with image and video directions", () => {
  const out = generateOutput({ scene: "bamboo_after_rain", output: "storyboard", language: "bilingual", seed: 6060 });
  const storyboard = out.outputs.storyboard;

  assert.equal(storyboard.shot_count, 5);
  assert.equal(storyboard.duration_seconds, 15);
  assert.deepEqual(storyboard.stages, ["ENTER", "ENCLOSE", "GUIDE", "REVEAL", "HOLD"]);
  assert.deepEqual(storyboard.shots.map(shot => shot.stage), storyboard.stages);
  for (const shot of storyboard.shots) {
    assert.ok(shot.image_prompt_zh);
    assert.ok(shot.image_prompt_en);
    assert.ok(shot.video_prompt_zh);
    assert.ok(shot.video_prompt_en);
  }
});

test("image and storyboard from both share the same SceneSpec, variation, and seed", () => {
  const image = generateOutput({ scene: "fern_forest", output: "image", language: "zh", seed: 7070 });
  const storyboard = generateOutput({ scene: "fern_forest", output: "storyboard", language: "zh", seed: 7070 });
  const both = generateOutput({ scene: "fern_forest", output: "both", language: "zh", seed: 7070 });

  assert.deepEqual(both.scene, image.scene);
  assert.deepEqual(both.scene, storyboard.scene);
  assert.deepEqual(both.variation, image.variation);
  assert.deepEqual(both.variation, storyboard.variation);
  assert.equal(both.outputs.image.prompt, image.outputs.image.prompt);
  assert.deepEqual(both.outputs.storyboard.shots, storyboard.outputs.storyboard.shots);
  assert.deepEqual(both.continuity, image.continuity);
  assert.deepEqual(both.continuity, storyboard.continuity);
  assert.equal(both.outputs.image.storyboard_alignment.keyframe, "REVEAL");
  assert.equal(both.outputs.image.storyboard_alignment.hold, "HOLD");
  assert.match(both.outputs.image.prompt, /REVEAL/);
  assert.match(both.outputs.storyboard.shots[0].video_prompt, /Continuity anchor|连续性锚点/);
});

test("continuity anchor keeps the same visual identity through all five shots", () => {
  const out = generateOutput({ scene: "lotus_pond", output: "both", language: "en", seed: 7171 });
  const anchor = out.continuity;
  assert.equal(anchor.scene_identity.en, "Lotus Pond");
  assert.equal(anchor.image_keyframe, "REVEAL");
  assert.equal(anchor.final_hold, "HOLD");
  for (const shot of out.outputs.storyboard.shots) {
    assert.match(shot.video_prompt_en, /same|unchanged/);
    assert.ok(shot.video_prompt_en.includes(anchor.subject.en));
  }
  assert.match(out.outputs.image.prompt_en, /storyboard REVEAL keyframe/);
  assert.notEqual(anchor.continuity_id, generateOutput({ scene: "lotus_pond", output: "both", language: "en", seed: 7172 }).continuity.continuity_id);
});

test("both output is byte-reproducible for the same SceneSpec and seed", () => {
  const args = { scene: "winter_branches", output: "both", language: "bilingual", seed: 8080 };
  assert.equal(JSON.stringify(generateOutput(args)), JSON.stringify(generateOutput(args)));
});

test("a failed output plugin does not block a healthy sibling output", () => {
  const base = generateOutput({ scene: "lotus_pond", output: "image", language: "en", seed: 9090 });
  const failingStoryboard = {
    id: "storyboard",
    outputType: "storyboard",
    compile() {
      throw new Error("simulated storyboard failure");
    }
  };
  const out = compileOutputs({
    source: "preset",
    scene_id: base.scene_id,
    scene: base.scene,
    seed: base.seed,
    variation: base.variation,
    language: base.language
  }, { output: "both", plugins: [imageOutput, failingStoryboard] });

  assert.ok(out.outputs.image);
  assert.equal(out.outputs.storyboard, undefined);
  assert.equal(out.errors[0].output, "storyboard");
  assert.equal(out.errors[0].code, "OUTPUT_PLUGIN_FAILED");
});

test("composer can feed both outputs through the same contract", async () => {
  const out = await generateComposedOutput({
    input: { plant: "bamboo", location: "mountain", emotion: "longing" },
    output: "both",
    language: "en",
    seed: 10010
  });
  assert.equal(out.source, "composed");
  assert.ok(out.outputs.image.prompt);
  assert.equal(out.outputs.storyboard.shots.length, 5);
  assert.deepEqual(out.visual_grammar, ["enter", "enclose", "guide", "reveal"]);
});
