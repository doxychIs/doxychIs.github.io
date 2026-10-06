import { CONFIG } from './config.js';
import { clickValue, incomePerSecond, unitProduction, isUnlocked, maxAffordable, priceFor, stageIndex, upgradeUnlocked } from './economy.js';
import { formatNumber, money, count, duration } from './format.js';
import { renderScene } from './scene.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };

function requirementText(upgrade) {
  const req = upgrade.requirement;
  if (req.clicks) return `Нужно ${count(req.clicks)} нажатий`;
  if (req.earned) return `Заработайте ${money(req.earned)}`;
  const building = CONFIG.buildings.find(item => item.id === req.building);
  return `${building.name}: ${count(req.owned)} в наличии`;
}

function objectWord(value) {
  const last = value % 10, pair = value % 100;
  return pair >= 11 && pair <= 14 ? 'объектов' : last === 1 ? 'объект' : last >= 2 && last <= 4 ? 'объекта' : 'объектов';
}

export class GameUI {
  constructor(actions) {
    this.actions = actions;
    this.buyMode = 1;
    this.currentTab = 'buildings';
    this.currentStage = -1;
    this.rows = new Map(); this.upgradeRows = new Map();
    this.lastFloat = 0;
    this.build(); this.bind();
  }

  build() {
    $('journey-track').innerHTML = CONFIG.stages.map((stage, index) => `<div class="journey-item" data-stage="${index}"><span class="journey-number">${String(index + 1).padStart(2, '0')}</span><span>${stage.short}</span></div>`).join('');
    $('building-list').innerHTML = CONFIG.buildings.map(building => `<article class="building-row" data-building="${building.id}"><div class="building-icon">${icon(building.icon)}</div><div class="building-info"><div class="building-name">${building.name}<span class="new-badge" hidden>НОВОЕ</span></div><div class="building-subtitle">${building.subtitle}</div><div class="building-rate"></div></div><div class="building-owned" aria-label="Количество в наличии"><b>0</b><span>в наличии</span></div><button class="buy-button" data-buy="${building.id}" disabled><span class="price"></span><span class="buy-caption"></span></button></article>`).join('');
    document.querySelectorAll('[data-building]').forEach(row => this.rows.set(row.dataset.building, {
      element: row, subtitle: row.querySelector('.building-subtitle'), rate: row.querySelector('.building-rate'), owned: row.querySelector('.building-owned b'), button: row.querySelector('.buy-button'), price: row.querySelector('.price'), caption: row.querySelector('.buy-caption'), badge: row.querySelector('.new-badge')
    }));
    $('upgrade-list').innerHTML = CONFIG.upgrades.map(upgrade => `<article class="upgrade-card" data-upgrade="${upgrade.id}"><div class="upgrade-top">${icon(upgrade.icon)}<span class="upgrade-multiplier">×${upgrade.multiplier}</span></div><h3>${upgrade.name}</h3><p>${upgrade.description}</p><span class="upgrade-requirement">${requirementText(upgrade)}</span><button class="upgrade-button" data-upgrade-buy="${upgrade.id}" disabled>${money(upgrade.price)}</button></article>`).join('');
    document.querySelectorAll('[data-upgrade]').forEach(row => this.upgradeRows.set(row.dataset.upgrade, { element: row, requirement: row.querySelector('.upgrade-requirement'), button: row.querySelector('.upgrade-button') }));
    $('stats-grid').innerHTML = [['total','Всего заработано'],['objects','Производственных объектов'],['clicks','Нажатий на производство'],['manual','Заработано вручную'],['upgrades','Установлено улучшений'],['time','Время в игре'],['offline','Заработано в ваше отсутствие'],['stage','Этап развития']].map(([id,label]) => `<div class="stat-card"><span>${label}</span><strong id="stat-${id}">0</strong></div>`).join('');
  }

