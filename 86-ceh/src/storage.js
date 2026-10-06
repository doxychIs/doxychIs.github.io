import { CONFIG } from './config.js';
import { normalizeState } from './state.js';

function getStorage(storage) {
  try { return storage ?? globalThis.localStorage; } catch { return null; }
}

export function loadSave(storage, now = Date.now()) {
  storage = getStorage(storage);
  let damaged = false;
  try {
    for (const key of [CONFIG.saveKey, `${CONFIG.saveKey}.backup`]) {
      const value = storage.getItem(key);
      if (!value) continue;
      try {
        const state = normalizeState(JSON.parse(value), now);
        if (state) return { state, recovered: damaged, error: false };
      } catch { /* Повреждённое сохранение: пробуем резервную копию. */ }
      damaged = true;
    }
    return { state: null, recovered: false, error: damaged };
  } catch {
    return { state: null, recovered: false, error: true };
  }
}

export function saveState(state, storage, now = Date.now()) {
  storage = getStorage(storage);
  const snapshot = { ...state, lastSeen: now };
  try {
    const previous = storage.getItem(CONFIG.saveKey);
    // Не заменяем хорошую резервную копию повреждёнными данными.
    if (previous) {
      try {
        if (normalizeState(JSON.parse(previous), now)) storage.setItem(`${CONFIG.saveKey}.backup`, previous);
      } catch { /* Текущая запись могла быть повреждена вручную. */ }
    }
    storage.setItem(CONFIG.saveKey, JSON.stringify(snapshot));
    state.lastSeen = now;
    return true;
  } catch { return false; }
}

export function resetSave(state, storage, now = Date.now()) {
  storage = getStorage(storage);
  try {
    // Обе записи становятся новыми: старый прогресс не восстановится из резерва.
    const value = JSON.stringify({ ...state, lastSeen: now });
    storage.setItem(CONFIG.saveKey, value);
    storage.setItem(`${CONFIG.saveKey}.backup`, value);
    return true;
  } catch { return false; }
}
