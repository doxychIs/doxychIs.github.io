import { EXPANSION, ERAS, OPPONENTS } from './expansion-config.js';
import { robotComplete, eraIndex } from './selectors.js';
import { robotStats } from './robot.js';
import { randomPart, reward, resource, counter, characterXp } from './expansion.js';

const config=EXPANSION.battle;
export function enemyPower(enemy) {return Math.round((enemy.health*0.4+enemy.attack*5+enemy.defense*4)*enemy.speed*(1+enemy.crit*0.4));}
function random(battle) {
  let seed=battle.seed;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  battle.seed=seed>>>0;return battle.seed/4294967296;
}
export function startBattle(state,id,seed=Date.now()) {
  const definition=OPPONENTS.find(enemy=>enemy.id===id);
  if(!definition||definition.era>eraIndex(state))return {ok:false,message:'Эта арена пока не открыта.'};
  if(state.activeBattle?.status==='running')return {ok:false,message:'Сначала завершите текущий бой.'};
  if(!robotComplete(state))return {ok:false,message:'Для боя соберите все шесть модулей робота.'};
  const stats=robotStats(state),scale=ERAS[definition.era].scale;
  const player={hp:stats.health,maxHp:stats.health,attack:stats.attack,defense:stats.defense,speed:stats.speed,crit:stats.crit,critDamage:stats.critDamage,shield:stats.health*stats.shield,loot:stats.loot,heal:stats.heal,armorScale:scale};
  const enemy={hp:definition.health,maxHp:definition.health,attack:definition.attack,defense:definition.defense,speed:definition.speed,crit:definition.crit,critDamage:config.critDamage,shield:definition.ability==='shield'?definition.health*config.enemyShield:0,loot:0,heal:0,armorScale:scale};
  state.activeBattle={opponent:id,status:'running',elapsed:0,player,enemy,seed:(seed>>>0)||1,playerTimer:config.playerTimer,enemyTimer:config.enemyTimer,accumulator:0,hits:0,lastHeal:0,lastShock:0,effects:stats.effects,shieldUntil:0,overloadUntil:0,cooldowns:{shield:0,overload:0},settled:false,finishAt:null};
  return {ok:true,message:definition.boss?`${definition.name} выходит на арену!`:'Поединок начался.'};
}
function hit(battle,from,to,amount,events,kind='hit') {
  const attacker=battle[from],defender=battle[to];
  const critical=kind==='hit'&&random(battle)<attacker.crit;
  let damage=amount*(critical?attacker.critDamage:1)/(1+defender.defense*config.armorFactor/defender.armorScale);
  if(defender.shield>0) {const absorbed=Math.min(damage,defender.shield);defender.shield-=absorbed;damage-=absorbed;}
  defender.hp=Math.max(0,defender.hp-damage);
  events.push({type:kind,from,to,damage,critical});
  if(from==='player'&&battle.effects.includes('leech'))attacker.hp=Math.min(attacker.maxHp,attacker.hp+damage*EXPANSION.effects.leech);
}
export function useAbility(state,id) {
  const battle=state.activeBattle;
  if(!battle||battle.status!=='running'||battle.finishAt!==null||!['shield','overload'].includes(id))return {ok:false,message:'Умение сейчас недоступно.'};
  if(battle.cooldowns[id]>battle.elapsed)return {ok:false,message:'Умение перезаряжается.'};
  const events=[];
  if(id==='shield') {
    battle.player.shield+=battle.player.maxHp*config.shield;battle.shieldUntil=battle.elapsed+config.shieldVisualSeconds;
    battle.cooldowns.shield=battle.elapsed+config.shieldCooldown;
    events.push({type:'shield',from:'player',to:'player',damage:0});
  } else {
    battle.overloadUntil=battle.elapsed+config.overloadDuration;battle.cooldowns.overload=battle.elapsed+config.overloadCooldown;
    hit(battle,'player','enemy',battle.player.attack*config.overloadDamage*(battle.effects.includes('overload')?EXPANSION.effects.overload:1),events,'overload');
  }
  return {ok:true,message:id==='shield'?'Щит активирован!':'Перегрузка реактора!',events};
}
export function stepBattle(state,seconds) {
  const battle=state.activeBattle,events=[];
  if(!battle||battle.status!=='running'||seconds<=0||!Number.isFinite(seconds))return events;
  const definition=OPPONENTS.find(enemy=>enemy.id===battle.opponent);
  battle.accumulator+=Math.min(seconds,config.maxSeconds+1);
  while(battle.accumulator>=config.fixedStep&&battle.status==='running') {
    const dt=config.fixedStep;battle.accumulator-=dt;battle.elapsed+=dt;
    if(battle.finishAt!==null) {
      if(battle.elapsed>=battle.finishAt)battle.status=battle.player.hp<=0?'lost':'won';
      continue;
    }
    if(battle.elapsed<(definition.boss?config.bossIntroSeconds:config.introSeconds))continue;
    battle.playerTimer-=dt;battle.enemyTimer-=dt;
    if(battle.playerTimer<=0) {
      const boosted=battle.elapsed<battle.overloadUntil;
      let attack=battle.player.attack*(boosted?1+config.overloadBuff:1);
      battle.hits++;
      if(battle.effects.includes('pulse')&&battle.hits%EXPANSION.effects.pulseHits===0)attack*=EXPANSION.effects.pulseDamage;
      if(battle.effects.includes('drone'))attack*=EXPANSION.effects.droneDamage;
      if(battle.effects.includes('nova')&&battle.hits%EXPANSION.effects.novaHits===0)attack*=EXPANSION.effects.novaDamage;
      hit(battle,'player','enemy',attack,events);
      battle.playerTimer+=1/battle.player.speed;
    }
    if(battle.enemy.hp>0&&battle.enemyTimer<=0) {hit(battle,'enemy','player',battle.enemy.attack,events);battle.enemyTimer+=1/battle.enemy.speed;}
    if(battle.player.heal&&battle.elapsed-battle.lastHeal>=EXPANSION.effects.healSeconds) {
      battle.lastHeal=battle.elapsed;battle.player.hp=Math.min(battle.player.maxHp,battle.player.hp+battle.player.maxHp*battle.player.heal);
      events.push({type:'heal',from:'player',to:'player',damage:0});
    }
    if(definition.boss&&battle.enemy.hp>0&&battle.elapsed-battle.lastShock>=config.bossShockSeconds) {
      battle.lastShock=battle.elapsed;hit(battle,'enemy','player',battle.enemy.attack*config.bossShockDamage,events,'shock');
    }
    if(battle.player.hp<=0||battle.enemy.hp<=0)battle.finishAt=Math.max(config.minSeconds,battle.elapsed);
    if(battle.elapsed>=config.maxSeconds) {
      battle.status=battle.player.hp/battle.player.maxHp>battle.enemy.hp/battle.enemy.maxHp?'won':'lost';
    }
  }
  if(battle.status!=='running')events.push({type:'finished',won:battle.status==='won'});
  return events;
}
export function settleBattle(state,rng=Math.random) {
  const battle=state.activeBattle;
  if(!battle||battle.status==='running'||battle.settled)return null;
  // Отметка устанавливается раньше награды: повторный вызов не выдаст добычу.
  battle.settled=true;const definition=OPPONENTS.find(enemy=>enemy.id===battle.opponent);
  if(battle.status==='lost') {characterXp(state,config.lossXp);return {won:false,opponent:definition,rewards:{xp:config.lossXp},parts:[]};}
  const firstBoss=definition.boss&&!state.progress.defeatedBosses.includes(definition.id);
  const loot=1+battle.player.loot;
  const values={...definition.rewards};
  for(const key of ['tokens','scrap','gears','coins','dust'])values[key]=Math.floor(values[key]*loot);
  if(!definition.boss&&rng()<config.crystalChance)values.crystals=1;
  const parts=reward(state,values,rng);
  const blueprints=[];
  const awardBlueprint=id=>{if(!state.blueprints.includes(id)){reward(state,{blueprint:id});blueprints.push(id);}};
  characterXp(state,values.xp);counter(state,'wins');
  state.progress.victories[definition.id]=(state.progress.victories[definition.id]??0)+1;
  if(firstBoss) {
    state.progress.defeatedBosses.push(definition.id);state.progress.counters.bosses=state.progress.defeatedBosses.length;
    awardBlueprint(`precision-${definition.era}`);awardBlueprint(`boss-core-${definition.era}`);
    if(definition.era<6)awardBlueprint(`precision-${definition.era+1}`);
    if(definition.era>=5)awardBlueprint('stellar');
    const part=randomPart(state,{definition:`boss${definition.era}-core`,rarity:4},rng);if(part)parts.push(part);
  } else {
    const part=randomPart(state,{era:definition.era,weights:definition.partWeights},rng);if(part)parts.push(part);
    if(rng()<config.blueprintChance)awardBlueprint(`precision-${definition.era}`);
  }
  return {won:true,firstBoss,opponent:definition,rewards:values,parts,blueprint:blueprints[0]??null,blueprints};
}
