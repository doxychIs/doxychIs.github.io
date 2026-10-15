import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createState,normalizeState} from '../src/state.js';
import {CHARACTERS,CHARACTER_MIGRATION,PARTS,SLOTS,ERAS,PART_MODELS} from '../src/expansion-config.js';
import {checkProgress,autoAssemble,craftPart,equipPart} from '../src/expansion.js';
import {characterBonuses} from '../src/selectors.js';
import {robotSvg,characterPortrait} from '../src/robot-view.js';
import {locationFor,LOCATIONS} from '../src/locations.js';

function robot(){const s=createState();s.clicks=25;checkProgress(s);autoAssemble(s);return s;}

test('Обновление команды сохраняет все уровни, опыт, роли, яйца и капитал версии 2',()=>{
  const raw=robot();raw.money=1555;raw.buildings.worker=8;
  for(const [i,id] of Object.keys(CHARACTER_MIGRATION).entries())raw.characters.owned[id]={level:i+2,xp:17+i,rank:i%5};
  raw.characters.pilot='asya';raw.characters.engineer='nika';raw.characters.eggs.basic=4;
  const loaded=normalizeState(JSON.parse(JSON.stringify(raw)));
  for(const [old,id] of Object.entries(CHARACTER_MIGRATION))assert.deepEqual(loaded.characters.owned[id],raw.characters.owned[old]);
  assert.equal(loaded.characters.pilot,'shin');assert.equal(loaded.characters.engineer,'lena');
  assert.equal(loaded.characters.eggs.basic,4);assert.equal(loaded.money,1555);assert.equal(loaded.buildings.worker,8);
  const again=normalizeState(loaded);assert.deepEqual(again.characters,loaded.characters);
  assert.ok(characterBonuses(loaded).factory>0);
});

test('Для каждой эпохи и слота есть три формы; крафт выбранной формы сохраняется',()=>{
  assert.equal(new Set(PARTS.map(p=>p.id)).size,PARTS.length);
  for(let era=0;era<ERAS.length;era++)for(const slot of SLOTS) {
    const defs=PARTS.filter(p=>!p.boss&&p.era===era&&p.slot===slot.id);assert.equal(defs.length,3);
    assert.deepEqual(new Set(defs.map(p=>p.model)),new Set(PART_MODELS.map(p=>p.id)));
  }
  const s=robot();s.money=10000;s.resources.scrap=s.resources.gears=1000;
  const p=craftPart(s,'head','basic','round');assert.ok(p.ok);assert.equal(p.part.definition,'era0-head-round');
  assert.ok(equipPart(s,p.part.uid).ok);const saved=normalizeState(s);assert.equal(saved.robot.slots.head,p.part.uid);
  const money=s.money,scrap=s.resources.scrap;
  assert.equal(craftPart(s,'body','basic','unknown').ok,false);assert.equal(s.money,money);assert.equal(s.resources.scrap,scrap);
});

test('Модели имеют разные характеристики и геометрию, старые детали сохранены',()=>{
  for(const slot of SLOTS) {
    const s=robot(),initial=robotSvg(s);s.money=10000;s.resources.scrap=s.resources.gears=1000;
    const p=craftPart(s,slot.id,'basic','crest');equipPart(s,p.part.uid);
    const svg=robotSvg(s);assert.notEqual(svg,initial);assert.match(svg,/model-crest/);
    assert.notDeepEqual(PARTS.find(d=>d.id===p.part.definition).stats,PARTS.find(d=>d.id===`era0-${slot.id}`).stats);
  }
});

test('Локации имеют собственные фоны; космическая верфь открывается позднее',()=>{
  for(const [view,location] of Object.entries(LOCATIONS)) {
    assert.equal(locationFor(view,0).image,location.image);
    assert.ok(existsSync(new URL(`../assets/locations/${location.image}.webp`,import.meta.url)));
  }
  assert.equal(locationFor('factory',6).image,'space');assert.equal(locationFor('robots',6).image,'space');
  assert.equal(locationFor('characters',6).image,'club');
});

test('Семь мини-портретов подключены, сборка содержит игровой стиль и русский заголовок',()=>{
  for(const character of CHARACTERS) {
    assert.ok(existsSync(new URL(`../assets/characters/${character.id}.webp`,import.meta.url)));
    assert.match(characterPortrait(character),new RegExp(character.id+'\\.webp'));
  }
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<title>86 ЦЕХ/);assert.match(html,/game\.css/);assert.match(html,/travel-name/);
  assert.match(readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8'),/'game.css'/);
});
