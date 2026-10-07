const button = document.querySelector<HTMLButtonElement>('.menu-toggle');
const nav = document.querySelector<HTMLElement>('#navigation');
const close = () => { button?.setAttribute('aria-expanded', 'false'); };
button?.addEventListener('click', () => button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true')));
nav?.addEventListener('click', e => { if ((e.target as HTMLElement).closest('a')) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && button?.getAttribute('aria-expanded') === 'true') { close(); button.focus(); } });
document.addEventListener('click', e => { if (!(e.target as HTMLElement).closest('.site-header')) close(); });
matchMedia('(min-width: 901px)').addEventListener('change', close);
export {};
