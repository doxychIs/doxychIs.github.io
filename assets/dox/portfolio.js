import { createInkScene } from './ink.js';

const canvas = document.querySelector('#ink-field');
const signature = document.querySelector('#signature');
const replay = document.querySelector('#replay-ink');
const button = document.querySelector('#motion-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let preference;
try { preference = localStorage.getItem('dox.motion'); } catch {}
let moving = preference === 'off' ? false : preference === 'on' ? true : !reduced.matches;
const scene = canvas && signature && replay ? createInkScene(canvas, signature, replay) : null;

function applyMotion() {
  document.documentElement.dataset.motion = moving ? 'on' : 'off';
  button.setAttribute('aria-pressed', String(moving));
  button.setAttribute('aria-label', moving ? 'Анимация включена. Выключить движение.' : 'Анимация выключена. Включить движение.');
  button.querySelector('span').textContent = moving ? 'Движение: вкл' : 'Движение: выкл';
  scene?.setMotion(moving);
}
if (scene) { button.hidden = false; applyMotion(); }
button.addEventListener('click', () => {
  moving = !moving; preference = moving ? 'on' : 'off';
  try { localStorage.setItem('dox.motion', preference); } catch {}
  applyMotion();
});
reduced.addEventListener('change', () => { if (!preference) { moving = !reduced.matches; applyMotion(); } });

const filters = [...document.querySelectorAll('[data-filter]')];
const projects = [...document.querySelectorAll('.project')];
const filterBar = document.querySelector('.filters');
filterBar.hidden = false;
filters.forEach(filter => filter.addEventListener('click', () => {
  const value = filter.dataset.filter;
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === filter)));
  projects.forEach(project => { project.hidden = value !== 'all' && project.dataset.kind !== value; });
  const visible = projects.filter(project => !project.hidden).length;
  document.querySelector('#project-count').textContent = String(visible).padStart(2, '0');
  document.querySelector('#filter-status').textContent = value === 'all' ? 'Показаны все четыре проекта.' : value === 'sites' ? 'Показаны три сайта.' : 'Показана одна игра.';
}));

const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
projects.forEach(project => {
  const preview = project.querySelector('.preview');
  project.addEventListener('pointermove', event => {
    if (!finePointer.matches || !moving) return;
    const rect = project.getBoundingClientRect();
    preview.style.setProperty('--preview-x', `${((event.clientX - rect.left) / rect.width - .5) * 22}px`);
    preview.style.setProperty('--preview-y', `${((event.clientY - rect.top) / rect.height - .5) * 16}px`);
  }, { passive: true });
  project.addEventListener('pointerleave', () => { preview.style.setProperty('--preview-x', '0px'); preview.style.setProperty('--preview-y', '0px'); });
});

const sections = [...document.querySelectorAll('[data-section]')];
const sectionLinks = [...document.querySelectorAll('[data-section-link]')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach(link => {
        if (link.dataset.sectionLink === entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -45% 0px' });
  sections.forEach(section => observer.observe(section));
}
