import { CONFIG } from './config.js';
import { createState } from './state.js';
import { EXPANSION, RARITIES, SLOTS, PARTS, PART_MODELS, ERAS, CHARACTERS, EGGS, ACHIEVEMENTS, QUESTS, SHOP, OPPONENTS } from './expansion-config.js';
import { eraIndex, characterBonuses, partDefinition, robotComplete, activeSets } from './selectors.js';

const success=(message,extra={})=>({ok:true,message,...extra});
const failure=message=>({ok:false,message});
export const counter=(state,key,amount=1)=>{state.progress.counters[key]=(state.progress.counters[key]??0)+amount;};
export const isFighting=state=>state.activeBattle?.status==='running';
export function resource(state,key,amount) {
  if(!(key in state.resources)||!Number.isFinite(amount))return;
  state.resources[key]=Math.max(0,Math.min(1e12,state.resources[key]+amount));
}
export function rollWeighted(weights,rng=Math.random) {
  let roll=Math.min(0.999999999,Math.max(0,rng()))*weights.reduce((sum,value)=>sum+value,0);
  for(let i=0;i<weights.length;i++) {roll-=weights[i];if(roll<0)return i;}
  return 0;
}
export function rollRarity(state,weights,rng=Math.random) {
  let rarity=rollWeighted(weights,rng);
  if(rng()<characterBonuses(state).quality)rarity=Math.min(5,rarity+1);
  return rarity;
}
export function addPart(state,definition,rarity=0,level=0) {
  const def=PARTS.find(part=>part.id===definition);
  if(!def||!Number.isInteger(rarity)||rarity<0||rarity>5)return null;
  if(rarity>=4)counter(state,'legendary');
  if(state.inventory.length>=EXPANSION.inventoryLimit) {resource(state,'scrap',RARITIES[rarity].scrap*(def.era+1));return null;}
  const part={uid:`p${state.nextPartId++}`,definition,rarity,level,locked:false};state.inventory.push(part);return part;
}
export function randomPart(state,{era=eraIndex(state),rarity,weights=EXPANSION.drops.weights,slot,definition}={},rng=Math.random) {
  slot??=SLOTS[Math.floor(rng()*SLOTS.length)%SLOTS.length].id;
  rarity??=rollRarity(state,weights,rng);
  const model=PART_MODELS[rollWeighted(PART_MODELS.map(item=>item.weight),rng)].id;
  return addPart(state,definition??`era${era}-${slot}${model==='box'?'':'-'+model}`,rarity);
}
export function reward(state,values,rng=Math.random) {
  const parts=[];
  for(const [key,value] of Object.entries(values)) {
    if(key in state.resources)resource(state,key,value);
    if(key==='coins') {state.money=Math.min(CONFIG.limits.money,state.money+value);state.totalEarned=Math.min(CONFIG.limits.money,state.totalEarned+value);}
    if(key==='crate')state.crates+=value;
    if(key==='egg'&&EGGS.some(egg=>egg.id===value))state.characters.eggs[value]++;
    if(key==='blueprint'&&!state.blueprints.includes(value))state.blueprints.push(value);
    if(key==='part') {const part=randomPart(state,value,rng);if(part)parts.push(part);}
  }
  return parts;
}
export function clickDrop(state,rng=Math.random) {
  if(!state.progress.unlocked)return null;
  state.dropPity++;
  const chance=EXPANSION.drops.base+characterBonuses(state).drop
    +Math.max(0,state.dropPity-EXPANSION.drops.pityStart)*EXPANSION.drops.pityStep;
  if(state.dropPity<EXPANSION.drops.guarantee&&rng()>=chance)return null;
  state.dropPity=0;counter(state,'clickParts');
  const part=randomPart(state,{},rng);resource(state,'scrap',EXPANSION.drops.scrap);
  return part;
}
export function dropChance(state) {
  return Math.min(1,EXPANSION.drops.base+characterBonuses(state).drop+Math.max(0,state.dropPity-EXPANSION.drops.pityStart)*EXPANSION.drops.pityStep);
}
export function checkProgress(state) {
  const events=[];
  if(!state.progress.unlocked&&(state.clicks>=EXPANSION.unlockClicks||state.totalEarned>=EXPANSION.unlockEarned)) {
    state.progress.unlocked=true;
    const era=eraIndex(state);for(const slot of SLOTS)addPart(state,`era${era}-${slot.id}`,0);
    resource(state,'scrap',EXPANSION.starter.scrap);resource(state,'gears',EXPANSION.starter.gears);state.crates+=EXPANSION.starter.crates;
    events.push({type:'unlock',title:'Робомастерская открыта!',text:`Шесть стартовых деталей уже на складе. Ваш робот: ${ERAS[era].robot}. Сразитесь с соседями и верните награды в производство.`,view:'robots'});
  }
  if(!state.progress.unlocked)return events;
  // Старым сохранениям выдаются рецепты уже побеждённых боссов без повторных наград.
  for(const id of state.progress.defeatedBosses) {
    const boss=OPPONENTS.find(enemy=>enemy.id===id);
    if(boss)reward(state,{blueprint:`boss-core-${boss.era}`});
  }
  if(robotComplete(state)&&!state.robot.built) {
    state.robot.built=true;counter(state,'robotsBuilt');
    events.push({type:'robot',title:'Ваш робот готов!',text:'Его детали влияют на бой, а комплект улучшает производство. Первая арена ждёт.',view:'battles'});
  }
  if(activeSets(state).length)state.progress.counters.sets=1;
  const era=eraIndex(state);
  if(era>=6)state.progress.counters.space=1;
  for(const threshold of EXPANSION.milestones)if(state.totalEarned>=threshold&&!state.progress.milestones.includes(String(threshold))) {
    state.progress.milestones.push(String(threshold));state.crates+=EXPANSION.milestoneReward.crates;resource(state,'gears',EXPANSION.milestoneReward.gears+era*EXPANSION.milestoneReward.gearsPerEra);
    events.push({type:'toast',text:'Рубеж производства: ящик деталей и золотые шестерни!'});
  }
  for(const index of [era])if(!state.progress.seenEras.includes(index)) {
    state.progress.seenEras.push(index);
    // Каждый переход даёт новый корпус: эволюция робота видна сразу.
    const part=addPart(state,`era${index}-body`,1);
    if(part&&!isFighting(state))state.robot.slots.body=part.uid;
    events.push({type:'era',title:`Новая эпоха: ${ERAS[index].robot}`,text:`${ERAS[index].material}. ${part?'Новый корпус уже установлен. Старые детали можно разобрать или сохранить.':'Склад заполнен: корпус переработан в материалы. Освободите место и создайте новый корпус в крафте.'}`,view:'robots'});
  }
  for(const [definitions,key,label] of [[ACHIEVEMENTS,'achievements','Достижение'],[QUESTS,'quests','Задание']]) {
    for(const item of definitions)if(!state.progress[key].includes(item.id)&&(state.progress.counters[item.key]??0)>=item.value) {
      state.progress[key].push(item.id);const parts=reward(state,item.reward);
      events.push({type:'toast',text:`${label}: «${item.name}». Награда получена!`});
      for(const part of parts)events.push({type:'part',title:`Награда: ${item.name}`,text:'Деталь добавлена на склад. Установите её в робота или используйте для улучшений.',part});
    }
  }
  return events;
}
export function tickMaterials(state,seconds,producing=true,{offline=false}={}) {
  if(!state.progress.unlocked||seconds<=0||!Number.isFinite(seconds))return;
  resource(state,'scrap',seconds*((state.buildings.fabricator??0)/EXPANSION.materials.fabricatorScrapSeconds+(state.buildings.salvage??0)/EXPANSION.materials.salvageScrapSeconds));
  resource(state,'gears',seconds*(state.buildings.salvage??0)/EXPANSION.materials.salvageGearSeconds);
  if(producing&&!offline) {
    state.productionClock+=seconds;
    const crates=Math.floor(state.productionClock/EXPANSION.crates.productionSeconds);
    if(crates) {state.crates+=crates;state.productionClock-=crates*EXPANSION.crates.productionSeconds;}
  }
}
export function offlineCrates(state,seconds,producing) {
  if(!state.progress.unlocked||!producing||seconds<EXPANSION.crates.offlineSeconds)return 0;
  const count=Math.min(EXPANSION.crates.offlineMax,1+Math.floor(seconds/EXPANSION.crates.offlineExtraSeconds));state.crates+=count;return count;
}
export function openCrate(state,rng=Math.random) {
  if(state.crates<1)return failure('Ящиков пока нет. Производство создаёт ящик каждые две минуты.');
  state.crates--;resource(state,'scrap',EXPANSION.crates.scrap+eraIndex(state)*EXPANSION.crates.scrapPerEra);resource(state,'gears',EXPANSION.crates.gears+Math.floor(eraIndex(state)/2));
  const part=randomPart(state,{weights:EXPANSION.crates.weights},rng);
  if(rng()<EXPANSION.crates.crystalChance)resource(state,'crystals',1);
  return success(part?`Найдена деталь: ${partDefinition(part).name}`:'Склад заполнен. Деталь переработана в металлолом.',{part});
}
export function claimBonus(state,now=Date.now()) {
  if(!state.progress.unlocked||now-state.bonusAt<EXPANSION.crates.bonusMs)return failure('Бонусный ящик ещё готовится.');
  state.bonusAt=now;state.crates++;resource(state,'gears',EXPANSION.crates.bonusGears);return success('Бонусный ящик готов! Откройте его на складе.');
}
export function equipPart(state,uid) {
  if(isFighting(state))return failure('Менять детали можно после боя.');
  const part=state.inventory.find(item=>item.uid===uid),def=partDefinition(part);
  if(!part||!def)return failure('Деталь не найдена.');
  state.robot.slots[def.slot]=uid;return success(`${def.name}: установлено.`);
}
export function partScore(part) {
  const def=partDefinition(part);return ERAS[def.era].scale*RARITIES[part.rarity].factor*(1+part.level*EXPANSION.enhancement.factor)*(def.boss?EXPANSION.robot.bossScoreFactor:1);
}
export function autoAssemble(state) {
  if(isFighting(state))return failure('Сборка доступна после боя.');
  for(const slot of SLOTS) {
    const best=state.inventory.filter(part=>partDefinition(part).slot===slot.id).sort((a,b)=>partScore(b)-partScore(a))[0];
    if(best)state.robot.slots[slot.id]=best.uid;
  }
  return success(robotComplete(state)?'Лучшие доступные модули установлены.':'Пока не хватает деталей. Создайте недостающие модули в крафте.');
}
export function dismantlePart(state,uid) {
  if(isFighting(state))return failure('Дождитесь завершения боя.');
  const part=state.inventory.find(item=>item.uid===uid);
  if(!part||part.locked||Object.values(state.robot.slots).includes(uid))return failure('Установленную или защищённую деталь нельзя разобрать.');
  const amount=RARITIES[part.rarity].scrap*(partDefinition(part).era+1)+part.level*EXPANSION.enhancement.returnPerLevel;
  state.inventory=state.inventory.filter(item=>item.uid!==uid);resource(state,'scrap',amount);
  return success(`Получено ${amount} металлолома.`);
}
export function togglePartLock(state,uid) {
  const part=state.inventory.find(item=>item.uid===uid);if(!part)return failure('Деталь не найдена.');
  part.locked=!part.locked;return success(part.locked?'Деталь защищена от разборки и слияния.':'Защита детали снята.');
}
export function enhancementCost(part) {
  return {scrap:EXPANSION.enhancement.scrap*(part.level+1)*(part.rarity+1),gears:EXPANSION.enhancement.gears*(part.level+1)};
}
export function enhancePart(state,uid) {
  if(isFighting(state))return failure('Улучшения доступны после боя.');
  const part=state.inventory.find(item=>item.uid===uid);if(!part||part.level>=EXPANSION.enhancement.max)return failure('Достигнут предел улучшения.');
  const cost=enhancementCost(part);if(!pay(state,cost))return failure('Не хватает металлолома или золотых шестерён.');
  part.level++;counter(state,'enhanced');return success(`Деталь улучшена до +${part.level}.`,{part});
}
export function mergeParts(state,uid) {
  if(isFighting(state))return failure('Слияние доступно после боя.');
  const part=state.inventory.find(item=>item.uid===uid);
  if(!part||part.rarity>=5||part.locked)return failure('Эту деталь нельзя объединить.');
  const equipped=new Set(Object.values(state.robot.slots));
  const matches=state.inventory.filter(item=>item.definition===part.definition&&item.rarity===part.rarity&&!item.locked&&!equipped.has(item.uid));
  if(!matches.some(item=>item.uid===uid)||matches.length<EXPANSION.merging.count)return failure('Нужны три одинаковые неустановленные детали одной редкости.');
  const chosen=[part,...matches.filter(item=>item.uid!==uid)].slice(0,EXPANSION.merging.count);
  const cost={gears:EXPANSION.merging.gears*(part.rarity+1)};if(!pay(state,cost))return failure('Не хватает золотых шестерён.');
  const ids=new Set(chosen.map(item=>item.uid));state.inventory=state.inventory.filter(item=>!ids.has(item.uid));
  const result=addPart(state,part.definition,part.rarity+1,Math.max(...chosen.map(item=>item.level)));
  return success('Слияние завершено. Редкость выросла!',{part:result});
}
export function bossRecipeEra(state) {
  for(let index=eraIndex(state);index>=0;index--)if(state.blueprints.includes(`boss-core-${index}`))return index;
  return -1;
}
export function craftCost(state,quality='basic') {
  const era=quality==='boss'?Math.max(0,bossRecipeEra(state)):eraIndex(state),config=EXPANSION.crafting;
  if(quality==='rare')return {money:ERAS[era].coinCost*config.rareCoinFactor,scrap:config.rareScrap*(era+1),gears:config.rareGears*(era+1)};
  if(quality==='mythical')return {money:ERAS[era].coinCost*config.mythCoinFactor,scrap:config.mythScrap,gears:config.mythGears,dust:config.mythDust};
  if(quality==='boss')return {money:ERAS[era].coinCost*config.bossCoinFactor,scrap:config.bossScrap*(era+1),gears:config.bossGears*(era+1)};
  return {money:ERAS[era].coinCost,scrap:config.scrap,gears:config.gears};
}
export function pay(state,cost) {
  if(Object.entries(cost).some(([key,value])=>(key==='money'?state.money:state.resources[key]??0)<value))return false;
  for(const [key,value] of Object.entries(cost)) {if(key==='money')state.money-=value;else resource(state,key,-value);}
  return true;
}
export function craftPart(state,slot,quality='basic',model='box') {
  if(isFighting(state))return failure('Крафт доступен после боя.');
  if(!state.progress.unlocked||!SLOTS.some(item=>item.id===slot)||!['basic','rare','mythical','boss'].includes(quality))return failure('Рецепт не найден.');
  const era=eraIndex(state);
  if(!PART_MODELS.some(item=>item.id===model))return failure('Неизвестная форма детали.');
  if(quality==='rare'&&!state.blueprints.includes(`precision-${era}`))return failure('Нужен чертёж точной сборки этой эпохи: получите его у босса или в магазине боёв.');
  if(quality==='mythical'&&(era<5||!state.blueprints.includes('stellar')))return failure('Звёздный рецепт открывается после планетарного босса.');
  if(quality==='boss'&&(slot!=='core'||bossRecipeEra(state)<0))return failure('Для особого ядра победите босса и выберите модуль «Ядро».');
  if(state.inventory.length>=EXPANSION.inventoryLimit)return failure('Освободите место на складе.');
  if(!pay(state,craftCost(state,quality)))return failure('Для крафта не хватает ресурсов.');
  const part=addPart(state,quality==='boss'?`boss${bossRecipeEra(state)}-core`:`era${era}-${slot}${model==='box'?'':'-'+model}`,quality==='mythical'?5:quality==='boss'?4:quality==='rare'?2:0);
  counter(state,'crafted');return success('Компонент создан по вашему заказу.',{part});
}
export function upgradeRobot(state) {
  if(isFighting(state))return failure('Улучшения доступны после боя.');
  if(!robotComplete(state)||state.robot.level>=EXPANSION.robot.maxLevel)return failure(`Соберите робота; предел его уровня — ${EXPANSION.robot.maxLevel}.`);
  if(!pay(state,robotUpgradeCost(state)))return failure('Не хватает ресурсов для настройки робота.');
  state.robot.level++;return success(`Робот настроен: уровень ${state.robot.level}. Все основные характеристики выросли.`);
}
export function robotUpgradeCost(state) {
  const config=EXPANSION.robot,level=state.robot.level;
  return {scrap:level*config.scrap,gears:level*config.gears,money:ERAS[eraIndex(state)].coinCost*level*config.coinFactor};
}
export function researchCost(state) {
  return {gears:Math.ceil(EXPANSION.research.gears*EXPANSION.research.growth**state.research),money:EXPANSION.research.coins*EXPANSION.research.coinGrowth**state.research};
}
export function buyResearch(state) {
  if(state.research>=EXPANSION.research.max)return failure('Все исследования завершены.');
  if(!pay(state,researchCost(state)))return failure('Не хватает DOX Coin или золотых шестерён.');
  state.research++;counter(state,'research');return success('Промышленное исследование усилило весь пассивный доход.');
}
export function buyEgg(state,id) {
  const egg=EGGS.find(item=>item.id===id);
  if(!egg||!state.progress.unlocked||eraIndex(state)<egg.era)return failure('Это яйцо пока не доступно.');
  if(!pay(state,{[egg.currency]:egg.price}))return failure('Не хватает валюты для яйца.');
  state.characters.eggs[id]++;return success('Яйцо добавлено. Откройте его, чтобы познакомиться с помощником.');
}
export function openEgg(state,id,rng=Math.random) {
  const egg=EGGS.find(item=>item.id===id);if(!egg||state.characters.eggs[id]<1)return failure('Сначала получите яйцо.');
  state.characters.eggs[id]--;state.eggPity++;
  let rarity=rollWeighted(egg.weights,rng);
  if(state.eggPity>=EXPANSION.characters.eggPity)rarity=Math.max(2,rarity);
  if(rarity>=2)state.eggPity=0;
  const pool=CHARACTERS.filter(character=>character.rarity===rarity),definition=pool[Math.floor(rng()*pool.length)%pool.length];
  const duplicate=Boolean(state.characters.owned[definition.id]);
  if(duplicate)resource(state,'fragments',EXPANSION.characters.duplicateShards+rarity*EXPANSION.characters.duplicatePerRarity);
  else state.characters.owned[definition.id]={level:1,xp:0,rank:0};
  return success(duplicate?'Дубликат превратился во фрагменты персонажей.':'Новый помощник присоединился к команде!',{character:definition,duplicate});
}
export function assignCharacter(state,id,role) {
  if(isFighting(state))return failure('Экипаж можно сменить после боя.');
  if(!state.characters.owned[id]||!['pilot','engineer'].includes(role))return failure('Персонаж не найден.');
  if(state.characters[role]===id)state.characters[role]=null;
  else {const other=role==='pilot'?'engineer':'pilot';if(state.characters[other]===id)state.characters[other]=null;state.characters[role]=id;counter(state,'assigned');}
  return success('Экипаж обновлён. Бонусы производства продолжают работать.');
}
export function characterXp(state,amount) {
  for(const id of new Set([state.characters.pilot,state.characters.engineer].filter(Boolean))) {
    const character=state.characters.owned[id];character.xp+=amount;
    while(character.level<EXPANSION.characters.maxLevel&&character.xp>=EXPANSION.characters.xpBase*character.level) {
      character.xp-=EXPANSION.characters.xpBase*character.level;character.level++;
    }
  }
}
export function rankCharacter(state,id) {
  if(isFighting(state))return failure('Развитие доступно после боя.');
  const character=state.characters.owned[id];if(!character||character.rank>=EXPANSION.characters.maxRank)return failure('Достигнут предел развития.');
  const cost={fragments:EXPANSION.characters.shards*(character.rank+1),gears:EXPANSION.characters.rankGears*(character.rank+1),money:EXPANSION.characters.rankCoins*(character.rank+1)};
  if(!pay(state,cost))return failure('Не хватает фрагментов персонажей или ресурсов.');
  character.rank++;return success('Персонаж стал сильнее. Усилены его обычные и боевые бонусы.');
}
export function buyShop(state,id,slot='core') {
  const item=SHOP.find(value=>value.id===id),era=eraIndex(state);
  if(!item||era<item.era||!SLOTS.some(value=>value.id===slot))return failure('Товар пока не доступен.');
  const key=`${item.id}-${item.id==='blueprint'?era:'all'}`;
  if(item.once&&state.progress.shop.includes(key))return failure('Этот чертёж уже куплен.');
  if(!pay(state,{tokens:item.price}))return failure('Не хватает жетонов боёв.');
  if(item.once)state.progress.shop.push(key);
  if(item.reward.partRarity!==undefined) {
    const part=addPart(state,`era${era}-${slot}`,item.reward.partRarity);
    return success(part?'Эксклюзивный модуль получен.':'Склад полон. Модуль переработан.',{part});
  }
  if(item.reward.blueprint)reward(state,{blueprint:`precision-${era}`});
  else reward(state,item.reward);
  return success('Награда из магазина получена.');
}
export function prestigeGain(state) {return eraIndex(state)>=3?Math.min(1e12-state.resources.cores,Math.max(1,Math.floor(Math.sqrt(state.totalEarned/EXPANSION.prestige.threshold)))):0;}
export function prestigeState(old,now=Date.now()) {
  const gain=prestigeGain(old);
  if(gain<1||isFighting(old))return null;
  const fresh=createState(now);
  fresh.settings={...old.settings};fresh.resources={...old.resources,cores:old.resources.cores+gain};
  fresh.inventory=structuredClone(old.inventory);fresh.nextPartId=old.nextPartId;fresh.robot=structuredClone(old.robot);
  fresh.characters=structuredClone(old.characters);fresh.blueprints=[...old.blueprints];fresh.crates=old.crates;
  fresh.progress.unlocked=true;
  for(const key of ['achievements','quests','tutorialSeen'])fresh.progress[key]=[...old.progress[key]];
  fresh.progress.counters={...old.progress.counters};fresh.createdAt=old.createdAt;
  return fresh;
}
export function currentQuest(state) {return QUESTS.find(quest=>!state.progress.quests.includes(quest.id));}
