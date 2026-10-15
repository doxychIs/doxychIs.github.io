// Короткая проверка сборки и данных без симуляций исходов боёв.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const directory of ['src','scripts'])for(const name of readdirSync(path.join(root,directory))) {
  if(!/\.(js|mjs)$/.test(name))continue;
  const filename=path.join(root,directory,name);
  const result=spawnSync(process.execPath,['--check',filename],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
  const source=readFileSync(filename,'utf8');
  for(const match of source.matchAll(/from\s*['"](\.\/[^'"]+)['"]/g)) {
    if(!existsSync(path.resolve(path.dirname(filename),match[1])))throw new Error(`Не найден модуль ${match[1]}`);
  }
}
const tests=['economy.test.mjs','platform.test.mjs','release.test.mjs','world.test.mjs'].map(name=>path.join(root,'tests',name));
const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});
process.exit(result.status??1);
