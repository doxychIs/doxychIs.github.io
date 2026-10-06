// Все значения экономики и условия развития изменяются здесь.
export const CONFIG = {
  version: 1,
  saveKey: 'ceh.save.v1',
  autosaveMs: 15000,
  offline: { maxSeconds: 8 * 60 * 60, efficiency: 1 },
  limits: { money: 1e300, owned: 10000 },
  click: { base: 1, passiveFraction: 0.02 },
  platform: { cloudSaves: false, timeoutMs: 7000, cloudIntervalMs: 60000 },
  buildings: [
    { id: 'worker', name: 'Рабочий', subtitle: 'Первая пара надёжных рук', icon: 'worker', basePrice: 15, growthRate: 1.15, production: 1, unlock: 0 },
    { id: 'machine', name: 'Станок', subtitle: 'Точность вместо ручного труда', icon: 'machine', basePrice: 120, growthRate: 1.15, production: 9, unlock: 90 },
    { id: 'conveyor', name: 'Конвейер', subtitle: 'Производство без остановок', icon: 'conveyor', basePrice: 1800, growthRate: 1.16, production: 95, unlock: 1400 },
    { id: 'workshop', name: 'Мастерская', subtitle: 'Больше места для больших идей', icon: 'workshop', basePrice: 24000, growthRate: 1.16, production: 1000, unlock: 20000 },
    { id: 'factory', name: 'Завод', subtitle: 'Настоящий промышленный масштаб', icon: 'factory', basePrice: 400000, growthRate: 1.17, production: 15000, unlock: 320000 },
    { id: 'complex', name: 'Промкомплекс', subtitle: 'Целая экосистема производства', icon: 'complex', basePrice: 9000000, growthRate: 1.17, production: 260000, unlock: 7000000 },
    { id: 'city', name: 'Промышленный город', subtitle: 'Город работает на вашу империю', icon: 'city', basePrice: 240000000, growthRate: 1.18, production: 5200000, unlock: 180000000 },
    { id: 'planet', name: 'Планетарная индустрия', subtitle: 'Ресурсы целого мира', icon: 'planet', basePrice: 8000000000, growthRate: 1.18, production: 130000000, unlock: 6000000000 },
    { id: 'space', name: 'Орбитальная верфь', subtitle: 'Следующий цех — среди звёзд', icon: 'space', basePrice: 300000000000, growthRate: 1.20, production: 3900000000, unlock: 240000000000 }
  ],
  stages: [
    { name: 'Гараж', short: 'Гараж', threshold: 0, headline: 'Большое дело.\nМаленький гараж.', description: 'Один верстак, смелая идея и целая империя впереди.' },
    { name: 'Мастерская', short: 'Мастерская', threshold: 12000, headline: 'Ваше дело\nнабирает обороты.', description: 'Мастера за работой. Пора расширять производство.' },
    { name: 'Завод', short: 'Завод', threshold: 320000, headline: 'Здесь рождается\nнастоящий масштаб.', description: 'Станки гудят, конвейеры движутся. Завод живёт.' },
    { name: 'Промкомплекс', short: 'Комплекс', threshold: 7000000, headline: 'Каждый цех —\nчасть большой идеи.', description: 'Объедините производства в мощную индустрию.' },
    { name: 'Промышленный город', short: 'Город', threshold: 180000000, headline: 'Целый город.\nОдна империя.', description: 'Ваше производство стало сердцем нового города.' },
    { name: 'Планетарная индустрия', short: 'Планета', threshold: 6000000000, headline: 'Мыслите шире.\nВ масштабе планеты.', description: 'Океаны возможностей. Континенты ресурсов.' },
    { name: 'Космическое производство', short: 'Космос', threshold: 240000000000, headline: 'У вашей империи\nнет границ.', description: 'Звёзды стали ближе. Стройте индустрию будущего.' }
  ],
  upgrades: [
    { id: 'tools', name: 'Хороший инструмент', description: 'Доход от нажатия ×2', target: 'click', multiplier: 2, price: 75, requirement: { clicks: 25 }, icon: 'tool' },
    { id: 'training', name: 'Школа мастерства', description: 'Доход рабочих ×2', target: 'worker', multiplier: 2, price: 600, requirement: { building: 'worker', owned: 10 }, icon: 'worker' },
    { id: 'precision', name: 'Точная настройка', description: 'Доход станков ×2', target: 'machine', multiplier: 2, price: 2400, requirement: { building: 'machine', owned: 5 }, icon: 'machine' },
    { id: 'blueprints', name: 'Новые чертежи', description: 'Доход от нажатия ×3', target: 'click', multiplier: 3, price: 5500, requirement: { earned: 5000 }, icon: 'tool' },
    { id: 'automation', name: 'Автоматизация', description: 'Доход конвейеров ×3', target: 'conveyor', multiplier: 3, price: 28000, requirement: { building: 'conveyor', owned: 5 }, icon: 'conveyor' },
    { id: 'logistics', name: 'Умная логистика', description: 'Всё пассивное производство ×2', target: 'all', multiplier: 2, price: 150000, requirement: { earned: 120000 }, icon: 'bolt' },
    { id: 'quality', name: 'Стандарт качества', description: 'Доход мастерских ×2', target: 'workshop', multiplier: 2, price: 340000, requirement: { building: 'workshop', owned: 5 }, icon: 'workshop' },
    { id: 'robots', name: 'Роботизированные цеха', description: 'Доход заводов ×3', target: 'factory', multiplier: 3, price: 4000000, requirement: { building: 'factory', owned: 3 }, icon: 'factory' },
    { id: 'network', name: 'Единая сеть', description: 'Всё пассивное производство ×3', target: 'all', multiplier: 3, price: 35000000, requirement: { earned: 30000000 }, icon: 'complex' },
    { id: 'energy', name: 'Энергия нового века', description: 'Доход промкомплексов ×3', target: 'complex', multiplier: 3, price: 120000000, requirement: { building: 'complex', owned: 3 }, icon: 'bolt' },
    { id: 'megacity', name: 'Город будущего', description: 'Доход промышленных городов ×2', target: 'city', multiplier: 2, price: 2500000000, requirement: { building: 'city', owned: 5 }, icon: 'city' },
    { id: 'fusion', name: 'Термоядерный синтез', description: 'Доход планетарной индустрии ×3', target: 'planet', multiplier: 3, price: 80000000000, requirement: { building: 'planet', owned: 3 }, icon: 'planet' },
    { id: 'stars', name: 'Технология звёзд', description: 'Всё пассивное производство ×3', target: 'all', multiplier: 3, price: 1500000000000, requirement: { building: 'space', owned: 3 }, icon: 'space' }
  ]
};
