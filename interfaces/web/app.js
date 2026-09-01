const sceneEl = document.querySelector("#scene");
const langEl = document.querySelector("#language");
const visualStyleEl = document.querySelector("#visualStyle");
const aspectRatioEl = document.querySelector("#aspectRatio");
const outputTypeEl = document.querySelector("#outputType");
const matchModeEl = document.querySelector("#matchMode");
const manualFieldsEl = document.querySelector("#manualFields");
const composeModeEl = document.querySelector("#composeMode");
const plantEl = document.querySelector("#plant");
const locationEl = document.querySelector("#location");
const composerEmotionEl = document.querySelector("#composerEmotion");
const languageButtons = [...document.querySelectorAll(".language-toggle button")];
const imagePromptColumnEl = document.querySelector("#imagePromptColumn");
const storyboardPromptColumnEl = document.querySelector("#storyboardPromptColumn");
const imageOutputEl = document.querySelector("#imageOutput");
const storyboardOutputEl = document.querySelector("#storyboardOutput");
const metaEl = document.querySelector("#meta");
const previewEl = document.querySelector("#preview");
const previewFrameEl = document.querySelector(".preview-frame");
const previewEmptyEl = document.querySelector("#previewEmpty");
const previewCaptionEl = document.querySelector("#previewCaption");
const copyStatusEl = document.querySelector("#copyStatus");
let copyStatusTimer;
let lastResult;
let lastResultList;
let lastMetaData;
let lastMetaPrefix = "";
let lastPreviewData;

const UI_COPY = {
  zh: {
    generate: "生成提示词",
    oneClick: "一键随机生成",
    compose: "组合新场景并生成",
    composeSeries: "组合系列（6条）",
    clear: "清空",
    imageLabel: "图片提示词",
    storyboardLabel: "视频分镜提示词",
    copyImage: "复制图片提示词",
    copyStoryboard: "复制视频分镜",
    languageLabel: "语言",
    outputLabel: "输出",
    languageZh: "中文",
    languageEn: "English",
    languageBilingual: "中英"
  },
  en: {
    generate: "Generate prompt",
    oneClick: "Generate random",
    compose: "Compose & generate",
    composeSeries: "Compose series (6)",
    clear: "Clear",
    imageLabel: "Image prompt",
    storyboardLabel: "Video storyboard prompt",
    copyImage: "Copy image prompt",
    copyStoryboard: "Copy storyboard",
    languageLabel: "Language",
    outputLabel: "Output",
    languageZh: "Chinese",
    languageEn: "English",
    languageBilingual: "Bilingual"
  }
};

const OUTPUT_LABELS = {
  zh: { image: "图片提示词", storyboard: "视频分镜", both: "图片 + 视频分镜" },
  en: { image: "Image prompt", storyboard: "Video storyboard", both: "Image + storyboard" }
};

