import { CONFIG } from './config.js';
import { SLOTS, PARTS, CHARACTERS, CHARACTER_MIGRATION, EGGS, OPPONENTS, EXPANSION } from './expansion-config.js';

export function createState(now=Date.now()) {
  return {
    version:CONFIG.version,money:0,totalEarned:0,manualEarned:0,offlineEarned:0,clicks:0,playSeconds:0,
    buildings:Object.fromEntries(CONFIG.buildings.map(building=>[building.id,0])),upgrades:[],
    settings:{sound:false,reducedMotion:false},createdAt:now,lastSeen:now,
    resources:Object.fromEntries(Object.keys(EXPANSION.resourceNames).map(key=>[key,0])),
    inventory:[],nextPartId:1,robot:{slots:Object.fromEntries(SLOTS.map(slot=>[slot.id,null])),level:1,built:false},
    characters:{owned:{},pilot:null,engineer:null,eggs:Object.fromEntries(EGGS.map(egg=>[egg.id,0]))},
    research:0,crates:0,dropPity:0,eggPity:0,productionClock:0,bonusAt:now,blueprints:[],
    progress:{eraFloor:0,unlocked:false,defeatedBosses:[],victories:{},milestones:[],achievements:[],quests:[],seenEras:[0],tutorialSeen:[],shop:[],counters:{}},
    activeBattle:null
  };
}

const validNumber=(value,max=CONFIG.limits.money)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max;
const number=(value,fallback=0,max=1e12)=>validNumber(value,max)?value:fallback;
const strings=value=>Array.isArray(value)?[...new Set(value.filter(item=>typeof item==='string'&&item.length<100))].slice(0,300):[];
const integer=(value,fallback=0,max=1e12)=>Math.floor(number(value,fallback,max));

