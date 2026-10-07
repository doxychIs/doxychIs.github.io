const clamp = value => Math.min(1, Math.max(0, value));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (from, to, value) => {
  if (to === from) return value >= to ? 1 : 0;
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const hash = (index, salt = 0) => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export function createHeroMorph(canvas, title) {
  const context = canvas?.getContext('2d', { alpha: true });
  const hero = canvas?.closest('.hero');
  if (!context || !hero || !title) return null;

  let width = 0;
  let height = 0;
  let ratio = 1;
  let progress = 0;
  let enabled = true;
  let nameTargets = [];
  let nickTargets = [];
  let scatterTargets = [];
  let particleCount = 0;
  let resizeTimer = 0;

  function pointsFromMask(draw) {
    const scale = width < 700 ? 0.62 : 0.48;
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.max(1, Math.round(width * scale));
    offscreen.height = Math.max(1, Math.round(height * scale));
    const offContext = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offContext) return [];

    offContext.setTransform(scale, 0, 0, scale, 0, 0);
    offContext.clearRect(0, 0, width, height);
    offContext.fillStyle = '#fff';
    draw(offContext);

    const image = offContext.getImageData(0, 0, offscreen.width, offscreen.height);
    const points = [];
    const step = width < 700 ? 2 : 3;
    for (let y = 0; y < offscreen.height; y += step) {
      for (let x = 0; x < offscreen.width; x += step) {
        if (image.data[(y * offscreen.width + x) * 4 + 3] > 110) {
          points.push({ x: x / scale, y: y / scale });
        }
      }
    }
    return points;
  }

  function pickPoints(source, count) {
    if (!source.length) return Array.from({ length: count }, () => ({ x: width / 2, y: height / 2 }));
    const picked = [];
    for (let index = 0; index < count; index++) {
      const position = Math.floor(((index + 0.37) / count) * source.length) % source.length;
      const point = source[position];
      picked.push({
        x: point.x + (hash(index, 1) - 0.5) * 1.8,
        y: point.y + (hash(index, 2) - 0.5) * 1.8
      });
    }
    return picked;
  }

  function buildTargets() {
    const heroRect = hero.getBoundingClientRect();
    const titleStyle = getComputedStyle(title);
    const titleFontSize = parseFloat(titleStyle.fontSize) || 120;
    const titleFont = `${titleStyle.fontWeight || 600} ${titleFontSize}px ${titleStyle.fontFamily || 'Arial'}`;
    const titleSpans = [...title.querySelectorAll('span')];

    const namePoints = pointsFromMask(offContext => {
      offContext.font = titleFont;
      offContext.textBaseline = 'alphabetic';
      titleSpans.forEach(span => {
        const rect = span.getBoundingClientRect();
        const x = rect.left - heroRect.left;
        const y = rect.top - heroRect.top;
        const baseline = y + rect.height * 0.79;
        offContext.fillText(span.textContent || '', x, baseline, Math.max(1, rect.width));
      });
    });

    const titleRect = title.getBoundingClientRect();
    const titleCenterY = titleRect.top - heroRect.top + titleRect.height / 2;
    const nickFontSize = width < 700
      ? Math.min(width * 0.38, 150)
      : Math.min(width * 0.245, 250);

    const nickPoints = pointsFromMask(offContext => {
      offContext.font = `600 ${nickFontSize}px Golos, Arial, sans-serif`;
      offContext.textAlign = 'center';
      offContext.textBaseline = 'middle';
      offContext.fillText('dox.', width / 2, titleCenterY, width * 0.76);
    });

    particleCount = width < 700 ? 280 : 620;
    nameTargets = pickPoints(namePoints, particleCount);
    nickTargets = pickPoints(nickPoints, particleCount);
    scatterTargets = Array.from({ length: particleCount }, (_, index) => ({
      x: width * (0.04 + hash(index, 4) * 0.92),
      y: height * (0.16 + hash(index, 5) * 0.68)
    }));
  }

  function resize() {
    width = Math.max(1, hero.clientWidth);
    height = Math.max(1, hero.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildTargets();
    render();
  }

  function render() {
    context.clearRect(0, 0, width, height);
    if (!enabled || !particleCount) {
      hero.style.setProperty('--hero-name-opacity', '1');
      return;
    }

    const nameFade = 1 - smooth(0.035, 0.19, progress);
    hero.style.setProperty('--hero-name-opacity', nameFade.toFixed(3));

    const particleIn = smooth(0.045, 0.18, progress);
    const scatter = smooth(0.16, 0.43, progress);
    const gather = smooth(0.42, 0.72, progress);
    const particleOut = 1 - smooth(0.88, 1, progress);
    const alpha = particleIn * particleOut;
    if (alpha <= 0.002) return;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#fff';

    for (let index = 0; index < particleCount; index++) {
      const start = nameTargets[index];
      const cloud = scatterTargets[index];
      const end = nickTargets[index];

      let x;
      let y;
      if (progress < 0.43) {
        x = mix(start.x, cloud.x, scatter);
        y = mix(start.y, cloud.y, scatter);
      } else {
        x = mix(cloud.x, end.x, gather);
        y = mix(cloud.y, end.y, gather);
      }

      const chaos = scatter * (1 - gather);
      const wave = Math.sin(progress * 13 + index * 0.71);
      x += wave * chaos * (5 + hash(index, 7) * 11);
      y += Math.cos(progress * 11 + index * 0.53) * chaos * (4 + hash(index, 8) * 9);

      const size = (width < 700 ? 2.2 : 3.2) * (0.62 + hash(index, 9) * 1.15);
      const angle = hash(index, 10) * Math.PI * 2 + progress * (hash(index, 11) - 0.5) * 4.5;
      const dx = Math.cos(angle) * size;
      const dy = Math.sin(angle) * size;

      context.globalAlpha = alpha * (0.38 + hash(index, 12) * 0.58);
      context.lineWidth = width < 700 ? 1.05 : 1.18;
      context.beginPath();
      context.moveTo(x - dx, y - dy);
      context.quadraticCurveTo(
        x + dy * 0.45,
        y - dx * 0.45,
        x + dx,
        y + dy
      );
      context.stroke();
    }

    context.restore();
    context.globalAlpha = 1;
  }

  function setProgress(value) {
    progress = clamp(value);
    render();
  }

  function setMotion(value) {
    enabled = Boolean(value);
    canvas.style.visibility = enabled ? 'visible' : 'hidden';
    if (!enabled) hero.style.setProperty('--hero-name-opacity', '1');
    render();
  }

  function scheduleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  }

  addEventListener('resize', scheduleResize, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(resize);
  else resize();

  return { setProgress, setMotion, resize };
}
