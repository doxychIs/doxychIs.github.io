import { Locations } from './locations.js';
import { CONFIG } from './config.js';
import { EXPANSION, RARITIES, SLOTS, ERAS, PART_MODELS, MODEL_NAMES, CHARACTERS, EGGS, OPPONENTS, SHOP, ACHIEVEMENTS, QUESTS, blueprintName } from './expansion-config.js';
import { eraIndex, robotComplete, robotName, activeSets, partDefinition, characterBonuses, characterFactor } from './selectors.js';
import { robotStats, partStats } from './robot.js';
import { robotSvg, partIcon, characterPortrait } from './robot-view.js';
import { enemyPower } from './battle.js';
import { enhancementCost, craftCost, bossRecipeEra, researchCost, dropChance, robotUpgradeCost, currentQuest, prestigeGain } from './expansion.js';
import { money, count, formatNumber, duration } from './format.js';

const $=id=>document.getElementById(id);
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const setText=(element,value)=>{if(element&&element.textContent!==value)element.textContent=value;};
const costText=cost=>Object.entries(cost).map(([key,value])=>key==='money'?money(value):`${count(value)} ${EXPANSION.resourceNames[key].toLowerCase()}`).join(' · ');
const disabled=flag=>flag?'disabled':'';
const rarityBadge=part=>`<span class="rarity-badge" style="--rarity:${RARITIES[part.rarity].color}">${RARITIES[part.rarity].name}${part.level?` +${part.level}`:''}</span>`;
const statNames={health:'Здоровье',attack:'Атака',defense:'Защита',speed:'Скорость',crit:'Шанс крита'};

