import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const files=readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.html'));
const mount='/tish';
const cache=new Map();
function html(path){if(!cache.has(path)){cache.set(path,new JSDOM(readFileSync(path,'utf8')).window.document);}return cache.get(path);}
function target(path){const candidate=resolve(root,'.'+(path.startsWith(mount+'/') ? path.slice(mount.length) : path));return existsSync(candidate)&&!path.endsWith('/')?candidate:resolve(candidate,'index.html');}
for(const file of files)test(`Структура, ссылки и ресурсы: ${file}`,()=>{
 const current=resolve(root,file);const doc=html(current);
 assert.equal(doc.documentElement.lang,'ru');assert.equal(doc.querySelectorAll('h1').length,1);
 assert.ok(doc.title.length>10);assert.ok(doc.querySelector('meta[name=description]')?.content);
 assert.ok(doc.querySelector('main'));assert.ok(doc.querySelector('a[href="#main"]'));
 const ids=[...doc.querySelectorAll('[id]')].map(e=>e.id);assert.equal(ids.length,new Set(ids).size,'Повторяющиеся id');
 for(const img of doc.querySelectorAll('img')){assert.ok(img.alt,'Пустой alt');assert.ok(img.width>0&&img.height>0,'Нет размера изображения');}
 for(const node of doc.querySelectorAll('a[href],link[href],img[src],script[src]')){
  const raw=node.getAttribute('href')||node.getAttribute('src');if(!raw||/^(https?:|mailto:|tel:|data:)/.test(raw))continue;
  const base='https://example.test/tish/'+file.replace(/index\.html$/,'');const url=new URL(raw,base);const local=target(decodeURIComponent(url.pathname));
  assert.ok(existsSync(local),`${file}: отсутствует ${raw}`);
  if(url.hash){assert.ok(html(local).getElementById(decodeURIComponent(url.hash.slice(1))),`${file}: отсутствует якорь ${raw}`);}
 }
 for(const control of doc.querySelectorAll('input:not([type=hidden]),select,textarea'))assert.ok(control.closest('label')||doc.querySelector(`label[for="${control.id}"]`)||control.getAttribute('aria-label'),'Нет подписи поля');
 for(const form of doc.querySelectorAll('form'))assert.equal(form.getAttribute('onsubmit'),'return false;','Нет защиты от отправки без JS');
});
