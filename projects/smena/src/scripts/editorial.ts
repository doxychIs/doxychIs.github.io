// Один плавный срез фотографии при появлении в поле зрения.
// Без обработчиков прокрутки, постоянных циклов и скрытого текста.
const frames = [...document.querySelectorAll<HTMLElement>('.direction-image, .look-photo')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (!reduced.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('editorial-waiting');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -35px 0px' });
  frames.forEach(frame => {
    frame.classList.add('editorial-frame');
    if (frame.getBoundingClientRect().top > innerHeight - 30) {
      frame.classList.add('editorial-waiting');
      observer.observe(frame);
    }
  });
  reduced.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    frames.forEach(frame => frame.classList.remove('editorial-waiting'));
  });
  document.addEventListener('focusin', event => {
    const link = (event.target as HTMLElement).closest('.direction-card, .look-card');
    const frame = link?.querySelector('.editorial-waiting');
    if (frame) { frame.classList.remove('editorial-waiting'); observer.unobserve(frame); }
  });
}
export {};