function setLanguage(language) {
  const normalized = ["zh", "en", "bilingual"].includes(language) ? language : "zh";
  langEl.value = normalized;
  document.documentElement.lang = normalized === "en" ? "en" : "zh-CN";
  languageButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.language === normalized);
  });
  const ui = normalized === "en" ? UI_COPY.en : UI_COPY.zh;
  document.querySelector("#generate").textContent = ui.generate;
  document.querySelector("#oneClick").textContent = ui.oneClick;
  document.querySelector("#compose").textContent = ui.compose;
  document.querySelector("#composeSeries").textContent = ui.composeSeries;
  document.querySelector("#clear").textContent = ui.clear;
  document.querySelector("#imagePromptLabel").textContent = ui.imageLabel;
  document.querySelector("#storyboardPromptLabel").textContent = ui.storyboardLabel;
  document.querySelector("#copyImage").textContent = ui.copyImage;
  document.querySelector("#copyStoryboard").textContent = ui.copyStoryboard;
  document.querySelector("#languageZh").textContent = ui.languageZh;
  document.querySelector("#languageEn").textContent = ui.languageEn;
  document.querySelector("#languageBilingual").textContent = ui.languageBilingual;
  document.querySelector("#languageLabel").textContent = ui.languageLabel;
  document.querySelector("#outputLabel").textContent = ui.outputLabel;
  const outputLabels = normalized === "en" ? OUTPUT_LABELS.en : OUTPUT_LABELS.zh;
  [...outputTypeEl.options].forEach(option => { option.textContent = outputLabels[option.value]; });
  if (lastResultList) renderOutputList(lastResultList);
 else if (lastResult) renderOutputFields(lastResult);
 if (lastMetaData) updateMeta(lastMetaData, lastMetaPrefix);
  if (lastPreviewData) updatePreview(lastPreviewData);
}

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value ?? "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashText(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function parsePreviewRatio(value = "9:16") {
  const [width, height] = String(value).split(":").map(Number);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? [width, height]
    : [9, 16];
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function previewPalette(data) {
  const motif = data.upward_motif?.id || "healing_blue";
  const palettes = {
    healing_blue: { skyTop: "#3b9fc5", skyBottom: "#e8f8ff", glow: "#f4ffff", deep: "#06130b", forest: "#12371c", darkLeaf: "#0b2a14", mid: "#1f5a28", leaf: "#4e8f2e", accent: "#eb397f" },
    dawn_rise: { skyTop: "#c65776", skyBottom: "#ffe3a2", glow: "#fff1c7", deep: "#1a0d18", forest: "#2d1d20", darkLeaf: "#1d2916", mid: "#663642", leaf: "#456f32", accent: "#f28b54" },
    sunset_glow: { skyTop: "#783b55", skyBottom: "#ffad62", glow: "#ffe09b", deep: "#140b12", forest: "#2b171b", darkLeaf: "#1d2716", mid: "#5f302d", leaf: "#456f31", accent: "#ee5c49" },
    after_rain_sky: { skyTop: "#278db0", skyBottom: "#e8fbff", glow: "#ffffff", deep: "#061518", forest: "#10362d", darkLeaf: "#0a2a24", mid: "#1f5f58", leaf: "#3f8b4a", accent: "#f2c34d" }
  };
  const palette = palettes[motif] || palettes.healing_blue;
  if (data.visual_style === "natural") return palette;
  if (data.visual_style === "contrast") return { ...palette, deep: "#041009", forest: "#164520", accent: palette.accent };
  return { ...palette, deep: "#020a05", forest: "#0d3319", accent: palette.accent };
}

function leafSvg(x, y, scale, angle, color, opacity = 1, blur = 0) {
  const filter = blur ? ` filter="url(#leafBlur)"` : "";
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${scale.toFixed(2)})" opacity="${opacity.toFixed(2)}"${filter}>
    <path d="M0 0 C28 -62 105 -82 153 -45 C119 8 45 34 0 0Z" fill="${color}"/>
    <path d="M2 0 Q70 -24 145 -45" fill="none" stroke="#b8dc83" stroke-opacity=".26" stroke-width="2"/>
  </g>`;
}

function flowerSvg(x, y, scale, color, angle) {
  const petals = Array.from({ length: 5 }, (_, index) => {
    const petalAngle = index * 72;
    return `<ellipse cx="0" cy="-${(17 * scale).toFixed(1)}" rx="${(8 * scale).toFixed(1)}" ry="${(20 * scale).toFixed(1)}" fill="${color}" transform="rotate(${petalAngle})"/>`;
  }).join("");
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})">
    ${petals}<circle r="${(8 * scale).toFixed(1)}" fill="#f6d45e"/>
  </g>`;
}

