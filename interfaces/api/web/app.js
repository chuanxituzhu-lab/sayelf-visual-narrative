import { loadDraft, saveDraft } from './modules/local-state.mjs';
import { buildDualOutputInput, buildPromptPackage, formatPromptPackageForHarness, isStoryMode } from './prompt-output.mjs';

const $ = (selector) => document.querySelector(selector);
const output = $('#output');
const message = $('#message');
let example;
let harnesses = [];
let visualSkills = [];
let mediaProviders = [];
const compileCache = new Map();
let realtimeSession = null;
let realtimeEvents = null;
let currentSpec = null;
let promptPackage = null;
let optimization = null;
let lastValidation = null;
let lastMessage = null;
let language = 'zh';

boot();

async function boot() {
  try {
    example = await api('/v1/example');
    setSpec(loadDraft() || example);
    renderLanguage();
    goToStep(1);
    await loadVisualSkills();
    await loadMediaProviders();
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
$('#generate-video').addEventListener('click', () => run(generateVideo));
$('#optimize').addEventListener('click', () => run(optimizeIntent));
$('#apply-optimization').addEventListener('click', () => run(applyOptimization));
$('#restore-original').addEventListener('click', () => run(restoreOriginalIntent));
$('#copy-optimization').addEventListener('click', () => run(() => copyPrompt(optimization?.optimized_intent, $('#copy-optimization'))));
$('#language').addEventListener('click', () => run(async () => {
  language = language === 'zh' ? 'en' : 'zh';
  renderLanguage();
  if (promptPackage?.imagePrompts?.length || promptPackage?.videoStoryboard) await compile();
}));
$('#mode').addEventListener('change', () => run(async () => { const spec = readSpec(); spec.mode = $('#mode').value; setSpec(spec); clearOutput(); await validate(); }));
document.querySelectorAll('[data-path], #avoid, #character-type, #image-platform, #scene-mode, #scene-options, #scene-seed, #platform, #duration').forEach((field) => field.addEventListener('input', () => { syncForm(); scheduleAutomation(); }));
document.querySelectorAll('#character-type, #image-platform, #scene-mode, #platform, #duration').forEach((field) => field.addEventListener('change', () => { syncForm(); scheduleAutomation(); }));
$('#skill').addEventListener('change', () => { syncForm(); scheduleAutomation(); });
$('#media-provider').addEventListener('change', () => { syncForm(); });
document.querySelectorAll('.nav-item[data-step]').forEach((button) => button.addEventListener('click', () => run(() => goToStep(Number(button.dataset.step)))));
$('#harness').addEventListener('change', () => run(async () => { renderHarnessCapabilities(); await connectHarness(); }));
$('#harness-capability').addEventListener('change', renderHarnessCapabilities);
$('#confirm-harness').addEventListener('click', () => run(confirmHarness));
$('#start-realtime').addEventListener('click', () => run(startRealtime));
$('#send-chat').addEventListener('click', () => run(sendRealtime));
$('#chat-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') run(sendRealtime); });
$('#prompt-package').addEventListener('click', (event) => {
  const button = event.target.closest('[data-copy-prompt]');
  if (!button) return;
  run(() => copyPrompt(promptTextForCopy(button.dataset.copyPrompt), button));
});
$('#use-prompt').addEventListener('click', () => {
  const compiled = formatPromptPackageForHarness(promptPackage) || (output.textContent.startsWith('等待编译') ? '' : output.textContent);
  $('#harness-prompt').value = compiled ? `${t('harnessReviewIntro')}\n\n${compiled}` : t('harnessReviewEmpty');
});
$('#run-harness').addEventListener('click', () => run(runHarness));

async function validate() {
  const result = await api('/v1/validate', { spec: readSpec() });
  lastValidation = result;
  renderGates(result);
  showMessage(result.status === 'PASS' ? t('validationPass') : t('validationRevise'), result.status !== 'PASS');
  return result;
}

async function compile() {
  const validation = await validate();
  if (validation.status !== 'PASS') return;
  const providerName = $('#provider').value;
  const spec = readSpec();
  const cacheKey = `${language}:${providerName}:${JSON.stringify(spec)}`;
  const cached = compileCache.get(cacheKey);
  if (cached) {
    output.textContent = cached.prompt;
    renderPromptPackage(cached.package);
    showMessage(t('usedCache'));
    return { provider: providerName, prompt: cached.prompt, package: cached.package, cached: true };
  }
  const result = await api('/v1/compile', { provider: providerName, spec, language });
  const compiledPrompt = result.prompt || JSON.stringify(result, null, 2);
  const packageResult = await createPromptPackage(spec, compiledPrompt);
  output.textContent = compiledPrompt;
  renderPromptPackage(packageResult);
  compileCache.set(cacheKey, { prompt: compiledPrompt, package: packageResult });
  showMessage(`${t('compiled')} ${result.provider || $('#provider').value} Prompt.`);
  return { provider: result.provider || providerName, prompt: compiledPrompt, package: packageResult, cached: false };
}

async function createPromptPackage(spec, compiledPrompt) {
  let dualOutput = null;
  if (isStoryMode(spec.mode)) {
    const result = await api('/v1/dual-output', { input: buildDualOutputInput(spec, language) });
    dualOutput = result.output;
    return buildPromptPackage({ spec, compiledPrompt, dualOutput, planning: result.plan, language });
  }
  return buildPromptPackage({ spec, compiledPrompt, dualOutput, language });
}

