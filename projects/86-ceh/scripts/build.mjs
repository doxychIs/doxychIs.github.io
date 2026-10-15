import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root,'dist');
const yandex = process.argv.includes('--yandex');
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
for (const name of ['index.html','styles.css','expansion.css','game.css','focus.css','src','assets']) await cp(path.join(root,name),path.join(destination,name),{recursive:true});
if(yandex) {
  const filename=path.join(destination,'index.html');
  const html=await readFile(filename,'utf8');
  await writeFile(filename,html.replace('name="yandex-games" content="disabled"','name="yandex-games" content="enabled"'));
}
console.log(`Готово. Файлы для ${yandex?'Яндекс Игр':'обычного хостинга'} находятся в dist/.\nindex.html должен находиться в корне загружаемого архива.`);
