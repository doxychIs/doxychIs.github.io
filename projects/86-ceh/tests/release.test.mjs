import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState} from '../src/state.js';
import {checkProgress,autoAssemble,craftPart,bossRecipeEra} from '../src/expansion.js';
import {startBattle,settleBattle} from '../src/battle.js';
import {blueprintName,PARTS} from '../src/expansion-config.js';

function robot(){const s=createState();s.clicks=25;checkProgress(s);autoAssemble(s);checkProgress(s);return s;}

test('Задание первой сборки даёт настоящую деталь только один раз',()=>{
  const s=robot();assert.ok(s.inventory.some(p=>PARTS.find(d=>d.id===p.definition).slot==='movement'&&p.rarity===1));
  const count=s.inventory.length;checkProgress(s);assert.equal(s.inventory.length,count);
});
test('Особое ядро восстанавливается по чертежу предыдущей эпохи',()=>{
  const s=robot();s.progress.eraFloor=1;s.blueprints=['boss-core-0'];s.money=100000;
  s.resources.scrap=s.resources.gears=1000;
  assert.equal(bossRecipeEra(s),0);const p=craftPart(s,'core','boss');
  assert.ok(p.ok);assert.equal(p.part.definition,'boss0-core');assert.equal(p.part.rarity,4);
  const before=s.money;assert.equal(craftPart(s,'left','boss').ok,false);assert.equal(s.money,before);
});
test('Старые победы восстанавливают рецепты без повторной валютной награды',()=>{
  const s=robot();s.progress.defeatedBosses=['rival-0-2'];s.progress.achievements.push('boss');s.progress.quests.push('boss');
  const before={...s.resources};checkProgress(s);assert.ok(s.blueprints.includes('boss-core-0'));assert.deepEqual(s.resources,before);
  const loaded=normalizeState(s);assert.ok(loaded.blueprints.includes('boss-core-0'));
});
test('Обработчик наград возвращает все новые чертежи и не платит повторно',()=>{
  // Готовый результат — вход обработчика; симулятор боя здесь не запускается.
  const s=robot();startBattle(s,'rival-0-2',1);s.activeBattle.status='won';
  const result=settleBattle(s,()=>.5);assert.ok(result.blueprints.includes('boss-core-0'));
  assert.ok(result.blueprints.includes('precision-1'));assert.equal(blueprintName('boss-core-0'),'Особое ядро: Болтик');
  const gears=s.resources.gears;assert.equal(settleBattle(s),null);assert.equal(s.resources.gears,gears);
});
