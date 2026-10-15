import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState} from '../src/state.js';
import {CONFIG} from '../src/config.js';
import {EXPANSION,SLOTS,OPPONENTS,ERAS,PARTS} from '../src/expansion-config.js';
import {stageIndex,incomePerSecond,produce,isUnlocked} from '../src/economy.js';
import {robotStats} from '../src/robot.js';
import {robotComplete,characterBonuses,activeSets,eraIndex,productionFactor} from '../src/selectors.js';
import {checkProgress,autoAssemble,clickDrop,addPart,equipPart,enhancePart,dismantlePart,mergeParts,craftPart,tickMaterials,offlineCrates,claimBonus,openCrate,buyResearch,buyEgg,openEgg,assignCharacter,rankCharacter,characterXp,buyShop,reward,prestigeGain,prestigeState} from '../src/expansion.js';
import {startBattle,stepBattle,useAbility,settleBattle} from '../src/battle.js';
import {saveState,loadSave} from '../src/storage.js';
import {robotSvg} from '../src/robot-view.js';

function unlocked() {const state=createState();state.clicks=25;checkProgress(state);return state;}
function assembled(){const state=unlocked();autoAssemble(state);checkProgress(state);return state;}
function rich(){const state=assembled();state.money=state.totalEarned=1e15;for(const key in state.resources)state.resources[key]=100000;return state;}
function finish(state,{abilities=true}={}){
  let guard=0;
  while(state.activeBattle?.status==='running'){
    if(abilities&&state.activeBattle.elapsed>1.4){useAbility(state,'shield');useAbility(state,'overload');}
    stepBattle(state,.05);assert.ok(++guard<500);
  }
  return settleBattle(state,()=>.3);
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);

