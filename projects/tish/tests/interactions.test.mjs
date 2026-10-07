import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import ts from 'typescript';
import * as care from '../src/data/care.ts';
function run(dom,file){dom.window.exports={};dom.window.require=()=>care;const source=readFileSync(new URL(`../src/scripts/${file}.ts`,import.meta.url),'utf8');dom.window.eval(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);}
test('Маршрут из ссылки меняет цену, время и этапы плана',()=>{
  const dom=new JSDOM(readFileSync(new URL('../dist/visit/index.html',import.meta.url),'utf8'),{url:'https://example.test/visit/?route=slow',runScripts:'outside-only'});run(dom,'visit');const doc=dom.window.document;
  assert.equal(doc.querySelector('#day-duration').textContent,'2 часа');assert.match(doc.querySelector('#day-price').textContent,/7\s900/);assert.equal(doc.querySelectorAll('#day-stages li').length,4);
  const form=doc.querySelector('form');form.elements.date.value='2099-05-20';form.elements.time.value='14:00';doc.querySelector('input[name=preference]').checked=true;
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));
  assert.equal(doc.querySelector('#care-result').hidden,false);assert.match(doc.querySelector('#care-plan-text').textContent,/Предпочитаю тишину/);assert.match(doc.querySelector('#care-plan-text').textContent,/Заявка не отправлена/);
  dom.window.close();
});
test('Пауза таймера не удваивает время; продолжение сохраняет фазу',()=>{
  const dom=new JSDOM(readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),{runScripts:'outside-only'});let now=0;let tick;
  Object.defineProperty(dom.window.performance,'now',{value:()=>now});dom.window.setInterval=fn=>{tick=fn;return 1;};dom.window.clearInterval=()=>{tick=undefined;};run(dom,'breathing');const doc=dom.window.document;const button=doc.querySelector('#breath-start');
  button.click();now=2000;tick();assert.equal(doc.querySelector('#breath-progress').value,2);
  now=2500;button.click();assert.equal(doc.querySelector('.breathing').dataset.state,'paused');
  now=5000;button.click();assert.equal(doc.querySelector('#breath-progress').value,2.5);
  now=6500;tick();assert.equal(doc.querySelector('#breath-progress').value,4);assert.equal(doc.querySelector('#breath-instruction').textContent,'Спокойный выдох');
  now=63000;tick();assert.equal(doc.querySelector('.breathing').dataset.state,'done');assert.equal(doc.querySelector('#breath-progress').value,60);
  doc.querySelector('#breath-reset').click();assert.equal(doc.querySelector('#breath-progress').value,0);assert.equal(doc.querySelector('.breathing').dataset.state,'idle');
  dom.window.close();
});
