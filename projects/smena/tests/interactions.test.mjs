import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import * as catalog from '../src/data/catalog.ts';
function fixture(url='https://example.test/visit/') {
  const dom=new JSDOM(readFileSync(new URL('../dist/visit/index.html',import.meta.url),'utf8'),{url,runScripts:'outside-only'});
  dom.window.exports={};dom.window.require=()=>catalog;
  const source=readFileSync(new URL('../src/scripts/builder.ts',import.meta.url),'utf8');
  dom.window.eval(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
  return dom;
}
test('Ссылка на образ задаёт основную услугу и обновляет расчёт',()=>{
  const dom=fixture('https://example.test/visit/?service=color');const doc=dom.window.document;
  assert.equal(doc.querySelector('input[name=service]:checked').value,'color');
  assert.match(doc.querySelector('#ticket-price').textContent,/6\s500/);
  const extra=doc.querySelector('input[value=care]');extra.checked=true;extra.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.match(doc.querySelector('#ticket-price').textContent,/8\s300/);assert.equal(doc.querySelector('#ticket-duration').textContent,'2 ч 25 мин');
  dom.window.close();
});
test('Невалидный запрос не создаёт план; заполненный создаёт только локальный текст',()=>{
  const dom=fixture();const doc=dom.window.document;const form=doc.querySelector('form');
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));
  assert.ok(doc.querySelector('#plan-result').hidden);assert.equal(form.elements.date.validationMessage,'Выберите желаемую дату визита.');
  form.elements.date.value='2099-05-20';form.elements.time.value='12:00';form.elements.note.value='<b>Сохранить длину</b>';
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));
  assert.equal(doc.querySelector('#plan-result').hidden,false);assert.match(doc.querySelector('#plan-text').textContent,/20 мая 2099/);
  assert.match(doc.querySelector('#plan-text').textContent,/<b>Сохранить длину<\/b>/);assert.equal(doc.querySelector('#plan-text b'),null);
  assert.match(doc.querySelector('#plan-text').textContent,/Заявка не отправлена/);assert.equal(doc.activeElement.id,'result-title');
  dom.window.close();
});