function createPreviewSvg(data) {
  const random = seededRandom(`${data.seed}:${data.scene_id}:${data.upward_motif?.id}:${data.visual_style}`);
  const palette = previewPalette(data);
  const width = 720;
  const [ratioWidth, ratioHeight] = parsePreviewRatio(data.aspect_ratio);
  const height = Math.max(360, Math.round(width * ratioHeight / ratioWidth));
  const scaleY = value => value * height / 1120;
  const center = width / 2 + (random() - .5) * 42;
  const apertureTop = scaleY(285 + random() * 105);
  const apertureBottom = scaleY(790 + random() * 110);
  const apertureWidth = (150 + random() * 60) * Math.min(1.15, Math.max(.72, Math.sqrt(height / 1120)));
  const left = center - apertureWidth;
  const right = center + apertureWidth;
  const aperturePath = `M ${center.toFixed(1)} ${apertureTop.toFixed(1)} C ${(right + 44).toFixed(1)} ${(apertureTop + scaleY(120)).toFixed(1)}, ${(right + 22).toFixed(1)} ${(apertureBottom - scaleY(110)).toFixed(1)}, ${right.toFixed(1)} ${apertureBottom.toFixed(1)} C ${(center + 70).toFixed(1)} ${(apertureBottom + scaleY(52)).toFixed(1)}, ${(center - 80).toFixed(1)} ${(apertureBottom + scaleY(42)).toFixed(1)}, ${left.toFixed(1)} ${apertureBottom.toFixed(1)} C ${(left - 28).toFixed(1)} ${(apertureBottom - scaleY(120)).toFixed(1)}, ${(left - 38).toFixed(1)} ${(apertureTop + scaleY(90)).toFixed(1)}, ${center.toFixed(1)} ${apertureTop.toFixed(1)}Z`;

  const skyDetails = Array.from({ length: 7 }, () => {
    const x = left + random() * apertureWidth * 2;
    const y = apertureTop + random() * (apertureBottom - apertureTop);
    const r = 9 + random() * 28;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r * 1.8).toFixed(1)}" ry="${(r * .45).toFixed(1)}" fill="#ffffff" opacity="${(.08 + random() * .16).toFixed(2)}"/>`;
  }).join("");

  const stems = Array.from({ length: 12 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const x = center + side * (apertureWidth * (.7 + random() * .9));
    const bend = center + side * (apertureWidth * (.35 + random() * .7));
    return `<path d="M ${x.toFixed(1)} ${height.toFixed(1)} Q ${bend.toFixed(1)} ${scaleY(780 - random() * 230).toFixed(1)} ${(center + side * random() * 80).toFixed(1)} ${(apertureTop + random() * scaleY(180)).toFixed(1)}" fill="none" stroke="${palette.mid}" stroke-width="${(4 + random() * 7).toFixed(1)}" opacity=".72"/>`;
  }).join("");

  const leaves = [];
  for (let index = 0; index < 52; index++) {
    const edge = index % 4;
    let x;
    let y;
    let angle;
    if (edge === 0) {
      x = random() * width;
      y = scaleY(-50 + random() * 260);
      angle = 125 + random() * 85;
    } else if (edge === 1) {
      x = random() * 190 - 80;
      y = scaleY(130 + random() * 890);
      angle = -35 + random() * 90;
    } else if (edge === 2) {
      x = 530 + random() * 240;
      y = scaleY(150 + random() * 920);
      angle = 95 + random() * 95;
    } else {
      x = random() * width;
      y = scaleY(850 + random() * 300);
      angle = -115 + random() * 85;
    }
    const scale = .62 + random() * .78;
    const color = index % 5 === 0 ? palette.mid : (index % 3 === 0 ? palette.leaf : palette.darkLeaf);
    leaves.push(leafSvg(x, y, scale, angle, color, .58 + random() * .36, index % 6 === 0 ? 1 : 0));
  }

  const tubeLeaves = Array.from({ length: 18 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const x = center + side * (apertureWidth * (.72 + random() * .35));
    const y = apertureTop + scaleY(70) + random() * (apertureBottom - apertureTop - scaleY(130));
    return leafSvg(x, y, .32 + random() * .34, side < 0 ? 5 + random() * 60 : 115 + random() * 60, index % 3 === 0 ? palette.mid : palette.leaf, .72, 0);
  }).join("");

  const flowers = Array.from({ length: 8 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    return flowerSvg(
      center + side * (apertureWidth + 80 + random() * 180),
      scaleY(430 + random() * 600),
      .45 + random() * .58,
      index % 3 === 0 ? palette.accent : palette.mid,
      random() * 80 - 40
    );
  }).join("");

  const motifId = data.upward_motif?.id || "healing_blue";
  const sunY = motifId === "sunset_glow" ? apertureBottom - scaleY(80) : motifId === "dawn_rise" ? apertureTop + scaleY(92) : apertureTop + (apertureBottom - apertureTop) * .34;
  const sunRadius = Math.min(150, Math.max(76, 145 * height / 1120));
  const motifName = escapeXml(data.upward_motif?.name_zh || "向上发现");
  const sceneName = escapeXml(data.scene?.name_zh || data.scene?.name_en || "Nature Window");
  const styleLabel = escapeXml(data.visual_style || "natural");
  const labelY = Math.max(50, height - 45);
  const subLabelY = Math.max(70, height - 18);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${sceneName} ${motifName} visual simulation">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${palette.skyTop}"/>
      <stop offset=".58" stop-color="${palette.skyBottom}"/>
      <stop offset="1" stop-color="${palette.glow}"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${palette.glow}" stop-opacity=".98"/>
      <stop offset=".48" stop-color="${palette.glow}" stop-opacity=".38"/>
      <stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="48%" r="70%">
      <stop offset=".42" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".78"/>
    </radialGradient>
    <radialGradient id="forest" cx="50%" cy="46%" r="74%">
      <stop offset="0" stop-color="${palette.forest}"/>
      <stop offset=".62" stop-color="${palette.deep}"/>
      <stop offset="1" stop-color="#010604"/>
    </radialGradient>
    <filter id="softBlur"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="leafBlur"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#forest)"/>
  <path d="${aperturePath}" fill="url(#sky)"/>
  <ellipse cx="${(center + (random() - .5) * 70).toFixed(1)}" cy="${sunY.toFixed(1)}" rx="${sunRadius.toFixed(1)}" ry="${sunRadius.toFixed(1)}" fill="url(#sun)" filter="url(#softBlur)"/>
  ${skyDetails}
  ${stems}
  ${tubeLeaves}
  ${leaves.join("")}
  ${flowers}
  <path d="${aperturePath}" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="3"/>
  <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  <text x="30" y="46" fill="#ffffff" fill-opacity=".72" font-family="Arial, sans-serif" font-size="16" letter-spacing="3">NATURE WINDOW · SIMULATION</text>
  <text x="30" y="${labelY.toFixed(1)}" fill="#ffffff" fill-opacity=".88" font-family="Arial, sans-serif" font-size="22" font-weight="700">${motifName}</text>
  <text x="30" y="${subLabelY.toFixed(1)}" fill="#ffffff" fill-opacity=".58" font-family="Arial, sans-serif" font-size="13" letter-spacing="1.2">${sceneName} · ${styleLabel}</text>