export class ExpansionUI {
  constructor(actions,base) {
    this.actions=actions;this.base=base;this.view='factory';this.filter='all';this.selected=null;this.arenaEra=null;
    this.workshopKey='';this.characterKey='';this.opponentKey='';this.achievementKey='';this.battleKey='';this.detailKey='';
    this.locations=new Locations();this.reveals=[];this.paused=false;this.state=null;this.build();this.bind();
  }
  build() {
    $('robots-view').innerHTML=`<div class="section-heading"><div><span class="eyebrow">ДЕТАЛИ → РОБОТ → ПОБЕДЫ → СИЛЬНЫЙ ЦЕХ</span><h2>Робомастерская</h2><p>Соберите своего друга. Каждая деталь меняет его вид и возможности.</p></div><button class="secondary-button" data-op="auto">${icon('tool')} Собрать автоматически</button></div>
      <div class="robot-workbench panel"><div class="robot-preview"><div class="robot-name"><span id="robot-era-label"></span><h3 id="robot-name"></h3></div><div id="robot-preview-art"></div><div class="robot-power">${icon('bolt')}<strong id="robot-power">0</strong><span>мощность</span></div><button class="secondary-button full-width" data-op="robotUpgrade" id="robot-level-button">Настроить робота</button><small class="robot-upgrade-cost" id="robot-upgrade-cost"></small></div><div class="module-area"><div class="module-heading"><h3>Шесть модулей. Ваш характер.</h3><span id="robot-completeness">0 / 6</span></div><div class="module-slots" id="module-slots"></div><details class="robot-stat-details"><summary>Характеристики и комплект</summary><div class="robot-basic-stats" id="robot-basic-stats"></div><div class="set-bonus" id="set-bonus"></div></details><div class="part-detail" id="part-detail"></div></div></div>
      <div class="workshop-bottom"><details class="workshop-drawer inventory-drawer"><summary>${icon('tool')} Склад деталей</summary><section class="inventory-panel panel"><div class="inventory-heading"><h3>Склад деталей <span id="inventory-count">0</span></h3><select id="part-filter" aria-label="Фильтр по модулю"><option value="all">Все модули</option>${SLOTS.map(slot=>`<option value="${slot.id}">${slot.name}</option>`).join('')}</select></div><details class="small-details"><summary>Как находить детали?</summary><p class="inventory-hint" id="drop-hint"></p></details><div class="inventory-grid" id="inventory-grid"></div></section></details><details class="workshop-drawer craft-drawer"><summary>${icon('machine')} Создать деталь</summary><section class="craft-panel panel"><span class="eyebrow">СДЕЛАНО ВАМИ</span><h3>Крафт по заказу</h3><p>Детали доступны без персонажей. Создайте именно тот модуль, которого не хватает.</p><label for="craft-slot">Какой модуль?</label><select id="craft-slot">${SLOTS.map(slot=>`<option value="${slot.id}">${slot.name}</option>`).join('')}</select><label for="craft-model">Форма детали</label><select id="craft-model"></select><label for="craft-quality">Технология сборки</label><select id="craft-quality"><option value="basic">Базовая · обычная деталь</option><option value="rare">Точная · редкая деталь</option><option value="mythical">Звёздная · мифическая деталь</option><option value="boss">Особое ядро · легендарное</option></select><div class="craft-recipe" id="craft-recipe"></div><button class="primary-button full-width" data-op="craft" id="craft-button">Создать компонент</button><div class="craft-note">Три одинаковые свободные детали можно объединить в более редкую. Лишние детали дают металлолом при разборке.</div><details class="blueprints"><summary>Ваши чертежи</summary><div id="blueprint-list"></div></details><div class="timed-crate"><h4>Посылка для мастерской</h4><p>Бесплатный ящик каждые 3 минуты.</p><button class="secondary-button full-width" data-op="bonus" id="bonus-button">Готовится</button></div></section></details></div>`;
    $('characters-view').innerHTML=`<div class="section-heading"><div><span class="eyebrow">ГЕРОИ «ВОСЕМЬДЕСЯТИ ШЕСТИ»</span><h2>Ваша команда</h2><p>Пилот и инженер сохраняют бонусы к цехам и нажатиям, а в бою помогают роботу.</p></div></div><div class="crew-summary panel" id="crew-summary"></div><div class="egg-list" id="egg-list"></div><div class="character-grid" id="character-grid"></div>`;
    $('battles-view').innerHTML=`<div class="section-heading"><div><span class="eyebrow">ТУРНИР ИЗОБРЕТАТЕЛЕЙ</span><h2>Арена мастерских</h2><p>Соседние мастерские уже ждут вашего робота! Вы выбираете момент для щита и перегрузки.</p></div><label class="arena-label">Эпоха <select id="arena-era" aria-label="Эпоха соперников"></select></label></div><div class="battle-arena panel" id="battle-arena" hidden><div class="battle-heading"><span id="battle-name"></span><strong id="battle-time">20 сек</strong></div><div id="boss-health" hidden><span id="boss-name"></span><div class="hp-track boss-hp"><span id="boss-hp-fill"></span></div></div><div class="fighters"><div class="fighter player-fighter"><div class="fighter-label">Ваш робот <strong id="player-hp-label"></strong></div><div class="hp-track"><span id="player-hp-fill"></span></div><div id="battle-player-art"></div><div class="shield-indicator" id="shield-indicator"></div></div><div class="versus-mark">×</div><div class="fighter enemy-fighter"><div class="fighter-label">Соперник <strong id="enemy-hp-label"></strong></div><div class="hp-track enemy-hp"><span id="enemy-hp-fill"></span></div><div id="battle-enemy-art"></div></div></div><div class="battle-effects" id="battle-effects" aria-hidden="true"></div><div class="boss-intro" id="boss-intro" hidden><span>НА АРЕНЕ — БОСС</span><strong id="boss-intro-name"></strong></div><div class="battle-controls"><button class="ability-button" data-op="ability" data-id="shield" id="ability-shield">${icon('planet')}<span>Щит<small>Защищает от сильного удара</small></span></button><button class="ability-button overload" data-op="ability" data-id="overload" id="ability-overload">${icon('bolt')}<span>Перегрузка<small>Удар и усиление атаки</small></span></button></div></div><div class="opponents-grid" id="opponents-grid"></div><details class="workshop-drawer shop-drawer"><summary>${icon('workshop')} Магазин наград</summary><section class="battle-shop panel"><div class="inventory-heading"><div><span class="eyebrow">НАГРАДЫ РАБОТАЮТ ВО ВСЕЙ ИМПЕРИИ</span><h3>Магазин боёв</h3></div><label>Модуль награды<select id="shop-slot" aria-label="Модуль награды">${SLOTS.map(slot=>`<option value="${slot.id}" ${slot.id==='core'?'selected':''}>${slot.name}</option>`).join('')}</select></label></div><div class="shop-grid" id="shop-grid"></div></section></details>`;
    $('achievements-view').innerHTML=`<div class="section-heading"><div><span class="eyebrow">У КАЖДОЙ НАХОДКИ ЕСТЬ ИСТОРИЯ</span><h2>Путь героя</h2><p>Награды заданий и достижений выдаются автоматически и только один раз.</p></div></div><h3 class="group-heading">Первые шаги</h3><div class="achievement-grid" id="quest-grid"></div><h3 class="group-heading">Достижения</h3><div class="achievement-grid" id="achievement-grid"></div>`;
  }
  bind() {
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>this.showView(button.dataset.view)));
    const delegate=event=>{
      const help=event.target.closest('[data-help]');if(help){this.base.openHelp(help.dataset.help);return;}
      const view=event.target.closest('[data-view-target]');if(view){this.showView(view.dataset.viewTarget);return;}
      const filter=event.target.closest('[data-slot-filter]');if(filter){this.filter=filter.dataset.slotFilter;$('part-filter').value=this.filter;this.workshopKey='';this.render(this.state,this.paused);$('inventory-grid').closest('details').open=true;$('inventory-grid').scrollIntoView({behavior:this.state.settings.reducedMotion?'auto':'smooth',block:'nearest'});return;}
      const select=event.target.closest('[data-select-part]');if(select){this.selected=select.dataset.selectPart;this.detailKey='';this.render(this.state,this.paused);return;}
      const button=event.target.closest('[data-op]');if(!button||button.disabled)return;
      if(button.dataset.op==='prestige'){this.actions.prestigePrompt();return;}
      const options={id:button.dataset.id,role:button.dataset.role,slot:$('craft-slot').value,quality:$('craft-quality').value,model:$('craft-model').value,shopSlot:$('shop-slot').value};
      this.actions.perform(button.dataset.op,options);
    };
    $('expansion-panels').addEventListener('click',delegate);$('resource-strip').addEventListener('click',delegate);$('connected-quest').addEventListener('click',delegate);
    $('industrial-research').addEventListener('click',delegate);$('prestige-card').addEventListener('click',delegate);
    $('robot-companion').addEventListener('click',delegate);
    $('part-filter').addEventListener('change',event=>{this.filter=event.target.value;this.workshopKey='';this.render(this.state,this.paused);});
    for(const id of ['craft-slot','craft-quality','craft-model'])$(id).addEventListener('change',()=>this.renderCraft(this.state));
    $('arena-era').addEventListener('change',event=>{this.arenaEra=Number(event.target.value);this.opponentKey='';this.render(this.state,this.paused);});
    $('reveal-close').addEventListener('click',()=>$('reveal-dialog').close());
    $('reveal-dialog').addEventListener('close',()=>{this.actions.modalClosed?.();setTimeout(()=>this.nextReveal(),20);});
    $('prestige-cancel').addEventListener('click',()=>$('prestige-dialog').close());
    $('prestige-confirm').addEventListener('click',()=>{this.actions.perform('prestige',{});$('prestige-dialog').close();});
  }
  showView(view) {
    if(view!=='factory'&&!this.state.progress.unlocked) {this.base.toast(`Робомастерская откроется после ${EXPANSION.unlockClicks} нажатий или ${EXPANSION.unlockEarned} заработанных DOX.`);return;}
    for(const id of ['management-dialog','progress-dialog','help-dialog'])if($(id).open)$(id).close();
    this.view=view;
    for(const item of ['factory','robots','characters','battles','achievements'])$(`${item}-view`).hidden=item!==view;
    document.querySelectorAll('[data-view]').forEach(button=>{const selected=button.dataset.view===view;button.classList.toggle('selected',selected);button.setAttribute('aria-current',selected?'page':'false');});
    this.render(this.state,this.paused);
    if(!this.state.progress.tutorialSeen.includes(view)&&view!=='factory') {
      this.state.progress.tutorialSeen.push(view);
      const tutorials={robots:['Ваш личный робот','Нажмите «Собрать автоматически», затем пробуйте менять модули. Четыре детали одного набора дают особый эффект и бонус цехам.'],characters:['Команда помогает везде','Откройте подарочное яйцо. Назначьте помощника пилотом или инженером: обычные бонусы сохранятся, а шанс найти деталь при нажатии вырастет.'],battles:['Поединок за новые технологии','Робот атакует сам. Щит помогает пережить сильный удар, перегрузка усиливает удары. Жетоны и шестерни возвращаются в производство.'],achievements:['Награды за ваши открытия','Задания дают надёжные источники деталей и материалов. Полученные награды отмечаются автоматически.']};
      const [title,text]=tutorials[view];this.present([{type:'tutorial',title,text}]);
    }
  }
  render(state,paused=false) {
    this.state=state;this.paused=paused;const era=eraIndex(state),stats=robotStats(state);
    this.locations.enter(this.view,era,state.settings.reducedMotion);
    setText($('inventory-indicator'),String(state.inventory.length));
    this.renderResources(state);this.renderConnectedQuest(state);this.renderResearch(state);
    if(this.view==='factory')this.renderCompanion(state,stats);
    if(this.view==='robots')this.renderWorkshop(state,stats);
    if(this.view==='characters')this.renderCharacters(state);
    if(this.view==='battles')this.renderOpponents(state,stats);
    if(this.view==='achievements')this.renderAchievements(state);
    if(state.activeBattle)this.renderBattle(state);
    if(this.view==='robots')this.renderCraft(state);
    const remaining=Math.max(0,EXPANSION.crates.bonusMs-(Date.now()-state.bonusAt));
    $('bonus-button').disabled=paused||remaining>0;setText($('bonus-button'),remaining>0?`Через ${duration(Math.ceil(remaining/1000))}`:'Забрать бесплатный ящик');
  }
  renderCompanion(state,stats) {
    const complete=robotComplete(state),unlocked=state.progress.unlocked;
    const key=JSON.stringify([state.robot,state.inventory,eraIndex(state),stats.power,unlocked,this.paused]);
    if(key===this.companionKey)return;this.companionKey=key;
    const preview=unlocked?state:{...state,
      inventory:SLOTS.map(slot=>({uid:`preview-${slot.id}`,definition:`era0-${slot.id}`,rarity:0,level:0})),
      robot:{...state.robot,slots:Object.fromEntries(SLOTS.map(slot=>[slot.id,`preview-${slot.id}`]))}
    };
    $('robot-companion').innerHTML=`<div class="companion-art">${robotSvg(preview,{namespace:'companion'})}</div>`;
  }

  renderResources(state) {
    $('resource-strip').hidden=!state.progress.unlocked||this.view==='factory';
    const keys=this.view==='characters'?['crystals','fragments']:this.view==='battles'?['tokens','gears']:['scrap','gears'];
    if(this.view==='robots'&&eraIndex(state)>=5)keys.push('dust');
    const html=keys.map(key=>`<span class="resource-pill" title="${EXPANSION.resourceNames[key]}">${icon(key==='scrap'?'tool':key==='tokens'?'bolt':'planet')}<span>${EXPANSION.resourceNames[key]}</span><strong>${count(Math.floor(state.resources[key]))}</strong></span>`).join('')+`<button class="crate-button" data-op="crate" ${disabled(this.paused||state.crates<1)}>${icon('workshop')} Ящики <b>${count(state.crates)}</b></button>`;
    if($('resource-strip').innerHTML!==html)$('resource-strip').innerHTML=html;
  }
  renderConnectedQuest(state) {
    let title,text,target;
    if(state.activeBattle?.status==='running') {title=`Идёт бой: ${OPPONENTS.find(enemy=>enemy.id===state.activeBattle.opponent).name}`;text='Робот сражается, а производство продолжает работать. Вернитесь на арену, чтобы применить умения.';target='battles';}
    else if(!state.progress.unlocked) {title='Первый секрет гаража';text=`${Math.min(state.clicks,EXPANSION.unlockClicks)} / ${EXPANSION.unlockClicks} нажатий — и получите шесть деталей для первого робота.`;target='factory';}
    else {
      const quest=currentQuest(state),era=eraIndex(state),next=CONFIG.stages[era+1];
      if(quest) {title=quest.name;text=quest.description;target=quest.id==='pilot'?'characters':quest.id==='boost'?'factory':quest.id==='battle'||quest.id==='boss'?'battles':'robots';}
      else if(next) {title=`Следующая цель: ${next.name}`;text=`Заработайте ${money(next.threshold)} и победите ${OPPONENTS.find(enemy=>enemy.id===next.boss).name}.`;target='battles';}
      else {title='Звёздная империя работает';text='Развивайте команду, собирайте мифические модули и начните новый цикл с ядрами DOX.';target='robots';}
    }
    const html=`<div class="quest-marker">${icon('bolt')}</div><div><strong>${title}</strong><p>${text}</p></div><button data-view-target="${target}" class="quest-link" aria-label="Перейти к заданию">${icon('arrow')}</button>`;
    if($('connected-quest').innerHTML!==html)$('connected-quest').innerHTML=html;
  }
  renderResearch(state) {
    $('industrial-research').hidden=!state.progress.unlocked;
    const cost=researchCost(state);
    const html=`<div><span class="eyebrow">ЗОЛОТЫЕ ШЕСТЕРНИ ИЗ БОЁВ → МОЩНЕЕ ЦЕХ</span><h3>Промышленное исследование · ${state.research}</h3><p>Каждый уровень добавляет 12% к базовому множителю всего пассивного производства.</p><small>${costText(cost)}</small></div><button class="primary-button" data-op="research" ${disabled(this.paused||state.research>=EXPANSION.research.max)}>Исследовать</button>`;
    if($('industrial-research').innerHTML!==html)$('industrial-research').innerHTML=html;
    const gain=prestigeGain(state);
    $('prestige-card').hidden=eraIndex(state)<3&&state.resources.cores===0;
    const prestige=`<h3>Новый промышленный цикл</h3><p>Ядра DOX: ${count(state.resources.cores)} · постоянный бонус ${Math.round(state.resources.cores*EXPANSION.prestige.bonus*100)}%. Команда и детали сохраняются.</p><button class="secondary-button" data-op="prestige" ${disabled(this.paused||gain<1)}>Начать цикл · +${count(gain)} ядер</button>`;
    if($('prestige-card').innerHTML!==prestige)$('prestige-card').innerHTML=prestige;
  }
  renderWorkshop(state,stats) {
    const era=eraIndex(state),fighting=state.activeBattle?.status==='running';
    const key=JSON.stringify([state.inventory,state.robot,this.filter]);
    if(key!==this.workshopKey) {
      this.workshopKey=key;
      setText($('robot-name'),robotName(state));setText($('robot-era-label'),ERAS[era].material);
      $('robot-preview-art').innerHTML=robotSvg(state,{namespace:'workshop'});
      $('module-slots').innerHTML=SLOTS.map(slot=>{
        const part=state.inventory.find(item=>item.uid===state.robot.slots[slot.id]);
        return `<button class="module-slot ${part?'filled':''}" data-slot-filter="${slot.id}" style="--rarity:${part?RARITIES[part.rarity].color:'#6b7e75'}"><span>${slot.name}</span>${part?partIcon(part):icon(slot.icon)}<strong>${part?partDefinition(part).name:'Пустой слот'}</strong>${part?rarityBadge(part):'<small>Выберите деталь</small>'}</button>`;
      }).join('');
      setText($('robot-completeness'),`${Object.values(state.robot.slots).filter(Boolean).length} / 6`);
      const sets=activeSets(state);$('set-bonus').innerHTML=sets.length?sets.map(index=>`<strong>${ERAS[index].name}</strong><span>${ERAS[index].setText}</span>`).join(''):'<strong>Соберите комплект</strong><span>Четыре модуля одного набора дают боевой эффект и усиливают пассивный доход.</span>';
      setText($('inventory-count'),`${state.inventory.length} / ${EXPANSION.inventoryLimit}`);
      const inventory=state.inventory.filter(part=>this.filter==='all'||partDefinition(part).slot===this.filter).sort((a,b)=>b.rarity-a.rarity||partDefinition(b).era-partDefinition(a).era);
      $('inventory-grid').innerHTML=inventory.length?inventory.map(part=>`<button class="inventory-item ${Object.values(state.robot.slots).includes(part.uid)?'equipped':''}" data-select-part="${part.uid}" style="--rarity:${RARITIES[part.rarity].color}">${partIcon(part)}<div><strong>${partDefinition(part).name}</strong>${rarityBadge(part)}<small>${ERAS[partDefinition(part).era].name}${part.locked?' · защищена':''}${Object.values(state.robot.slots).includes(part.uid)?' · установлена':''}</small></div></button>`).join(''):'<p class="empty-state">Здесь пока нет деталей. Создайте нужный модуль в крафте или откройте ящик.</p>';
      this.detailKey='';
    }
    setText($('robot-power'),count(stats.power));
    const statText=`<span>Атака <b>${count(Math.round(stats.attack))}</b></span><span>Здоровье <b>${count(Math.round(stats.health))}</b></span><span>Крит <b>${Math.round(stats.crit*100)}%</b></span>`;
    if($('robot-basic-stats').innerHTML!==statText)$('robot-basic-stats').innerHTML=statText;
    setText($('robot-level-button'),`Настроить · ур. ${state.robot.level} → ${Math.min(EXPANSION.robot.maxLevel,state.robot.level+1)}`);$('robot-level-button').disabled=this.paused||fighting||!robotComplete(state)||state.robot.level>=EXPANSION.robot.maxLevel;
    setText($('robot-upgrade-cost'),state.robot.level>=EXPANSION.robot.maxLevel?'Максимальный уровень':costText(robotUpgradeCost(state)));
    setText($('drop-hint'),`Находка при нажатии: ${(dropChance(state)*100).toFixed(1).replace('.',',')}%. Без находки: ${state.dropPity} / ${EXPANSION.drops.guarantee}. Персонажи повышают шанс.`);
    this.renderDetail(state);
  }
  renderDetail(state) {
    const part=state.inventory.find(item=>item.uid===this.selected),fighting=state.activeBattle?.status==='running';
    const key=JSON.stringify([part,state.robot.slots,this.paused,fighting]);if(key===this.detailKey)return;this.detailKey=key;
    $('part-detail').hidden=!part;
    if(!part){$('part-detail').innerHTML='<p>Выберите компонент на складе, чтобы установить, улучшить, объединить или разобрать его.</p>';return;}
    const def=partDefinition(part),equipped=Object.values(state.robot.slots).includes(part.uid),cost=enhancementCost(part);
    $('part-detail').innerHTML=`<div class="detail-title">${partIcon(part)}<div><h4>${def.name}</h4>${rarityBadge(part)}</div><button class="text-button" data-op="lock" data-id="${part.uid}">${part.locked?'Снять защиту':'Защитить'}</button></div><div class="detail-stats">${Object.entries(partStats(part)).map(([key,value])=>`<span>${statNames[key]} <b>${['crit','speed'].includes(key)?`${Math.round(value*100)}%`:count(Math.round(value))}</b></span>`).join('')}</div><small>Набор: ${ERAS[def.era].name}${def.effect?' · особый эффект: '+({heal:'ремонт',shield:'щит',crit:'крит',pulse:'импульс',loot:'больше добычи',leech:'восстановление',nova:'сверхновая'}[def.effect]??def.effect):''}</small><div class="detail-actions"><button class="primary-button" data-op="equip" data-id="${part.uid}" ${disabled(this.paused||fighting||equipped)}>${equipped?'Установлена':'Установить'}</button><button class="secondary-button" data-op="enhance" data-id="${part.uid}" ${disabled(this.paused||fighting||part.level>=EXPANSION.enhancement.max)}>Улучшить +${part.level+1}</button></div><p class="detail-cost">Улучшение: ${costText(cost)}</p><div class="detail-secondary"><button class="text-button" data-op="merge" data-id="${part.uid}" ${disabled(this.paused||fighting||equipped||part.locked||part.rarity>=5)}>Объединить 3 → 1</button><button class="text-button" data-op="dismantle" data-id="${part.uid}" ${disabled(this.paused||fighting||equipped||part.locked)}>Разобрать → металл</button></div>`;
  }
  renderCraft(state) {
    const quality=$('craft-quality').value,era=eraIndex(state),cost=craftCost(state,quality);
    if(quality==='boss')$('craft-slot').value='core';$('craft-slot').disabled=quality==='boss';
    const slot=$('craft-slot').value,chosen=$('craft-model').value||'box',modelKey=slot+'-'+era;
    if(this.modelKey!==modelKey) {this.modelKey=modelKey;$('craft-model').innerHTML=PART_MODELS.map(model=>`<option value="${model.id}">${MODEL_NAMES[slot][model.id].split(' / ')[era===0?0:1]}</option>`).join('');$('craft-model').value=chosen;}
    $('craft-model').disabled=quality==='boss';
    const allowed=quality==='basic'||quality==='rare'&&state.blueprints.includes(`precision-${era}`)||quality==='mythical'&&era>=5&&state.blueprints.includes('stellar')||quality==='boss'&&bossRecipeEra(state)>=0;
    const text=allowed?`${quality==='boss'?blueprintName(`boss-core-${bossRecipeEra(state)}`)+' · ':''}${costText(cost)}`:quality==='boss'?'Нужен чертёж особого ядра. Его даёт первая победа над боссом.':quality==='rare'?'Нужен чертёж точной сборки: босс эпохи или магазин боёв.':'Нужен звёздный чертёж планетарного босса и звёздная пыль.';
    setText($('craft-recipe'),text);$('craft-button').disabled=this.paused||state.activeBattle?.status==='running'||!allowed;
    const html=state.blueprints.length?state.blueprints.map(id=>`<span>${icon('check')}${blueprintName(id)}</span>`).join(''):'<p>Побеждайте боссов, выполняйте задания или посетите магазин боёв.</p>';
    if($('blueprint-list').innerHTML!==html)$('blueprint-list').innerHTML=html;
  }
  renderCharacters(state) {
    const key=JSON.stringify([state.characters,state.activeBattle?.status,this.paused,eraIndex(state)]);
    const bonus=characterBonuses(state);
    const summary=`<div><strong>Пилот</strong><span>${CHARACTERS.find(item=>item.id===state.characters.pilot)?.name??'Ещё не назначен'}</span></div><div><strong>Инженер</strong><span>${CHARACTERS.find(item=>item.id===state.characters.engineer)?.name??'Ещё не назначен'}</span></div><p>Цехи +${Math.round(bonus.factory*100)}% · нажатия +${Math.round(bonus.click*100)}% · находка деталей +${(bonus.drop*100).toFixed(1).replace('.',',')}%</p>`;
    if($('crew-summary').innerHTML!==summary)$('crew-summary').innerHTML=summary;
    if(key===this.characterKey)return;this.characterKey=key;
    $('egg-list').innerHTML=EGGS.map(egg=>`<article class="egg-card panel" style="--egg:${egg.color}"><div class="egg-shape">${icon('bolt')}</div><h3>${egg.name}</h3><p>${egg.currency==='money'?money(egg.price):`${egg.price} кристаллов DOX`}</p><div class="egg-actions"><button class="secondary-button" data-op="buyEgg" data-id="${egg.id}" ${disabled(this.paused||eraIndex(state)<egg.era)}>Купить</button><button class="primary-button" data-op="openEgg" data-id="${egg.id}" ${disabled(this.paused||state.characters.eggs[egg.id]<1)}>Открыть · ${state.characters.eggs[egg.id]}</button></div>${eraIndex(state)<egg.era?`<small>Нужна эпоха: ${CONFIG.stages[egg.era].name}</small>`:''}</article>`).join('');
    const owned=CHARACTERS;
    $('character-grid').innerHTML=owned.length?owned.map(character=>{
      const item=state.characters.owned[character.id];
      if(!item)return `<article class="character-card panel undiscovered" style="--rarity:${RARITIES[character.rarity].color}"><div class="character-top">${characterPortrait(character)}<div><span class="rarity-badge">${RARITIES[character.rarity].name}</span><h3>${character.name}</h3><p>${character.role}</p></div></div><p class="collection-hint">Этот герой ещё не в команде. Открывайте яйца: помощники усиливают производство и робота.</p><span class="character-locked">Ждёт знакомства</span></article>`;
      const pilot=state.characters.pilot===character.id,engineer=state.characters.engineer===character.id,fighting=state.activeBattle?.status==='running';
      const factor=characterFactor(item);
      const secondary={speed:'Скорость атаки',shield:'Сильнее щиты',crit:'Шанс критического удара',loot:'Больше добычи',attack:'Сильнее атака'}[character.combat];
      return `<article class="character-card panel" style="--rarity:${RARITIES[character.rarity].color}"><div class="character-top">${characterPortrait(character)}<div><span class="rarity-badge">${RARITIES[character.rarity].name}</span><h3>${character.name}</h3><p>${character.role}</p><small>Уровень ${item.level} · развитие ${item.rank} / ${EXPANSION.characters.maxRank}</small></div></div><details class="character-more"><summary>Бонусы и развитие</summary><p class="character-bonuses">Цехи +${Math.round(character.factory*factor*100)}% · нажатия +${Math.round(character.click*factor*100)}%<br>${secondary} +${Math.round(character.value*factor*100)}%<br>Находка детали +${(character.drop*factor*100).toFixed(1).replace('.',',')}%${character.quality?' · выше качество деталей':''}</p><div class="xp-track"><span style="width:${Math.min(100,item.xp/(EXPANSION.characters.xpBase*item.level)*100)}%"></span></div><small>Опыт из боёв: ${count(item.xp)} / ${count(EXPANSION.characters.xpBase*item.level)}</small><button class="text-button" data-op="rank" data-id="${character.id}" ${disabled(this.paused||fighting||item.rank>=EXPANSION.characters.maxRank)}>Развить · ${EXPANSION.characters.shards*(item.rank+1)} фрагм. + ${EXPANSION.characters.rankGears*(item.rank+1)} шестерн. + ${EXPANSION.characters.rankCoins*(item.rank+1)} DOX</button></details><div class="character-roles"><button class="secondary-button ${pilot?'assigned':''}" data-op="assign" data-id="${character.id}" data-role="pilot" ${disabled(this.paused||fighting)}>${pilot?'✓ Пилот':'В пилоты'}</button><button class="secondary-button ${engineer?'assigned':''}" data-op="assign" data-id="${character.id}" data-role="engineer" ${disabled(this.paused||fighting)}>${engineer?'✓ Инженер':'В инженеры'}</button></div></article>`;
    }).join(''):'<p class="empty-state panel">За первого робота вы получите бесплатное яйцо. Откройте его и назначьте помощника — но детали можно добывать и без команды.</p>';
  }
  renderOpponents(state,stats) {
    const era=eraIndex(state),selected=this.arenaEra===null?era:Math.min(era,this.arenaEra),fighting=state.activeBattle?.status==='running';
    const options=CONFIG.stages.slice(0,era+1).map((stage,index)=>`<option value="${index}" ${index===selected?'selected':''}>${stage.name}</option>`).join('');
    if($('arena-era').innerHTML!==options)$('arena-era').innerHTML=options;
    const key=JSON.stringify([era,selected,state.progress.victories,stats.power,this.paused,fighting,state.progress.shop]);if(key===this.opponentKey)return;this.opponentKey=key;
    $('opponents-grid').innerHTML=OPPONENTS.filter(enemy=>enemy.era===selected).map(enemy=>`<article class="opponent-card panel ${enemy.boss?'boss-card':''}"><div class="opponent-top"><span>${enemy.boss?'БОСС ЭПОХИ':'СОПЕРНИК'}</span><strong>${count(enemyPower(enemy))} ${icon('bolt')}</strong></div><div class="opponent-art">${robotSvg(state,{enemy,namespace:enemy.id})}</div><h3>${enemy.name}</h3><details class="opponent-more"><summary>Соперник и награды</summary><p>${enemy.description}</p><div class="opponent-rewards">${enemy.rewards.tokens} жетонов · ${enemy.rewards.gears} шестерён · деталь${enemy.boss?' + чертёж':''}</div></details><button class="${enemy.boss?'primary':'secondary'}-button full-width" data-op="battle" data-id="${enemy.id}" ${disabled(this.paused||fighting||!robotComplete(state))}>${!robotComplete(state)?'Нужно собрать робота':enemy.boss&&state.progress.defeatedBosses.includes(enemy.id)?'Повторить бой':'На арену'}</button><small>Побед: ${state.progress.victories[enemy.id]??0} · ваш робот: ${count(stats.power)}</small></article>`).join('');
    $('shop-grid').innerHTML=SHOP.filter(item=>era>=item.era).map(item=>{
      const purchased=item.once&&state.progress.shop.includes(`${item.id}-${era}`);
      return `<article class="shop-item"><div><h4>${item.name}</h4><p>${item.description}</p></div><button class="secondary-button" data-op="shop" data-id="${item.id}" ${disabled(this.paused||purchased)}>${purchased?'Куплено':`${item.price} жет.`}</button></article>`;
    }).join('');
  }
  renderBattle(state) {
    const battle=state.activeBattle,enemy=OPPONENTS.find(item=>item.id===battle.opponent);
    $('battle-arena').hidden=battle.status!=='running';
    if(battle.status!=='running')return;
    const key=`${battle.seed===0?'zero':''}${battle.opponent}-${battle.player.maxHp}`;
    if(key!==this.battleKey) {
      this.battleKey=key;$('battle-player-art').innerHTML=robotSvg(state,{namespace:'battle-player',idle:false});$('battle-enemy-art').innerHTML=robotSvg(state,{enemy,namespace:'battle-enemy',idle:false});
      setText($('battle-name'),`Ваш робот против «${enemy.name}»`);setText($('boss-name'),enemy.name);setText($('boss-intro-name'),enemy.name);
      $('battle-arena').classList.toggle('boss-fight',enemy.boss);
    }
    $('boss-health').hidden=!enemy.boss;$('boss-intro').hidden=!enemy.boss||battle.elapsed>EXPANSION.battle.bossIntroSeconds;
    setText($('battle-time'),battle.finishAt!==null?'Нокаут! Подводим итоги…':`${Math.max(0,Math.ceil(EXPANSION.battle.maxSeconds-battle.elapsed))} сек`);
    for(const side of ['player','enemy']) {
      const unit=battle[side],ratio=Math.max(0,Math.min(100,unit.hp/unit.maxHp*100));
      $(`${side}-hp-fill`).style.width=`${ratio}%`;setText($(`${side}-hp-label`),`${count(Math.ceil(unit.hp))} / ${count(Math.ceil(unit.maxHp))}`);
      $(`battle-${side}-art`).classList.toggle('knocked-out',unit.hp<=0);
    }
    $('boss-hp-fill').style.width=`${Math.max(0,battle.enemy.hp/battle.enemy.maxHp*100)}%`;
    const shield=battle.player.shield>0;setText($('shield-indicator'),shield?`Щит: ${count(Math.ceil(battle.player.shield))}`:'');$('battle-player-art').classList.toggle('shield-active',shield);$('battle-player-art').classList.toggle('overload-active',battle.elapsed<battle.overloadUntil);
    for(const ability of ['shield','overload']) {
      const remaining=Math.max(0,Math.ceil(battle.cooldowns[ability]-battle.elapsed));
      const button=$(`ability-${ability}`);button.disabled=this.paused||remaining>0||battle.finishAt!==null;
      const title=ability==='shield'?'Щит':'Перегрузка';
      button.querySelector('span').firstChild.textContent=remaining?`${title} · ${remaining} сек`:title;
    }
  }
  renderAchievements(state) {
    const key=JSON.stringify([state.progress.counters,state.progress.achievements,state.progress.quests]);if(key===this.achievementKey)return;this.achievementKey=key;
    for(const [items,id,claimed] of [[ACHIEVEMENTS,'achievement-grid','achievements'],[QUESTS,'quest-grid','quests']]) {
      $(id).innerHTML=items.map(item=>{
        const done=state.progress[claimed].includes(item.id),progress=Math.min(item.value,state.progress.counters[item.key]??0);
        return `<article class="achievement-card panel ${done?'completed':''}"><span class="achievement-icon">${icon(done?'check':'bolt')}</span><div><h3>${item.name}</h3><p>${item.description}</p><small>${done?'✓ Награда получена':`${count(progress)} / ${item.value}`}</small><span class="achievement-reward">${Object.entries(item.reward).map(([k,v])=>k==='egg'?'Яйцо мастерской':k==='crate'?`${v} ящик деталей`:k==='part'?`${RARITIES[v.rarity??0].name} деталь`:k==='blueprint'?blueprintName(v):`${v} ${EXPANSION.resourceNames[k].toLowerCase()}`).join(' · ')}</span></div></article>`;
      }).join('');
    }
  }
  present(events) {
    for(const event of events) {
      if(event.type==='toast')this.base.toast(event.text);
      else this.reveals.push(event);
    }
    this.nextReveal();
  }
  nextReveal() {
    if(document.querySelector('dialog[open]')||!this.reveals.length)return;
    const event=this.reveals.shift();
    let art=icon('bolt'),extra='';
    if(event.part)art=partIcon(event.part);
    if(event.character)art=characterPortrait(event.character);
    if(['robot','era'].includes(event.type))art=robotSvg(this.state,{namespace:'reveal'});
    if(event.type==='battle') {
      const result=event.result;
      art=result.won?icon('check'):icon('tool');
      extra=`<div class="reward-grid">${Object.entries(result.rewards).filter(([key,value])=>value>0).map(([key,value])=>`<span>${key==='coins'?money(value):`${count(value)} ${key==='xp'?'опыта':EXPANSION.resourceNames[key]??key}`}</span>`).join('')}</div>${result.parts.map(part=>`<div class="reward-part" style="--rarity:${RARITIES[part.rarity].color}">${partIcon(part)}<div><strong>${partDefinition(part).name}</strong>${rarityBadge(part)}</div></div>`).join('')}${(result.blueprints??(result.blueprint?[result.blueprint]:[])).map(id=>`<p class="reward-blueprint">✓ ${blueprintName(id)}</p>`).join('')}`;
    }
    $('reveal-dialog').className=`modal reveal-modal reveal-${event.type}`;
    $('reveal-content').innerHTML=`<div class="reveal-art">${art}</div><span class="eyebrow">${event.type==='battle'?'РЕЗУЛЬТАТ ПОЕДИНКА':event.part?RARITIES[event.part.rarity].name.toUpperCase():'НОВОЕ ПРИКЛЮЧЕНИЕ'}</span><h2 id="reveal-title">${event.title}</h2><p class="modal-copy">${event.text??''}</p>${extra}`;
    $('reveal-dialog').showModal();
    setText($('reveal-close'),event.view?'Продолжить открытие':'Отлично!');
    $('reveal-close').onclick=()=>{if(event.view)this.showViewWithoutTutorial(event.view);};
  }
  showViewWithoutTutorial(view) {
    if(!this.state.progress.tutorialSeen.includes(view))this.state.progress.tutorialSeen.push(view);
    this.showView(view);
  }
  partDrop(part) {
    const rarity=RARITIES[part.rarity];
    const element=document.createElement('div');element.className=`part-drop rarity-${part.rarity}`;element.style.setProperty('--rarity',rarity.color);
    element.innerHTML=partIcon(part)+`<strong>${rarity.name}</strong>`;
    let start=$('produce-button').getBoundingClientRect();
    const mobile=$('mobile-produce-button').getBoundingClientRect();
    if(!start.width||start.bottom<0||start.top>innerHeight)start=mobile.width?mobile:$('connected-quest').getBoundingClientRect();
    const target=$('inventory-indicator').getBoundingClientRect();
    const x=start.left+start.width/2,y=Math.min(innerHeight-60,start.top+10);element.style.left=`${x-35}px`;element.style.top=`${y-65}px`;document.body.append(element);
    if(this.state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches){setTimeout(()=>element.remove(),900);}
    else if(element.animate) {
      const animation=element.animate([{transform:'translate(0,20px) rotate(-18deg) scale(.4)',opacity:0},{transform:'translate(0,-55px) rotate(14deg) scale(1.1)',opacity:1,offset:.3},{transform:'translate(0,-55px) rotate(-8deg) scale(1)',opacity:1,offset:.65},{transform:`translate(${target.left+target.width/2-x}px,${target.top+target.height/2-y+65}px) rotate(170deg) scale(.15)`,opacity:0}],{duration:1500,easing:'ease-in-out'});
      animation.onfinish=()=>{element.remove();$('inventory-indicator').classList.add('inventory-ping');setTimeout(()=>$('inventory-indicator').classList.remove('inventory-ping'),600);};
    } else setTimeout(()=>element.remove(),1500);
    this.base.toast(`Найдена ${rarity.name.toLowerCase()} деталь: ${partDefinition(part).name}!`);
  }
  combatEvents(events) {
    for(const event of events) {
      if(event.type==='finished')continue;
      const fighter=document.querySelector(`.${event.to==='enemy'?'enemy':'player'}-fighter`);if(!fighter)continue;
      const impact=document.createElement('span');impact.className=`damage-number ${event.critical?'critical':''} ${event.type}`;
      impact.textContent=event.type==='shield'?'ЩИТ':event.type==='heal'?'+ РЕМОНТ':event.damage<1?'БЛОК':`${event.critical?'КРИТ ':''}−${count(Math.round(event.damage))}`;
      fighter.append(impact);setTimeout(()=>impact.remove(),900);
      const art=$(`battle-${event.to}-art`);art.classList.remove('hit-impact');void art.offsetWidth;art.classList.add('hit-impact');setTimeout(()=>art.classList.remove('hit-impact'),180);
      if(['hit','overload','shock'].includes(event.type)) {
        const source=$(`battle-${event.from}-art`);source.classList.remove('attack-strike');void source.offsetWidth;source.classList.add('attack-strike');setTimeout(()=>source.classList.remove('attack-strike'),300);
        const era=event.from==='player'?eraIndex(this.state):OPPONENTS.find(item=>item.id===this.state.activeBattle.opponent).era;
        const beam=document.createElement('span');beam.className=`battle-beam beam-${ERAS[era].visual.attack} ${event.from==='enemy'?'enemy-beam':''} ${event.type}`;
        beam.style.setProperty('--beam-color',ERAS[era].glow);$('battle-effects').append(beam);setTimeout(()=>beam.remove(),400);
      }
      const spark=document.createElement('span');spark.className=`battle-spark ${event.type}`;spark.style.left=event.to==='enemy'?'70%':'27%';$('battle-effects').append(spark);setTimeout(()=>spark.remove(),600);
      if(['shock','overload'].includes(event.type)){$('battle-arena').classList.add('arena-impact');setTimeout(()=>$('battle-arena').classList.remove('arena-impact'),300);}
    }
  }
  battleResult(result) {
    this.battleKey='';this.opponentKey='';
    this.present([{type:'battle',title:result.won?result.firstBoss?'Босс побеждён!':'Отличная победа!':'Робот вернётся сильнее',text:result.won?result.firstBoss?result.opponent.era===6?'Звёздная вершина покорена! Уникальное ядро и награды помогут довести империю до совершенства.':'Новый чертёж, уникальное ядро и пропуск в следующую эпоху. Нужный капитал всё ещё важен.':'Добыча поможет улучшить цех, робота и команду.':'Улучшите модули или попробуйте вовремя включить щит и перегрузку. Опыт экипажа уже начислен.',result}]);
  }
}
