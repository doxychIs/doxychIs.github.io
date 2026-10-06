import { CONFIG } from './config.js';

export const clampMoney = value => Math.max(0, Math.min(CONFIG.limits.money, Number.isFinite(value) ? value : CONFIG.limits.money));
export const buildingById = id => CONFIG.buildings.find(item => item.id === id);
export const isUnlocked = (state, building) => state.totalEarned >= building.unlock || state.buildings[building.id] > 0;

export function multiplier(state, target) {
  return CONFIG.upgrades.reduce((value, upgrade) =>
    state.upgrades.includes(upgrade.id) && upgrade.target === target ? value * upgrade.multiplier : value, 1);
}

export function unitProduction(state, building) {
  return clampMoney(building.production * multiplier(state, building.id) * multiplier(state, 'all'));
}

export function incomePerSecond(state) {
  return clampMoney(CONFIG.buildings.reduce((sum, building) => sum + state.buildings[building.id] * unitProduction(state, building), 0));
}

export function clickValue(state) {
  return clampMoney((CONFIG.click.base + incomePerSecond(state) * CONFIG.click.passiveFraction) * multiplier(state, 'click'));
}

// Сумма геометрической прогрессии; Infinity означает недостижимую цену.
export function priceFor(building, owned, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1 || owned + quantity > CONFIG.limits.owned) return Infinity;
  const next = building.basePrice * Math.pow(building.growthRate, owned);
  const sum = quantity === 1 ? next : next * Math.expm1(quantity * Math.log(building.growthRate)) / (building.growthRate - 1);
  if (!Number.isFinite(sum) || sum > CONFIG.limits.money) return Infinity;
  return sum;
}

export function maxAffordable(state, building) {
  const owned = state.buildings[building.id];
  const next = priceFor(building, owned);
  if (!isUnlocked(state, building) || state.money < next || !Number.isFinite(next)) return 0;
  let quantity = Math.floor(Math.log1p(state.money / next * (building.growthRate - 1)) / Math.log(building.growthRate));
  quantity = Math.min(quantity, CONFIG.limits.owned - owned);
  // Коррекция округления около границ покупки.
  while (quantity > 0 && priceFor(building, owned, quantity) > state.money) quantity--;
  while (quantity < CONFIG.limits.owned - owned && priceFor(building, owned, quantity + 1) <= state.money) quantity++;
  return quantity;
}

export function earn(state, amount) {
  amount = clampMoney(amount);
  state.money = clampMoney(state.money + amount);
  state.totalEarned = clampMoney(state.totalEarned + amount);
  return amount;
}

export function produce(state) {
  const amount = earn(state, clickValue(state));
  state.clicks = Math.min(Number.MAX_SAFE_INTEGER, state.clicks + 1);
  state.manualEarned = clampMoney(state.manualEarned + amount);
  return amount;
}

export function buyBuilding(state, id, quantity = 1) {
  const building = buildingById(id);
  if (!building || !isUnlocked(state, building)) return false;
  if (quantity === 'max') quantity = maxAffordable(state, building);
  const price = priceFor(building, state.buildings[id], quantity);
  if (!Number.isFinite(price) || price > state.money) return false;
  state.money = Math.max(0, state.money - price);
  state.buildings[id] += quantity;
  return { quantity, price };
}

export function upgradeUnlocked(state, upgrade) {
  const requirement = upgrade.requirement;
  return (!requirement.clicks || state.clicks >= requirement.clicks)
    && (!requirement.earned || state.totalEarned >= requirement.earned)
    && (!requirement.building || state.buildings[requirement.building] >= requirement.owned);
}

export function buyUpgrade(state, id) {
  const upgrade = CONFIG.upgrades.find(item => item.id === id);
  if (!upgrade || state.upgrades.includes(id) || !upgradeUnlocked(state, upgrade) || state.money < upgrade.price) return false;
  state.money -= upgrade.price;
  state.upgrades.push(id);
  return true;
}

export function stageIndex(state) {
  let index = 0;
  CONFIG.stages.forEach((stage, i) => { if (state.totalEarned >= stage.threshold) index = i; });
  return index;
}

export function offlineIncome(state, seconds) {
  const creditedSeconds = Math.max(0, Math.min(CONFIG.offline.maxSeconds, Number.isFinite(seconds) ? seconds : 0));
  const amount = earn(state, incomePerSecond(state) * creditedSeconds * CONFIG.offline.efficiency);
  state.offlineEarned = clampMoney(state.offlineEarned + amount);
  return { amount, seconds: creditedSeconds };
}
