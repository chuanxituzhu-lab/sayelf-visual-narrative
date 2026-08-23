import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sessions = new Map();

export function createRealtimeSession() {
  const id = randomUUID();
  const codexHome = process.env.SAYELF_CODEX_HOME || process.env.CODEX_HOME || (process.env.USERPROFILE ? resolve(process.env.USERPROFILE, 'Documents', 'Codex', 'codex-runtime') : undefined);
  const executable = process.platform === 'win32' ? 'codex.cmd' : 'codex';
  const child = spawn(executable, ['app-server', '--stdio'], { cwd: root, shell: process.platform === 'win32', windowsHide: true, env: { ...process.env, ...(codexHome ? { CODEX_HOME: codexHome } : {}) } });
  const session = { id, child, clients: new Set(), events: [], nextRequestId: 1, threadId: null };
  sessions.set(id, session);
  child.stdin.on('error', (error) => publish(session, { type: 'error', text: error.message }));
  child.stdout.on('data', (chunk) => {
    for (const line of String(chunk).split(/\r?\n/).filter(Boolean)) {
      try { publish(session, JSON.parse(line)); } catch { publish(session, { type: 'text', text: line }); }
    }
  });
  child.stderr.on('data', (chunk) => publish(session, { type: 'stderr', text: String(chunk) }));
  child.on('error', (error) => publish(session, { type: 'error', text: error.message }));
  child.on('close', (code) => { session.closed = true; publish(session, { type: 'closed', code }); setTimeout(() => sessions.delete(id), 300_000); });
  write(session, { id: session.nextRequestId++, method: 'initialize', params: { clientInfo: { name: 'sayelf-visual-narrative', version: '0.3.0' }, capabilities: {} } });
  write(session, { method: 'initialized', params: {} });
  write(session, { id: session.nextRequestId++, method: 'thread/start', params: { cwd: root } });
  return { id };
}

export function sendRealtimeMessage(id, text) {
  const session = sessions.get(id);
  if (!session) throw httpError(404, 'realtime session not found');
  if (session.closed) throw httpError(409, 'realtime session is closed; create a new session');
  if (!text?.trim()) throw httpError(400, 'message is required');
  publish(session, { type: 'user', text });
  write(session, { id: session.nextRequestId++, method: 'turn/start', params: { threadId: session.threadId, input: [{ type: 'text', text }] } });
}

export function attachRealtimeEvents(id, res) {
  const session = sessions.get(id);
  if (!session) throw httpError(404, 'realtime session not found');
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  for (const event of session.events) res.write(`data: ${JSON.stringify(event)}\n\n`);
  session.clients.add(res);
  res.on('close', () => session.clients.delete(res));
}

function write(session, message) { session.child.stdin.write(`${JSON.stringify(message)}\n`); }
function publish(session, event) {
  if (event?.result?.thread?.id) session.threadId = event.result.thread.id;
  session.events.push(event);
  if (session.events.length > 200) session.events.shift();
  for (const client of session.clients) client.write(`data: ${JSON.stringify(event)}\n\n`);
}
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