async function goToStep(step) {
  document.querySelectorAll('.nav-item[data-step]').forEach((button) => button.classList.toggle('active', Number(button.dataset.step) === step));
  document.querySelectorAll('.director-form [data-step]').forEach((field) => field.classList.toggle('step-hidden', Number(field.dataset.step) !== step));
  const heading = document.querySelector('[data-i18n="workspace"]');
  heading.dataset.stepTitle = step;
  if (step === 6) {
    await compile();
    document.querySelector('#prompt-package').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const first = document.querySelector(`.director-form [data-step="${step}"] input, .director-form [data-step="${step}"] textarea, .director-form [data-step="${step}"] select`);
  first?.focus();
  showMessage(`${stepLabel(step)} · ${t('stepReady')}`);
}

function stepLabel(step) {
  const button = document.querySelector(`.nav-item[data-step="${step}"] i`);
  return button?.textContent || `${t('step')} ${step}`;
}

async function generate() {
  return generateMedia('image');
}

async function generateVideo() {
  return generateMedia('video');
}

async function optimizeIntent() {
  const spec = readSpec();
  const intent = spec.story?.intent?.trim();
  if (!intent) throw new Error(t('enterIntent'));
  const button = $('#optimize');
  button.disabled = true;
  button.textContent = t('optimizing');
  try {
    optimization = await api('/v1/optimize', { intent, language, spec });
    renderOptimization(optimization);
    showMessage(t('optimizationReady'));
  } finally {
    button.disabled = false;
    button.textContent = t('optimize');
  }
}

function renderOptimization(result) {
  $('#optimization-output').textContent = result?.optimized_intent || '';
  $('#optimization-original').textContent = result?.original_intent || '';
  $('#optimization-panel').hidden = !result?.optimized_intent;
}

async function applyOptimization() {
  if (!optimization?.optimized_intent) throw new Error(t('optimizationEmpty'));
  $('#intent').value = optimization.optimized_intent;
  syncForm();
  renderOptimization(optimization);
  await validate();
  showMessage(t('optimizationApplied'));
}

async function restoreOriginalIntent() {
  if (!optimization?.original_intent) throw new Error(t('optimizationEmpty'));
  $('#intent').value = optimization.original_intent;
  syncForm();
  await validate();
  showMessage(t('originalRestored'));
}

async function generateMedia(assetType) {
  const validation = await validate();
  if (validation.status !== 'PASS') return;
  const button = assetType === 'video' ? $('#generate-video') : $('#generate');
  button.disabled = true;
  button.textContent = assetType === 'video' ? t('generatingVideo') : t('generating');
  $('#preview-state').textContent = t('compilingPrompt');
  try {
    const compiled = await compile();
    const imagePrompts = promptPackage?.imagePrompts || [];
    const prompt = assetType === 'video'
      ? promptPackage?.videoStoryboard?.prompt || compiled?.prompt || ''
      : imagePrompts[0]?.prompt || compiled?.prompt || '';
    const prompts = assetType === 'image' ? imagePrompts.map((item) => item.prompt) : [prompt];
    $('#preview-state').textContent = t('working');
    showMessage(assetType === 'video' ? t('requestingVideo') : t('requestingImage'));
    const spec = readSpec();
    const result = await api('/v1/media/jobs', {
      provider_id: $('#media-provider').value,
      asset_type: assetType,
      mode: assetType === 'image' ? 'text_to_image' : 'text_to_video',
      prompts,
      count: prompts.length,
      aspect_ratio: spec.constraints?.aspect_ratio,
      duration_seconds: spec.constraints?.duration_seconds,
      metadata: { visual_skill_id: spec.skill_id || null, narrative_mode: spec.mode || 'single_image' }
    });
    renderMediaJob(result);
    if (result.status === 'awaiting_assistant') {
      $('#harness-prompt').value = result.assistant_prompt || formatPromptPackageForHarness(promptPackage);
      showMessage(t('assistantFallbackReady'));
    } else if (result.status === 'completed' && result.assets?.length) {
      showMessage(assetType === 'video' ? t('videoGenerated') : t('generated'));
    } else {
      showMessage(result.message || t('mediaProcessing'));
    }
  } catch (error) {
    $('#preview-state').textContent = t('error');
    throw error;
  } finally {
    button.disabled = false;
    button.textContent = assetType === 'video' ? t('generateVideo') : t('generate');
  }
}

function renderMediaJob(job) {
  const result = $('#media-result');
  const assets = job.assets || [];
  const image = assets.find((asset) => asset.type === 'image' && asset.preview_url);
  const video = assets.find((asset) => asset.type === 'video' && asset.preview_url);
  $('#preview-frame').classList.toggle('has-image', Boolean(image));
  $('#preview-frame').classList.toggle('has-video', Boolean(video));
  $('#preview-image').src = image?.preview_url || '';
  $('#preview-video').src = video?.preview_url || '';
  $('#preview-state').textContent = job.status || t('empty');
  result.hidden = false;
  $('#media-result-state').textContent = `${job.provider_id} · ${job.status}${job.message ? ` · ${job.message}` : ''}`;
  $('#media-downloads').innerHTML = assets.filter((asset) => asset.download_url).map((asset) => `<a href="${escapeHtml(asset.download_url)}" download>${escapeHtml(asset.file_name || `${asset.type}-${asset.index + 1}`)} ↓</a>`).join('');
  $('#media-fallback').textContent = job.status === 'awaiting_assistant' ? (job.assistant_prompt || '') : '';
}

async function loadVisualSkills() {
  const result = await api('/v1/skills');
  visualSkills = result.skills || [];
  $('#skill').innerHTML = `<option value="" data-i18n="autoRoute">${escapeHtml(t('autoRoute'))}</option>` + visualSkills.map((skill) => `<option value="${escapeHtml(skill.id)}">${escapeHtml(skill.name?.[language] || skill.id)} · ${escapeHtml(skill.origin || 'builtin')}</option>`).join('');
  $('#skill').value = currentSpec?.skill_id || '';
}

async function loadMediaProviders() {
  const result = await api('/v1/media/providers');
  mediaProviders = result.providers || [];
  renderMediaProviders();
}

function renderMediaProviders() {
  $('#media-provider').innerHTML = mediaProviders.map((provider) => {
    const label = provider.name?.[language] || provider.id;
    const state = provider.ready ? t('providerReady') : provider.configured ? t('assistantFallback') : t('providerConfigRequired');
    return `<option value="${escapeHtml(provider.id)}">${escapeHtml(label)} · ${escapeHtml(state)}</option>`;
  }).join('');
  $('#media-provider').value = currentSpec?.media_provider_id || 'local-preview';
  if (!mediaProviders.some((provider) => provider.id === $('#media-provider').value)) $('#media-provider').value = mediaProviders[0]?.id || '';
}

async function loadHarnesses() {
  const result = await api('/v1/harnesses');
  harnesses = result.harnesses;
  renderHarnessOptions();
  const firstEnabled = harnesses.find((item) => item.enabled);
  if (firstEnabled) $('#harness').value = firstEnabled.id;
  renderHarnessCapabilities();
  const available = harnesses.filter((item) => item.enabled).length;
  $('#harness-state').textContent = `${available}/${harnesses.length} ${t('ready').toUpperCase()}`;
}

function renderHarnessOptions() {
  $('#harness').innerHTML = harnesses.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(harnessLabel(item))} · ${item.transport.toUpperCase()}${item.enabled ? '' : ` · ${escapeHtml(t('disabled'))}`}</option>`).join('');
}

function renderHarnessCapabilities() {
  const selected = harnesses.find((item) => item.id === $('#harness').value);
  const capabilities = selected?.capabilities || [];
  $('#harness-capability').innerHTML = capabilities.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(capabilityLabel(item))}</option>`).join('');
  $('#harness-capability').disabled = !selected?.enabled || !capabilities.length;
  const capability = capabilities.find((item) => item.id === $('#harness-capability').value);
  const separator = language === 'en' ? ': ' : '：';
  const details = selected?.missing_env?.length
    ? `${t('localConfigRequired')}${separator}${selected.missing_env.join(', ')}`
    : [harnessDescription(selected), capabilityDescription(capability)].filter(Boolean).join(' · ');
  $('#harness-description').textContent = details;
}

