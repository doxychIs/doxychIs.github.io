import { journeys, money, duration } from '../data/care';
const form=document.querySelector<HTMLFormElement>('#care-form');
if(form){
  form.noValidate=true;
  form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled=false;
  const route=document.querySelector<HTMLElement>('#day-route')!;
  const time=document.querySelector<HTMLElement>('#day-duration')!;
  const price=document.querySelector<HTMLElement>('#day-price')!;
  const stages=document.querySelector<HTMLOListElement>('#day-stages')!;
  const result=document.querySelector<HTMLElement>('#care-result')!;
  const text=document.querySelector<HTMLElement>('#care-plan-text')!;
  const date=form.elements.namedItem('date') as HTMLInputElement;
  const now=new Date();date.min=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const routeId=new URLSearchParams(location.search).get('route');
  if(journeys.some(j=>j.id===routeId)){const input=form.querySelector<HTMLInputElement>(`input[name="route"][value="${routeId}"]`);if(input)input.checked=true;}
  const getJourney=()=>journeys.find(j=>j.id===new FormData(form).get('route'))||journeys[0];
  function update(announce=true){
    const j=getJourney();route.textContent=j.title;time.textContent=duration(j.minutes);price.textContent=money(j.price);
    stages.replaceChildren(...j.steps.map(s=>{const li=document.createElement('li');const name=document.createElement('span');const minutes=document.createElement('small');name.textContent=s.name;minutes.textContent=`${s.minutes} мин`;li.append(name,minutes);return li;}));
    if(announce){const status=document.querySelector<HTMLElement>('#day-status');if(status)status.textContent=`Выбран маршрут «${j.title}», ${duration(j.minutes)}, ${money(j.price)}.`;}
    result.hidden=true;
  }
  update(false);
  form.addEventListener('change',e=>{if((e.target as HTMLInputElement).name==='route')update();else result.hidden=true;});form.addEventListener('input',e=>{result.hidden=true;(e.target as HTMLInputElement).setCustomValidity?.('');});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    date.setCustomValidity(!date.value?'Выберите желаемую дату визита.':date.validity.rangeUnderflow?'Выберите сегодняшнюю или будущую дату.':'');
    const clock=form.elements.namedItem('time') as HTMLSelectElement;
    clock.setCustomValidity(!clock.value?'Выберите удобное время.':'');
    if(!form.reportValidity())return;
    const j=getJourney();const data=new FormData(form);
    const day=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${data.get('date')}T12:00:00`));
    const prefs=data.getAll('preference').map(String);const note=String(data.get('note')||'').trim();
    text.textContent=`ТИШЬ · Пермь\n\nМаршрут: ${j.title}\nВремя для себя: ${duration(j.minutes)}\nСтоимость: ${money(j.price)}\nЖелаемый визит: ${day}, ${data.get('time')}\n\n${j.steps.map(s=>`${s.name} — ${s.minutes} минут`).join('\n')}${prefs.length?`\n\nКомфорт: ${prefs.join('; ')}`:''}${note?`\nПожелание: ${note}`:''}\n\nЭто личный план, а не подтверждённая запись. Заявка не отправлена.`;
    result.hidden=false;document.querySelector<HTMLElement>('#result-title')?.focus();
  });
  document.querySelector('#edit-care-plan')?.addEventListener('click',()=>{result.hidden=true;form.querySelector<HTMLInputElement>('input[name="route"]:checked')?.focus();});
  document.querySelector('#save-care-plan')?.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['\ufeff'+text.textContent],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='tish-plan.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);const status=document.querySelector<HTMLElement>('#save-status');if(status)status.textContent='План сохранён на ваше устройство. Запись не создана.';});
}
