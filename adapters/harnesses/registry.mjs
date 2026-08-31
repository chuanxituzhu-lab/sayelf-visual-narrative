import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const defaultConfig = resolve(root, 'config', 'harnesses.json');

export async function listHarnesses() {
  const config = await loadConfig();
  return config.harnesses.map((harness) => ({
    id: harness.id,
    name: harness.name,
    transport: harness.transport,
    enabled: Boolean(harness.enabled),
    description: harness.description || '',
    capabilities: normalizeCapabilities(harness.capabilities),
    configured: missingEnvironment(harness).length === 0,
    missing_env: missingEnvironment(harness),
    plugin: Boolean(harness.plugin),
    version: harness.version
  }));
}

export async function invokeHarness(id, input = {}) {
  const config = await loadConfig();
  const harness = config.harnesses.find((item) => item.id === id);
  if (!harness) throw httpError(404, `Unknown harness: ${id}`);
  if (!harness.enabled) throw httpError(409, `${harness.name} is not enabled in config/harnesses.json`);
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) throw httpError(400, 'prompt is required');
  const capability = selectCapability(harness, input.capability);
  const request = { prompt, spec: input.spec || null, compiledPrompt: input.compiledPrompt || '', capability: capability.id };
  if (harness.transport === 'cli') return runCli(harness, request);
  if (harness.transport === 'api') return runApi(harness, request);
  if (harness.transport === 'mcp') return runMcp(harness, request);
  throw httpError(400, `Unsupported harness transport: ${harness.transport}`);
}

export async function connectHarness(id) {
  const config = await loadConfig();
  const harness = config.harnesses.find((item) => item.id === id);
  if (!harness) throw httpError(404, `Unknown harness: ${id}`);
  if (harness.transport === 'api') {
    const missing = missingEnvironment(harness);
    if (missing.length) return { harness: id, status: 'api_configuration_required', missing_env: missing, message: `${harness.name} requires local API configuration before it can be used.` };
    return { harness: id, status: 'api_ready', message: `${harness.name} API configuration is available locally. Run a capability to test the endpoint.` };
  }
  if (!harness.auth) return { harness: id, status: harness.enabled ? 'ready' : 'not_configured', message: `${harness.name} has no automatic authorization flow configured.` };
  const authorizationUrl = harness.auth.url || null;
  const command = harness.auth.command || harness.command;
  const args = harness.auth.args || [];
  if (!command) return { harness: id, status: 'authorization_required', authorization_url: authorizationUrl, message: `${harness.name} requires manual authorization.` };
  try {
    await startInteractiveProcess(command, args);
    return { harness: id, status: 'authorization_started', authorization_url: authorizationUrl, message: `${harness.name} authorization was started. Complete the sign-in, then return here.` };
  } catch (error) {
    if (authorizationUrl) return { harness: id, status: 'authorization_required', authorization_url: authorizationUrl, message: `${harness.name} CLI is not available. Open the authorization link, then install/configure the CLI to finish binding.` };
    return { harness: id, status: 'tool_unavailable', message: `${harness.name} authorization could not start: ${error.message}` };
  }
}

export async function confirmHarness(id) {
  const config = await loadConfig();
  const harness = config.harnesses.find((item) => item.id === id);
  if (!harness) throw httpError(404, `Unknown harness: ${id}`);
  if (harness.transport === 'api') {
    const missing = missingEnvironment(harness);
    return missing.length
      ? { harness: id, status: 'api_configuration_required', missing_env: missing, message: `${harness.name} is not configured. Set the required local environment variables, then try again.` }
      : { harness: id, status: 'api_ready', message: `${harness.name} API configuration is available locally.` };
  }
  const verify = harness.auth?.verify;
  if (!verify?.command) return { harness: id, status: 'manual_confirmation_recorded', message: `${harness.name} has no verification command. Manual confirmation recorded locally; configure a verifier to prove the credential is available.` };
  try {
    const result = await runProcess(verify.command, verify.args || [], undefined, 15_000);
    return { harness: id, status: 'authorized', message: `${harness.name} is authorized.`, detail: result.stdout.trim().slice(0, 200) };
  } catch {
    return { harness: id, status: 'not_authorized', message: `${harness.name} did not confirm an active login. Complete authorization and try again.` };
  }
}

async function loadConfig() {
  const configPath = process.env.SAYELF_HARNESS_CONFIG ? resolve(process.env.SAYELF_HARNESS_CONFIG) : defaultConfig;
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (!Array.isArray(config.harnesses)) throw new Error('harnesses config must contain a harnesses array');
  const plugins = await discoverPlugins();
  const merged = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  for (const harness of config.harnesses) merged.set(harness.id, { ...merged.get(harness.id), ...harness });
  return { ...config, harnesses: [...merged.values()] };
}

async function discoverPlugins() {
  const pluginsRoot = resolve(root, 'plugins');
  let entries;
  try { entries = await readdir(pluginsRoot, { withFileTypes: true }); } catch { return []; }
  const plugins = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const manifest = JSON.parse(await readFile(resolve(pluginsRoot, entry.name, 'plugin.json'), 'utf8'));
      if (manifest.type !== 'sayelf-assist-plugin' || !manifest.id || !manifest.name || !manifest.transport) continue;
      const entryConfig = manifest.entry || {};
      plugins.push({
        ...entryConfig,
        id: manifest.id,
        name: manifest.name,
        version: manifest.version || '0.0.0',
        description: manifest.description || '',
        transport: manifest.transport,
        enabled: Boolean(manifest.enabled),
        capabilities: manifest.capabilities || ['assist'],
        plugin: true
      });
    } catch { /* An incomplete plugin is ignored until its manifest is fixed. */ }
  }
  return plugins;
}

