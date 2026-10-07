import test from 'node:test';
import assert from 'node:assert/strict';
import { visitTotal, money, duration, looks, services } from '../src/data/catalog.ts';
test('Визит суммирует цену и последовательную длительность',()=>{
  const total=visitTotal('cut',['care','brows']);
  assert.equal(total.price,6600);assert.equal(total.minutes,130);
  assert.deepEqual(total.items.map(s=>s.id),['cut','care','brows']);
});
test('Повторные, неизвестные и основные услуги не попадают в дополнения',()=>{
  const total=visitTotal('short',['care','care','cut','unknown']);
  assert.equal(total.price,4700);assert.equal(total.minutes,85);assert.equal(total.items.length,2);
  assert.deepEqual(visitTotal('missing',['care']),{items:[],price:0,minutes:0});
});
test('Образы ведут к существующей основной услуге',()=>{
  for(const look of looks)assert.ok(services.some(s=>s.id===look.service&&!s.extra));
});
test('Денежные и временные значения оформлены по-русски',()=>{
  assert.ok(money(3200).endsWith('₽'));assert.equal(duration(130),'2 ч 10 мин');assert.equal(duration(45),'45 мин');
});
