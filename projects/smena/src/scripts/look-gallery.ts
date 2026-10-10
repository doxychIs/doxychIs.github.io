/** Смена реальных ракурсов. Нативная прокрутка и доступные кнопки сохраняются. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

async function ready(slide: HTMLElement): Promise<boolean> {
  const image = slide.querySelector('img');
  if (!image) return false;
  image.loading = 'eager';
  try {
    if (image.decode) await image.decode();
    return true;
  } catch { return false; }
}

document.querySelectorAll<HTMLElement>('[data-look-gallery]').forEach(gallery => {
  if (gallery.dataset.initialized) return;
  gallery.dataset.initialized = 'true';
  const slides = [...gallery.querySelectorAll<HTMLElement>('[data-slide]')];
  const buttons = [...gallery.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const stage = gallery.querySelector<HTMLElement>('.gallery-stage')!;
  const status = gallery.querySelector<HTMLElement>('[data-gallery-status]')!;
  const hint = gallery.querySelector<HTMLElement>('.gallery-hint')!;
  let current = 0;
  let desired = 0;
  let revision = 0;
  let hoverTimer = 0;
  let touchStart: { id: number; x: number; y: number } | undefined;
  gallery.classList.add('gallery-ready');
  gallery.querySelector<HTMLElement>('.gallery-step-controls')!.hidden = false;
  const updateHint = () => { hint.textContent = finePointer.matches ? 'Наведите или выберите' : 'Листайте или выберите'; };
  updateHint();
  finePointer.addEventListener('change', updateHint);

  const show = async (index: number, announce = true) => {
    desired = (index + slides.length) % slides.length;
    const target = desired;
    const request = ++revision;
    if (target === current) return;
    const loaded = await ready(slides[target]);
    if (request !== revision) return;
    if (!loaded) {
      desired = current;
      if (announce) status.textContent = 'Не удалось загрузить кадр. Попробуйте выбрать ракурс ещё раз.';
      return;
    }
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-leaving', i === current);
      slide.classList.toggle('is-current', i === target);
      slide.setAttribute('aria-hidden', String(i !== target));
    });
    current = target;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
    const label = slides[current].dataset.label!;
    gallery.querySelector<HTMLElement>('[data-view-number]')!.textContent = `0${current + 1}`;
    gallery.querySelector<HTMLElement>('[data-view-label]')!.textContent = label;
    if (announce) status.textContent = `${label}. Кадр ${current + 1} из ${slides.length}.`;
  };

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => { clearTimeout(hoverTimer); void show(i); });
    button.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => { void show(i, false); }, 120);
    });
    button.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  });
  gallery.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => {
    button.addEventListener('click', () => { clearTimeout(hoverTimer); void show(desired + Number(button.dataset.step)); });
  });
  gallery.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const actions: Record<string, number> = { ArrowLeft: desired - 1, ArrowRight: desired + 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in actions)) return;
    event.preventDefault();
    clearTimeout(hoverTimer);
    void show(actions[event.key]);
  });
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.target instanceof Element && event.target.closest('button')) return;
    touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture?.(event.pointerId);
  });
  stage.addEventListener('pointerup', event => {
    if (!touchStart || event.pointerId !== touchStart.id) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = undefined;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) void show(desired + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { touchStart = undefined; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(hoverTimer); });
  reduced.addEventListener('change', () => { clearTimeout(hoverTimer); });
});

document.querySelectorAll<HTMLElement>('[data-look-preview]').forEach(frame => {
  if (frame.dataset.initialized) return;
  frame.dataset.initialized = 'true';
  const slides = [...frame.querySelectorAll<HTMLElement>('[data-slide]')];
  const markers = [...frame.querySelectorAll<HTMLElement>('[data-preview-marker]')];
  let current = 0;
  let desired = 0;
  let revision = 0;
  let timer = 0;
  const show = async (index: number) => {
    desired = index;
    const request = ++revision;
    if (index === current) return;
    if (!await ready(slides[index]) || request !== revision) return;
    slides.forEach((slide, i) => { slide.classList.toggle('is-current', i === index); slide.setAttribute('aria-hidden', String(i !== index)); });
    markers.forEach((marker, i) => marker.classList.toggle('is-current', i === index));
    current = index;
  };
  const reset = () => { clearTimeout(timer); void show(0); };
  frame.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return;
    const box = frame.getBoundingClientRect();
    if (box.width < 1) return;
    const index = Math.max(0, Math.min(slides.length - 1, Math.floor((event.clientX - box.left) / box.width * slides.length)));
    if (index === desired) return;
    desired = index;
    clearTimeout(timer);
    timer = window.setTimeout(() => { void show(index); }, 100);
  });
  frame.addEventListener('pointerleave', reset);
  finePointer.addEventListener('change', reset);
  reduced.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
});
export {};