// Формат v2 сохраняется. Обновление 3.0 переносит команду по таблице соответствий.
export function normalizeState(raw,now=Date.now()) {
  if(!raw||![1,CONFIG.version].includes(raw.version)||!validNumber(raw.money)||!validNumber(raw.totalEarned)
    ||!raw.buildings||!Array.isArray(raw.upgrades)||!validNumber(raw.lastSeen,1e15))return null;
  const state=createState(now);
  for(const key of ['money','totalEarned','manualEarned','offlineEarned','clicks','playSeconds'])if(validNumber(raw[key]))state[key]=raw[key];
  state.clicks=Math.min(Number.MAX_SAFE_INTEGER,Math.floor(state.clicks));state.totalEarned=Math.max(state.money,state.totalEarned);
  for(const building of CONFIG.buildings) {
    const value=raw.buildings[building.id]??0;
    if(!validNumber(value,CONFIG.limits.owned)||!Number.isInteger(value))return null;
    state.buildings[building.id]=value;
  }
  state.upgrades=strings(raw.upgrades).filter(id=>CONFIG.upgrades.some(upgrade=>upgrade.id===id));
  state.settings.sound=raw.settings?.sound===true;state.settings.reducedMotion=raw.settings?.reducedMotion===true;
  state.createdAt=validNumber(raw.createdAt,1e15)?raw.createdAt:now;state.lastSeen=Math.min(raw.lastSeen,now);
  if(raw.version===1) {
    CONFIG.stages.forEach((stage,index)=>{if(state.totalEarned>=stage.threshold)state.progress.eraFloor=index;});
    state.progress.milestones=EXPANSION.milestones.filter(value=>value<=state.totalEarned).map(String);
    state.progress.seenEras=Array.from({length:state.progress.eraFloor+1},(_,i)=>i);
    return state;
  }
  for(const key of Object.keys(state.resources))state.resources[key]=number(raw.resources?.[key]);
  state.nextPartId=integer(raw.nextPartId,1);const uids=new Set();
  if(Array.isArray(raw.inventory))for(const part of raw.inventory.slice(0,EXPANSION.inventoryLimit)) {
    if(!part||typeof part.uid!=='string'||!/^[p][0-9]+$/.test(part.uid)||!Number.isSafeInteger(Number(part.uid.slice(1)))||uids.has(part.uid)||!PARTS.some(def=>def.id===part.definition))continue;
    if(!Number.isInteger(part.rarity)||part.rarity<0||part.rarity>5)continue;
    uids.add(part.uid);state.inventory.push({uid:part.uid,definition:part.definition,rarity:part.rarity,level:integer(part.level,0,EXPANSION.enhancement.max),locked:part.locked===true});
    state.nextPartId=Math.max(state.nextPartId,Number(part.uid.slice(1))+1);
  }
  for(const slot of SLOTS) {
    const id=raw.robot?.slots?.[slot.id];
    const part=state.inventory.find(item=>item.uid===id);
    if(part&&PARTS.find(def=>def.id===part.definition).slot===slot.id)state.robot.slots[slot.id]=id;
  }
  state.robot.level=integer(raw.robot?.level,1,EXPANSION.robot.maxLevel)||1;state.robot.built=raw.robot?.built===true;
  for(const character of CHARACTERS) {
    const legacy=Object.keys(CHARACTER_MIGRATION).find(id=>CHARACTER_MIGRATION[id]===character.id);
    const item=raw.characters?.owned?.[character.id]??raw.characters?.owned?.[legacy];
    if(item)state.characters.owned[character.id]={level:integer(item.level,1,EXPANSION.characters.maxLevel)||1,xp:number(item.xp),rank:integer(item.rank,0,EXPANSION.characters.maxRank)};
  }
  for(const role of ['pilot','engineer']) {
    const id=CHARACTER_MIGRATION[raw.characters?.[role]]??raw.characters?.[role];
    if(state.characters.owned[id])state.characters[role]=id;
  }
  if(state.characters.pilot===state.characters.engineer)state.characters.engineer=null;
  for(const egg of EGGS)state.characters.eggs[egg.id]=integer(raw.characters?.eggs?.[egg.id]);
  state.research=integer(raw.research,0,EXPANSION.research.max);state.crates=integer(raw.crates);
  state.dropPity=integer(raw.dropPity,0,EXPANSION.drops.guarantee);state.eggPity=integer(raw.eggPity,0,20);
  state.productionClock=number(raw.productionClock,0,EXPANSION.crates.productionSeconds);
  state.bonusAt=Math.min(number(raw.bonusAt,now,1e15),now);
  const p=raw.progress??{};
  state.progress.eraFloor=integer(p.eraFloor,0,6);state.progress.unlocked=p.unlocked===true;
  for(const key of ['milestones','achievements','quests','tutorialSeen','shop'])state.progress[key]=strings(p[key]);
  state.progress.defeatedBosses=strings(p.defeatedBosses).filter(id=>OPPONENTS.some(enemy=>enemy.id===id&&enemy.boss));
  state.progress.seenEras=Array.isArray(p.seenEras)?[...new Set(p.seenEras.filter(value=>Number.isInteger(value)&&value>=0&&value<=6))]:[0];
  for(const enemy of OPPONENTS)state.progress.victories[enemy.id]=integer(p.victories?.[enemy.id]);
  for(const key of ['robotsBuilt','clickParts','sets','wins','bosses','crafted','enhanced','legendary','space','research','assigned'])state.progress.counters[key]=integer(p.counters?.[key]);
  state.blueprints=strings(raw.blueprints);
  // Незавершённый бой можно продолжить, но награда не выдаётся при загрузке.
  const battle=raw.activeBattle;
  if(battle&&OPPONENTS.some(enemy=>enemy.id===battle.opponent)&&['running','won','lost'].includes(battle.status)
    &&battle.player&&battle.enemy&&validNumber(battle.elapsed,EXPANSION.battle.maxSeconds+1)) {
    const safeUnit=unit=>{
      const keys=['hp','maxHp','attack','defense','speed','crit','critDamage','shield','loot','heal','armorScale'];
      if(keys.some(key=>!validNumber(unit[key]??0,1e12)))return null;
      return Object.fromEntries(keys.map(key=>[key,number(unit[key])]));
    };
    const player=safeUnit(battle.player),enemy=safeUnit(battle.enemy);
    if(player&&enemy&&player.maxHp>0&&enemy.maxHp>0&&player.speed>0&&enemy.speed>0&&player.armorScale>0&&enemy.armorScale>0) {
      player.hp=Math.min(player.hp,player.maxHp);enemy.hp=Math.min(enemy.hp,enemy.maxHp);
      state.activeBattle={opponent:battle.opponent,status:battle.status,elapsed:battle.elapsed,player,enemy,
        seed:integer(battle.seed,1,0xffffffff)||1,playerTimer:number(battle.playerTimer),enemyTimer:number(battle.enemyTimer),
        accumulator:number(battle.accumulator,0,1),hits:integer(battle.hits),lastHeal:number(battle.lastHeal),lastShock:number(battle.lastShock),
        effects:strings(battle.effects),shieldUntil:number(battle.shieldUntil),overloadUntil:number(battle.overloadUntil),
        cooldowns:{shield:number(battle.cooldowns?.shield),overload:number(battle.cooldowns?.overload)},
        settled:battle.settled===true,finishAt:validNumber(battle.finishAt,21)?battle.finishAt:null};
    }
  }
  return state;
}