  bind() {
    $('produce-button').addEventListener('click', event => this.actions.produce(event));
    $('mobile-produce-button').addEventListener('click', event => this.actions.produce(event));
    if ('IntersectionObserver' in window) {
      this.produceObserver=new IntersectionObserver(entries=>{
        const visible=entries[0].isIntersecting;
        $('mobile-production').hidden=visible;
        document.body.classList.toggle('mobile-production-visible',!visible);
      },{threshold:0});
      this.produceObserver.observe($('produce-button'));
    }
    $('building-list').addEventListener('click', event => { const button = event.target.closest('[data-buy]'); if (button && !button.disabled) this.actions.buyBuilding(button.dataset.buy, this.buyMode); });
    $('upgrade-list').addEventListener('click', event => { const button = event.target.closest('[data-upgrade-buy]'); if (button && !button.disabled) this.actions.buyUpgrade(button.dataset.upgradeBuy); });
    document.querySelectorAll('[data-buy-mode]').forEach(button => button.addEventListener('click', () => {
      this.buyMode = button.dataset.buyMode === 'max' ? 'max' : Number(button.dataset.buyMode);
      document.querySelectorAll('[data-buy-mode]').forEach(item => { const selected = item === button; item.classList.toggle('selected',selected); item.setAttribute('aria-pressed',String(selected)); });
      this.actions.refresh();
    }));
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => this.selectTab(button.dataset.tab));
      button.addEventListener('keydown', event => {
        if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = [...document.querySelectorAll('[data-tab]')];
        let next = (tabs.indexOf(button) + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        this.selectTab(tabs[next].dataset.tab); tabs[next].focus();
      });
    });
    $('settings-button').addEventListener('click', () => $('settings-dialog').showModal());
    $('sound-button').addEventListener('click', () => this.actions.toggle('sound'));
    $('sound-toggle').addEventListener('click', () => this.actions.toggle('sound'));
    $('motion-toggle').addEventListener('click', () => this.actions.toggle('reducedMotion'));
    $('save-button').addEventListener('click', () => this.actions.save(true));
    $('reset-button').addEventListener('click', () => { $('settings-dialog').close(); $('reset-dialog').showModal(); $('cancel-reset').focus(); });
    $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
    $('confirm-reset').addEventListener('click', () => { this.actions.reset(); $('reset-dialog').close(); });
    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
    document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }));
    window.addEventListener('keydown', event => {
      if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]')) return;
      if (event.target.closest('button,a,input,select,textarea,[contenteditable]')) return;
      event.preventDefault(); if(!event.repeat)this.actions.produce(event);
    });
  }

  selectTab(name) {
    this.currentTab = name;
    document.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === name;
      button.classList.toggle('active', selected); button.setAttribute('aria-selected',String(selected)); button.tabIndex = selected ? 0 : -1;
      $(`view-${button.dataset.tab}`).hidden = !selected;
    });
    this.actions.refresh();
  }

  render(state, paused = false) {
    const income = incomePerSecond(state), click = clickValue(state), stage = stageIndex(state);
    const balanceText=formatNumber(state.money);
    setText($('money'),balanceText);
    $('money').parentElement.classList.toggle('compact',balanceText.length>8);
    $('money').parentElement.classList.toggle('very-compact',balanceText.length>12);
    const incomeText = `${money(income)}<span class="metric-unit"> / сек</span>`;
    if ($('income').innerHTML !== incomeText) $('income').innerHTML = incomeText;
    const clickText = `${money(click)}<span class="metric-unit"> / нажатие</span>`;
    if ($('click-income').innerHTML !== clickText) $('click-income').innerHTML = clickText;
    setText($('produce-value'), `+${money(click)} за нажатие`);
    setText($('mobile-produce-value'), `+${money(click)}`);
    $('produce-button').disabled = paused;
    $('mobile-produce-button').disabled = paused;
    document.body.classList.toggle('paused',paused);
    const ownedTotal = Object.values(state.buildings).reduce((a,b)=>a+b,0);
    setText($('capacity'),`${count(ownedTotal)} ${objectWord(ownedTotal)}`);
    this.renderStage(state,stage);
    for (const building of CONFIG.buildings) {
      const row = this.rows.get(building.id), unlocked = isUnlocked(state,building), owned = state.buildings[building.id];
      const quantity = this.buyMode === 'max' ? maxAffordable(state,building) : this.buyMode;
      const shownQuantity = this.buyMode === 'max' ? Math.max(1,quantity) : quantity;
      const price = priceFor(building,owned,shownQuantity);
      row.element.classList.toggle('locked',!unlocked);
      row.badge.hidden = !unlocked || owned > 0 || building.id === 'worker';
      setText(row.subtitle,unlocked?building.subtitle:`Заработайте ${money(building.unlock)}`);
      setText(row.rate,`+${money(unitProduction(state,building))} / сек`);
      setText(row.owned,count(owned));
      setText(row.price,unlocked?money(price):'Закрыто');
      const caption = !unlocked ? 'Не открыт' : !Number.isFinite(price) ? 'Достигнут предел' : `Купить ×${count(shownQuantity)}`;
      setText(row.caption,caption);
      row.button.disabled = paused || !unlocked || quantity < 1 || price > state.money || !Number.isFinite(price);
      row.button.setAttribute('aria-label', unlocked?`Купить: ${building.name}, ${count(shownQuantity)} шт., цена ${money(price)}`:`${building.name}: откроется после заработка ${money(building.unlock)}`);
    }
    let available=0;
    for (const upgrade of CONFIG.upgrades) {
      const row=this.upgradeRows.get(upgrade.id), installed=state.upgrades.includes(upgrade.id), unlocked=upgradeUnlocked(state,upgrade);
      if(unlocked&&!installed) available++;
      row.element.classList.toggle('locked',!unlocked&&!installed); row.element.classList.toggle('installed',installed);
      setText(row.requirement,installed?'Технология уже работает':unlocked?'Готово к установке':requirementText(upgrade));
      setText(row.button,installed?'✓ Установлено':money(upgrade.price));
      row.button.disabled=paused||installed||!unlocked||state.money<upgrade.price;
      row.button.setAttribute('aria-label',installed?`${upgrade.name}: установлено`:`Улучшение «${upgrade.name}», ${upgrade.description}, цена ${money(upgrade.price)}`);
    }
    setText($('upgrade-count'),available?String(available):'');
    if(this.currentTab==='stats') {
      for(const [id,value] of Object.entries({total:money(state.totalEarned),objects:count(ownedTotal),clicks:count(state.clicks),manual:money(state.manualEarned),upgrades:`${state.upgrades.length} / ${CONFIG.upgrades.length}`,time:duration(state.playSeconds),offline:money(state.offlineEarned),stage:`${stage+1} / ${CONFIG.stages.length}`})) setText($(`stat-${id}`),value);
    }
  }

  renderStage(state,index) {
    if(this.currentStage!==index) {
      this.currentStage=index;
      const stage=CONFIG.stages[index];
      $('stage-headline').innerHTML=stage.headline.replace('\n','<br>');
      setText($('stage-description'),stage.description);
      setText($('stage-badge'),`ЭТАП ${String(index+1).padStart(2,'0')} / 07`);
      $('scene-art').innerHTML=renderScene(index);
      setText($('scene-label'),index===0?'Гаражная мастерская':stage.name);
      document.querySelectorAll('[data-stage]').forEach(item=>{
        const i=Number(item.dataset.stage);
        item.classList.toggle('current',i===index); item.classList.toggle('done',i<index);
        item.querySelector('.journey-number').innerHTML=i<index?icon('check'):String(i+1).padStart(2,'0');
        if(i===index)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
      });
    }
    const next=CONFIG.stages[index+1];
    setText($('next-stage-label'),next?'СЛЕДУЮЩИЙ ЭТАП':'ДАЛЬШЕ — ТОЛЬКО ЗВЁЗДЫ');
    setText($('next-stage-name'),next?next.name:'Космическая империя');
    setText($('next-stage-amount'),next?`${money(state.totalEarned)} / ${money(next.threshold)}`:'Все этапы открыты');
    const previous=CONFIG.stages[index].threshold;
    const percent=next?Math.min(100,(state.totalEarned-previous)/(next.threshold-previous)*100):100;
    $('stage-progress-fill').style.width=`${percent}%`;
    $('stage-progress').setAttribute('aria-valuenow',String(Math.round(percent)));
    $('stage-progress').setAttribute('aria-valuetext',next?`${Math.round(percent)}% до этапа «${next.name}»`:'Все этапы открыты');
  }

  settings(state) {
    $('sound-button').innerHTML=icon(state.settings.sound?'sound':'muted');
    $('sound-button').setAttribute('aria-pressed',String(state.settings.sound));
    $('sound-button').setAttribute('aria-label',state.settings.sound?'Выключить звук':'Включить звук');
    $('sound-button').title=state.settings.sound?'Выключить звук':'Включить звук';
    $('sound-toggle').setAttribute('aria-checked',String(state.settings.sound));
    $('motion-toggle').setAttribute('aria-checked',String(state.settings.reducedMotion));
    document.body.classList.toggle('reduce-motion',state.settings.reducedMotion);
  }

  saveStatus(ok) { $('save-status').classList.toggle('error',!ok);setText($('save-label'),ok?'Прогресс сохранён':'Не удалось сохранить'); }
  toast(message,error=false) {
    const element=document.createElement('div');element.className=`toast${error?' error':''}`;
    element.innerHTML=icon(error?'info':'check');
    const label=document.createElement('span');label.textContent=message;element.append(label);
    while($('toasts').children.length>=3)$('toasts').firstElementChild.remove();
    $('toasts').append(element);setTimeout(()=>element.remove(),4300);
  }
  feedback(amount) {
    const button=$('produce-button');button.classList.remove('pressed');void button.offsetWidth;button.classList.add('pressed');setTimeout(()=>button.classList.remove('pressed'),90);
    if(performance.now()-this.lastFloat<80||document.body.classList.contains('reduce-motion'))return;
    this.lastFloat=performance.now();
    const element=document.createElement('span');element.className='floating-gain';element.textContent=`+${money(amount)}`;
    element.style.left=`${40+Math.random()*20}%`;$('produce-wrap').append(element);setTimeout(()=>element.remove(),900);
  }
  purchase(id) { const row=this.rows.get(id);if(!row)return;row.element.classList.remove('purchased');void row.element.offsetWidth;row.element.classList.add('purchased');setTimeout(()=>row.element.classList.remove('purchased'),550); }
  offline(result) { setText($('offline-time'),`Ваши производства работали ${duration(result.seconds)}. Учтено до 8 часов отсутствия.`);setText($('offline-amount'),`+${money(result.amount)}`);$('offline-dialog').showModal(); }
  ready() { $('app').setAttribute('aria-busy','false');$('loading').classList.add('done');setTimeout(()=>$('loading').remove(),250); }
}
