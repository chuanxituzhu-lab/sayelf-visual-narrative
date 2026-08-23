import { loadDraft, saveDraft } from './modules/local-state.mjs';

const $ = (selector) => document.querySelector(selector);
const output = $('#output');
const message = $('#message');
let example;
let harnesses = [];
const compileCache = new Map();
let realtimeSession = null;
let realtimeEvents = null;
let currentSpec = null;
let language = 'zh';

boot();

async function boot() {
  try {
    example = await api('/v1/example');
    setSpec(loadDraft() || example);
    goToStep(1);
    await loadHarnesses();
    await validate();
  } catch (error) {
    showMessage(error.message, true);
  }
}

$('#reset').addEventListener('click', () => { setSpec(example); clearOutput(); validate(); });
$('#validate').addEventListener('click', () => run(validate));
$('#compile').addEventListener('click', () => run(compile));
$('#generate').addEventListener('click', () => run(generate));
$('#language').addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; renderLanguage(); });
$('#mode').addEventListener('change', () => run(() => { const spec = readSpec(); spec.mode = $('#mode').value; setSpec(spec); }));
document.querySelectorAll('[data-path], #avoid').forEach((field) => field.addEventListener('input', () => { syncForm(); scheduleAutomation(); }));
document.querySelectorAll('.nav-item[data-step]').forEach((button) => button.addEventListener('click', () => run(() => goToStep(Number(button.dataset.step)))));
$('#harness').addEventListener('change', () => run(connectHarness));
$('#confirm-harness').addEventListener('click', () => run(confirmHarness));
$('#start-realtime').addEventListener('click', () => run(startRealtime));
$('#send-chat').addEventListener('click', () => run(sendRealtime));
$('#chat-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') run(sendRealtime); });
$('#copy').addEventListener('click', () => run(copyPrompt));
$('#use-prompt').addEventListener('click', () => {
  const compiled = output.textContent.startsWith('等待编译') ? '' : output.textContent;
  $('#harness-prompt').value = compiled ? `请审阅并改进下面的视觉叙事提示词，同时保留 VisualSpec 的导演意图：\n\n${compiled}` : '请审阅当前 VisualSpec，并提出可执行的导演与艺术指导改进建议。';
});
$('#run-harness').addEventListener('click', () => run(runHarness));

async function validate() {
  const result = await api('/v1/validate', { spec: readSpec() });
  renderGates(result);
  showMessage(result.status === 'PASS' ? 'VisualSpec 已通过三道 Gate。' : 'VisualSpec 需要修订。', result.status !== 'PASS');
  return result;
}

async function compile() {
  const validation = await validate();
  if (validation.status !== 'PASS') return;
  const providerName = $('#provider').value;
  const spec = readSpec();
  const cacheKey = `${providerName}:${JSON.stringify(spec)}`;
  const cached = compileCache.get(cacheKey);
  if (cached) {
    output.textContent = cached;
    showMessage(language === 'zh' ? '已使用本地编译缓存。' : 'Used local compile cache.');
    return { provider: providerName, prompt: cached, cached: true };
  }
  const result = await api('/v1/compile', { provider: providerName, spec });
  output.textContent = result.prompt || JSON.stringify(result, null, 2);
  compileCache.set(cacheKey, output.textContent);
  showMessage(`已编译 ${result.provider || $('#provider').value} Prompt。`);
  return { provider: result.provider || providerName, prompt: output.textContent, cached: false };
}

