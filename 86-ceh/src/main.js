import { CONFIG } from './config.js';
import { createState, normalizeState } from './state.js';
import { loadSave, saveState, resetSave } from './storage.js';
import { buyBuilding, buyUpgrade, produce, earn, incomePerSecond, offlineIncome, stageIndex, buildingById } from './economy.js';
import { money } from './format.js';
import { GameUI } from './ui.js';
import { ExpansionUI } from './expansion-ui.js';
import { Sound } from './audio.js';
import { YandexPlatform } from './platform.js';
import * as Systems from './expansion.js';
import { startBattle, stepBattle, settleBattle, useAbility } from './battle.js';
import { EXPANSION } from './expansion-config.js';

let state,ui,expansion;
let started=false,platformPaused=false;
let hiddenAt=null,hiddenAccountedSeconds=0,hiddenEarnedAmount=0,hiddenCratesAccounted=0;
let lastTick=performance.now(),lastRender=0,lastCloud=0,lastSaveError=false;
const sound=new Sound();
const paused=()=>platformPaused||document.hidden;
const platform=new YandexPlatform({onPause:()=>setPlatformPause(true),onResume:()=>setPlatformPause(false)});

function processProgress() {
  const events=Systems.checkProgress(state);
  if(expansion&&events.length)expansion.present(events);
  return events;
}
function render() {
  if(!ui)return;
  ui.render(state,paused());expansion?.render(state,paused());
}
function updateProduction(now=performance.now()) {
  if(!started)return;
  const seconds=Math.max(0,(now-lastTick)/1000);lastTick=now;
  if(paused())return;
  const credited=Math.min(seconds,CONFIG.offline.maxSeconds);
  const income=incomePerSecond(state);earn(state,income*credited);
  Systems.tickMaterials(state,credited,income>0);state.playSeconds+=seconds;
  if(state.activeBattle?.status==='running'&&!document.querySelector('dialog[open]')) {
    const events=stepBattle(state,seconds);
    if(events.length) {
      expansion.combatEvents(events);
      if(events.some(event=>['shock','overload'].includes(event.type)))sound.play('impact');
      else if(events.some(event=>event.type==='hit'))sound.play('hit');
    }
    if(state.activeBattle.status!=='running')finishBattle();
  }
}
function finishBattle() {
  const result=settleBattle(state);if(!result)return;
  // Награды фиксируются до показа экрана победы.
  saveState(state);render();expansion.battleResult(result);processProgress();
  sound.play(result.won?'win':'click');
}
function save(showMessage=false) {
  if(!started)return;
  updateProduction();settleHiddenIncome();
  const ok=saveState(state);ui.saveStatus(ok);
  if(showMessage)ui.toast(ok?'Империя сохранена. Можно выдохнуть.':'Браузер не разрешил сохранить прогресс. Проверьте доступ к данным сайта.',!ok);
  else if(!ok&&!lastSaveError)ui.toast('Не удалось сохранить прогресс на устройстве.',true);
  lastSaveError=!ok;
  if(CONFIG.platform.cloudSaves&&(showMessage||Date.now()-lastCloud>=CONFIG.platform.cloudIntervalMs)) {lastCloud=Date.now();platform.saveCloud(state);}
  return ok;
}
function settleHiddenIncome() {
  if(hiddenAt===null)return;
  const seconds=Math.max(0,Math.min(CONFIG.offline.maxSeconds,(Date.now()-hiddenAt)/1000));
  const remaining=Math.max(0,seconds-hiddenAccountedSeconds);
  if(remaining>0) {
    hiddenEarnedAmount+=offlineIncome(state,remaining).amount;
    Systems.tickMaterials(state,remaining,incomePerSecond(state)>0,{offline:true});
    hiddenAccountedSeconds=seconds;
  }
  const expected=state.progress.unlocked&&incomePerSecond(state)>0&&seconds>=EXPANSION.crates.offlineSeconds?Math.min(EXPANSION.crates.offlineMax,1+Math.floor(seconds/EXPANSION.crates.offlineExtraSeconds)):0;
  if(expected>hiddenCratesAccounted){state.crates+=expected-hiddenCratesAccounted;hiddenCratesAccounted=expected;}
}
function setPlatformPause(value) {
  if(!started){platformPaused=value;return;}
  updateProduction();platformPaused=value;lastTick=performance.now();sound.pause(paused());render();if(value)save();
}
function loop(now) {
  if(started) {
    updateProduction(now);
    if(!paused()&&now-lastRender>=200) {
      processProgress();render();lastRender=now;expansion.nextReveal();
    }
  }
  requestAnimationFrame(loop);
}
function resetTiming() {hiddenAt=null;hiddenAccountedSeconds=0;hiddenEarnedAmount=0;hiddenCratesAccounted=0;lastTick=performance.now();}
function prestige() {
  const gain=Systems.prestigeGain(state);
  if(gain<1||Systems.isFighting(state))return {ok:false,message:'Новый цикл доступен с эпохи промкомплекса после боя.'};
  state=Systems.prestigeState(state);resetTiming();ui.currentStage=-1;expansion.reveals=[];expansion.workshopKey='';
  resetSave(state);expansion.showView('factory');
  return {ok:true,message:`Новая глава началась. Получено ${gain} ядер DOX!`};
}
function perform(op,options) {
  if(paused())return;
  updateProduction();let result;
  const {id,role,slot,quality,model,shopSlot}=options;
  const operations={
    auto:()=>Systems.autoAssemble(state),equip:()=>Systems.equipPart(state,id),enhance:()=>Systems.enhancePart(state,id),
    merge:()=>Systems.mergeParts(state,id),dismantle:()=>Systems.dismantlePart(state,id),lock:()=>Systems.togglePartLock(state,id),
    craft:()=>Systems.craftPart(state,slot,quality,model),robotUpgrade:()=>Systems.upgradeRobot(state),
    research:()=>Systems.buyResearch(state),crate:()=>Systems.openCrate(state),bonus:()=>Systems.claimBonus(state),
    buyEgg:()=>Systems.buyEgg(state,id),openEgg:()=>Systems.openEgg(state,id),assign:()=>Systems.assignCharacter(state,id,role),
    rank:()=>Systems.rankCharacter(state,id),shop:()=>Systems.buyShop(state,id,shopSlot),
    battle:()=>startBattle(state,id),ability:()=>useAbility(state,id),prestige
  };
  result=operations[op]?.();if(!result)return;
  if(!result.ok){ui.toast(result.message,true);return;}
  if(result.events)expansion.combatEvents(result.events);
  if(result.character)expansion.present([{type:'character',title:result.character.name,text:result.message,character:result.character}]);
  else if(result.part&&['crate','craft','merge','shop'].includes(op))expansion.present([{type:'part',title:Systems.partScore(result.part)>0?'Новая деталь!':'Находка!',text:result.message,part:result.part}]);
  else ui.toast(result.message);
  if(op==='battle') {expansion.battleKey='';expansion.showView('battles');}
  if(op==='dismantle'||op==='merge')expansion.selected=null;
  processProgress();render();save();sound.play(op==='ability'?'impact':op==='battle'?'start':'buy');
}
async function boot() {
  const loaded=loadSave();state=loaded.state??createState();
  await platform.init();
  if(CONFIG.platform.cloudSaves) {const cloud=normalizeState(await platform.loadCloud());if(cloud&&(!loaded.state||cloud.lastSeen>state.lastSeen))state=cloud;}
  const initialEvents=Systems.checkProgress(state);
  const offline=offlineIncome(state,(Date.now()-state.lastSeen)/1000);
  Systems.tickMaterials(state,offline.seconds,incomePerSecond(state)>0,{offline:true});
  const offlineBoxes=Systems.offlineCrates(state,offline.seconds,incomePerSecond(state)>0);
  ui=new GameUI({
    produce:()=>{
      if(paused())return;
      updateProduction();const amount=produce(state);processProgress();
      const part=Systems.clickDrop(state);if(part)expansion.partDrop(part);
      sound.play('click');ui.feedback(amount);processProgress();render();
      if(part||state.clicks===1||state.clicks%25===0)save();
    },
    buyBuilding:(id,quantity)=>{
      if(paused())return;
      updateProduction();const result=buyBuilding(state,id,quantity);if(!result)return;
      ui.purchase(id);sound.play('buy');processProgress();render();save();
      if(state.buildings[id]===result.quantity)ui.toast(`${buildingById(id).name} в деле. Производство запущено!`);
    },
    buyUpgrade:id=>{
      if(paused())return;
      updateProduction();if(!buyUpgrade(state,id))return;
      sound.play('buy');processProgress();render();save();ui.toast('Улучшение установлено. Теперь производство мощнее.');
    },
    toggle:key=>{state.settings[key]=!state.settings[key];sound.enabled=state.settings.sound;ui.settings(state);save();if(key==='sound')sound.play('buy');},
    refresh:render,save,
    reset:()=>{
      const settings={...state.settings};state=createState();state.settings=settings;resetTiming();ui.currentStage=-1;
      expansion.reveals=[];expansion.selected=null;expansion.arenaEra=null;expansion.workshopKey='';expansion.showView('factory');
      const ok=resetSave(state);ui.saveStatus(ok);render();if(CONFIG.platform.cloudSaves)platform.saveCloud(state);
      ui.toast(ok?'Новая глава началась. Ваш гараж ждёт.':'Новый прогресс не удалось сохранить.',!ok);
    }
  });
  expansion=new ExpansionUI({perform,modalClosed:()=>save(),prestigePrompt:()=>{
    if(Systems.isFighting(state)){ui.toast('Сначала завершите бой.');return;}
    document.getElementById('prestige-gain').textContent=`Вы получите ${Systems.prestigeGain(state)} ядер DOX. Каждое добавляет ${Math.round(EXPANSION.prestige.bonus*100)}% постоянного пассивного дохода.`;
    document.getElementById('prestige-dialog').showModal();
  }},ui);
  started=true;lastTick=performance.now();sound.enabled=state.settings.sound;sound.pause(paused());
  ui.settings(state);render();ui.ready();save();platform.ready();if(!paused())platform.start();
  if(loaded.recovered)ui.toast('Прогресс восстановлен из резервной копии.');
  if(loaded.error)ui.toast('Сохранение не удалось прочитать. Начата новая игра.',true);
  if(offline.amount>=1&&offline.seconds>=60){ui.offline(offline);if(offlineBoxes)document.getElementById('offline-time').textContent+=` На складе ждут ящики деталей: ${offlineBoxes}.`;}
  expansion.present(initialEvents);processProgress();
  if(state.activeBattle?.status==='running')expansion.showViewWithoutTutorial('battles');
  else if(state.activeBattle&&!state.activeBattle.settled)finishBattle();
  setInterval(()=>save(),CONFIG.autosaveMs);requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{
  if(!started)return;
  if(document.hidden) {
    if(!platformPaused) {
      const seconds=Math.max(0,(performance.now()-lastTick)/1000),income=incomePerSecond(state);
      earn(state,income*Math.min(seconds,CONFIG.offline.maxSeconds));Systems.tickMaterials(state,Math.min(seconds,CONFIG.offline.maxSeconds),income>0);state.playSeconds+=seconds;
    }
    lastTick=performance.now();hiddenAt=Date.now();hiddenAccountedSeconds=0;hiddenEarnedAmount=0;hiddenCratesAccounted=0;save();platform.stop();sound.pause(true);
  } else {
    if(hiddenAt!==null){settleHiddenIncome();if(hiddenAccountedSeconds>=60&&hiddenEarnedAmount>=1)ui.toast(`За время отсутствия: +${money(hiddenEarnedAmount)}${hiddenCratesAccounted?` и ${hiddenCratesAccounted} ящиков`:''}`);}
    resetTiming();save();sound.pause(platformPaused);if(!platformPaused)platform.start();processProgress();render();
  }
});
window.addEventListener('pagehide',()=>save());window.addEventListener('beforeunload',()=>save());
boot().catch(error=>{console.error('Не удалось запустить игру:',error);const loading=document.getElementById('loading');if(loading)loading.innerHTML='<p>Не удалось запустить игру. Обновите страницу и попробуйте снова.</p>';});