function harnessLabel(item) {
  return t(`harness_${item.id}`) === `harness_${item.id}` ? item.name : t(`harness_${item.id}`);
}

function capabilityLabel(item) {
  return t(`capability_${item?.id}`) === `capability_${item?.id}` ? item?.name || item?.id || '' : t(`capability_${item.id}`);
}

function capabilityDescription(item) {
  if (!item) return '';
  const key = `capability_${item.id}_description`;
  return t(key) === key ? item.description || '' : t(key);
}

function harnessDescription(item) {
  if (!item) return '';
  const key = `harness_${item.id}_description`;
  return t(key) === key ? item.description || '' : t(key);
}

async function runHarness() {
  const harness = $('#harness').value;
  if (!harness) throw new Error(t('enableHarness'));
  const button = $('#run-harness');
  button.disabled = true;
  button.textContent = t('collaborating');
  try {
    const result = await api('/v1/harness/run', {
      harness,
      input: { prompt: $('#harness-prompt').value, capability: $('#harness-capability').value, spec: compactSpec(readSpec()), compiledPrompt: formatPromptPackageForHarness(promptPackage) || output.textContent }
    });
    $('#harness-output').textContent = typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2);
    showMessage(`${harness} ${t('harnessReturned')}`);
  } finally {
    button.disabled = false;
    button.textContent = t('sendTask');
  }
}

async function connectHarness() {
  const id = $('#harness').value;
  if (!id) return;
  $('#harness-state').textContent = t('connecting');
  try {
    const result = await api('/v1/harness/connect', { harness: id });
    $('#harness-state').textContent = harnessStateLabel(result.status);
    const link = $('#harness-link');
    if (result.authorization_url) { link.href = result.authorization_url; link.hidden = false; link.textContent = t('openAuthorization'); $('#confirm-harness').hidden = false; link.click(); }
    showMessage(result.message, result.status === 'api_configuration_required');
  } catch (error) {
    $('#harness-state').textContent = t('offline');
    showMessage(error.message, true);
  }
}

async function confirmHarness() {
  const id = $('#harness').value;
  const result = await api('/v1/harness/confirm', { harness: id });
  $('#harness-state').textContent = harnessStateLabel(result.status);
  showMessage(result.message, result.status === 'not_authorized');
}

async function startRealtime() {
  if (realtimeEvents) realtimeEvents.close();
  const result = await api('/v1/realtime/session', {});
  realtimeSession = result.id;
  realtimeEvents = new EventSource(`/v1/realtime/${realtimeSession}/events`);
  realtimeEvents.onmessage = (event) => renderRealtime(JSON.parse(event.data));
  realtimeEvents.onerror = () => renderRealtime({ type: 'error', text: t('realtimeDisconnected') });
  $('#send-chat').disabled = false;
  $('#chat-log').textContent = t('realtimeStarted');
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
    consistency: spec.consistency,
    aspect_ratio: spec.constraints?.aspect_ratio,
    space_continuity: spec.consistency?.space_continuity,
    avoid: spec.constraints?.avoid
  };
}

function renderGates(result) {
  $('#overall').textContent = result.status === 'PASS' ? t('pass') : t('revise');
  $('#overall').className = `badge ${result.status.toLowerCase()}`;
  for (const gate of result.gates) {
    const card = document.querySelector(`[data-gate="${gate.gate}"]`);
    card.classList.remove('pass', 'revise');
    card.classList.add(gate.status.toLowerCase());
    card.querySelector('.gate-state').textContent = gate.status === 'PASS' ? t('pass') : t('revise');
    card.title = gate.issues.join('\n');
  }
}

function readSpec() {
  syncForm();
  return structuredClone(currentSpec);
}

function setSpec(spec) {
  currentSpec = structuredClone(spec);
  currentSpec.media_provider_id ||= 'local-preview';
  $('#mode').value = currentSpec.mode || 'single_image';
  $('#skill').value = currentSpec.skill_id || '';
  document.querySelectorAll('[data-path]').forEach((field) => { field.value = getPath(currentSpec, field.dataset.path) || ''; });
  $('#character-type').value = currentSpec.character?.type || 'human';
  $('#image-platform').value = currentSpec.constraints?.image_platform_profile || 'xiaohongshu_image';
  $('#avoid').value = (currentSpec.constraints?.avoid || []).join(', ');
  $('#scene-mode').value = currentSpec.scene?.scene_mode || 'auto';
  $('#scene-options').value = (currentSpec.scene?.scene_options || []).join(', ');
  $('#scene-seed').value = currentSpec.scene?.scene_seed || '';
  $('#platform').value = currentSpec.constraints?.platform_profile || 'generic_short';
  $('#duration').value = currentSpec.constraints?.duration_seconds || 18;
}

