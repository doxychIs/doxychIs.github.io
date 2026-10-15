// Весь баланс расширения: детали, персонажи, рецепты, противники и награды.
export const RARITIES = [
  { id:'common', name:'Обычная', color:'#b5bca8', factor:1, scrap:8 },
  { id:'uncommon', name:'Необычная', color:'#95cf8e', factor:1.35, scrap:14 },
  { id:'rare', name:'Редкая', color:'#7abcf4', factor:1.85, scrap:25 },
  { id:'epic', name:'Эпическая', color:'#bd97ef', factor:2.65, scrap:45 },
  { id:'legendary', name:'Легендарная', color:'#ffc46d', factor:3.8, scrap:90 },
  { id:'mythical', name:'Мифическая', color:'#f495bf', factor:5.5, scrap:180 }
];
export const SLOTS = [
  {id:'head',name:'Голова',icon:'worker'}, {id:'body',name:'Корпус',icon:'factory'},
  {id:'left',name:'Левое оружие',icon:'tool'}, {id:'right',name:'Правое оружие',icon:'bolt'},
  {id:'movement',name:'Ходовая',icon:'conveyor'}, {id:'core',name:'Ядро',icon:'planet'}
];
export const ERAS = [
  { name:'Самоделкин', robot:'Болтик', color:'#ddaa72', dark:'#76523b', glow:'#ffd278', scale:1, material:'Картон, банки и скотч', personality:'wave', setEffect:'heal', setText:'4 детали: ремонт 4% здоровья каждые 3 сек; производство +5%', power:1, coinCost:50, enemyHp:195, enemyAttack:16 },
  { name:'Стальной помощник', robot:'Клёпик', color:'#9bb0b8', dark:'#485b65', glow:'#a8e1df', scale:2.8, material:'Металл, пружины и гидравлика', personality:'tinker', setEffect:'shield', setText:'4 детали: стартовый щит 25% здоровья; производство +7%', power:3, coinCost:5000, enemyHp:560, enemyAttack:48 },
  { name:'Цеховой штурм', robot:'Кузнец', color:'#b9a25c', dark:'#61532d', glow:'#ffe99a', scale:8, material:'Бронеплиты и промышленный инструмент', personality:'test', setEffect:'overload', setText:'4 детали: перегрузка на 30% сильнее; производство +9%', power:8, coinCost:100000, enemyHp:1600, enemyAttack:138 },
  { name:'Импульс', robot:'Пульсар', color:'#79bbaa', dark:'#31584e', glow:'#8effd6', scale:23, material:'Энергосистемы и композитная броня', personality:'scan', setEffect:'pulse', setText:'4 детали: каждый 4-й удар наносит ещё 55% урона; производство +11%', power:23, coinCost:3000000, enemyHp:4600, enemyAttack:397 },
  { name:'Городской страж', robot:'Монолит', color:'#8d9dcd', dark:'#404869', glow:'#c3c7ff', scale:65, material:'Дроны и умные сплавы', personality:'confident', setEffect:'drone', setText:'4 детали: дрон добавляет 20% урона; производство +13%', power:65, coinCost:80000000, enemyHp:13000, enemyAttack:1123 },
  { name:'Горизонт', robot:'Атлас', color:'#c8baed', dark:'#62557c', glow:'#ead7ff', scale:180, material:'Парящие модули и плазменные реакторы', personality:'hover', setEffect:'leech', setText:'4 детали: 12% урона лечит робота; производство +15%', power:180, coinCost:2000000000, enemyHp:36000, enemyAttack:3110 },
  { name:'Звёздный синтез', robot:'Аврора', color:'#dde0df', dark:'#64747d', glow:'#7fe7ff', scale:520, material:'Фотонные орудия и орбитальные технологии', personality:'orbit', setEffect:'nova', setText:'4 детали: 5-й удар — сверхновая с двойным уроном; производство +18%', power:520, coinCost:80000000000, enemyHp:104000, enemyAttack:8986 }
];
// Бонус комплектов хранится рядом с их визуальной эпохой.
ERAS.forEach((era,index)=>{
  era.productionBonus=[0.05,0.07,0.09,0.11,0.13,0.15,0.18][index];
  era.visual={attack:['punch','tool','spark','ion','drone','plasma','photon'][index],particles:4+index*2};
});
const partNames = [
  ['Ведёрко с глазами','Коробка с болтами','Боксёрская варежка','Пружинный кулак','Колёсики от тележки','Игрушечный мотор'],
  ['Визор мастера','Клёпаный кожух','Гидравлический хват','Пневмокувалда','Гусеницы помощника','Медный генератор'],
  ['Датчик цеха','Литой бронекорпус','Турборезак','Сварочный импульс','Тяжёлые шасси','Промышленный реактор'],
  ['Импульсный сенсор','Композитная оболочка','Ионный захват','Дуговой излучатель','Магнитные опоры','Реактор импульса'],
  ['Визор стража','Умная броня','Орудие дронов','Квантовый молот','Сервоприводы города','Сетевая энергоячейка'],
  ['Сканер горизонта','Титановая оболочка','Плазменное копьё','Гравитационный луч','Парящие платформы','Термоядерное сердце'],
  ['Фотонный визор','Орбитальная цитадель','Луч звёздного синтеза','Антиматерийный импульс','Кольца левитации','Ядро сверхновой']
];
const baseStats = [
  {health:10,crit:0.04}, {health:75,defense:3}, {attack:9},
  {attack:9,speed:0.04}, {health:20,defense:1,speed:0.04}, {health:20,attack:3}
];
export const PARTS = ERAS.flatMap((era, index) => SLOTS.map((slot, i) => ({
  id:`era${index}-${slot.id}`, name:partNames[index][i], slot:slot.id, era:index, set:index,
  model:'box', stats:baseStats[i], effect:i===5&&index>=2?'shield':i===0&&index>=3?'loot':null
}))).concat(ERAS.map((era,index)=>({
  id:`boss${index}-core`, name:['Заводная звезда','Сердце клепальщика','Ядро домны','Резонатор импульса','Сердце мегаполиса','Сингулярный узел','Звёздный маяк'][index],
  slot:'core',era:index,set:index,stats:{health:28,attack:5,defense:1},effect:['heal','shield','crit','pulse','loot','leech','nova'][index],boss:true
})));
export const PART_MODELS = [
  {id:'box',name:'Классика',weight:4,statFactor:1},
  {id:'round',name:'Круглая серия',weight:3,statFactor:0.94,stats:{health:9,speed:0.025}},
  {id:'crest',name:'Угловатая серия',weight:3,statFactor:0.96,stats:{attack:2,defense:0.6}}
];
export const MODEL_NAMES = {
  head:{box:'Ведёрко / визор',round:'Шар / купол',crest:'Лисёнок / сканер'},
  body:{box:'Коробка / бронекорпус',round:'Бочка / капсула',crest:'Панцирь / шестигранник'},
  left:{box:'Варежка / захват',round:'Клешня / манипулятор',crest:'Бур / турбосверло'},
  right:{box:'Кулак / излучатель',round:'Молот / резонатор',crest:'Рогатка / двойной импульс'},
  movement:{box:'Колёса / опоры',round:'Гусеницы / кольцо',crest:'Пружины / шагоход'},
  core:{box:'Мотор / реактор',round:'Катушка / сфера',crest:'Звезда / кристалл'}
};
for(const [eraIndex,era] of ERAS.entries())for(const [slotIndex,slot] of SLOTS.entries())for(const model of PART_MODELS.slice(1)) {
  const base=baseStats[slotIndex],stats=Object.fromEntries(Object.entries(base).map(([key,value])=>[key,value*model.statFactor]));
  for(const [key,value] of Object.entries(model.stats))stats[key]=(stats[key]??0)+value;
  const names=MODEL_NAMES[slot.id][model.id].split(' / '),label=names[eraIndex===0?0:1];
  PARTS.push({id:`era${eraIndex}-${slot.id}-${model.id}`,name:`${label}: ${era.name}`,slot:slot.id,era:eraIndex,set:eraIndex,model:model.id,stats,
    effect:slot.id==='core'?(model.id==='round'?'shield':'crit'):slot.id==='head'&&model.id==='round'?'loot':null});
}
export const BLUEPRINTS = ERAS.flatMap((era,index)=>[
  {id:`precision-${index}`,name:`Точная сборка: ${era.name}`},
  {id:`boss-core-${index}`,name:`Особое ядро: ${era.robot}`}
]).concat({id:'stellar',name:'Звёздная сборка'});
export const blueprintName=id=>BLUEPRINTS.find(item=>item.id===id)?.name??'Промышленный чертёж';
// Идентификаторы старых помощников преобразуются при загрузке без потери развития.
export const CHARACTER_MIGRATION = {lev:'theo',mila:'raiden',tim:'kurena',vera:'anju',nika:'lena',asya:'shin',luna:'frederica'};
export const CHARACTERS = [
  {id:'theo',name:'Теото Рикка',short:'Тео',rarity:0,role:'Художник и мастер эскизов',factory:0.05,click:0.08,drop:0.002,combat:'speed',value:0.06,color:'#73b47b'},
  {id:'raiden',name:'Райден Шуга',short:'Райден',rarity:1,role:'Надёжный защитник команды',factory:0.09,click:0.12,drop:0.003,combat:'shield',value:0.10,color:'#63ac99'},
  {id:'kurena',name:'Курэна Кукумила',short:'Курэна',rarity:2,role:'Точные попадания и яркие идеи',factory:0.15,click:0.20,drop:0.004,combat:'crit',value:0.08,color:'#eb9272'},
  {id:'anju',name:'Андзю Эмма',short:'Андзю',rarity:2,role:'Забота о команде и ценные находки',factory:0.18,click:0.16,drop:0.004,combat:'loot',value:0.12,color:'#8cacdb'},
  {id:'lena',name:'Владилена Милизе',short:'Лена',rarity:3,role:'Вдохновляющая командирка',factory:0.25,click:0.35,drop:0.007,combat:'attack',value:0.15,color:'#929fdf'},
  {id:'shin',name:'Шинэй Нодзэн',short:'Шин',rarity:4,role:'Спокойный и быстрый пилот',factory:0.40,click:0.55,drop:0.01,combat:'speed',value:0.20,color:'#e6b677'},
  {id:'frederica',name:'Фредерика Розенфорт',short:'Фредерика',rarity:5,role:'Маленькая исследовательница больших секретов',factory:0.65,click:0.85,drop:0.012,quality:0.045,combat:'loot',value:0.25,color:'#df89a5'}
];
export const EGGS = [
  {id:'basic',name:'Яйцо мастерской',era:0,currency:'money',price:250,weights:[62,24,10,3,1,0],color:'#d0b67d'},
  {id:'industrial',name:'Энергетическое яйцо',era:1,currency:'crystals',price:15,weights:[0,20,47,25,7.5,0.5],color:'#a1c5dd'},
  {id:'cosmic',name:'Звёздное яйцо',era:5,currency:'crystals',price:60,weights:[0,0,22,42,29,7],color:'#d6a7e8'}
];
const opponentsNames = [
  ['Гараж «Жестянка»','Клуб «Пружинные кулаки»','Барон Болт'],
  ['Мастерская «Искра»','Артель «Стальной хват»','Главный Клепальщик'],
  ['Завод «Медный гром»','Синдикат «Турбина»','Смотритель Домны'],
  ['Комплекс «Контур»','Объединение «Вектор»','Хранитель Импульса'],
  ['Город «Неоноград»','Концерн «Монумент»','Архитектор Мегаполиса'],
  ['Альянс «Горизонт»','Колония «Северная дуга»','Титан Материка'],
  ['Верфь «Звёздный ветер»','Станция «Дальний маяк»','Владыка Синтеза']
];
export const OPPONENTS = ERAS.flatMap((era,index)=>opponentsNames[index].map((name,i)=>({
  id:`rival-${index}-${i}`,name,era:index,boss:i===2,
  description:i===2?index===6?'Вершина звёздных арен: уникальное ядро и ценные награды.':'Победа открывает следующую эпоху и особый чертёж.':i===0?'Честный поединок за детали и ресурсы.':'Усиленный соперник: больше шестерён и добычи.',
  theme:['#e9a667','#72c6d7','#c793e7'][i],
  models:Object.fromEntries(SLOTS.map((slot,n)=>[slot.id,['box','round','crest'][(i+n+index)%3]])),
  health:Math.round(era.enemyHp*[1,1.32,1.72][i]),attack:Math.round(era.enemyAttack*[1,1.13,1.42][i]),
  defense:(4+index*1.5)*era.scale,speed:[0.9,1,0.92][i],crit:[0.06,0.10,0.13][i],
  ability:i===2?'shock':i===1?'shield':null,
  rewards:{tokens:(index+1)*[5,8,22][i],scrap:(index+1)*[12,20,65][i],gears:(index+1)*[3,5,14][i],xp:[25,40,100][i],coins:era.coinCost*[1.8,2.6,6][i],crystals:i===2?4+index*2:0,dust:index>=5?[2,3,12][i]:0},
  partWeights:i===2?[0,0,24,48,25,3]:i===1?[25,36,27,10,2,0]:[48,32,16,3.5,0.5,0]
})));
export const SHOP = [
  {id:'egg',name:'Яйцо мастерской',description:'Новый помощник или фрагменты дубликата',price:12,era:0,reward:{egg:'basic'}},
  {id:'scrap',name:'Ящик металлолома',description:'45 фрагментов металла для крафта',price:8,era:0,reward:{scrap:45}},
  {id:'gears',name:'Набор золотых шестерён',description:'12 шестерён для производства и деталей',price:14,era:0,reward:{gears:12}},
  {id:'shards',name:'Фрагменты персонажей',description:'8 фрагментов для развития команды',price:18,era:0,reward:{fragments:8}},
  {id:'rare',name:'Редкая деталь на выбор',description:'Выбранный модуль текущей эпохи',price:30,era:0,reward:{partRarity:2}},
  {id:'blueprint',name:'Чертёж точной сборки',description:'Открывает крафт редких модулей эпохи',price:35,era:0,reward:{blueprint:true},once:true},
  {id:'energyEgg',name:'Энергетическое яйцо',description:'Редкие и более сильные помощники',price:55,era:1,reward:{egg:'industrial'}},
  {id:'epic',name:'Эпический модуль',description:'Выбранный модуль текущей эпохи',price:85,era:2,reward:{partRarity:3}},
  {id:'crystals',name:'Кристаллы DOX',description:'10 кристаллов для ценных яиц',price:40,era:1,reward:{crystals:10}},
  {id:'dust',name:'Звёздная пыль',description:'20 пыли для космического крафта',price:120,era:5,reward:{dust:20}}
];
export const ACHIEVEMENTS = [
  {id:'robot',name:'Он живой!',description:'Собрать первого робота',key:'robotsBuilt',value:1,reward:{gears:4,egg:'basic'}},
  {id:'clickPart',name:'Находка под верстаком',description:'Найти деталь при нажатии',key:'clickParts',value:1,reward:{scrap:15}},
  {id:'set',name:'Всё в одном стиле',description:'Собрать комплект из четырёх деталей',key:'sets',value:1,reward:{tokens:10,crystals:3}},
  {id:'win',name:'Первый звонкий удар',description:'Победить соперника',key:'wins',value:1,reward:{crate:1,gears:5}},
  {id:'boss',name:'Гаражная легенда',description:'Победить первого босса',key:'bosses',value:1,reward:{crystals:5,fragments:5}},
  {id:'craft',name:'Сделано своими руками',description:'Создать три детали',key:'crafted',value:3,reward:{crate:2}},
  {id:'enhance',name:'Лучше, чем вчера',description:'Улучшить деталь три раза',key:'enhanced',value:3,reward:{scrap:35,gears:5}},
  {id:'legend',name:'Золотое сияние',description:'Получить легендарную или мифическую деталь',key:'legendary',value:1,reward:{crystals:10}},
  {id:'bosses',name:'Покоритель индустрии',description:'Победить четыре разных босса',key:'bosses',value:4,reward:{fragments:20,crystals:15}},
  {id:'space',name:'От коробки до звёзд',description:'Дойти до космической эпохи роботов',key:'space',value:1,reward:{dust:30,crystals:20}}
];
export const QUESTS = [
  {id:'build',name:'Соберите первого друга',description:'Заполните шесть слотов в робомастерской.',key:'robotsBuilt',value:1,reward:{scrap:20,part:{slot:'movement',rarity:1}}},
  {id:'battle',name:'Познакомьтесь с соседями',description:'Выиграйте первый поединок.',key:'wins',value:1,reward:{tokens:8,gears:3}},
  {id:'craft',name:'Деталь по вашему заказу',description:'Создайте компонент из металлолома.',key:'crafted',value:1,reward:{crate:1}},
  {id:'boost',name:'Технология для цеха',description:'Купите промышленное исследование за шестерни.',key:'research',value:1,reward:{crystals:3,blueprint:'precision-0'}},
  {id:'pilot',name:'Команда мечты',description:'Назначьте пилота или инженера.',key:'assigned',value:1,reward:{fragments:3}},
  {id:'boss',name:'Пропуск в большой мир',description:'Победите Барона Болта; для новой эпохи также нужно заработать 12 тыс. DOX.',key:'bosses',value:1,reward:{crate:2}}
];
export const EXPANSION = {
  unlockClicks:25,unlockEarned:90,inventoryLimit:240,
  starter:{scrap:25,gears:3,crates:1},
  drops:{base:0.008,pityStart:25,pityStep:0.001,guarantee:70,scrap:2,weights:[65,24,9,1.8,0.2,0]},
  crates:{productionSeconds:120,bonusMs:180000,bonusGears:1,offlineSeconds:900,offlineMax:3,offlineExtraSeconds:3600,scrap:10,scrapPerEra:6,gears:1,crystalChance:0.08,weights:[70,24,5,1,0,0]},
  milestones:[90,1000,10000,100000,1000000,10000000,100000000,1000000000,10000000000,100000000000],
  milestoneReward:{crates:1,gears:2,gearsPerEra:1},
  materials:{fabricatorScrapSeconds:18,salvageScrapSeconds:10,salvageGearSeconds:90},
  crafting:{scrap:12,gears:1,rareScrap:40,rareGears:8,rareCoinFactor:3,mythScrap:180,mythGears:60,mythDust:25,mythCoinFactor:15,bossScrap:90,bossGears:30,bossCoinFactor:6},
  robot:{maxLevel:20,levelFactor:0.08,scrap:15,gears:4,coinFactor:2,bossScoreFactor:1.2,maxSpeed:2.8,maxCrit:0.7,epicWeaponCritDamage:0.15,legendaryBodyShield:0.08},
  effects:{shield:0.25,heal:0.04,healSeconds:3,loot:0.1,crit:0.12,overload:1.3,pulseHits:4,pulseDamage:1.55,droneDamage:1.2,novaHits:5,novaDamage:2,leech:0.12},
  enhancement:{max:10,factor:0.14,scrap:8,gears:2,returnPerLevel:4},
  merging:{count:3,gears:2},
  research:{max:30,gears:3,growth:1.6,coins:300,coinGrowth:1.8,factor:0.12},
  characters:{maxLevel:20,maxRank:5,xpBase:50,levelFactor:0.05,rankFactor:0.15,shards:4,rankCoins:250,rankGears:1,eggPity:10,duplicateShards:4,duplicatePerRarity:3},
  battle:{minSeconds:10,maxSeconds:20,fixedStep:0.05,baseHealth:60,baseAttack:6,baseDefense:2,baseSpeed:1,baseCrit:0.05,critDamage:1.65,armorFactor:0.025,shield:0.28,shieldCooldown:8,shieldVisualSeconds:4,overloadDamage:1.8,overloadBuff:0.35,overloadDuration:4,overloadCooldown:10,bossShockSeconds:6,bossShockDamage:1.6,introSeconds:0.6,bossIntroSeconds:1.4,enemyShield:0.12,playerTimer:0.7,enemyTimer:1.1,lossXp:8,crystalChance:0.12,blueprintChance:0.08},
  prestige:{threshold:7000000,bonus:0.15},
  resourceNames:{scrap:'Металлолом',gears:'Золотые шестерни',tokens:'Жетоны боёв',crystals:'Кристаллы DOX',fragments:'Фрагменты персонажей',cores:'Ядра DOX',dust:'Звёздная пыль'}
};
