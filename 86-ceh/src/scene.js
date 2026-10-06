// Векторная сцена: никаких внешних изображений, запросов или тяжёлых библиотек.
const point = (a, b, z = 0) => [250 + (a - b) * 1.06, 150 + (a + b) * 0.54 - z];
const points = list => list.map(value => point(...value).join(',')).join(' ');
const poly = (list, fill, extra = '') => `<polygon points="${points(list)}" fill="${fill}" ${extra}/>`;
function block(a, b, width, depth, height, color = ['#514943', '#383532', '#272829'], base = 0) {
  return poly([[a,b,base+height],[a+width,b,base+height],[a+width,b+depth,base+height],[a,b+depth,base+height]], color[0])
    + poly([[a,b+depth,base],[a+width,b+depth,base],[a+width,b+depth,base+height],[a,b+depth,base+height]],color[1])
    + poly([[a+width,b,base],[a+width,b+depth,base],[a+width,b+depth,base+height],[a+width,b,base+height]],color[2]);
}
const line = (from, to, stroke = '#78716b', width = 1, extra = '') => `<line x1="${point(...from)[0]}" y1="${point(...from)[1]}" x2="${point(...to)[0]}" y2="${point(...to)[1]}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
function windows(a,b,width,z,rows=1) {
  let svg = '';
  for (let row=0;row<rows;row++) for (let x=0;x<width;x+=17) svg += poly([[a+x,b,z+row*24],[a+x+10,b,z+row*24],[a+x+10,b,z+13+row*24],[a+x,b,z+13+row*24]], '#efa357', 'class="lit-window"');
  return svg;
}
function chimney(a,b,height) {
  return block(a,b,13,13,height,['#7b7771','#54534e','#424441'])
    + block(a-2,b-2,17,17,6,['#8f8980','#63615a','#494a43'],height-6)
    + `<circle class="smoke smoke-1" cx="${point(a+7,b+7,height+12)[0]}" cy="${point(a+7,b+7,height+12)[1]}" r="8" fill="#8b8880"/>
    <circle class="smoke smoke-2" cx="${point(a+7,b+7,height+28)[0]}" cy="${point(a+7,b+7,height+28)[1]}" r="12" fill="#8b8880"/>`;
}

function garage(stage) {
  let svg = '';
  if (stage > 0) svg += block(75,-15,65,70,65,['#6c5b4e','#514438','#393834']) + windows(80,55,50,18,1) + chimney(110,0,104);
  svg += block(-30,-15,120,88,82,['#5e584f','#43413c','#313330']);
  // Двускатная крыша, отливы и металлические панели.
  svg += poly([[-36,-20,82],[96,-20,82],[96,29,113],[-36,29,113]],'#68645a')
    + poly([[-36,29,113],[96,29,113],[96,80,82],[-36,80,82]],'#81715f');
  for(let a=-26;a<96;a+=12) svg += line([a,29,113],[a,80,82],'#62594e',1.4);
  svg += line([-36,29,113],[96,29,113],'#a19a88',2);
  // Ворота, освещённый верстак, окно и вывеска.
  svg += poly([[-6,73.2,4],[59,73.2,4],[59,73.2,62],[-6,73.2,62]],'#201f1c')
    + poly([[-1,73.4,5],[55,73.4,5],[55,73.4,54],[-1,73.4,54]],'url(#warm-door)');
  svg += block(4,74,40,15,18,['#a57a4d','#725337','#57432f']);
  svg += poly([[65,73.4,33],[81,73.4,33],[81,73.4,55],[65,73.4,55]],'#e6a25a')
    + line([73,73.5,33],[73,73.5,55],'#3f3d35',2)
    + line([65,73.5,44],[81,73.5,44],'#3f3d35',2);
  svg += poly([[-22,73.5,59],[-6,73.5,59],[-6,73.5,72],[-22,73.5,72]],'#ed9947');
  const sign = point(-20,73.7,64);
  svg += `<text x="${sign[0]}" y="${sign[1]}" fill="#32251a" font-size="7" font-weight="700" transform="rotate(27 ${sign[0]} ${sign[1]})">ЦЕХ</text>`;
  svg += block(95,91,20,20,22,['#a37648','#775233','#5b422e']) + block(117,91,16,17,15,['#b48550','#7f5b38','#65492c']);
  svg += block(-47,80,11,15,18,['#847c68','#6c644f','#4e4a3e']);
  return svg;
}

function factory(stage) {
  let svg = block(-40,-20,150,95,83,['#615e55','#45483f','#333831']);
  svg += block(-40,-20,150,95,7,['#88816c','#5f5a4c','#474c40'],83);
  svg += windows(-30,75.5,125,30,2) + chimney(25,-5,144) + chimney(60,-5,124);
  svg += block(112,5,34,64,48,['#7c6b50','#554b39','#3d4031']);
  svg += poly([[-20,75.7,0],[13,75.7,0],[13,75.7,26],[-20,75.7,26]],'#252923');
  if(stage>2) svg += block(-32,90,75,44,48,['#666454','#4c5040','#373e31']) + windows(-24,134.5,56,13,1) + block(65,94,57,35,29,['#7a6d4d','#5b513a','#414531']);
  return svg;
}

function city() {
  let svg='';
  for(const [a,b,w,d,h] of [[-35,-25,38,38,100],[22,-25,34,34,135],[76,-18,37,35,115],[-33,35,38,38,62],[28,38,32,34,96],[85,40,32,32,74]]) {
    svg += block(a,b,w,d,h,['#68766f','#485c52','#31443d']) + windows(a+5,b+d+.3,w-9,14,Math.floor(h/27));
  }
  return svg;
}

function space(stage) {
  if(stage===5) return `<circle cx="260" cy="179" r="103" fill="url(#planet-light)"/><ellipse cx="260" cy="179" rx="150" ry="35" fill="none" stroke="#86a38b" stroke-width="9" opacity=".2" transform="rotate(-23 260 179)"/><path d="M188 110 217 126 216 154 237 167 253 149 278 161 271 186 289 205 285 248 309 263 338 215 333 183 343 163 321 145 307 115 278 112 255 87 217 96Z" fill="#769b7d" opacity=".7"/><path d="M172 179 192 169 217 192 208 211 226 235 216 260 194 247 179 216Z" fill="#688b73"/><circle cx="217" cy="138" r="4" fill="#ffc27b" class="lit-window"/><circle cx="309" cy="196" r="4" fill="#ffc27b" class="lit-window"/><circle cx="226" cy="213" r="3" fill="#ffc27b" class="lit-window"/>`;
  return `<circle cx="390" cy="91" r="40" fill="url(#planet-light)" opacity=".55"/><g transform="translate(0 70)">${block(-28,4,85,65,30,['#b2b5ae','#727d7a','#515e5e'],80)}${block(-10,22,50,32,32,['#d3bba0','#a7865b','#646c64'],110)}${block(-100,14,60,64,6,['#416d84','#294454','#1d3546'],81)}${block(80,14,60,64,6,['#416d84','#294454','#1d3546'],81)}${windows(-5,54.4,43,123,1)}${line([14,26,142],[14,26,187],'#acb8b2',3)}${line([14,26,186],[40,22,192],'#f3b76c',2)}</g><ellipse cx="259" cy="185" rx="171" ry="89" fill="none" stroke="#87a398" stroke-width="1" stroke-dasharray="5 10" transform="rotate(-14 259 185)"/>`;
}

export function renderScene(stage) {
  let grid = '';
  for (let i=-45;i<170;i+=25) grid += line([i,-45,1],[i,145,1],'#454b40',.8) + line([-55,i,1],[155,i,1],'#454b40',.8);
  const ground = stage<5 ? `<ellipse cx="260" cy="292" rx="196" ry="35" fill="#030605" opacity=".3"/>${block(-55,-45,210,190,9,['#363d32','#272f26','#202920'],-9)}${grid}${line([-55,144,2],[155,144,2],'#939068',3)}` : '';
  const details = stage<5 ? `<g>${block(-31,112,44,17,7,['#b8a37b','#746748','#57583e'])}${line([-23,112,8],[-23,129,8],'#393e2e',3)}${line([-8,112,8],[-8,129,8],'#393e2e',3)}${block(138,73,5,5,68,['#898e79','#666e59','#4b5442'])}${line([142,76,69],[157,76,69],'#b5b794',3)}</g>` : '';
  return `<svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${['Гараж с освещённым верстаком','Мастерская и новые цеха','Завод с трубами и освещёнными окнами','Большой промышленный комплекс','Город с высотными производствами','Планета с промышленными центрами','Орбитальная производственная станция'][stage]}"><defs><linearGradient id="warm-door" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f1aa61"/><stop offset="1" stop-color="#78512f"/></linearGradient><radialGradient id="planet-light" cx=".28" cy=".25" r=".8"><stop stop-color="#aac4a7"/><stop offset=".5" stop-color="#4f7466"/><stop offset="1" stop-color="#172b2b"/></radialGradient><filter id="scene-shadow"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity=".25"/></filter></defs><g filter="url(#scene-shadow)">${ground}${stage<2?garage(stage):stage<4?factory(stage):stage===4?city():space(stage)}${details}</g></svg>`;
}
