import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { signature, curvePoint, distanceToCurve, transformCurve, footerCurve, assemblyProgress, advance, follow } from '../assets/dox/ink-core.js';

test('Signature retains closed d, o and dot paths', () => {
  for (const start of [0, 6, 14]) {
    for (let i = start; i < start + 3; i++) assert.deepEqual(signature[i][3], signature[i + 1][0]);
    assert.deepEqual(signature[start + 3][3], signature[start][0]);
  }
  assert.equal(signature.length, 18);
});
test('Curve hit detection follows the visible curve', () => {
  const curve = [[0,0], [20,50], [40,-50], [60,0]];
  assert.deepEqual(curvePoint(curve, 0), [0,0]);
  assert.deepEqual(curvePoint(curve, 1), [60,0]);
  assert.equal(distanceToCurve(curve, 30, 0), 0);
  assert.ok(distanceToCurve(curve, 300, 300) > 200);
  assert.deepEqual(transformCurve(curve, 10, 20, 0, 2)[3], [130,20]);
});
test('Scroll assembly clamps and maps glyph to the footer', () => {
  assert.equal(assemblyProgress(900, 900), 0);
  assert.equal(assemblyProgress(0, 900), 1);
  assert.equal(assemblyProgress(-500, 900), 1);
  assert.equal(assemblyProgress(1500, 900), 0);
  assert.equal(assemblyProgress(585, 844, 147), 1);
  assert.deepEqual(footerCurve([[1000,420]], {left:20, top:100, width:350, height:147}), [[370,247]]);
});
test('Movement remains bounded and smoothing is frame-rate independent', () => {
  const p = {x:1000, y:1000, vx:40, vy:40};
  advance(p, .035, 390, 844);
  assert.ok(p.x <= 343.2 && p.y <= 794);
  assert.ok(p.vx < 0 && p.vy < 0);
  assert.ok(Math.abs((1 - follow(5, 1/60)) ** 60 - (1 - follow(5, 1/30)) ** 30) < 1e-12);
});
test('All local links and assets exist; dot and no-JS signature remain', async () => {
  const root = new URL('../', import.meta.url);
  const html = await readFile(new URL('index.html', root), 'utf8');
  for (const match of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
    const path = match[1].slice(1);
    await access(new URL(path.endsWith('/') ? path + 'index.html' : path, root));
  }
  assert.match(html, /<h2 class="sr-only">dox\.<\/h2>/);
  assert.equal((html.match(/<path d="M\d+ \d+ C/g) || []).length, 18);
  await access(new URL('assets/dox/social.png', root));
});
