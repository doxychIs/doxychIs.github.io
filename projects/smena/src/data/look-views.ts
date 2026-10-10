import { looks } from './catalog';

export function lookViews(look: typeof looks[number]) {
  return [
    { image: look.image, width: 512, label: 'Портрет', alt: look.alt },
    { image: `${look.image}-profile`, width: 768, label: 'Профиль', alt: `${look.title}: профиль модели, боковая линия стрижки` },
    { image: `${look.image}-back`, width: 768, label: 'Сзади', alt: `${look.title}: ракурс сзади, объём и линия затылка` },
  ];
}

export const viewNotes: Record<string, string> = {
  line: 'В профиль — точная линия у подбородка. Сзади — чистый срез и округлый силуэт каре.',
  texture: 'В профиль — мягкие слои у лица. Сзади — естественные волны и подвижный объём.',
  copper: 'В профиль — тёплые блики у лица. Сзади — глубина медного оттенка и мягкий контур боба.',
};