function syncForm() {
  if (!currentSpec) return;
  currentSpec.character ||= {};
  currentSpec.scene ||= {};
  currentSpec.constraints ||= {};
  currentSpec.consistency ||= {};
  currentSpec.consistency.product ||= {};
  currentSpec.mode = $('#mode').value;
  currentSpec.skill_id = $('#skill').value || undefined;
  currentSpec.media_provider_id = $('#media-provider').value || 'local-preview';
  if (!currentSpec.skill_id) delete currentSpec.skill_id;
  document.querySelectorAll('[data-path]').forEach((field) => setPath(currentSpec, field.dataset.path, field.value));
  currentSpec.character.type = $('#character-type').value;
  currentSpec.constraints.image_platform_profile = $('#image-platform').value;
  currentSpec.constraints.avoid = $('#avoid').value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  currentSpec.scene.scene_mode = $('#scene-mode').value;
  currentSpec.scene.scene_options = $('#scene-options').value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  currentSpec.scene.scene_seed = $('#scene-seed').value.trim();
  currentSpec.constraints.platform_profile = $('#platform').value;
  currentSpec.constraints.duration_seconds = Number($('#duration').value) || 18;
  if (saveDraft(currentSpec)) $('#local-state').textContent = t('localSaved');
}

let automationTimer;
function scheduleAutomation() {
  clearTimeout(automationTimer);
  $('#local-state').textContent = t('autoChecking');
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
  promptPackage = null;
  optimization = null;
  output.textContent = t('outputEmpty');
  renderPromptPackage({ mode: 'single_image', imagePrompts: [], videoStoryboard: null });
  $('#preview-frame').classList.remove('has-image', 'has-video');
  $('#preview-image').src = '';
  $('#preview-video').src = '';
  $('#media-result').hidden = true;
  $('#media-downloads').innerHTML = '';
  $('#media-fallback').textContent = '';
  $('#optimization-panel').hidden = true;
  $('#optimization-output').textContent = '';
  $('#optimization-original').textContent = '';
}

function renderPromptPackage(nextPackage) {
  promptPackage = nextPackage;
  const imagePrompts = nextPackage?.imagePrompts || [];
  $('#image-count').textContent = language === 'zh' ? `${imagePrompts.length} 张` : `${imagePrompts.length} image${imagePrompts.length === 1 ? '' : 's'}`;
  $('#image-prompts').innerHTML = imagePrompts.length ? imagePrompts.map((item) => `
    <article class="prompt-card">
      <div class="prompt-card-head"><h3>${escapeHtml(item.title)}</h3><button class="quiet" data-copy-prompt="${escapeHtml(item.id)}">${escapeHtml(t('copyImagePrompt'))}</button></div>
      <pre class="image-prompt">${escapeHtml(item.prompt)}</pre>
      ${item.negativePrompt ? `<div class="negative-prompt"><span>${escapeHtml(t('negativePrompt'))}</span>${escapeHtml(item.negativePrompt)}</div>` : ''}
    </article>`).join('') : `<p class="empty-output">${escapeHtml(t('waitingCompile'))}</p>`;

  const storyboard = nextPackage?.videoStoryboard;
  const section = $('#video-storyboard-section');
  section.hidden = !storyboard?.prompt;
  const plan = storyboard?.planning;
  $('#storyboard-plan').innerHTML = plan ? [
    `<span class="plan-chip">${escapeHtml(plan.platform_label || t('genericShort'))}</span>`,
    `<span class="plan-chip">${escapeHtml(plan.duration_seconds)} ${escapeHtml(t('seconds'))}</span>`,
    `<span class="plan-chip">${escapeHtml(t('adaptive'))} ${escapeHtml(plan.shot_count)} ${escapeHtml(t('shots'))}</span>`,
    `<span class="plan-chip">${escapeHtml(t('openingHook'))} ${escapeHtml(plan.hook_seconds)} ${escapeHtml(t('seconds'))}</span>`,
    `<span class="plan-chip">${escapeHtml(plan.scene?.mode === 'random' ? t('randomScene') : plan.scene?.mode === 'auto' ? t('autoScene') : t('selectedScene'))}${escapeHtml(language === 'en' ? ': ' : '：')}${escapeHtml(plan.scene?.selected || '')}</span>`,
    plan.scene?.transitions?.length ? `<span class="plan-chip">${escapeHtml(t('spaceSwitches'))} ${escapeHtml(plan.scene.transitions.length)}</span>` : '',
    plan.guidance?.length ? `<small class="plan-guidance">${escapeHtml(t('platformGuidance'))}${escapeHtml(language === 'en' ? ': ' : '：')}${escapeHtml(plan.guidance.join(' · '))}</small>` : ''
  ].join('') : '';
  $('#video-storyboard-prompt').textContent = storyboard?.prompt || t('storyboardEmpty');
  $('#storyboard-shots').innerHTML = storyboard?.shots?.length ? storyboard.shots.map((shot) => `
    <article class="shot-card">
      <div><strong>${escapeHtml(t('shotItem'))} ${escapeHtml(shot.order)} · ${escapeHtml(frameRoleLabel(shot.frame_role))}</strong><span>${escapeHtml(shot.duration_seconds)} ${escapeHtml(t('seconds'))}</span></div>
      <p>${escapeHtml(shot.visual_action)}</p>
      <small class="shot-transition">${escapeHtml(shot.transition)}</small>
      <small>${escapeHtml(shot.camera)}</small>
    </article>`).join('') : '';
}

function frameRoleLabel(role) {
  return language === 'en' ? ({ start: 'opening', development: 'development', end: 'ending' })[role] || role || 'shot' : ({ start: '开场', development: '发展', end: '结尾' })[role] || role || '镜头';
}

function promptTextForCopy(id) {
  if (id === 'canonical') return output.textContent;
  if (id === 'video-storyboard') return promptPackage?.videoStoryboard?.prompt || '';
  const item = promptPackage?.imagePrompts?.find((prompt) => prompt.id === id);
  return item ? `${item.prompt}${item.negativePrompt ? `\n${t('negativePrompt')}：${item.negativePrompt}` : ''}` : '';
}

