import { EXPANSION, ERAS, RARITIES } from './expansion-config.js';
import { partDefinition, equippedParts, activeSets, characterBonuses, eraIndex } from './selectors.js';

export function partStats(part) {
  const def=partDefinition(part);if(!def)return {};
  const rarity=RARITIES[part.rarity],level=1+part.level*EXPANSION.enhancement.factor;
  const factor=ERAS[def.era].scale*rarity.factor*level;
  return Object.fromEntries(Object.entries(def.stats).map(([key,value])=>[key,value*(['crit','speed'].includes(key)?rarity.factor*level:factor)]));
}
export function robotStats(state) {
  const config=EXPANSION.battle,bonus=characterBonuses(state),sets=activeSets(state);
  const stats={health:config.baseHealth,attack:config.baseAttack,defense:config.baseDefense,speed:config.baseSpeed,crit:config.baseCrit,critDamage:config.critDamage,shield:0,heal:0,loot:bonus.loot,effects:sets.map(index=>ERAS[index].setEffect)};
  for(const part of equippedParts(state)) {
    const definition=partDefinition(part);
    for(const [key,value] of Object.entries(partStats(part)))stats[key]=(stats[key]??0)+value;
    if(definition.effect&&!stats.effects.includes(definition.effect))stats.effects.push(definition.effect);
    if(part.rarity>=3&&['left','right'].includes(definition.slot))stats.critDamage+=EXPANSION.robot.epicWeaponCritDamage;
    if(part.rarity>=4&&definition.slot==='body')stats.shield+=EXPANSION.robot.legendaryBodyShield;
  }
  const factor=1+(state.robot.level-1)*EXPANSION.robot.levelFactor;
  for(const key of ['health','attack','defense'])stats[key]*=factor;
  stats.attack*=1+bonus.attack;stats.speed=Math.min(EXPANSION.robot.maxSpeed,stats.speed*(1+bonus.speed));
  stats.crit=Math.min(EXPANSION.robot.maxCrit,stats.crit+bonus.crit+(stats.effects.includes('crit')?EXPANSION.effects.crit:0));
  if(stats.effects.includes('shield'))stats.shield+=EXPANSION.effects.shield;
  if(stats.effects.includes('heal'))stats.heal=EXPANSION.effects.heal;
  if(stats.effects.includes('loot'))stats.loot+=EXPANSION.effects.loot;
  stats.shield+=bonus.shield;stats.armorScale=ERAS[eraIndex(state)].scale;
  stats.power=Math.round((stats.health*0.4+stats.attack*5+stats.defense*4)*stats.speed*(1+stats.crit*0.4));
  return stats;
}
