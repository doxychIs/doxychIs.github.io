import { services, visitTotal, money, duration } from '../data/catalog';
const form = document.querySelector<HTMLFormElement>('#visit-form');
if (form) {
  form.noValidate = true;
  form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = false;
  const price = document.querySelector<HTMLElement>('#ticket-price')!;
  const time = document.querySelector<HTMLElement>('#ticket-duration')!;
  const list = document.querySelector<HTMLUListElement>('#ticket-items')!;
  const status = document.querySelector<HTMLElement>('#ticket-status')!;
  const result = document.querySelector<HTMLElement>('#plan-result')!;
  const text = document.querySelector<HTMLElement>('#plan-text')!;
  const date = form.elements.namedItem('date') as HTMLInputElement;
  const localDate = new Date();
  const today = `${localDate.getFullYear()}-${String(localDate.getMonth()+1).padStart(2,'0')}-${String(localDate.getDate()).padStart(2,'0')}`;
  date.min = today;
  const params = new URLSearchParams(location.search);
  const selected = params.get('service');
  if (services.some(s => s.id === selected && !s.extra)) {
    const input = form.querySelector<HTMLInputElement>(`input[name="service"][value="${selected}"]`);
    if (input) input.checked = true;
  }
  const extra = params.get('extra');
  if (services.some(s => s.id === extra && s.extra)) {
    const input = form.querySelector<HTMLInputElement>(`input[name="extra"][value="${extra}"]`);
    if (input) input.checked = true;
  }
  const getTotal = () => { const data = new FormData(form); return visitTotal(String(data.get('service')),data.getAll('extra').map(String)); };
  function update(announce = true) {
    const total = getTotal();
    list.replaceChildren(...total.items.map(item => { const li = document.createElement('li'); const name = document.createElement('span'); const cost = document.createElement('span'); name.textContent = item.name; cost.textContent = money(item.price); li.append(name,cost); return li; }));
    price.textContent = money(total.price); time.textContent = duration(total.minutes);
    const mobilePrice = document.querySelector<HTMLElement>('#mobile-ticket-price');
    const mobileTime = document.querySelector<HTMLElement>('#mobile-ticket-duration');
    if (mobilePrice) mobilePrice.textContent = money(total.price);
    if (mobileTime) mobileTime.textContent = duration(total.minutes);
    if (announce) status.textContent = `План обновлён. ${money(total.price)}, ${duration(total.minutes)}.`;
    result.hidden = true;
  }
  const mobileSummary = document.querySelector<HTMLElement>('.mobile-plan-summary');
  if (mobileSummary) mobileSummary.hidden = false;
  update(false);
  form.addEventListener('change', e => { if (['service','extra'].includes((e.target as HTMLInputElement).name)) update(); else result.hidden = true; });
  form.addEventListener('input', e => { result.hidden = true; (e.target as HTMLInputElement).setCustomValidity?.(''); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    date.setCustomValidity(!date.value ? 'Выберите желаемую дату визита.' : date.validity.rangeUnderflow ? 'Выберите сегодняшнюю или будущую дату.' : '');
    const clock = form.elements.namedItem('time') as HTMLSelectElement;
    clock.setCustomValidity(!clock.value ? 'Выберите удобное время.' : '');
    if (!form.reportValidity()) return;
    const total = getTotal(); const data = new FormData(form);
    const pickedDate = new Date(`${String(data.get('date'))}T12:00:00`);
    const day = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(pickedDate);
    const note = String(data.get('note') || '').trim();
    text.textContent = `СМЕНА · Пермь\n\n${total.items.map(s=>`${s.name} — ${money(s.price)}`).join('\n')}\n\nОриентир: ${money(total.price)}\nДлительность: ${duration(total.minutes)}\nЖелаемый визит: ${day}, ${data.get('time')}${note ? `\nПожелание: ${note}` : ''}\n\nДата и стоимость требуют подтверждения. Заявка не отправлена.`;
    result.hidden = false;
    document.querySelector<HTMLElement>('#result-title')?.focus();
  });
  document.querySelector('#edit-plan')?.addEventListener('click', () => { result.hidden = true; form.querySelector<HTMLInputElement>('input[name="service"]:checked')?.focus(); });
  document.querySelector('#download-plan')?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob(['\ufeff'+text.textContent],{type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'smena-plan.txt'; document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    const message = document.querySelector<HTMLElement>('#download-status'); if(message) message.textContent = 'План сохранён на ваше устройство. Запись не создана.';
  });
}
