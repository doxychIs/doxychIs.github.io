import { CONFIG } from './config.js';
import { CHARACTERS, PARTS, ERAS, EXPANSION } from './expansion-config.js';

export function eraIndex(state) {
  let era=0;
  for(let index=1;index<CONFIG.stages.length;index++) {
    const stage=CONFIG.stages[index];
    const legacy=index<=(state.progress?.eraFloor??0);
    if(legacy||(state.totalEarned>=stage.threshold&&state.progress?.defeatedBosses.includes(stage.boss)))era=index;
    else break;
  }
  return era;
}
export const partDefinition=part=>PARTS.find(item=>item.id===part?.definition);
export const equippedParts=state=>Object.values(state.robot?.slots??{}).map(id=>state.inventory.find(part=>part.uid===id)).filter(Boolean);
export const robotComplete=state=>equippedParts(state).length===6;
export function activeSets(state) {
  const sets=new Map();
  for(const part of equippedParts(state)) {const set=partDefinition(part)?.set;if(set!==undefined)sets.set(set,(sets.get(set)??0)+1);}
  return [...sets].filter(([,count])=>count>=4).map(([id])=>id);
}
export function characterBonuses(state) {
  const result={factory:0,click:0,drop:0,quality:0,attack:0,speed:0,crit:0,shield:0,loot:0};
  for(const id of new Set([state.characters?.pilot,state.characters?.engineer].filter(Boolean))) {
    const definition=CHARACTERS.find(character=>character.id===id), owned=state.characters.owned[id];
    if(!definition||!owned)continue;
    const factor=characterFactor(owned);
    for(const key of ['factory','click','drop','quality'])result[key]+=(definition[key]??0)*factor;
    result[definition.combat]+=definition.value*factor;
  }
  return result;
}
export const characterFactor=owned=>1+(owned.level-1)*EXPANSION.characters.levelFactor+owned.rank*EXPANSION.characters.rankFactor;
export function productionFactor(state) {
  const sets=activeSets(state);
  const setBonus=sets.reduce((sum,index)=>sum+ERAS[index].productionBonus,0);
  return (1+characterBonuses(state).factory)*(1+(state.research??0)*EXPANSION.research.factor)
    *(1+(state.resources?.cores??0)*EXPANSION.prestige.bonus)*(1+setBonus);
}
export const robotName=state=>ERAS[eraIndex(state)].robot;