test('Первый робот достижим без персонажей, случайных находок и боёв',()=>{
  const state=createState();for(let i=0;i<25;i++)produce(state);
  assert.equal(Object.keys(state.characters.owned).length,0);assert.equal(state.inventory.length,0);
  checkProgress(state);assert.equal(state.inventory.length,6);assert.equal(state.progress.unlocked,true);
  assert.ok(autoAssemble(state).ok);assert.ok(robotComplete(state));checkProgress(state);
  assert.equal(state.robot.built,true);assert.ok(state.characters.eggs.basic>=1);
  assert.deepEqual(activeSets(state),[0]);assert.ok(incomePerSecond(state)===0);
});
test('Защита от невезения гарантирует деталь и переживает загрузку',()=>{
  let state=unlocked();
  for(let i=0;i<69;i++)assert.equal(clickDrop(state,()=>.999),null);
  state=normalizeState(JSON.parse(JSON.stringify(state)));assert.equal(state.dropPity,69);
  assert.ok(clickDrop(state,()=>.999));assert.equal(state.dropPity,0);assert.equal(state.progress.counters.clickParts,1);
});
test('Персонаж продолжает усиливать цех и нажатия при назначении пилотом',()=>{
  const state=assembled();state.buildings.worker=10;const before=incomePerSecond(state);
  state.characters.owned.kurena={level:1,xp:0,rank:0};assert.ok(assignCharacter(state,'kurena','pilot').ok);
  const bonus=characterBonuses(state);assert.equal(bonus.drop,.004);assert.equal(bonus.crit,.08);assert.ok(bonus.click>0);
  close(incomePerSecond(state),before*1.15);
  assignCharacter(state,'kurena','engineer');assert.equal(state.characters.pilot,null);assert.equal(state.characters.engineer,'kurena');
  close(incomePerSecond(state),before*1.15);
});
test('Шестерни из боя применяются к реальному пассивному доходу',()=>{
  const state=rich();state.buildings.worker=3;const before=incomePerSecond(state);
  assert.ok(buyResearch(state).ok);close(incomePerSecond(state),before*1.12);
});
test('Крафт даёт выбранный слот, проверяет чертежи и не списывает ресурсы при ошибке',()=>{
  const state=rich();const before=state.money;
  assert.equal(craftPart(state,'core','rare').ok,false);assert.equal(state.money,before);
  const result=craftPart(state,'head','basic');assert.ok(result.ok);assert.equal(PARTS.find(part=>part.id===result.part.definition).slot,'head');
  state.blueprints.push('precision-0');const rare=craftPart(state,'core','rare');assert.ok(rare.ok);assert.equal(rare.part.rarity,2);
  assert.equal(craftPart(state,'core','mythical').ok,false);
});
test('Улучшение повышает характеристики; установленные детали нельзя случайно разобрать',()=>{
  const state=rich(),part=state.inventory.find(item=>item.uid===state.robot.slots.left),before=robotStats(state).attack;
  assert.ok(enhancePart(state,part.uid).ok);assert.ok(robotStats(state).attack>before);
  assert.equal(dismantlePart(state,part.uid).ok,false);
  const extra=addPart(state,'era0-head',0);const scrap=state.resources.scrap;
  assert.ok(dismantlePart(state,extra.uid).ok);assert.ok(state.resources.scrap>scrap);
});
test('Слияние трёх одинаковых деталей сохраняет лучшие улучшения и повышает редкость',()=>{
  const state=rich();const parts=[addPart(state,'era0-core',1,1),addPart(state,'era0-core',1,3),addPart(state,'era0-core',1,2)];
  const result=mergeParts(state,parts[0].uid);assert.ok(result.ok);assert.equal(result.part.rarity,2);assert.equal(result.part.level,3);
  for(const part of parts)assert.ok(!state.inventory.some(item=>item.uid===part.uid));
});
test('Фабрикатор, переработка, производство и отсутствие дают независимые награды',()=>{
  const state=unlocked();state.buildings.fabricator=1;state.buildings.salvage=1;const scrap=state.resources.scrap,gears=state.resources.gears,crates=state.crates;
  tickMaterials(state,180,true);close(state.resources.scrap-scrap,28);close(state.resources.gears-gears,2);assert.equal(state.crates-crates,1);
  const before=state.crates;assert.equal(offlineCrates(state,28800,true),3);assert.equal(state.crates-before,3);
  assert.equal(offlineCrates(state,900,false),0);
});
test('Бонусный ящик нельзя получать повторно или раньше таймера',()=>{
  const state=unlocked();state.bonusAt=1000;
  assert.equal(claimBonus(state,1001).ok,false);assert.ok(claimBonus(state,181000).ok);assert.equal(claimBonus(state,181001).ok,false);
});
test('Награды достижений, рубежей и заданий начисляются единожды',()=>{
  const state=assembled();state.totalEarned=1000;checkProgress(state);const snapshot=JSON.stringify([state.resources,state.crates,state.characters.eggs]);
  checkProgress(state);checkProgress(state);assert.equal(JSON.stringify([state.resources,state.crates,state.characters.eggs]),snapshot);
});
test('Миграция v1 сохраняет капитал, старые здания и доступные эпохи',()=>{
  const raw={version:1,money:123456,totalEarned:9000000,manualEarned:100,offlineEarned:0,clicks:80,playSeconds:900,buildings:{worker:10,machine:5,complex:1},upgrades:['tools'],settings:{sound:true},lastSeen:1000,createdAt:500};
  const state=normalizeState(raw,2000);assert.equal(state.version,2);assert.equal(state.money,123456);assert.equal(state.buildings.complex,1);assert.equal(stageIndex(state),3);assert.equal(state.settings.sound,true);
  assert.ok(isUnlocked(state,CONFIG.buildings.find(item=>item.id==='complex')));checkProgress(state);
  assert.ok(state.inventory.every(part=>part.definition.startsWith('era3-')));
});
test('Деньги не обходят босса, а победа без капитала не открывает эпоху',()=>{
  const state=assembled();state.totalEarned=1e15;assert.equal(stageIndex(state),0);
  state.progress.defeatedBosses.push('rival-0-2');assert.equal(stageIndex(state),1);
  state.totalEarned=100;assert.equal(stageIndex(state),0);
});
test('Бой короткий, умения тратят перезарядку, а экипировка фиксируется до завершения',()=>{
  const state=rich();assert.ok(startBattle(state,'rival-0-0',5).ok);
  assert.ok(useAbility(state,'shield').ok);assert.equal(useAbility(state,'shield').ok,false);
  assert.equal(equipPart(state,state.inventory[0].uid).ok,false);assert.equal(craftPart(state,'body').ok,false);
  const result=finish(state);assert.ok(result.won);assert.ok(state.activeBattle.elapsed>=10&&state.activeBattle.elapsed<=20.1);
  assert.equal(settleBattle(state),null);
});
test('Босс выдаёт особое ядро, чертежи и открывает эпоху; награда не дублируется',()=>{
  const state=assembled();state.totalEarned=12000;assert.ok(startBattle(state,'rival-0-2',8).ok);
  const result=finish(state);assert.ok(result.won);assert.ok(result.firstBoss);assert.equal(result.parts[0].definition,'boss0-core');assert.equal(result.parts[0].rarity,4);
  assert.ok(state.blueprints.includes('precision-1'));assert.equal(stageIndex(state),1);assert.ok(state.resources.tokens>0&&state.resources.gears>0);
  const before=JSON.stringify(state.resources);assert.equal(settleBattle(state),null);assert.equal(JSON.stringify(state.resources),before);
});
test('Незавершённый бой сохраняется и продолжается без автоматической победы',()=>{
  const state=assembled();startBattle(state,'rival-0-0',7);stepBattle(state,3);useAbility(state,'shield');
  const loaded=normalizeState(JSON.parse(JSON.stringify(state)));assert.equal(loaded.activeBattle.status,'running');assert.equal(loaded.activeBattle.elapsed,state.activeBattle.elapsed);
  assert.equal(settleBattle(loaded),null);const result=finish(loaded);assert.ok(result.won);assert.equal(settleBattle(loaded),null);
});
test('Одинаковый бой не зависит от размера кадра',()=>{
  const small=assembled(),large=structuredClone(small);startBattle(small,'rival-0-0',11);startBattle(large,'rival-0-0',11);
  for(let i=0;i<50;i++)stepBattle(small,.1);stepBattle(large,5);
  close(small.activeBattle.player.hp,large.activeBattle.player.hp);close(small.activeBattle.enemy.hp,large.activeBattle.enemy.hp);
});
test('Яйца, дубликаты, гарантированная редкость и фрагменты работают вместе',()=>{
  const state=rich();assert.ok(buyEgg(state,'basic').ok);const first=openEgg(state,'basic',()=>.01);assert.ok(first.character);assert.equal(first.duplicate,false);
  state.characters.eggs.basic=10;const second=openEgg(state,'basic',()=>.01);assert.equal(second.duplicate,true);
  const id=first.character.id;assert.ok(rankCharacter(state,id).ok);assert.equal(state.characters.owned[id].rank,1);
  state.eggPity=9;const pity=openEgg(state,'basic',()=>.01);assert.ok(pity.character.rarity>=2);
});
test('Опыт из боёв повышает уровень обоих членов экипажа',()=>{
  const state=assembled();state.characters.owned.theo={level:1,xp:0,rank:0};state.characters.owned.kurena={level:1,xp:0,rank:0};
  assignCharacter(state,'theo','pilot');assignCharacter(state,'kurena','engineer');characterXp(state,150);
  assert.equal(state.characters.owned.theo.level,3);assert.equal(state.characters.owned.kurena.level,3);
});
test('Магазин боёв выдаёт нужный модуль и не продаёт один чертёж дважды',()=>{
  const state=rich();const result=buyShop(state,'rare','movement');assert.ok(result.ok);assert.equal(PARTS.find(p=>p.id===result.part.definition).slot,'movement');assert.equal(result.part.rarity,2);
  assert.ok(buyShop(state,'blueprint').ok);const before=state.resources.tokens;assert.equal(buyShop(state,'blueprint').ok,false);assert.equal(state.resources.tokens,before);
});
test('Полный склад не теряет награду: лишняя деталь превращается в материал',()=>{
  const state=unlocked();while(state.inventory.length<EXPANSION.inventoryLimit)addPart(state,'era0-head',0);
  const scrap=state.resources.scrap;assert.equal(addPart(state,'era0-core',4),null);assert.ok(state.resources.scrap>scrap);
  assert.ok(state.progress.counters.legendary>0);
});
test('Сохранение v2 не теряет детали, шестерни, экипаж и редкие валюты',()=>{
  const state=rich();state.resources.cores=5;state.resources.dust=20;state.characters.owned.frederica={level:4,xp:13,rank:2};assignCharacter(state,'frederica','pilot');
  const map=new Map(),store={getItem:key=>map.get(key)??null,setItem:(key,val)=>map.set(key,val)};
  saveState(state,store);const loaded=loadSave(store).state;
  assert.equal(loaded.inventory.length,state.inventory.length);assert.deepEqual(loaded.robot.slots,state.robot.slots);assert.equal(loaded.resources.cores,5);assert.equal(loaded.resources.dust,20);assert.equal(loaded.characters.pilot,'frederica');
});
test('Эволюция модульной графики заметна и каждая смена модуля меняет SVG',()=>{
  const state=assembled();const toy=robotSvg(state);assert.match(toy,/robot-era-0/);assert.match(toy,/Болтик/);
  const body=addPart(state,'era6-body',4);equipPart(state,body.uid);const space=robotSvg(state);assert.match(space,/robot-era-6/);assert.notEqual(space,toy);
  assert.ok(!/Star Wars|Gundam|Transformers/.test(space));
});
test('Все эпохи и боссы достижимы без персонажей через стартовый набор и выбранный крафт',()=>{
  const state=assembled();
  for(let era=0;era<ERAS.length;era++) {
    assert.equal(eraIndex(state),era);
    state.money=state.totalEarned=Math.max(CONFIG.stages[Math.min(6,era+1)].threshold,ERAS[era].coinCost*20);
    state.resources.scrap=state.resources.gears=10000;
    if(era>0)for(const slot of SLOTS)assert.ok(craftPart(state,slot.id,'rare').ok);
    autoAssemble(state);assert.ok(startBattle(state,`rival-${era}-2`,123).ok);
    const result=finish(state);assert.equal(result.won,true,`Босс эпохи ${era}`);checkProgress(state);
  }
  assert.equal(state.progress.defeatedBosses.length,7);assert.equal(eraIndex(state),6);
  assert.ok(state.blueprints.includes('stellar'));assert.equal(Object.keys(state.characters.owned).length,0);
});
test('Престиж сохраняет коллекцию, команду и валюты, сбрасывает фабрику и усиливает новый доход',()=>{
  const state=rich();state.progress.eraFloor=3;state.buildings.worker=40;
  state.characters.owned.theo={level:3,xp:19,rank:1};assignCharacter(state,'theo','pilot');
  state.crates=3;state.blueprints=['precision-3'];state.resources.cores=2;
  state.progress.defeatedBosses=['rival-0-2'];state.progress.achievements=['robot'];
  const before=structuredClone(state),gain=prestigeGain(state),fresh=prestigeState(state,123456);
  assert.deepEqual(state,before);assert.ok(fresh);assert.equal(fresh.money,0);assert.equal(fresh.buildings.worker,0);
  assert.equal(eraIndex(fresh),0);assert.deepEqual(fresh.progress.defeatedBosses,[]);
  assert.deepEqual(fresh.inventory,state.inventory);assert.deepEqual(fresh.characters,state.characters);
  assert.deepEqual(fresh.blueprints,state.blueprints);assert.equal(fresh.resources.cores,2+gain);
  for(const key of Object.keys(state.resources).filter(key=>key!=='cores'))assert.equal(fresh.resources[key],state.resources[key]);
  assert.equal(fresh.crates,3);assert.deepEqual(fresh.progress.achievements,['robot']);
  fresh.buildings.worker=1;assert.ok(incomePerSecond(fresh)>incomePerSecond({...fresh,resources:{...fresh.resources,cores:0}}));
  assert.ok(normalizeState(fresh,123456));startBattle(state,'rival-0-0');assert.equal(prestigeState(state),null);
});
test('Предел ядер престижа не приводит к переполнению или нечисловому доходу',()=>{
  const state=assembled();state.progress.eraFloor=6;state.totalEarned=1e300;state.resources.cores=1e12-2;
  assert.equal(prestigeGain(state),2);const fresh=prestigeState(state);assert.equal(fresh.resources.cores,1e12);
  fresh.progress.eraFloor=6;fresh.totalEarned=1e300;assert.equal(prestigeGain(fresh),0);assert.equal(prestigeState(fresh),null);
});
test('Особое ядро усиливает крит, а космический комплект даёт заявленные 18% производства',()=>{
  const state=assembled(),before=robotStats(state).crit;const part=addPart(state,'boss2-core',4);equipPart(state,part.uid);
  assert.ok(robotStats(state).crit>=before+EXPANSION.effects.crit-.00001);
  state.inventory=[];for(const slot of SLOTS)addPart(state,`era6-${slot.id}`,0);autoAssemble(state);
  close(productionFactor(state),1.18);
});
test('Повреждённый снимок боя не мешает загрузить остальной прогресс',()=>{
  const state=assembled();startBattle(state,'rival-0-0');state.activeBattle.player.armorScale=0;
  const loaded=normalizeState(state);assert.ok(loaded);assert.equal(loaded.activeBattle,null);
  assert.deepEqual(loaded.robot.slots,state.robot.slots);assert.equal(loaded.inventory.length,state.inventory.length);
});
