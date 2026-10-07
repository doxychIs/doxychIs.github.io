export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const mix = (a, b, amount) => a + (b - a) * amount;
export const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const follow = (rate, seconds) => 1 - Math.exp(-rate * seconds);

export function curvePoint(points, t) {
  const a = 1 - t;
  return [0, 1].map(axis => a ** 3 * points[0][axis] + 3 * a ** 2 * t * points[1][axis] + 3 * a * t ** 2 * points[2][axis] + t ** 3 * points[3][axis]);
}

export function distanceToCurve(points, x, y) {
  let distance = Infinity;
  for (let i = 0; i <= 16; i++) {
    const point = curvePoint(points, i / 16);
    distance = Math.min(distance, Math.hypot(point[0] - x, point[1] - y));
  }
  return distance;
}

export function pose(random = Math.random) {
  const templates = [
    [[-48, -8], [-22, 52], [24, -48], [48, 12]],
    [[-32, 25], [58, 62], [42, -56], [-18, -12]],
    [[-35, -15], [-10, -57], [52, 60], [26, -5]],
    [[-24, -35], [66, -43], [-62, 58], [32, 30]],
    [[-40, 24], [25, 40], [-30, -45], [40, -22]],
  ];
  return templates[Math.floor(random() * templates.length)].map(point => point.map(value => value + (random() - .5) * 16));
}

export const signature = [
  [[250,242],[249,292],[226,324],[174,324]],
  [[174,324],[126,324],[95,300],[95,246]],
  [[95,246],[95,195],[130,165],[180,165]],
  [[180,165],[224,165],[246,194],[250,242]],
  [[250,242],[250,214],[248,170],[250,142]],
  [[250,142],[252,103],[249,71],[250,42]],
  [[516,246],[516,293],[490,324],[438,324]],
  [[438,324],[384,324],[354,295],[354,246]],
  [[354,246],[354,196],[384,165],[438,165]],
  [[438,165],[490,165],[516,196],[516,246]],
  [[603,174],[622,199],[648,230],[675,254]],
  [[675,254],[697,278],[722,306],[744,324]],
  [[744,174],[724,199],[698,231],[675,254]],
  [[675,254],[648,280],[623,308],[603,324]],
  [[890,308],[890,317],[883,324],[874,324]],
  [[874,324],[865,324],[858,317],[858,308]],
  [[858,308],[858,299],[865,292],[874,292]],
  [[874,292],[883,292],[890,299],[890,308]],
];

export function transformCurve(points, x, y, angle = 0, scale = 1) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return points.map(([px, py]) => [x + (px * cos - py * sin) * scale, y + (px * sin + py * cos) * scale]);
}

export function footerCurve(points, rect) {
  return points.map(([x, y]) => [rect.left + x / 1000 * rect.width, rect.top + y / 420 * rect.height]);
}

export function assemblyProgress(top, viewportHeight, frameHeight = viewportHeight) {
  return ease((viewportHeight - top) / Math.min(viewportHeight * .78, frameHeight + 60));
}

export function advance(particle, seconds, width, height) {
  particle.x += particle.vx * seconds;
  particle.y += particle.vy * seconds;
  const margin = Math.min(65, width * .12);
  if (particle.x < margin || particle.x > width - margin) {
    particle.x = clamp(particle.x, margin, width - margin); particle.vx *= -1;
  }
  if (particle.y < 100 || particle.y > height - 50) {
    particle.y = clamp(particle.y, Math.min(100, height * .2), height - 50); particle.vy *= -1;
  }
  return particle;
}
