// Локации меняются внутри игры: производство и бой продолжают работать.
export const LOCATIONS = {
  factory:{name:'Солнечный гараж',subtitle:'Здесь начинаются большие идеи',image:'garage',color:'#ffc757',icon:'workshop'},
  robots:{name:'Сборочный ангар',subtitle:'Соберите друга с вашим характером',image:'hangar',color:'#58d2e3',icon:'tool'},
  characters:{name:'Комната команды',subtitle:'Семь знакомых героев. Одна большая мечта',image:'club',color:'#ffad7d',icon:'worker'},
  battles:{name:'Арена мастерских',subtitle:'Дружеские поединки за новые технологии',image:'arena',color:'#9ea7ff',icon:'bolt'},
  achievements:{name:'Сад достижений',subtitle:'Каждый шаг приближает вас к звёздам',image:'garden',color:'#7cdb9d',icon:'check'}
};
export function locationFor(view,era=0) {
  const location=LOCATIONS[view]??LOCATIONS.factory;
  if(era>=5&&['factory','robots'].includes(view))return {...location,name:view==='factory'?'Орбитальная верфь':'Звёздный ангар',image:'space',color:'#acbcff'};
  if(view==='factory'&&era>=1)return {...location,name:['','Мастерская мечты','Большая фабрика','Промышленный квартал','Город изобретателей'][era],image:'hangar',color:'#58d2e3'};
  return location;
}
export class Locations {
  constructor() {this.key='';this.active=0;this.timer=null;this.travelTimer=null;}
  enter(view,era,reduced=false) {
    const place=locationFor(view,era),key=`${view}-${place.image}-${place.name}`;
    document.body.classList.toggle('reduce-motion',reduced);
    if(key===this.key)return;
    const first=!this.key;this.key=key;
    document.body.dataset.location=view;document.body.dataset.era=String(era);
    document.documentElement.style.setProperty('--location-accent',place.color);
    document.getElementById('location-name').textContent=place.name;
    document.getElementById('location-subtitle').textContent=place.subtitle;
    const badge=document.getElementById('location-icon');badge.innerHTML=`<svg class="icon" aria-hidden="true"><use href="#i-${place.icon}"/></svg>`;
    const layers=[...document.querySelectorAll('.world-layer')],next=first?0:1-this.active;
    layers[next].style.backgroundImage=`url('./assets/locations/${place.image}.webp')`;
    layers[next].classList.add('active');
    if(!first)layers[this.active].classList.remove('active');
    this.active=next;
    clearTimeout(this.timer);clearTimeout(this.travelTimer);
    document.body.classList.remove('travelling');
    if(!first&&!reduced&&!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.getElementById('travel-name').textContent=place.name;
      requestAnimationFrame(()=>{document.body.classList.add('travelling');this.travelTimer=setTimeout(()=>document.body.classList.remove('travelling'),620);});
    }
  }
}
