const small = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const suffixes = ['', 'тыс.', 'млн', 'млрд', 'трлн', 'квадрлн', 'квинтлн', 'секстлн', 'септлн', 'октлн', 'нонилл', 'децилл'];

export function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(value)) return 'Предел';
  if (Math.abs(value) < 1000) return decimals === 0 ? integer.format(value) : small.format(value);
  let group = Math.floor(Math.log10(Math.abs(value)) / 3);
  if (group >= suffixes.length) return value.toExponential(2).replace('.', ',').replace('e+', ' × 10^');
  let scaled = value / 1000 ** group;
  if (Math.round(scaled * 10) / 10 >= 1000) { group++; scaled /= 1000; }
  if (group >= suffixes.length) return value.toExponential(2).replace('.', ',').replace('e+', ' × 10^');
  return `${small.format(scaled)} ${suffixes[group]}`;
}

export const money = value => `${formatNumber(value)} ₽`;
export function duration(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  return `${Math.floor(seconds / 3600)} ч ${Math.floor(seconds % 3600 / 60)} мин`;
}

export const count = value => integer.format(value);
