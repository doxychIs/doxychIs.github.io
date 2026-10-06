import { CONFIG } from './config.js';
import { createState, normalizeState } from './state.js';
import { loadSave, saveState, resetSave } from './storage.js';
import { buyBuilding, buyUpgrade, produce, earn, incomePerSecond, offlineIncome, stageIndex, buildingById } from './economy.js';
import { money } from './format.js';
import { GameUI } from './ui.js';
import { Sound } from './audio.js';
import { YandexPlatform } from './platform.js';

let state;
let ui;
let started=false;
let platformPaused=false;
let hiddenAt=null;
let hiddenAccountedSeconds=0;
let hiddenEarnedAmount=0;
let lastTick=performance.now();
let lastRender=0;
let lastCloud=0;
let lastSaveError=false;
const sound=new Sound();
const paused=()=>platformPaused||document.hidden;
const platform=new YandexPlatform({onPause:()=>setPlatformPause(true),onResume:()=>setPlatformPause(false)});

function updateProduction(now=performance.now()) {
  if(!started)return;
  const seconds=Math.max(0,(now-lastTick)/1000);
  lastTick=now;
  if(paused())return;
  // Точный доход по прошедшему времени, без зависимости от частоты кадров.
  earn(state,incomePerSecond(state)*Math.min(seconds,CONFIG.offline.maxSeconds));
  state.playSeconds+=seconds;
}

function announceProgress(previousStage) {
  const next=stageIndex(state);
  if(next>previousStage)ui.toast(`Новый этап: ${CONFIG.stages[next].name}. Империя растёт!`);
}

function save(showMessage=false) {
  if(!started)return;
  updateProduction();
  settleHiddenIncome();
  const ok=saveState(state);
  ui.saveStatus(ok);
  if(showMessage)ui.toast(ok?'Империя сохранена. Можно выдохнуть.':'Браузер не разрешил сохранить прогресс. Проверьте доступ к данным сайта.',!ok);
  else if(!ok&&!lastSaveError)ui.toast('Не удалось сохранить прогресс на устройстве.',true);
  lastSaveError=!ok;
  if(CONFIG.platform.cloudSaves&&(showMessage||Date.now()-lastCloud>=CONFIG.platform.cloudIntervalMs)) {
    lastCloud=Date.now();platform.saveCloud(state);
  }
  return ok;
}

function settleHiddenIncome() {
  if(hiddenAt===null)return;
  const seconds=Math.max(0,Math.min(CONFIG.offline.maxSeconds,(Date.now()-hiddenAt)/1000));
  const remaining=Math.max(0,seconds-hiddenAccountedSeconds);
  if(remaining>0) {
    hiddenEarnedAmount+=offlineIncome(state,remaining).amount;
    hiddenAccountedSeconds=seconds;
  }
}

function setPlatformPause(value) {
  if(!started) { platformPaused=value;return; }
  updateProduction();platformPaused=value;lastTick=performance.now();
  sound.pause(paused());
  ui.render(state,paused());
  if(value)save();
}

function loop(now) {
  if(started) {
    const previous=ui.currentStage;
    updateProduction(now);
    if(!paused()&&now-lastRender>=100) { ui.render(state,false);lastRender=now;announceProgress(previous); }
  }
  requestAnimationFrame(loop);
}

async function boot() {
  const loaded=loadSave();state=loaded.state??createState();
  await platform.init();
  if(CONFIG.platform.cloudSaves) {
    const cloud=normalizeState(await platform.loadCloud());
    if(cloud&&(!loaded.state||cloud.lastSeen>state.lastSeen))state=cloud;
  }
  const offline=offlineIncome(state,(Date.now()-state.lastSeen)/1000);
  ui=new GameUI({
    produce:()=>{
      if(paused())return;
      const previous=stageIndex(state);updateProduction();const amount=produce(state);
      sound.play('click');ui.feedback(amount);ui.render(state);announceProgress(previous);
      // Сохраняем первый рубль и важные рубежи; остальное — автосохранением.
      if(state.clicks===1||state.clicks%25===0)save();
    },
    buyBuilding:(id,quantity)=>{
      if(paused())return;
      updateProduction();const result=buyBuilding(state,id,quantity);
      if(!result)return;
      ui.purchase(id);sound.play('buy');ui.render(state);save();
      if(state.buildings[id]===result.quantity)ui.toast(`${buildingById(id).name} в деле. Производство запущено!`);
    },
    buyUpgrade:id=>{
      if(paused())return;
      updateProduction();if(!buyUpgrade(state,id))return;
      sound.play('buy');ui.render(state);save();ui.toast('Улучшение установлено. Теперь производство мощнее.');
    },
    toggle:key=>{state.settings[key]=!state.settings[key];sound.enabled=state.settings.sound;ui.settings(state);save();if(key==='sound')sound.play('buy');},
    refresh:()=>ui.render(state,paused()),save,
    reset:()=>{
      const settings={...state.settings};state=createState();state.settings=settings;
      hiddenAt=null;hiddenAccountedSeconds=0;hiddenEarnedAmount=0;lastTick=performance.now();ui.currentStage=-1;
      const ok=resetSave(state);ui.saveStatus(ok);ui.render(state,paused());
      if(CONFIG.platform.cloudSaves)platform.saveCloud(state);
      ui.toast(ok?'Новая глава началась. Ваш гараж ждёт.':'Новый прогресс не удалось сохранить.',!ok);
    }
  });
  started=true;lastTick=performance.now();
  sound.enabled=state.settings.sound;sound.pause(paused());
  ui.settings(state);ui.render(state,paused());ui.ready();
  save(); // Начисление офлайн-дохода фиксируется сразу, повторно его получить нельзя.
  platform.ready();if(!paused())platform.start();
  if(loaded.recovered)ui.toast('Прогресс восстановлен из резервной копии.');
  if(loaded.error)ui.toast('Сохранение не удалось прочитать. Начата новая игра.',true);
  if(offline.amount>=1&&offline.seconds>=60)ui.offline(offline);
  setInterval(()=>save(),CONFIG.autosaveMs);
  requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange',()=>{
  if(!started)return;
  if(document.hidden) {
    // Событие приходит уже после смены hidden, поэтому закрываем последний интервал явно.
    if(!platformPaused) {
      const seconds=Math.max(0,(performance.now()-lastTick)/1000);
      earn(state,incomePerSecond(state)*Math.min(seconds,CONFIG.offline.maxSeconds));state.playSeconds+=seconds;
    }
    lastTick=performance.now();hiddenAt=Date.now();hiddenAccountedSeconds=0;hiddenEarnedAmount=0;save();platform.stop();sound.pause(true);
  } else {
    if(hiddenAt!==null) {
      settleHiddenIncome();
      if(hiddenAccountedSeconds>=60&&hiddenEarnedAmount>=1)ui.toast(`За время отсутствия: +${money(hiddenEarnedAmount)}`);
    }
    hiddenAt=null;hiddenAccountedSeconds=0;hiddenEarnedAmount=0;lastTick=performance.now();save();sound.pause(platformPaused);
    if(!platformPaused)platform.start();ui.render(state,paused());
  }
});

window.addEventListener('pagehide',()=>save());
window.addEventListener('beforeunload',()=>save());

boot().catch(error=>{
  console.error('Не удалось запустить игру:',error);
  const loading=document.getElementById('loading');
  if(loading)loading.innerHTML='<p>Не удалось запустить игру. Обновите страницу и попробуйте снова.</p>';
});