</svg>`;
}

function previewDataUri(data) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createPreviewSvg(data))}`;
}

function showCopyStatus(message, isError = false) {
  clearTimeout(copyStatusTimer);
  copyStatusEl.textContent = message;
  copyStatusEl.classList.toggle("error", isError);
  if (!isError) {
    copyStatusTimer = setTimeout(() => {
      copyStatusEl.textContent = "";
    }, 2400);
  }
}

function localize(language, zh, en) {
  if (language === "en") return en || zh || "";
  if (language === "bilingual") return `【中文】\n${zh || ""}\n\n【English】\n${en || zh || ""}`;
  return zh || en || "";
}

function imagePromptText(data) {
  const output = data.outputs?.image;
  if (output) return localize(langEl.value, output.prompt_zh || output.prompt, output.prompt_en || output.prompt);
  return localize(langEl.value, data.prompt_zh || data.prompt, data.prompt_en || data.prompt);
}

function storyboardPromptText(data) {
  const output = data.outputs?.storyboard;
  if (!output?.shots?.length) return "";
  const render = language => output.shots.map(shot => {
    const title = `SHOT ${String(shot.index).padStart(2, "0")} — ${shot.stage} (${shot.duration_seconds}s)`;
    const prompt = language === "en" ? (shot.video_prompt_en || shot.video_prompt) : (shot.video_prompt_zh || shot.video_prompt);
    return `${title}\n${prompt || ""}`;
  }).join("\n\n");
  return localize(langEl.value, render("zh"), render("en"));
}

