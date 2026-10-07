export type Service = { id: string; name: string; note: string; price: number; minutes: number; group: string; extra?: boolean };
export const services: Service[] = [
  { id: 'cut', name: 'Стрижка и укладка', note: 'Консультация, мытьё, новая форма и укладка. Любая длина.', price: 3200, minutes: 75, group: 'Форма' },
  { id: 'short', name: 'Короткая стрижка', note: 'Пикси, короткий боб или точная графичная форма.', price: 2900, minutes: 60, group: 'Форма' },
  { id: 'fringe', name: 'Коррекция чёлки', note: 'Обновить линию, сохранив привычный образ.', price: 800, minutes: 20, group: 'Форма' },
  { id: 'tone', name: 'Тонирование', note: 'Обновить оттенок, добавить глубину и мягкий блеск.', price: 4800, minutes: 90, group: 'Цвет' },
  { id: 'color', name: 'Окрашивание в один тон', note: 'Ровный цвет от корней до кончиков. До плеч.', price: 6500, minutes: 120, group: 'Цвет' },
  { id: 'light', name: 'Мягкое осветление', note: 'Растяжка цвета, тонирование и завершающий уход.', price: 11500, minutes: 210, group: 'Цвет' },
  { id: 'style', name: 'Укладка с характером', note: 'Гладкая форма, волны или живая текстура.', price: 2400, minutes: 45, group: 'Укладка' },
  { id: 'care', name: 'Глубокий уход', note: 'Подбираем состав по состоянию волос.', price: 1800, minutes: 25, group: 'Дополнить визит', extra: true },
  { id: 'brows', name: 'Форма и цвет бровей', note: 'Аккуратная коррекция и естественный оттенок.', price: 1600, minutes: 30, group: 'Дополнить визит', extra: true },
];
export const looks = [
  { slug: 'line', number: '01', title: 'Чёткая линия', sub: 'Форма, которая говорит первой.', image: 'line', alt: 'Графичное чёрное каре с ровной чёлкой на красном фоне', service: 'short', tag: 'Каре · графика', detail: 'Ровный срез, выразительный силуэт и ничего лишнего. Длину и линию чёлки выбираем по пропорциям лица и тому, как вы привыкли укладывать волосы.', everyday: 'Чтобы сохранить форму, достаточно фена и плоской щётки. На консультации покажем движение, которое работает именно на ваших волосах.', maintenance: 'Обновление формы — примерно раз в 6–8 недель.' },
  { slug: 'texture', number: '02', title: 'Своя текстура', sub: 'Свобода быть чуть небрежной.', image: 'texture', alt: 'Брюнетка с подвижными волнами до плеч на светлом фоне', service: 'cut', tag: 'Слои · движение', detail: 'Мягкие слои раскрывают естественную текстуру волос. Вместо жёстко заданной укладки — подвижная форма, которая остаётся вашей в любой день.', everyday: 'Немного средства на влажные волосы, мягкая сушка и работа пальцами. Без сложной укладки перед каждым выходом.', maintenance: 'Обновление формы — примерно раз в 8–10 недель.' },
  { slug: 'copper', number: '03', title: 'Медный акцент', sub: 'Цвет как личное высказывание.', image: 'copper', alt: 'Медный боб и тёмный сливовый топ на графитовом фоне', service: 'color', tag: 'Медь · глубина', detail: 'Тёплый медный оттенок с глубиной у корней. Подбираем насыщенность по тону кожи, исходному цвету и готовности к регулярному уходу.', everyday: 'Мягкий шампунь для окрашенных волос и термозащита помогают сохранить оттенок. Домашний уход обсудим без лишних покупок.', maintenance: 'Обновление оттенка — примерно раз в 4–6 недель.' },
];
export const money = (value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
export const duration = (value: number) => value < 60 ? `${value} мин` : `${Math.floor(value / 60)} ч${value % 60 ? ` ${value % 60} мин` : ''}`;
export function visitTotal(baseId: string, extraIds: string[]) {
  const base = services.find(s => s.id === baseId && !s.extra);
  const extras = services.filter(s => s.extra && extraIds.includes(s.id));
  const items = base ? [base, ...extras] : [];
  return { items, price: items.reduce((sum, s) => sum + s.price, 0), minutes: items.reduce((sum, s) => sum + s.minutes, 0) };
}
