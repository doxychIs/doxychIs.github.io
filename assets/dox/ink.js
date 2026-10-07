import { signature, pose, mix, follow, distanceToCurve, transformCurve, footerCurve, assemblyProgress, advance, clamp } from './ink-core.js';

export function createInkScene(canvas, frame, replay) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  const particles = signature.map((_, index) => ({
    x: 0, y: 0, vx: 0, vy: 0, angle: Math.random() * Math.PI * 2,
    scale: .65 + Math.random() * .7, width: .85 + Math.random() * .65,
    shape: pose(), targetShape: pose(), awakeUntil: 0, nextPose: 0, nextTurn: 0,
    lastHit: -1000, points: [], seed: index * 2.31, spin: 0,
  }));
  let width = 0, height = 0, animation = 0, previous = 0, assembly = 0, motion = true;
  let burstStart = -Infinity, bursting = false, resized = false, reactions = 0;
  let pointer = { x: -1000, y: -1000, active: false, touch: false };
  const hero = document.querySelector('.hero');
  const status = document.querySelector('#ink-status');

  function resize() {
    const oldWidth = width, oldHeight = height;
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles.forEach((particle, index) => {
      if (resized) { particle.x = particle.x / oldWidth * width; particle.y = particle.y / oldHeight * height; }
      else {
        const side = index % 2;
        particle.x = width * (side ? .72 + Math.random() * .2 : .06 + Math.random() * .2);
        particle.y = 110 + Math.random() * Math.max(50, height - 190);
      }
    });
    resized = true; request();
  }

  function wake(particle, now, force = false) {
    if (!force && now - particle.lastHit < 1100) return;
    const away = Math.atan2(particle.y - pointer.y, particle.x - pointer.x) + (Math.random() - .5);
    const angle = force ? Math.random() * Math.PI * 2 : away;
    const speed = 26 + Math.random() * 35;
    particle.vx = Math.cos(angle) * speed; particle.vy = Math.sin(angle) * speed;
    particle.spin = (Math.random() - .5) * .6;
    particle.targetShape = pose(); particle.awakeUntil = now + 9000 + Math.random() * 6000;
    particle.nextPose = now + 1800; particle.nextTurn = now + 2500;
    particle.lastHit = now;
    reactions++; canvas.dataset.reactions = String(reactions);
  }

  function draw(now) {
    animation = 0;
    const seconds = previous ? clamp((now - previous) / 1000, 0, .035) : .016;
    previous = now;
    const rect = frame.getBoundingClientRect();
    let targetAssembly = assemblyProgress(rect.top, height, rect.height);
    if (bursting) {
      targetAssembly *= clamp((now - burstStart - 1400) / 1400);
      if (now - burstStart > 3800) {
        bursting = false; replay.disabled = false;
        if (status) status.textContent = 'Подпись dox. снова собрана.';
      }
    }
    assembly = motion ? mix(assembly, targetAssembly, follow(5, seconds)) : targetAssembly;
    if (targetAssembly === 1 && assembly > .997) assembly = 1;
    frame.dataset.assembled = String(assembly === 1);
    const heroRect = hero.getBoundingClientRect();
    const fieldOpacity = heroRect.bottom > height * .28 ? .52 : .18;
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#ffffff';

    particles.forEach((particle, index) => {
      const awake = motion && now < particle.awakeUntil && assembly < .95;
      if (awake) {
        if (now > particle.nextPose) { particle.targetShape = pose(); particle.nextPose = now + 2200 + Math.random() * 1300; }
        if (now > particle.nextTurn) {
          const turn = (Math.random() - .5) * .9;
          const cos = Math.cos(turn), sin = Math.sin(turn), vx = particle.vx;
          particle.vx = vx * cos - particle.vy * sin; particle.vy = vx * sin + particle.vy * cos;
          particle.nextTurn = now + 1800 + Math.random() * 2300;
        }
        advance(particle, seconds, width, height); particle.angle += particle.spin * seconds;
      } else { particle.vx *= .97; particle.vy *= .97; }
      if (motion) particle.shape = particle.shape.map((point, p) => point.map((value, axis) => mix(value, particle.targetShape[p][axis], follow(1.35, seconds))));
      const free = transformCurve(particle.shape, particle.x, particle.y, particle.angle, particle.scale * (width < 650 ? .72 : 1));
      const word = footerCurve(signature[index], rect);
      particle.points = free.map((point, p) => point.map((value, axis) => mix(value, word[p][axis], assembly)));
      if (motion && pointer.active && assembly < .65 && distanceToCurve(particle.points, pointer.x, pointer.y) < (pointer.touch ? 40 : 23)) wake(particle, now);
      const visible = width < 650 && index > 10 ? assembly : 1;
      context.globalAlpha = visible * mix(awake ? .85 : fieldOpacity, .96, assembly);
      context.lineWidth = mix(particle.width, Math.max(2.5, rect.width / 1000 * 4.6), assembly);
      context.beginPath(); context.moveTo(...particle.points[0]); context.bezierCurveTo(...particle.points[1], ...particle.points[2], ...particle.points[3]); context.stroke();
    });
    context.globalAlpha = 1;
    if (motion && !document.hidden) request();
  }

  function request() { if (!animation && !document.hidden) animation = requestAnimationFrame(draw); }
  function setMotion(enabled) {
    motion = enabled; previous = 0;
    if (!enabled) {
      cancelAnimationFrame(animation); animation = 0; bursting = false; replay.disabled = false;
      particles.forEach(particle => { particle.awakeUntil = 0; });
    }
    replay.hidden = !enabled; request();
  }

  addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY, touch: false, active: !event.target.closest('a,button,input,select,textarea') };
  }, { passive: true });
  addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.target.closest('a,button,input,select,textarea')) return;
    pointer = { x: event.clientX, y: event.clientY, touch: true, active: true };
    if (motion && assembly < .65) particles.forEach(particle => { if (particle.points.length && distanceToCurve(particle.points, pointer.x, pointer.y) < 65) wake(particle, performance.now()); });
    pointer.active = false;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });
  addEventListener('blur', () => { pointer.active = false; });
  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => { if (!motion) request(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animation); animation = 0; }
    else { previous = 0; request(); }
  });
  replay.addEventListener('click', () => {
    if (!motion || bursting) return;
    const now = performance.now(); burstStart = now; bursting = true; replay.disabled = true;
    particles.forEach(particle => wake(particle, now, true));
    if (status) status.textContent = 'Линии разлетаются и снова собираются в dox.';
    request();
  });
  resize(); document.documentElement.classList.add('ink-ready');
  return { setMotion };
}