function renderOutputFields(data) {
  const imageText = imagePromptText(data);
  const storyboardText = storyboardPromptText(data);
  imageOutputEl.value = imageText;
  storyboardOutputEl.value = storyboardText;
  imagePromptColumnEl.hidden = !imageText.trim();
  storyboardPromptColumnEl.hidden = !storyboardText.trim();
}

function renderOutputList(items) {
  const imageText = items.map((item, index) => {
    const text = imagePromptText(item);
    return text ? `### ${index + 1}\n${text}` : "";
  }).filter(Boolean).join("\n\n");
  const storyboardText = items.map((item, index) => {
    const text = storyboardPromptText(item);
    return text ? `### ${index + 1}\n${text}` : "";
  }).filter(Boolean).join("\n\n");
  imageOutputEl.value = imageText;
  storyboardOutputEl.value = storyboardText;
  imagePromptColumnEl.hidden = !imageText.trim();
  storyboardPromptColumnEl.hidden = !storyboardText.trim();
}

function displayOutput(data) {
  lastResult = data;
  lastResultList = undefined;
  renderOutputFields(data);
}

function displayOutputList(items) {
  lastResult = undefined;
  lastResultList = items;
  renderOutputList(items);
}

function outputView(data) {
  return { ...data, ...(data.outputs?.image || {}) };
}

function updatePreview(data) {
  const view = outputView(data);
  lastPreviewData = data;
  const isEnglish = langEl.value === "en";
  const sceneName = isEnglish ? (view.scene?.name_en || view.scene?.name_zh || "Nature Window") : (view.scene?.name_zh || view.scene?.name_en || "Nature Window");
  const [ratioWidth, ratioHeight] = parsePreviewRatio(view.aspect_ratio);
  previewFrameEl.style.aspectRatio = `${ratioWidth} / ${ratioHeight}`;
  previewEl.src = previewDataUri(view);
  previewEl.alt = `${sceneName} Nature Window visual simulation`;
  previewEl.hidden = false;
  previewEmptyEl.hidden = true;
  previewCaptionEl.textContent = isEnglish
    ? `${sceneName} · The simulation follows this prompt's composition, sky mood and color; it is not the final photo.`
    : `${sceneName} · 视觉模拟图已根据本次提示词的构图、天空情绪与色彩自动变化；不是最终照片。`;
}

function resetPreview() {
  lastPreviewData = undefined;
  previewFrameEl.style.aspectRatio = "9 / 16";
  previewEl.src = "/assets/nature-window-preview.png";
  previewEl.hidden = true;
  previewEmptyEl.hidden = false;
  previewCaptionEl.textContent = langEl.value === "en"
    ? "The preview demonstrates the Nature Window viewpoint; generation draws a prompt-driven simulation at the selected ratio."
    : "预览图展示 Nature Window 的观看方式；生成后会依据提示词与所选画面比例自动绘制视觉模拟图。";
}

