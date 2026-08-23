const STORAGE_KEY = 'sayelf.visual-narrative.draft.v1';

export function loadDraft() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

export function saveDraft(spec) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(spec)); return true; } catch { return false; }
}

export function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage may be unavailable */ }
}
