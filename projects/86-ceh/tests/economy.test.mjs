import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createState, normalizeState } from '../src/state.js';
import { buyBuilding, buyUpgrade, clickValue, incomePerSecond, isUnlocked, maxAffordable, offlineIncome, priceFor, produce, stageIndex } from '../src/economy.js';
import { loadSave, saveState, resetSave } from '../src/storage.js';
import { formatNumber } from '../src/format.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-10,`${a} ≈ ${b}`);
const worker=CONFIG.buildings[0];
function memoryStorage() {
  const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
}

test('Старт, ручное производство и первый рабочий',()=>{
  const state=createState();assert.equal(state.money,0);assert.equal(incomePerSecond(state),0);
  assert.equal(buyBuilding(state,'worker'),false);
  for(let i=0;i<15;i++)produce(state);
  close(state.money,15);assert.equal(state.clicks,15);
  assert.ok(buyBuilding(state,'worker'));close(incomePerSecond(state),1);close(clickValue(state),1.02);
  assert.equal(buyBuilding(state,'machine'),false);
});

test('Геометрическая цена и пакетная покупка эквивалентны последовательной',()=>{
  const batch=createState(),single=createState();batch.money=single.money=1e8;batch.totalEarned=single.totalEarned=1e8;
  close(priceFor(worker,3),15*1.15**3);
  const result=buyBuilding(batch,'worker',10);assert.equal(result.quantity,10);
  for(let i=0;i<10;i++)assert.ok(buyBuilding(single,'worker'));
  close(batch.money,single.money);assert.equal(batch.buildings.worker,single.buildings.worker);
  assert.equal(buyBuilding(batch,'worker',-1),false);assert.equal(buyBuilding(batch,'worker',1.5),false);
});

test('Максимальная покупка не уходит в долг даже при огромном капитале',()=>{
  for(const budget of [14.99,15,120,10000,1e15,1e100,1e300]) {
    const state=createState();state.money=state.totalEarned=budget;
    const max=maxAffordable(state,worker);
    if(max>0) {assert.ok(priceFor(worker,0,max)<=budget);assert.ok(priceFor(worker,0,max+1)>budget);assert.ok(buyBuilding(state,'worker','max'));assert.ok(state.money>=0);}
    else assert.ok(budget<priceFor(worker,0));
  }
});

test('Открытие зависит от всех заработанных денег, а не от остатка',()=>{
  const state=createState();state.totalEarned=320000;state.money=0;state.progress.defeatedBosses=['rival-0-2','rival-1-2'];
  assert.equal(isUnlocked(state,CONFIG.buildings[4]),true);assert.equal(stageIndex(state),2);
  assert.equal(buyBuilding(state,'factory'),false);
});

test('Улучшения умножают нужный доход и покупаются один раз',()=>{
  const state=createState();state.money=state.totalEarned=1e6;state.buildings.worker=10;state.buildings.machine=1;
  assert.equal(buyUpgrade(state,'tools'),false);state.clicks=25;
  assert.ok(buyUpgrade(state,'tools'));close(clickValue(state),(1+19*.02)*2);
  assert.ok(buyUpgrade(state,'training'));close(incomePerSecond(state),29);
  assert.ok(buyUpgrade(state,'logistics'));close(incomePerSecond(state),58);
  assert.equal(buyUpgrade(state,'training'),false);assert.equal(buyUpgrade(state,'unknown'),false);
});

test('Офлайн-доход ограничен восемью часами и безопасен при неверном времени',()=>{
  const state=createState();state.buildings.worker=10;
  const result=offlineIncome(state,86400);assert.equal(result.seconds,28800);assert.equal(result.amount,288000);
  assert.equal(state.offlineEarned,288000);assert.equal(state.totalEarned,288000);
  assert.equal(offlineIncome(state,-300).amount,0);assert.equal(offlineIncome(state,NaN).amount,0);
});

test('Проверка структуры сохранения, резервное восстановление и сброс',()=>{
  const store=memoryStorage(),state=createState(1000);state.money=state.totalEarned=123;
  assert.ok(saveState(state,store,2000));state.money=200;state.totalEarned=200;assert.ok(saveState(state,store,3000));
  assert.equal(loadSave(store,4000).state.money,200);
  store.setItem(CONFIG.saveKey,'повреждённые данные');
  const recovered=loadSave(store,4000);assert.equal(recovered.recovered,true);assert.equal(recovered.state.money,123);
  assert.ok(resetSave(createState(5000),store,5000));store.setItem(CONFIG.saveKey,'сломан');assert.equal(loadSave(store,6000).state.money,0);
  assert.equal(normalizeState({...state,money:-1}),null);
  assert.equal(normalizeState({...state,buildings:{...state.buildings,worker:Infinity}}),null);
  assert.equal(normalizeState({...state,version:999}),null);
  assert.equal(normalizeState({...state,upgrades:['tools','tools','неизвестное']}).upgrades.length,1);
});

test('Недоступное хранилище не ломает игру',()=>{
  const store={getItem(){throw new Error('Запрещено');},setItem(){throw new Error('Запрещено');}};
  assert.equal(loadSave(store).error,true);assert.equal(saveState(createState(),store),false);
});

test('Даже запрет доступа к самому localStorage обрабатывается безопасно',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Доступ запрещён');}});
  try {
    assert.equal(loadSave().error,true);assert.equal(saveState(createState()),false);assert.equal(resetSave(createState()),false);
  } finally {
    if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;
  }
});

test('Числа остаются читаемыми вплоть до очень больших значений',()=>{
  assert.equal(formatNumber(0),'0');assert.match(formatNumber(1500),/1,5 тыс\./);
  assert.match(formatNumber(1e9),/млрд/);assert.match(formatNumber(1e12),/трлн/);
  assert.match(formatNumber(1e100),/10\^100/);assert.equal(formatNumber(Infinity),'Предел');
});