function getManualOverrides() {
  if (matchModeEl.value !== "manual") return {};
  return {
    emotion: document.querySelector("#emotion").value.trim(),
    hook: document.querySelector("#hook").value.trim(),
    window: document.querySelector("#window").value.trim()
  };
}

function updateMatchMode() {
  manualFieldsEl.hidden = matchModeEl.value !== "manual";
}

function updateComposerMode() {
  const manual = composeModeEl.value === "manual";
  [plantEl, locationEl, composerEmotionEl].forEach(element => {
    element.disabled = !manual;
  });
}

function syncCompositionSelection(data) {
  const selection = data.composition_selection || data.scene?.composition_selection;
  if (!selection) return;
  if (selection.plant) plantEl.value = selection.plant;
  if (selection.location) locationEl.value = selection.location;
  if (selection.emotion) composerEmotionEl.value = selection.emotion;
}

function updateMeta(data, prefix) {
  lastMetaData = data;
 lastMetaPrefix = prefix;
 const view = outputView(data);
 const match = view.auto_match;
  const isEnglish = langEl.value === "en";
  const sceneName = data.scene ? (isEnglish ? data.scene.name_en : data.scene.name_zh) : prefix;
  const languageName = langEl.value === "bilingual" ? (isEnglish ? "Bilingual" : "中英双语") : (isEnglish ? "English" : "中文");
  const prefixText = prefix.includes("动态组合系列") ? (isEnglish ? "Composed series · 6 items" : "动态组合系列 · 6条") : prefix.includes("动态组合") ? `${isEnglish ? "Composed scene" : "动态组合"} · ${sceneName}` : `${sceneName} · ${languageName}`;
 if (!match) {
    metaEl.textContent = prefixText;
   return;
 }
 const hook = isEnglish ? match.visual_hook.en : match.visual_hook.zh;
  const emotion = isEnglish ? match.emotion.en : match.emotion.zh;
  const windowText = isEnglish ? match.hidden_window.en : match.hidden_window.zh;
  const upward = view.upward_motif
    ? (isEnglish ? view.upward_motif.en : view.upward_motif.zh)
    : "";
  const upwardLine = upward ? `\n${isEnglish ? "Upward view" : "向上视角"}：${upward}` : "";
  const ratioLine = `\n${isEnglish ? "Aspect ratio" : "画面比例"}：${view.aspect_ratio || "9:16"}`;
  const composition = data.composition_mode || data.scene?.composition_mode;
  const compositionLine = composition ? `\n${isEnglish ? "Composition" : "组合方式"}：${composition.name_en || composition.name_zh}` : "";
 const mode = isEnglish ? match.mode_en : match.mode_zh;
 const details = isEnglish ? `Visual hook: ${hook} · Emotion: ${emotion} · Hidden window: ${windowText}` : `视觉钩子：${hook} · 情绪：${emotion} · 隐藏窗口：${windowText}`;
  metaEl.textContent = `${prefixText} · ${mode}${ratioLine}${compositionLine}\n${details}${upwardLine}`;
}

async function json(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "request failed");
  return data;
}

async function loadScenes() {
  const data = await json("/v1/scenes");
  sceneEl.innerHTML = data.scenes.map(s =>
    `<option value="${s.id}">${s.name_zh} / ${s.name_en}</option>`
  ).join("");
}

async function generate() {
  const body = {
    scene: sceneEl.value,
    language: langEl.value,
    visual_style: visualStyleEl.value,
    aspect_ratio: aspectRatioEl.value,
    output: outputTypeEl.value,
    overrides: getManualOverrides()
  };
  const data = await json("/v1/prompt", {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify(body)
  });
  displayOutput(data);
  updatePreview(data);
  updateMeta(data, `${data.scene.name_zh} / ${data.scene.name_en} · ${data.language}`);
}

