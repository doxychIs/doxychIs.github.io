import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/scripts/look-gallery.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(slug='line', reduced=false, page) {
 const dom=new JSDOM(readFileSync(new URL(`../dist/${page ?? `obrazy/${slug}/index.html`}`,import.meta.url),'utf8'),{url:'https://example.test/smena/',runScripts:'outside-only',pretendToBeVisual:true});
 const win=dom.window;
 win.exports={};win.matchMedia=query=>({matches:query.includes('reduce')?reduced:true,addEventListener(){}});
 win.HTMLImageElement.prototype.decode=()=>Promise.resolve();
 win.eval(source);
 return dom;
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function pointer(win,node,type,props) {
 const event=new win.Event(type,{bubbles:true});
 Object.entries(props).forEach(([key,value])=>Object.defineProperty(event,key,{value}));
 node.dispatchEvent(event);
}
for(const slug of ['line','texture','copper']) test(`${slug}: смена ракурса, клавиатура, зацикливание и объявление кадра`,async()=>{
 const dom=fixture(slug);const win=dom.window;const doc=win.document;const gallery=doc.querySelector('[data-look-gallery]');
 assert.equal(gallery.querySelectorAll('[data-slide]').length,3);
 assert.equal(gallery.querySelector('.gallery-step-controls').hidden,false);
 gallery.querySelector('[data-view="1"]').click();await flush();
 assert.equal(gallery.querySelector('[data-view="1"]').getAttribute('aria-pressed'),'true');
 assert.match(gallery.querySelector('[data-gallery-status]').textContent,/Профиль.*2 из 3/);
 gallery.querySelector('.gallery-stage').dispatchEvent(new win.KeyboardEvent('keydown',{key:'End',bubbles:true}));await flush();
 assert.match(gallery.querySelector('.gallery-slide.is-current img').src,/back\.webp$/);
 gallery.querySelector('[data-step="1"]').click();await flush();
 assert.equal(gallery.querySelector('[data-view="0"]').getAttribute('aria-pressed'),'true');
 assert.equal(gallery.querySelectorAll('[data-slide][aria-hidden="false"]').length,1);
 dom.window.close();
});
test('Горизонтальный свайп меняет кадр; вертикальная прокрутка и отменённый жест — нет',async()=>{
 const dom=fixture();const win=dom.window;const gallery=win.document.querySelector('[data-look-gallery]');const stage=gallery.querySelector('.gallery-stage');
 const start={pointerType:'touch',pointerId:7,clientX:230,clientY:100};
 pointer(win,stage,'pointerdown',start);pointer(win,stage,'pointerup',{...start,clientX:90});await flush();
 assert.equal(gallery.querySelector('[data-view="1"]').getAttribute('aria-pressed'),'true');
 pointer(win,stage,'pointerdown',start);pointer(win,stage,'pointerup',{...start,clientX:160,clientY:270});await flush();
 assert.equal(gallery.querySelector('[data-view="1"]').getAttribute('aria-pressed'),'true');
 pointer(win,stage,'pointerdown',start);pointer(win,stage,'pointercancel',start);pointer(win,stage,'pointerup',{...start,clientX:70});await flush();
 assert.equal(gallery.querySelector('[data-view="1"]').getAttribute('aria-pressed'),'true');dom.window.close();
});
test('Поздно загруженный кадр не отменяет более свежий выбор',async()=>{
 const dom=fixture();const gallery=dom.window.document.querySelector('[data-look-gallery]');const slides=[...gallery.querySelectorAll('[data-slide]')];
 let profileReady,backReady;
 slides[1].querySelector('img').decode=()=>new Promise(resolve=>{profileReady=resolve;});
 slides[2].querySelector('img').decode=()=>new Promise(resolve=>{backReady=resolve;});
 gallery.querySelector('[data-view="1"]').click();gallery.querySelector('[data-view="2"]').click();
 backReady();await flush();profileReady();await flush();
 assert.equal(gallery.querySelector('[data-view="2"]').getAttribute('aria-pressed'),'true');dom.window.close();
});
test('Ошибка загрузки оставляет текущий кадр и позволяет повторить выбор',async()=>{
 const dom=fixture();const gallery=dom.window.document.querySelector('[data-look-gallery]');const img=gallery.querySelectorAll('[data-slide] img')[1];
 img.decode=()=>Promise.reject(new Error('network'));
 gallery.querySelector('[data-view="1"]').click();await flush();
 assert.equal(gallery.querySelector('[data-view="0"]').getAttribute('aria-pressed'),'true');
 assert.match(gallery.querySelector('[data-gallery-status]').textContent,/Не удалось/);
 img.decode=()=>Promise.resolve();gallery.querySelector('[data-view="1"]').click();await flush();
 assert.equal(gallery.querySelector('[data-view="1"]').getAttribute('aria-pressed'),'true');dom.window.close();
});
test('Уменьшенное движение отключает наведение, сохраняя выбор кнопкой',async()=>{
 const dom=fixture('line',true);const gallery=dom.window.document.querySelector('[data-look-gallery]');const button=gallery.querySelector('[data-view="1"]');
 pointer(dom.window,button,'pointerenter',{pointerType:'mouse'});await new Promise(resolve=>setTimeout(resolve,140));
 assert.equal(button.getAttribute('aria-pressed'),'false');button.click();await flush();
 assert.equal(button.getAttribute('aria-pressed'),'true');dom.window.close();
});
test('Карточка показывает ракурс по положению мыши и возвращает портрет при уходе',async()=>{
 const dom=fixture('line',false,'obrazy/index.html');const frame=dom.window.document.querySelector('[data-look-preview]');
 frame.getBoundingClientRect=()=>({left:0,width:300});
 pointer(dom.window,frame,'pointermove',{pointerType:'mouse',clientX:260});await new Promise(resolve=>setTimeout(resolve,140));
 assert.match(frame.querySelector('.is-current img').src,/back\.webp$/);
 pointer(dom.window,frame,'pointerleave',{});await flush();
 assert.match(frame.querySelector('.is-current img').src,/line\.webp$/);dom.window.close();
});
