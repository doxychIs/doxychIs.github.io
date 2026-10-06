import { CONFIG } from './config.js';

export function createState(now = Date.now()) {
  return {
    version: CONFIG.version,
    money: 0, totalEarned: 0, manualEarned: 0, offlineEarned: 0,
    clicks: 0, playSeconds: 0,
    buildings: Object.fromEntries(CONFIG.buildings.map(building => [building.id, 0])),
    upgrades: [],
    settings: { sound: false, reducedMotion: false },
    createdAt: now, lastSeen: now
  };
}

const validNumber = (value, max = CONFIG.limits.money) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;

// Старые сохранения мигрируются здесь при добавлении новых версий.
export function normalizeState(raw, now = Date.now()) {
  if (!raw || raw.version !== CONFIG.version || !validNumber(raw.money) || !validNumber(raw.totalEarned)
      || !raw.buildings || !Array.isArray(raw.upgrades) || !validNumber(raw.lastSeen, 1e15)) return null;
  const state = createState(now);
  for (const key of ['money', 'totalEarned', 'manualEarned', 'offlineEarned', 'clicks', 'playSeconds']) {
    if (validNumber(raw[key])) state[key] = raw[key];
  }
  state.clicks = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(state.clicks));
  state.totalEarned = Math.max(state.money, state.totalEarned);
  for (const building of CONFIG.buildings) {
    const value = raw.buildings[building.id] ?? 0;
    if (!validNumber(value, CONFIG.limits.owned) || !Number.isInteger(value)) return null;
    state.buildings[building.id] = value;
  }
  state.upgrades = [...new Set(raw.upgrades.filter(id => CONFIG.upgrades.some(upgrade => upgrade.id === id)))];
  state.settings.sound = raw.settings?.sound === true;
  state.settings.reducedMotion = raw.settings?.reducedMotion === true;
  state.createdAt = validNumber(raw.createdAt, 1e15) ? raw.createdAt : now;
  state.lastSeen = Math.min(raw.lastSeen, now);
  return state;
}