async function oneClickPrompt() {
  const data = await json("/v1/one-click", {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({ language: langEl.value, visual_style: visualStyleEl.value, aspect_ratio: aspectRatioEl.value, output: outputTypeEl.value })
  });
  sceneEl.value = data.scene_id;
  displayOutput(data);
  updatePreview(data);
  updateMeta(data, `${data.scene.name_zh} / ${data.scene.name_en} · ${data.language}`);
}

document.querySelector("#generate").onclick = () => generate().catch(e => alert(e.message));
document.querySelector("#oneClick").onclick = () => oneClickPrompt().catch(e => alert(e.message));
async function copyPrompt(element, kind) {
  const isEnglish = langEl.value === "en";
  const emptyMessage = isEnglish ? "Nothing to copy yet" : "暂无内容可复制";
  const successMessage = isEnglish ? `${kind} copied` : `${kind}复制成功`;
  const failureMessage = isEnglish ? "Copy failed; please copy manually" : "复制失败，请手动复制";
  if (!element.value.trim()) {
    showCopyStatus(emptyMessage, true);
    return;
  }
  try {
    await navigator.clipboard.writeText(element.value);
    showCopyStatus(successMessage);
  } catch (error) {
    showCopyStatus(failureMessage, true);
  }
}
document.querySelector("#copyImage").onclick = () => copyPrompt(imageOutputEl, langEl.value === "en" ? "Image prompt" : "图片提示词");
document.querySelector("#copyStoryboard").onclick = () => copyPrompt(storyboardOutputEl, langEl.value === "en" ? "Storyboard" : "视频分镜");
document.querySelector("#clear").onclick = () => {
  lastResult = undefined;
  lastResultList = undefined;
  lastMetaData = undefined;
  lastMetaPrefix = "";
  imageOutputEl.value = "";
  storyboardOutputEl.value = "";
  imagePromptColumnEl.hidden = true;
  storyboardPromptColumnEl.hidden = true;
  metaEl.textContent = "";
  copyStatusEl.textContent = "";
  resetPreview();
};
languageButtons.forEach(button => {
  button.onclick = () => setLanguage(button.dataset.language);
});
langEl.onchange = () => setLanguage(langEl.value);
setLanguage(langEl.value);

matchModeEl.onchange = updateMatchMode;
updateMatchMode();
composeModeEl.onchange = updateComposerMode;
updateComposerMode();

loadScenes().catch(error => {
  metaEl.textContent = `场景加载失败：${error.message}`;
});


async function composeScenePrompt() {
  const body = {
    language: langEl.value,
    visual_style: visualStyleEl.value,
    aspect_ratio: aspectRatioEl.value,
    output: outputTypeEl.value,
    input: {
      mode: composeModeEl.value,
      plant: plantEl.value,
      location: locationEl.value,
      emotion: composerEmotionEl.value
    }
  };
  const data = await json("/v1/compose", {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify(body)
  });
  displayOutput(data);
  syncCompositionSelection(data);
  updatePreview(data);
  updateMeta(data, `动态组合 · ${data.scene.name_zh} / ${data.scene.name_en}`);
}

async function composeSeriesPrompt() {
  const base = {
    language: langEl.value,
    visual_style: visualStyleEl.value,
    aspect_ratio: aspectRatioEl.value,
    output: outputTypeEl.value,
    input: {
      mode: composeModeEl.value,
      plant: plantEl.value,
      location: locationEl.value,
      emotion: composerEmotionEl.value
    }
  };
  const results = [];
 let lastData;
 const seedBase = Date.now();
 for (let i = 0; i < 6; i++) {
    const data = await json("/v1/compose", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({...base, seed: seedBase + i})
   });
   lastData = data;
    results.push(data);
 }
  displayOutputList(results);
  syncCompositionSelection(lastData);
  updatePreview(lastData);
  updateMeta(lastData, "动态组合系列 · 6条");
}

document.querySelector("#compose").onclick = () => composeScenePrompt().catch(e => alert(e.message));
document.querySelector("#composeSeries").onclick = () => composeSeriesPrompt().catch(e => alert(e.message));