async function runCli(harness, request) {
  if (!harness.command) throw httpError(409, `${harness.name} has no command configured`);
  const args = (harness.args || []).map((arg) => interpolate(arg, request));
  const result = await runProcess(harness.command, args, harness.stdin === false ? undefined : JSON.stringify(request), harness.timeoutMs);
  return { harness: harness.id, transport: 'cli', output: result.stdout.trim(), stderr: result.stderr.trim() };
}

async function runApi(harness, request) {
  if (!harness.url) throw httpError(409, `${harness.name} has no API URL configured`);
  const missing = missingEnvironment(harness);
  if (missing.length) throw httpError(409, `${harness.name} requires local environment variables: ${missing.join(', ')}`);
  const headers = { 'Content-Type': 'application/json', ...(harness.headers || {}) };
  for (const [header, envName] of Object.entries(headerEnvironment(harness))) headers[header] = process.env[envName];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), harness.timeoutMs || 60_000);
  try {
    const response = await fetch(harness.url, {
      method: harness.method || 'POST', headers,
      body: JSON.stringify(request), signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) throw httpError(502, `${harness.name} API returned ${response.status}: ${text.slice(0, 300)}`);
    return { harness: harness.id, transport: 'api', output: text };
  } finally { clearTimeout(timeout); }
}

async function runMcp(harness, request) {
  if (!harness.command || !harness.tool) throw httpError(409, `${harness.name} requires command and tool`);
  const messages = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'sayelf-bridge', version: '0.3.0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: harness.tool, arguments: request } }
  ];
  const result = await runProcess(harness.command, harness.args || [], `${messages.map(JSON.stringify).join('\n')}\n`, harness.timeoutMs, 2);
  const responses = result.stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const response = responses.find((item) => item.id === 2);
  if (!response) throw httpError(502, `${harness.name} returned no MCP tool response`);
  if (response.error) throw httpError(502, response.error.message || 'MCP error');
  return { harness: harness.id, transport: 'mcp', output: response.result };
}

function runProcess(command, args, stdin, timeoutMs = 60_000, stopAfterId = null) {
  return new Promise((resolvePromise, reject) => {
    const codexHome = process.env.SAYELF_CODEX_HOME || process.env.CODEX_HOME || (process.env.USERPROFILE ? resolve(process.env.USERPROFILE, 'Documents', 'Codex', 'codex-runtime') : undefined);
    const executable = process.platform === 'win32' && command === 'codex' ? 'codex.cmd' : command;
    const child = spawn(executable, args, { cwd: root, shell: process.platform === 'win32' && executable.endsWith('.cmd'), windowsHide: true, env: { ...process.env, ...(codexHome ? { CODEX_HOME: codexHome } : {}) } });
    let stdout = ''; let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stopAfterId && new RegExp(`\"id\"\\s*:\\s*${stopAfterId}`).test(stdout)) child.kill();
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(httpError(502, `${command}: ${error.message}`)); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code && !stopAfterId) reject(httpError(502, `${command} exited with ${code}: ${stderr.trim()}`));
      else resolvePromise({ stdout, stderr });
    });
    if (stdin !== undefined) child.stdin.end(stdin); else child.stdin.end();
  });
}

function startInteractiveProcess(command, args) {
  return new Promise((resolvePromise, reject) => {
    const executable = process.platform === 'win32' && command === 'codex' ? 'codex.cmd' : command;
    const codexHome = process.env.SAYELF_CODEX_HOME || process.env.CODEX_HOME || (process.env.USERPROFILE ? resolve(process.env.USERPROFILE, 'Documents', 'Codex', 'codex-runtime') : undefined);
    const child = spawn(executable, args, {
      cwd: root,
      shell: process.platform === 'win32' && executable.endsWith('.cmd'),
      windowsHide: false,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, ...(codexHome ? { CODEX_HOME: codexHome } : {}) }
    });
    let settled = false;
    child.once('error', (error) => { if (!settled) { settled = true; reject(httpError(502, `${command}: ${error.message}`)); } });
    setTimeout(() => { if (!settled) { settled = true; child.unref(); resolvePromise(); } }, 250);
  });
}

function interpolate(value, request) {
  return String(value).replaceAll('{prompt}', request.prompt).replaceAll('{compiledPrompt}', request.compiledPrompt).replaceAll('{capability}', request.capability).replaceAll('{specJson}', JSON.stringify(request.spec || {}));
}

function normalizeCapabilities(capabilities) {
  const items = Array.isArray(capabilities) && capabilities.length ? capabilities : ['assist'];
  return items.map((item) => {
    if (typeof item === 'string') return { id: item, name: item, description: '' };
    return { id: item.id, name: item.name || item.id, description: item.description || '' };
  }).filter((item) => typeof item.id === 'string' && item.id.trim());
}

function selectCapability(harness, requested) {
  const capabilities = normalizeCapabilities(harness.capabilities);
  const id = typeof requested === 'string' && requested.trim() ? requested.trim() : capabilities[0]?.id;
  const capability = capabilities.find((item) => item.id === id);
  if (!capability) throw httpError(400, `${harness.name} does not declare capability: ${id}`);
  return capability;
}

function headerEnvironment(harness) {
  return harness.header_env || harness.headers_env || harness.headerEnv || {};
}

function missingEnvironment(harness) {
  const names = [
    ...(Array.isArray(harness.required_env) ? harness.required_env : []),
    ...(Array.isArray(harness.auth?.required_env) ? harness.auth.required_env : []),
    ...Object.values(headerEnvironment(harness))
  ].filter((name) => typeof name === 'string' && name.trim());
  return [...new Set(names)].filter((name) => !process.env[name]);
}

function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
