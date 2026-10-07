import test from 'node:test';
import assert from 'node:assert/strict';
import { journeys, treatments, breathingPhase, money, duration } from '../src/data/care.ts';
test('Время каждого маршрута включает все этапы',()=>{
  for(const journey of journeys){assert.equal(journey.steps.reduce((sum,s)=>sum+s.minutes,0),journey.minutes,journey.id);assert.ok(journey.price>0);}
});
test('Короткие процедуры связаны с существующим направлением ухода',()=>{
  for(const item of treatments)assert.ok(journeys.some(j=>j.id===item.id));
  assert.equal(new Set(journeys.map(j=>j.id)).size,journeys.length);
});
test('Минута состоит из шести циклов, вдох 4 секунды, выдох 6 секунд',()=>{
  assert.equal(breathingPhase(0).phase,'inhale');assert.equal(breathingPhase(3.999).phase,'inhale');
  assert.equal(breathingPhase(4).phase,'exhale');assert.equal(breathingPhase(9.999).phase,'exhale');
  assert.equal(breathingPhase(10).phase,'inhale');assert.equal(breathingPhase(59).phase,'exhale');
  assert.deepEqual(breathingPhase(60),{remaining:0,phase:'done',cycles:6});
});
test('Таймер остаётся в пределах минуты',()=>{
  assert.deepEqual(breathingPhase(100),{remaining:0,phase:'done',cycles:6});assert.equal(breathingPhase(-5).remaining,60);
});
test('Цена и длительность оформлены по-русски',()=>{
  assert.ok(money(7900).endsWith('₽'));assert.equal(duration(75),'1 час 15 минут');assert.equal(duration(120),'2 часа');
});