async function goToStep(step) {
  document.querySelectorAll('.nav-item[data-step]').forEach((button) => button.classList.toggle('active', Number(button.dataset.step) === step));
  document.querySelectorAll('.director-form [data-step]').forEach((field) => field.classList.toggle('step-hidden', Number(field.dataset.step) !== step));
  const heading = document.querySelector('[data-i18n="workspace"]');
  heading.dataset.stepTitle = step;
  if (step === 6) {
    await compile();
    document.querySelector('#output').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const first = document.querySelector(`.director-form [data-step="${step}"] input, .director-form [data-step="${step}"] textarea, .director-form [data-step="${step}"] select`);
  first?.focus();
  showMessage(`${stepLabel(step)} · ${t('stepReady')}`);
}

function stepLabel(step) {
  const button = document.querySelector(`.nav-item[data-step="${step}"] i`);
  return button?.textContent || `Step ${step}`;
}

async function generate() {
  const validation = await validate();
  if (validation.status !== 'PASS') return;
  if ($('#provider').value !== 'openai') {
    $('#preview-state').textContent = language === 'zh' ? '选择 OPENAI' : 'SELECT OPENAI';
    showMessage(t('selectImageProvider'), true);
    $('#provider').focus();
    return;
  }
  const button = $('#generate');
  button.disabled = true;
  button.textContent = t('generating');
  $('#preview-state').textContent = language === 'zh' ? '生成 PROMPT' : 'COMPILING PROMPT';
  try {
    // Always expose the compiled prompt before making the image request. This
    // keeps the workflow inspectable and leaves a usable prompt even when the
    // image provider is unavailable or returns an error.
    await compile();
    $('#preview-state').textContent = 'WORKING';
    showMessage(language === 'zh' ? 'Prompt 已生成，正在请求图像服务…' : 'Prompt ready; requesting the image provider…');
    const result = await api('/v1/generate', { provider: 'openai', spec: readSpec() });
    const image = result.images?.find((item) => item.preview || item.url);
    if (!image) throw new Error(t('noPreview'));
    $('#preview-image').src = image.preview || image.url;
    $('#preview-frame').classList.add('has-image');
    $('#preview-state').textContent = 'READY';
    showMessage(t('generated'));
  } catch (error) {
    $('#preview-state').textContent = 'ERROR';
    showMessage(error.message, true);
    throw error;
  } finally {
    button.disabled = false;
    button.textContent = t('generate');
  }
}

async function loadHarnesses() {
  const result = await api('/v1/harnesses');
  harnesses = result.harnesses;
  $('#harness').innerHTML = harnesses.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${item.transport.toUpperCase()}${item.enabled ? '' : ' · 未启用'}</option>`).join('');
  const available = harnesses.filter((item) => item.enabled).length;
  $('#harness-state').textContent = `${available}/${harnesses.length} READY`;
}

async function runHarness() {
  const harness = $('#harness').value;
  if (!harness) throw new Error('请先在 config/harnesses.json 中启用至少一个 Harness。');
  const button = $('#run-harness');
  button.disabled = true;
  button.textContent = '协作中…';
  try {
    const result = await api('/v1/harness/run', {
      harness,
      input: { prompt: $('#harness-prompt').value, spec: compactSpec(readSpec()), compiledPrompt: output.textContent }
    });
    $('#harness-output').textContent = typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2);
    showMessage(`${harness} 已返回协作结果。`);
  } finally {
    button.disabled = false;
    button.textContent = '发送协作任务';
  }
}

async function connectHarness() {
  const id = $('#harness').value;
  if (!id) return;
  $('#harness-state').textContent = 'CONNECTING';
  try {
    const result = await api('/v1/harness/connect', { harness: id });
    $('#harness-state').textContent = result.status === 'authorization_started' ? 'AUTH WINDOW' : result.status.toUpperCase();
    const link = $('#harness-link');
    if (result.authorization_url) { link.href = result.authorization_url; link.hidden = false; link.textContent = language === 'zh' ? '打开授权入口' : 'Open authorization'; $('#confirm-harness').hidden = false; link.click(); }
    showMessage(result.message);
  } catch (error) {
    $('#harness-state').textContent = 'OFFLINE';
    showMessage(error.message, true);
  }
}

async function confirmHarness() {
  const id = $('#harness').value;
  const result = await api('/v1/harness/confirm', { harness: id });
  $('#harness-state').textContent = result.status === 'authorized' ? 'AUTHORIZED' : result.status.toUpperCase();
  showMessage(result.message, result.status === 'not_authorized');
}

async function startRealtime() {
  if (realtimeEvents) realtimeEvents.close();
  const result = await api('/v1/realtime/session', {});
  realtimeSession = result.id;
  realtimeEvents = new EventSource(`/v1/realtime/${realtimeSession}/events`);
  realtimeEvents.onmessage = (event) => renderRealtime(JSON.parse(event.data));
  realtimeEvents.onerror = () => renderRealtime({ type: 'error', text: '实时连接已断开。' });
  $('#send-chat').disabled = false;
  $('#chat-log').textContent = '实时会话已建立，等待 Codex 响应…';
}

async function sendRealtime() {
  const input = $('#chat-input');
  const message = input.value.trim();
  if (!realtimeSession || !message) return;
  input.value = '';
  await api(`/v1/realtime/session/${realtimeSession}/send`, { message });
}

function renderRealtime(event) {
  const text = event.text || event.message || event.delta || event.result?.text || event.result?.content || JSON.stringify(event);
  const line = document.createElement('div');
  line.className = event.type === 'user' ? 'chat-user' : 'chat-assistant';
  line.textContent = typeof text === 'string' ? text : JSON.stringify(text);
  $('#chat-log').append(line);
  $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
}

function compactSpec(spec) {
  return {
    mode: spec.mode,
    intent: spec.story?.intent,
    theme: spec.story?.theme,
    emotional_arc: spec.story?.emotional_arc,
    decisive_moment: spec.scene?.decisive_moment,
    medium: spec.style?.medium,
    location: spec.world?.location,
    shot_size: spec.camera?.shot_size,
    aspect_ratio: spec.constraints?.aspect_ratio,
    avoid: spec.constraints?.avoid
  };
}

function renderGates(result) {
  $('#overall').textContent = result.status;
  $('#overall').className = `badge ${result.status.toLowerCase()}`;
  for (const gate of result.gates) {
    const card = document.querySelector(`[data-gate="${gate.gate}"]`);
    card.classList.remove('pass', 'revise');
    card.classList.add(gate.status.toLowerCase());
    card.querySelector('.gate-state').textContent = gate.status;
    card.title = gate.issues.join('\n');
  }
}

function readSpec() {
  syncForm();
  return structuredClone(currentSpec);
}

function setSpec(spec) {
  currentSpec = structuredClone(spec);
  $('#mode').value = currentSpec.mode || 'single_image';
  document.querySelectorAll('[data-path]').forEach((field) => { field.value = getPath(currentSpec, field.dataset.path) || ''; });
  $('#avoid').value = (currentSpec.constraints?.avoid || []).join(', ');
}

function syncForm() {
  if (!currentSpec) return;
  currentSpec.mode = $('#mode').value;
  document.querySelectorAll('[data-path]').forEach((field) => setPath(currentSpec, field.dataset.path, field.value));
  currentSpec.constraints.avoid = $('#avoid').value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  if (saveDraft(currentSpec)) $('#local-state').textContent = 'LOCAL SAVED';
}

let automationTimer;
function scheduleAutomation() {
  clearTimeout(automationTimer);
  $('#local-state').textContent = 'AUTO CHECKING';
  automationTimer = setTimeout(() => run(validate), 650);
}

function getPath(object, path) { return path.split('.').reduce((value, key) => value?.[key], object); }
function setPath(object, path, value) {
  const keys = path.split('.');
  const leaf = keys.pop();
  const parent = keys.reduce((target, key) => target[key] ||= {}, object);
  parent[leaf] = value;
}

function clearOutput() {
  output.textContent = '等待编译。';
}

async function copyPrompt() {
  const text = output.textContent.trim();
  if (!text || text === '等待编译。') throw new Error(language === 'zh' ? '请先编译 Prompt，再复制。' : 'Compile the prompt before copying it.');

  // Clipboard API is preferred, but the local WebUI may be served from a
  // context where clipboard permissions are unavailable. Keep a synchronous
  // fallback so the button still has a real copy effect in that case.
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }
  if (!copied) {
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();
    fallback.setSelectionRange(0, fallback.value.length);
    copied = document.execCommand('copy');
    fallback.remove();
  }
  if (!copied) throw new Error(language === 'zh' ? '复制失败，请检查浏览器剪贴板权限。' : 'Copy failed; check browser clipboard permissions.');

  const button = $('#copy');
  const original = button.textContent;
  button.textContent = language === 'zh' ? '已复制 ✓' : 'Copied ✓';
  button.classList.add('copied');
  button.setAttribute('aria-label', language === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard');
  showMessage(language === 'zh' ? 'Prompt 已复制到剪贴板。' : 'Prompt copied to clipboard.');
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
    button.removeAttribute('aria-label');
  }, 1800);
}

async function api(path, body) {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

async function run(task) {
  try { await task(); } catch (error) { showMessage(error.message, true); }
}

function showMessage(text, error = false) {
  message.textContent = text;
  message.className = `message${error ? ' error' : ''}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

const translations = {
  zh: { tagline: '好画面不是生成出来的，是决定出来的。', creativeIntent: '创作意图', storyDirector: '故事导演', artDirector: '艺术指导', cinematicDirector: '镜头导演', continuity: '连续性', promptCompiler: '提示词编译', principle: 'Prompt 只是最后一步。先决定意义、表演、证据与镜头，再交给模型执行。', quality: '决策检查', workspace: '视觉导演工作台', intent: '创作意图', theme: '主题', emotion: '情绪弧线', moment: '决定性瞬间', medium: '视觉媒介', location: '场景地点', shot: '镜头景别', ratio: '画面比例', avoid: '避免元素（逗号分隔）', reset: '恢复示例', validate: '运行三道 Gate', compile: '编译 Prompt', generate: '生成图像', preview: '生成预览', previewEmpty: '接入文生图服务后，生成结果将在这里显示', generating: '生成中…', selectImageProvider: '请选择已接入的 OpenAI 文生图 Provider。', noPreview: '生成服务没有返回可预览图像。', generated: '图像已生成并载入预览。' },
  en: { tagline: 'Great images are decided before they are generated.', creativeIntent: 'Creative Intent', storyDirector: 'Story Director', artDirector: 'Art Director', cinematicDirector: 'Cinematic Director', continuity: 'Continuity', promptCompiler: 'Prompt Compiler', principle: 'The prompt is the final step. Decide meaning, performance, evidence, and camera before execution.', quality: 'Decision Check', workspace: 'Visual Director Workspace', intent: 'Creative intent', theme: 'Theme', emotion: 'Emotional arc', moment: 'Decisive moment', medium: 'Visual medium', location: 'Location', shot: 'Shot size', ratio: 'Aspect ratio', avoid: 'Avoid (comma-separated)', reset: 'Restore example', validate: 'Run three gates', compile: 'Compile prompt', generate: 'Generate image', preview: 'Generated preview', previewEmpty: 'Generated images will appear here after an image provider is connected', generating: 'Generating…', selectImageProvider: 'Select the connected OpenAI image provider first.', noPreview: 'The provider returned no previewable image.', generated: 'Image generated and loaded into preview.' }
};
Object.assign(translations.zh, { stepReady: '已进入此阶段', continuityNote: '连续性检查会在右侧 Gate 区域运行，确保角色、风格与世界状态保持一致。', compilerNote: '提示词将在通过三道 Gate 后编译，并可发送给已启用的 Harness 或文生图 Provider。' });
Object.assign(translations.en, { stepReady: 'This stage is ready', continuityNote: 'Continuity checks run in the Gate panel to keep character, style, and world state consistent.', compilerNote: 'The prompt is compiled after the three gates and can be sent to an enabled Harness or image provider.' });

function t(key) { return translations[language][key] || key; }
function renderLanguage() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  $('#language').textContent = language === 'zh' ? '中文 / EN' : 'EN / 中文';
  $('#generate').textContent = t('generate');
}
