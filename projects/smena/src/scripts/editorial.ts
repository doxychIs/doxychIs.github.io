/** Редакционная хореография. Контент доступен без JS; прокрутка нативная. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = matchMedia('(hover: hover) and (pointer: fine)');
const pending = new Set<HTMLElement>();
const observationTargets = new Map<HTMLElement, Element>();
let observer: IntersectionObserver | undefined;
const reveal = (element: HTMLElement) => {
  element.classList.remove('motion-pending');
  pending.delete(element);
  const target = observationTargets.get(element);
  observationTargets.delete(element);
  if (target && ![...observationTargets.values()].includes(target)) observer?.unobserve(target);
};
const queue = (element: HTMLElement) => {
  if (reduced.matches) return;
  element.classList.add('motion-pending');
  pending.add(element);
  // Полностью закрытая clip-path фотография не пересекается с viewport.
  // Наблюдаем стабильную геометрию её карточки, а раскрываем сам кадр.
  const target = element.classList.contains('motion-photo') ? element.parentElement ?? element : element;
  observationTargets.set(element, target);
  observer?.observe(target);
};
if (!reduced.matches && 'IntersectionObserver' in window) {
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      [...observationTargets].forEach(([element, target]) => { if (target === entry.target) reveal(element); });
    });
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });

  // Сохраняем исходные текстовые узлы, цветовые акценты и единственное чтение заголовка.
  document.querySelectorAll<HTMLElement>('.campaign-title, .section-head h2, .manifesto h2, .first-visit h2, .visit-invitation h2, .home-questions h2').forEach(heading => {
    const content = document.createDocumentFragment();
    let line: HTMLElement;
    let inner: HTMLElement;
    let index = 0;
    const nextLine = () => {
      line = document.createElement('i');
      line.className = 'motion-line';
      inner = document.createElement('i');
      inner.className = 'motion-line-inner';
      inner.style.setProperty('--line-index', String(index++));
      line.append(inner);
      content.append(line);
    };
    nextLine();
    [...heading.childNodes].forEach(node => {
      if (node instanceof HTMLBRElement) nextLine();
      else inner.append(node);
    });
    heading.replaceChildren(content);
    heading.classList.add('motion-heading');
    queue(heading);
  });
  document.querySelectorAll<HTMLElement>('.direction-image, .look-photo, .price-group-head img').forEach((frame, index) => {
    frame.classList.add('motion-photo');
    frame.style.setProperty('--reveal-delay', `${(index % 4) * 85}ms`);
    // На длинных страницах раскрываем только фотографии ниже первого экрана.
    if (frame.getBoundingClientRect().top > innerHeight - 40) queue(frame);
  });
  document.querySelectorAll<HTMLElement>('.visit-steps li, .manifesto-copy p, .section-caption, .footer-top').forEach((element, index) => {
    element.classList.add('motion-item');
    element.style.setProperty('--reveal-delay', `${(index % 3) * 90}ms`);
    if (element.getBoundingClientRect().top > innerHeight - 40) queue(element);
  });
}

// Читаем геометрию раз за кадр только после scroll/resize, без вечного RAF.
const hero = document.querySelector<HTMLElement>('.campaign-visual');
const ticket = document.querySelector<HTMLElement>('.ticket-preview');
let scrollFrame = 0;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const updateScroll = () => {
  scrollFrame = 0;
  if (reduced.matches || document.hidden) return;
  const mobile = innerWidth <= 650;
  if (hero) {
    const box = hero.getBoundingClientRect();
    const progress = clamp((innerHeight - box.top) / (innerHeight + box.height));
    hero.classList.add('motion-scroll');
    hero.style.setProperty('--hero-pan', `${(progress - .5) * (mobile ? 20 : 52)}px`);
    hero.style.setProperty('--hero-scale', String(1.12 - progress * .045));
    hero.style.setProperty('--sticker-pan', `${(progress - .35) * (mobile ? -12 : -36)}px`);
    hero.style.setProperty('--sticker-turn', `${16 - progress * 20}deg`);
  }
  if (ticket && !mobile) {
    const box = ticket.getBoundingClientRect();
    const progress = clamp((innerHeight - box.top) / (innerHeight + box.height));
    ticket.classList.add('motion-scroll');
    ticket.style.setProperty('--ticket-pan', `${(progress - .5) * -60}px`);
    ticket.style.setProperty('--ticket-turn', `${12 - progress * 14}deg`);
  } else ticket?.classList.remove('motion-scroll');
};
const scheduleScroll = () => {
  if (!scrollFrame && !reduced.matches && (hero || ticket)) scrollFrame = requestAnimationFrame(updateScroll);
};
addEventListener('scroll', scheduleScroll, { passive: true });
addEventListener('resize', scheduleScroll, { passive: true });
scheduleScroll();

// Один активный портрет: изображение и метка мягко следуют за курсором.
type Portrait = { frame: HTMLElement; x: number; y: number; targetX: number; targetY: number; width: number; height: number; };
let active: Portrait | undefined;
let pointerFrame = 0;
const clearPointer = () => {
  cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  if (!active) return;
  active.frame.classList.remove('pointer-active');
  for (const key of ['--photo-x', '--photo-y', '--photo-turn', '--photo-scale']) active.frame.style.removeProperty(key);
  active = undefined;
};
const updatePointer = () => {
  pointerFrame = 0;
  if (!active || reduced.matches || !pointer.matches || document.hidden) { clearPointer(); return; }
  active.x += (active.targetX - active.x) * .18;
  active.y += (active.targetY - active.y) * .18;
  const nx = active.x / active.width - .5;
  const ny = active.y / active.height - .5;
  active.frame.style.setProperty('--cursor-x', `${active.x}px`);
  active.frame.style.setProperty('--cursor-y', `${active.y}px`);
  active.frame.style.setProperty('--photo-x', `${nx * -22}px`);
  active.frame.style.setProperty('--photo-y', `${ny * -22}px`);
  active.frame.style.setProperty('--photo-turn', `${nx * 2.4}deg`);
  active.frame.style.setProperty('--photo-scale', '1.09');
  if (Math.abs(active.targetX - active.x) + Math.abs(active.targetY - active.y) > .2) pointerFrame = requestAnimationFrame(updatePointer);
};
const schedulePointer = () => { if (!pointerFrame) pointerFrame = requestAnimationFrame(updatePointer); };
document.querySelectorAll<HTMLElement>('.direction-image, .look-photo').forEach(frame => {
  const cursor = document.createElement('span');
  cursor.className = 'motion-cursor';
  cursor.textContent = frame.classList.contains('direction-image') ? 'СМОТРЕТЬ\nУСЛУГИ' : 'СМОТРЕТЬ\nОБРАЗ';
  cursor.style.whiteSpace = 'pre-line';
  cursor.setAttribute('aria-hidden', 'true');
  frame.append(cursor);
  frame.classList.add('motion-pointer');
  const move = (event: PointerEvent) => {
    if (reduced.matches || !pointer.matches || event.pointerType !== 'mouse') return;
    const box = frame.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    const x = clamp(event.clientX - box.left, 45, box.width - 45);
    const y = clamp(event.clientY - box.top, 45, box.height - 45);
    if (active?.frame !== frame) {
      clearPointer();
      active = { frame, x, y, targetX: x, targetY: y, width: box.width, height: box.height };
      frame.classList.add('pointer-active');
      reveal(frame);
    }
    active.targetX = x;
    active.targetY = y;
    schedulePointer();
  };
  frame.addEventListener('pointerenter', move);
  frame.addEventListener('pointermove', move);
  frame.addEventListener('pointerleave', () => { if (active?.frame === frame) clearPointer(); });
});

// Фокус никогда не оказывается внутри скрытого блока; пользователь может сменить настройку на лету.
document.addEventListener('focusin', event => {
  const target = event.target as HTMLElement;
  [...pending].forEach(element => {
    if (element.contains(target) || target.contains(element)) reveal(element);
  });
});
reduced.addEventListener('change', () => {
  if (!reduced.matches) { scheduleScroll(); return; }
  observer?.disconnect();
  [...pending].forEach(reveal);
  cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
  clearPointer();
  hero?.classList.remove('motion-scroll');
  ticket?.classList.remove('motion-scroll');
});
pointer.addEventListener('change', clearPointer);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearPointer(); cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
  else scheduleScroll();
});
export {};