async function copyPrompt(textValue, button) {
  const text = String(textValue || '').trim();
  if (!text || text === t('waitingCompile')) throw new Error(t('compileBeforeCopy'));

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
  if (!copied) throw new Error(t('copyFailed'));

  const original = button.textContent;
  button.textContent = t('copied');
  button.classList.add('copied');
  button.setAttribute('aria-label', t('copiedToClipboard'));
  showMessage(t('promptCopied'));
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
  const translationKey = Object.entries(translations[language] || {}).find(([, value]) => value === text)?.[0] || '';
  lastMessage = { text, error, translationKey };
  message.textContent = text;
  message.className = `message${error ? ' error' : ''}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

const translations = {
  zh: { tagline: '好画面不是生成出来的，是决定出来的。', creativeIntent: '创作意图', storyDirector: '故事导演', artDirector: '艺术指导', cinematicDirector: '镜头导演', continuity: '连续性', promptCompiler: '提示词编译', principle: 'Prompt 只是最后一步。先决定意义、表演、证据与镜头，再交给模型执行。', quality: '决策检查', workspace: '视觉导演工作台', imagePrompts: '图片 Prompt', videoStoryboard: '视频分镜 Prompt', canonicalPrompt: '查看 Canonical Prompt 底稿', capability: '使用能力', characterType: '人物类型', characterIdentity: '人物身份锚点', characterAppearance: '外观一致性锚点', characterCostume: '服装/材质', performanceAnchor: '动作/姿态锚点', sceneMode: '空间策略', sceneOptions: '空间序列 / 候选地点（逗号分隔）', sceneSeed: '随机种子', platform: '自媒体策略', duration: '视频时长（秒）', intent: '创作意图', theme: '主题', emotion: '情绪弧线', moment: '决定性瞬间', medium: '视觉媒介', location: '场景地点', shot: '镜头景别', ratio: '画面比例', avoid: '避免元素（逗号分隔）', reset: '恢复示例', validate: '运行三道 Gate', compile: '编译 Prompt', generate: '生成图像', preview: '生成预览', previewEmpty: '接入文生图服务后，生成结果将在这里显示', generating: '生成中…', selectImageProvider: '请选择已接入的 OpenAI 文生图 Provider。', noPreview: '生成服务没有返回可预览图像。', generated: '图像已生成并载入预览。' },
  en: { tagline: 'Great images are decided before they are generated.', creativeIntent: 'Creative Intent', storyDirector: 'Story Director', artDirector: 'Art Director', cinematicDirector: 'Cinematic Director', continuity: 'Continuity', promptCompiler: 'Prompt Compiler', principle: 'The prompt is the final step. Decide meaning, performance, evidence, and camera before execution.', quality: 'Decision Check', workspace: 'Visual Director Workspace', imagePrompts: 'Image Prompts', videoStoryboard: 'Video Storyboard Prompt', canonicalPrompt: 'View Canonical Prompt base', capability: 'Use capability', characterType: 'Character type', characterIdentity: 'Character identity anchor', characterAppearance: 'Appearance continuity anchor', characterCostume: 'Wardrobe / material', performanceAnchor: 'Action / pose anchor', sceneMode: 'Space strategy', sceneOptions: 'Space sequence / candidate places (comma-separated)', sceneSeed: 'Random seed', platform: 'Short-video strategy', duration: 'Video duration (seconds)', intent: 'Creative intent', theme: 'Theme', emotion: 'Emotional arc', moment: 'Decisive moment', medium: 'Visual medium', location: 'Location', shot: 'Shot size', ratio: 'Aspect ratio', avoid: 'Avoid (comma-separated)', reset: 'Restore example', validate: 'Run three gates', compile: 'Compile prompt', generate: 'Generate image', preview: 'Generated preview', previewEmpty: 'Generated images will appear here after an image provider is connected', generating: 'Generating…', selectImageProvider: 'Select the connected OpenAI image provider first.', noPreview: 'The provider returned no previewable image.', generated: 'Image generated and loaded into preview.' }
};
Object.assign(translations.zh, {
  consistencyBase: '一致性底座', consistencyLocked: '锁定后贯穿所有图片与分镜', productIdentity: '产品身份', productAppearance: '产品外观', productMaterial: '产品材质 / 标记', productIdentityPlaceholder: '例如：白色无线耳机 Pro · 型号 A01', productAppearancePlaceholder: '例如：圆角方盒、短柄、银色触控区', productMaterialPlaceholder: '例如：磨砂塑料、黑色 Logo、不可改变的细节', optimize: '一键优化', optimizing: '优化中…', optimizationLocalNote: '本地保留原文，先给出导演版建议，确认后再采用。', optimizationEyebrow: '创意优化', optimizationTitle: '导演版创意', showOriginal: '查看客户原始创意', applyOptimization: '采用优化', restoreOriginal: '恢复原始', copyOptimization: '复制导演版', enterIntent: '请先输入客户的创意内容。', optimizationEmpty: '请先运行一键优化。', optimizationReady: '导演版创意已生成，原文仍已保留。', optimizationApplied: '已采用导演版创意，原文仍可从优化面板查看。', originalRestored: '已恢复客户原始创意。'
});
Object.assign(translations.en, {
  consistencyBase: 'Consistency base', consistencyLocked: 'Locked across every image and storyboard shot', productIdentity: 'Product identity', productAppearance: 'Product appearance', productMaterial: 'Material / markings', productIdentityPlaceholder: 'e.g. White Wireless Headphones Pro · Model A01', productAppearancePlaceholder: 'e.g. rounded case, short stem, silver touch panel', productMaterialPlaceholder: 'e.g. matte plastic, black logo, immutable details', optimize: 'Optimize once', optimizing: 'Optimizing…', optimizationLocalNote: 'The original stays local; review the director version before applying it.', optimizationEyebrow: 'Creative optimization', optimizationTitle: 'Director version', showOriginal: 'View customer original', applyOptimization: 'Apply optimization', restoreOriginal: 'Restore original', copyOptimization: 'Copy director version', enterIntent: 'Enter the customer creative first.', optimizationEmpty: 'Run the one-click optimizer first.', optimizationReady: 'Director version ready; the original is preserved.', optimizationApplied: 'Director version applied; the original remains available in the optimization panel.', originalRestored: 'Customer original restored.'
});
Object.assign(translations.zh, { stepReady: '已进入此阶段', continuityNote: '连续性检查会在右侧 Gate 区域运行，确保角色、风格与世界状态保持一致。', compilerNote: '提示词将在通过三道 Gate 后编译，并可发送给已启用的 Harness 或文生图 Provider。' });
Object.assign(translations.en, { stepReady: 'This stage is ready', continuityNote: 'Continuity checks run in the Gate panel to keep character, style, and world state consistent.', compilerNote: 'The prompt is compiled after the three gates and can be sent to an enabled Harness or image provider.' });

Object.assign(translations.zh, {
  localApi: '本地 API', localDraft: '本地草稿', localSaved: '本地已保存', autoChecking: '自动检查中', directingFlow: '导演流程', corePrinciple: '核心原则', directorInput: '导演输入', mode: '模式', singleImage: '单图', storySequence: '连续故事', storyboard: '视频分镜', provider: 'Provider', genericProvider: '通用', humanCharacter: '人物', anthropomorphicCharacter: '拟人化人物', characterIdentityPlaceholder: '例如：elderly-man-01', characterAppearancePlaceholder: '例如：银发、瘦脸、深色外套、左耳缺口', performanceAnchorPlaceholder: '例如：半转身，重心稳定，右手轻触墙面',
  imagePromptsEyebrow: '图片提示词', videoStoryboardEyebrow: '视频分镜', canonicalPromptTitle: 'Canonical Prompt', compiledOutput: '编译输出', copy: '复制',
  sceneAuto: '按故事自动切换空间', sceneSelected: '锁定当前地点', sceneRandom: '随机选择一个地点', autoScene: '空间自动流转', spaceSwitches: '空间切换', sceneOptionsPlaceholder: '例如：旷野，室内，舞台（按故事需要自动切换）', sceneSeedPlaceholder: '留空则使用创作意图',
  imagePlatform: '图片发布平台', imagePlatformXiaohongshu: '小红书图片', imagePlatformFacebook: 'Facebook 图片', imagePlatformInstagram: 'Instagram 图片', imagePlatformPinterest: 'Pinterest 图片', imagePlatformGeneric: '通用图片',
  platform: '视频发布平台', platformGeneric: '通用短视频', platformXiaohongshu: '小红书视频', platformYoutube: 'YouTube Shorts', platformInstagram: 'Instagram Reels', platformTiktok: 'TikTok', platformDouyin: '抖音', platformBilibili: 'B站', platformWechat: '视频号', platformFacebook: 'Facebook Reels', platformKuaishou: '快手',
  shotItem: '镜头', avoidPlaceholder: '例如：文字、水印、畸形手指、过度 HDR', generatedPreviewAlt: '生成的视觉预览', imagePreview: '图片预览', waitingCompile: '等待编译。', storyboardEmpty: '故事模式编译后，这里会单独列出视频分镜。', outputEmpty: '等待编译。\\n\\nVisualSpec 通过三道 Gate 后，Provider Adapter 会在这里输出可执行提示词。',
  copyImagePrompt: '复制图片 Prompt', copyStoryboard: '复制完整分镜', negativePrompt: '反向提示词', seconds: '秒', adaptive: '智能', openingHook: '首屏钩子', randomScene: '随机场景', selectedScene: '选择场景', platformGuidance: '平台策略', genericShort: '通用短视频',
  qualityControl: '质量控制', ready: '就绪', empty: '空', pass: '通过', revise: '需修订', selectOpenAI: '选择 OPENAI', compilingPrompt: '生成 PROMPT', working: '处理中', error: '错误', requestingImage: 'Prompt 已生成，正在请求图像服务…', compiled: '已编译', usedCache: '已使用本地编译缓存。', compileBeforeCopy: '请先编译 Prompt，再复制。', copyFailed: '复制失败，请检查浏览器剪贴板权限。', copied: '已复制 ✓', copiedToClipboard: '已复制到剪贴板', promptCopied: 'Prompt 已复制到剪贴板。', localDraft: '本地草稿', localSaved: '本地已保存', autoChecking: '自动检查中',
  harnessBridge: 'AI 辅助平台', harnessTitle: '辅助平台协作', local: '本地', targetTool: '目标工具', targetHarness: '目标 AI Harness', harnessCapability: '使用 AI 辅助平台的能力', harnessPrompt: '发给 AI Harness 的任务', harnessPromptPlaceholder: '例如：根据当前 VisualSpec 提出三个更克制的艺术指导方案。', useCompiled: '带入编译结果', sendTask: '发送协作任务', harnessEmpty: '等待连接已启用的 Harness。配置保存在服务端，不在浏览器中保存密钥或命令。', openAuthorization: '打开授权入口', confirmAuthorization: '我已完成人工授权，确认接入', disabled: '未启用', localConfigRequired: '待本机配置', enableHarness: '请先在 config/harnesses.json 中启用至少一个 Harness。', collaborating: '协作中…', harnessReturned: '已返回协作结果。', harnessReviewIntro: '请审阅并改进下面的视觉叙事提示词，同时保留 VisualSpec 的导演意图：', harnessReviewEmpty: '请审阅当前 VisualSpec，并提出可执行的导演与艺术指导改进建议。', capability_assist: '协作', capability_review: '审阅', capability_refine: '改写', capability_tools: '工具调用',
  codexRealtime: 'CODEX 实时会话', startRealtime: '开始实时会话', realtimeEmpty: '尚未建立实时会话。', realtimeStarted: '实时会话已建立，等待 Codex 响应…', realtimeDisconnected: '实时连接已断开。', chatPlaceholder: '向 Codex 发送消息…', realtimeMessage: '实时消息', send: '发送',
  harness_codex: 'Codex', harness_codex_description: 'OpenAI Codex CLI 适配器。', 'harness_claude-code': 'Claude Code', 'harness_claude-code_description': 'Anthropic Claude Code CLI 适配器。', harness_workbuddy: 'WorkBuddy', harness_workbuddy_description: 'WorkBuddy CLI 适配器；请按已安装客户端调整参数。', 'harness_custom-mcp': '自定义 MCP', 'harness_custom-mcp_description': '示例 stdio MCP 适配器。', 'harness_custom-api': '自定义 HTTP API', 'harness_custom-api_description': '示例服务端 HTTP API 适配器。密钥必须保存在本机环境变量中。', 'harness_example-assist': '示例辅助插件', 'harness_example-assist_description': '用于验证插件能力的示例辅助适配器。',
  capability_assist_description: '让辅助平台分析当前视觉任务。', capability_review_description: '检查意图、连续性与提示词质量。', capability_refine_description: '在保留导演意图的前提下改进结果。', capability_tools_description: '调用辅助平台声明的工具。',
  validationPass: 'VisualSpec 已通过三道 Gate。', validationRevise: 'VisualSpec 需要修订。', connecting: '连接中', authWindow: '授权窗口', apiReady: 'API 就绪', apiConfig: 'API 配置', offline: '离线', authorized: '已授权', notAuthorized: '未授权', step: '步骤',
  directorGate: '导演 Gate', directorGateHelp: '事件、瞬间、证据、景别', artGate: '艺术指导 Gate', artGateHelp: '取舍、层级、克制、一致', continuityGate: '连续性 Gate', continuityGateHelp: '角色、风格、世界连续性'
});
Object.assign(translations.en, {
  localApi: 'Local API', localDraft: 'LOCAL DRAFT', localSaved: 'LOCAL SAVED', autoChecking: 'AUTO CHECKING', directingFlow: 'Directing Flow', corePrinciple: 'Core Principle', directorInput: 'Director Input', mode: 'Mode', singleImage: 'Single image', storySequence: 'Story sequence', storyboard: 'Video storyboard', provider: 'Provider', genericProvider: 'Generic', humanCharacter: 'Human', anthropomorphicCharacter: 'Anthropomorphic character', characterIdentityPlaceholder: 'e.g. elderly-man-01', characterAppearancePlaceholder: 'e.g. silver hair, narrow face, dark coat, notch in the left ear', performanceAnchorPlaceholder: 'e.g. half-turned, balanced weight, right hand lightly touching the wall',
  imagePromptsEyebrow: 'IMAGE PROMPTS', videoStoryboardEyebrow: 'VIDEO STORYBOARD', canonicalPromptTitle: 'Canonical Prompt', compiledOutput: 'Compiled Output', copy: 'Copy',
  sceneAuto: 'Auto-switch spaces by story', sceneSelected: 'Lock current place', sceneRandom: 'Randomly select one place', autoScene: 'Automatic space flow', spaceSwitches: 'space transition(s)', sceneOptionsPlaceholder: 'e.g. open field, interior, stage (switch as the story requires)', sceneSeedPlaceholder: 'Leave empty to use the creative intent',
  imagePlatform: 'Image publishing platform', imagePlatformXiaohongshu: 'Xiaohongshu image', imagePlatformFacebook: 'Facebook image', imagePlatformInstagram: 'Instagram image', imagePlatformPinterest: 'Pinterest image', imagePlatformGeneric: 'Generic image',
  platform: 'Video publishing platform', platformGeneric: 'Generic short video', platformXiaohongshu: 'Xiaohongshu video', platformYoutube: 'YouTube Shorts', platformInstagram: 'Instagram Reels', platformTiktok: 'TikTok', platformDouyin: 'Douyin', platformBilibili: 'Bilibili', platformWechat: 'WeChat Channels', platformFacebook: 'Facebook Reels', platformKuaishou: 'Kuaishou',
  shotItem: 'Shot', avoidPlaceholder: 'e.g. text, watermark, malformed hands, excessive HDR', generatedPreviewAlt: 'Generated visual preview', imagePreview: 'IMAGE PREVIEW', waitingCompile: 'Waiting for compilation.', storyboardEmpty: 'The separate video storyboard will appear here after compiling story mode.', outputEmpty: 'Waiting for compilation.\\n\\nAfter the three VisualSpec gates pass, the Provider Adapter will output an executable prompt.',
  copyImagePrompt: 'Copy image prompt', copyStoryboard: 'Copy full storyboard', negativePrompt: 'Negative prompt', seconds: 'sec', adaptive: 'Adaptive', openingHook: 'Opening hook', randomScene: 'Random scene', selectedScene: 'Selected scene', platformGuidance: 'Platform guidance', genericShort: 'Generic short video',
  qualityControl: 'Quality Control', ready: 'Ready', empty: 'Empty', pass: 'Pass', revise: 'Revise', selectOpenAI: 'SELECT OPENAI', compilingPrompt: 'COMPILING PROMPT', working: 'WORKING', error: 'ERROR', requestingImage: 'Prompt ready; requesting the image provider…', compiled: 'Compiled', usedCache: 'Used local compile cache.', compileBeforeCopy: 'Compile the prompt before copying it.', copyFailed: 'Copy failed; check browser clipboard permissions.', copied: 'Copied ✓', copiedToClipboard: 'Copied to clipboard', promptCopied: 'Prompt copied to clipboard.', localDraft: 'LOCAL DRAFT', localSaved: 'LOCAL SAVED', autoChecking: 'AUTO CHECKING',
  harnessBridge: 'AI HARNESS BRIDGE', harnessTitle: 'AI Assistant Collaboration', local: 'Local', targetTool: 'Target tool', targetHarness: 'Target AI Harness', harnessCapability: 'Harness capability', harnessPrompt: 'Task for AI Harness', harnessPromptPlaceholder: 'e.g. propose three more restrained art-direction options for this VisualSpec.', useCompiled: 'Use compiled output', sendTask: 'Send collaboration task', harnessEmpty: 'Waiting for an enabled Harness. Configuration stays on the server; keys and commands are not stored in the browser.', openAuthorization: 'Open authorization', confirmAuthorization: 'I completed authorization', disabled: 'disabled', localConfigRequired: 'Configure locally', enableHarness: 'Enable at least one Harness in config/harnesses.json first.', collaborating: 'Collaborating…', harnessReturned: 'returned a collaboration result.', harnessReviewIntro: 'Review and improve the visual-narrative prompt below while preserving the VisualSpec director intent:', harnessReviewEmpty: 'Review the current VisualSpec and suggest actionable directing and art-direction improvements.', capability_assist: 'Assist', capability_review: 'Review', capability_refine: 'Refine', capability_tools: 'Tool calls',
  codexRealtime: 'CODEX REALTIME', startRealtime: 'Start realtime session', realtimeEmpty: 'No realtime session yet.', realtimeStarted: 'Realtime session established; waiting for Codex…', realtimeDisconnected: 'Realtime connection closed.', chatPlaceholder: 'Message Codex…', realtimeMessage: 'Realtime message', send: 'Send',
  harness_codex: 'Codex', harness_codex_description: 'OpenAI Codex CLI adapter.', 'harness_claude-code': 'Claude Code', 'harness_claude-code_description': 'Anthropic Claude Code CLI adapter.', harness_workbuddy: 'WorkBuddy', harness_workbuddy_description: 'WorkBuddy CLI adapter; adjust args for the installed client.', 'harness_custom-mcp': 'Custom MCP', 'harness_custom-mcp_description': 'Example stdio MCP adapter.', 'harness_custom-api': 'Custom HTTP API', 'harness_custom-api_description': 'Example server-side HTTP API adapter. Keep the key in a local environment variable.', 'harness_example-assist': 'Example Assist Plugin', 'harness_example-assist_description': 'Example assistant adapter for validating plugin capabilities.',
  capability_assist_description: 'Let the assistant analyze the current visual task.', capability_review_description: 'Check intent, continuity, and prompt quality.', capability_refine_description: 'Improve the result while preserving director intent.', capability_tools_description: 'Call tools declared by the assistant platform.',
  validationPass: 'VisualSpec passed all three gates.', validationRevise: 'VisualSpec needs revision.', connecting: 'Connecting', authWindow: 'AUTH WINDOW', apiReady: 'API READY', apiConfig: 'API CONFIG', offline: 'OFFLINE', authorized: 'AUTHORIZED', notAuthorized: 'NOT AUTHORIZED', step: 'Step',
  directorGate: 'Director Gate', directorGateHelp: 'Event, moment, evidence, shot size', artGate: 'Art Direction Gate', artGateHelp: 'Selection, hierarchy, restraint, consistency', continuityGate: 'Continuity Gate', continuityGateHelp: 'Character, style, and world continuity'
});

Object.assign(translations.zh, {
  skill: 'Visual Skill', autoRoute: '自动路由', mediaProvider: '媒体 Provider', assistantFallback: 'AI 辅助回退', providerReady: '可用', providerConfigRequired: '待配置', generateVideo: '生成视频', generatingVideo: '生成视频中…', requestingVideo: '分镜已生成，正在请求视频服务…', videoGenerated: '视频已生成并载入预览。', mediaProcessing: '媒体任务已提交。', assistantFallbackReady: '未接入媒体 API，已准备 AI 辅助任务。', previewEmpty: '接入媒体服务后，生成结果将在这里显示'
});
Object.assign(translations.en, {
  skill: 'Visual Skill', autoRoute: 'Auto route', mediaProvider: 'Media provider', assistantFallback: 'AI assistant fallback', providerReady: 'ready', providerConfigRequired: 'configure locally', generateVideo: 'Generate video', generatingVideo: 'Generating video…', requestingVideo: 'Storyboard ready; requesting the video provider…', videoGenerated: 'Video generated and loaded into preview.', mediaProcessing: 'Media job submitted.', assistantFallbackReady: 'No media API is connected; the AI assistant task is ready.', previewEmpty: 'Generated media will appear here after a media provider is connected'
});

function t(key) { return translations[language][key] || key; }
function renderLanguage() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
  document.querySelectorAll('[data-i18n-alt]').forEach((element) => { element.alt = t(element.dataset.i18nAlt); });
  $('#language').textContent = language === 'zh' ? '中文 / EN' : 'EN / 中文';
  $('#generate').textContent = t('generate');
  $('#generate-video').textContent = t('generateVideo');
  if (lastValidation) renderGates(lastValidation);
  if (lastMessage?.translationKey) message.textContent = t(lastMessage.translationKey);
  if (harnesses.length) {
    renderHarnessOptions();
    renderHarnessCapabilities();
    const available = harnesses.filter((item) => item.enabled).length;
    $('#harness-state').textContent = String(available) + '/' + String(harnesses.length) + ' ' + t('ready').toUpperCase();
  }
  if (visualSkills.length) {
    $('#skill').innerHTML = `<option value="" data-i18n="autoRoute">${escapeHtml(t('autoRoute'))}</option>` + visualSkills.map((skill) => `<option value="${escapeHtml(skill.id)}">${escapeHtml(skill.name?.[language] || skill.id)} · ${escapeHtml(skill.origin || 'builtin')}</option>`).join('');
    $('#skill').value = currentSpec?.skill_id || '';
  }
  if (mediaProviders.length) renderMediaProviders();
  if (!promptPackage) {
    $('#image-count').textContent = language === 'zh' ? '0 张' : '0 images';
    $('#output').textContent = t('outputEmpty');
    $('#video-storyboard-prompt').textContent = t('storyboardEmpty');
    $('#preview-state').textContent = t('empty');
  }
}

function harnessStateLabel(status) {
  const labels = {
    api_configuration_required: 'localConfigRequired',
    api_ready: 'apiReady',
    ready: 'ready',
    not_configured: 'disabled',
    authorization_required: 'authWindow',
    authorization_started: 'authWindow',
    tool_unavailable: 'offline',
    manual_confirmation_recorded: 'authorized',
    authorized: 'authorized',
    not_authorized: 'notAuthorized'
  };
  return t(labels[status] || 'offline');
}
