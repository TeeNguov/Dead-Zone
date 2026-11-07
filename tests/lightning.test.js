import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLightning, activateLightning, tickLightning, interruptLightning } from '../src/lightning.js';
import { createLightningEffects } from '../src/lightning-effects.js';
const origin = { x: 0, z: 0 };
const enemies = () => Array.from({ length: 7 }, (_, i) => ({ group: { position: new THREE.Vector3(i + 2, .32, 0) } }));
test('lightning requires full meter and recharges after its eight-second activation', () => {
  const skill = createLightning(); assert.ok(activateLightning(skill)); assert.equal(skill.charge, 0);
  assert.equal(activateLightning(skill), false);
  tickLightning(skill, 8, origin, [], [], () => {}); assert.equal(skill.remaining, 0);
  tickLightning(skill, 10, origin, [], [], () => {}); assert.equal(skill.charge, 50); assert.equal(activateLightning(skill), false);
  tickLightning(skill, 10, origin, [], [], () => {}); assert.ok(activateLightning(skill));
});
test('three orbs strike at most four distinct nearest enemies every half-second', () => {
  const skill = createLightning(), hits = [], crowd = enemies(); activateLightning(skill);
  tickLightning(skill, .01, origin, crowd, [], enemy => hits.push(enemy));
  assert.equal(hits.length, 4); assert.equal(new Set(hits).size, 4); assert.deepEqual(hits, crowd.slice(0, 4));
  tickLightning(skill, .2, origin, crowd, [], enemy => hits.push(enemy)); assert.equal(hits.length, 4);
  tickLightning(skill, .3, origin, crowd, [], enemy => hits.push(enemy)); assert.equal(hits.length, 8);
});
test('lightning cannot strike through cover, outside range, or fallen enemies', () => {
  const skill = createLightning(), crowd = enemies(), hits = []; activateLightning(skill);
  crowd[0].down = Infinity; crowd[1].group.position.z = 25;
  tickLightning(skill, .01, origin, crowd, [{ x: 6, z: 0, w: .2, d: 8 }], enemy => hits.push(enemy));
  assert.deepEqual(hits, [crowd[2], crowd[3]]);
});
test('strike rate stays consistent across frame rates', () => {
  const counts = [1 / 30, 1 / 60, .2].map(dt => {
    const skill = createLightning(); activateLightning(skill); let count = 0;
    for (let elapsed = 0; elapsed < 8 - 1e-7; elapsed += dt) tickLightning(skill, dt, origin, enemies(), [], () => count++);
    return count;
  });
  assert.deepEqual(counts, [64, 64, 64]);
});
test('three orbiting balls and four bolts reuse their meshes and disappear when inactive', () => {
  const scene = new THREE.Scene(), effects = createLightningEffects(scene); const count = scene.children.length;
  effects.update(.1, { x: 4, z: 5 }, true); assert.equal(effects.orbs.length, 3); assert.ok(effects.group.visible);
  for (let i = 0; i < 4; i++) effects.strike(enemies()[i], i);
  assert.ok(effects.bolts.every(b => b.line.visible));
  effects.update(.2, { x: 9, z: 5 }, false); assert.equal(effects.group.visible, false);
  assert.ok(effects.bolts.every(b => !b.line.visible)); assert.equal(scene.children.length, count);
});

test('lightning stores up to three uses, spends one at a time and preserves energy on death', () => {
  const skill = createLightning();
  tickLightning(skill, 100, origin, [], [], () => {}); assert.equal(skill.charge, 300);
  assert.ok(activateLightning(skill)); assert.equal(skill.charge, 200);
  interruptLightning(skill); assert.equal(skill.charge, 200); assert.equal(skill.remaining, 0);
  assert.ok(activateLightning(skill)); assert.equal(skill.charge, 100);
  interruptLightning(skill); skill.charge = 175;
  interruptLightning(skill); assert.equal(skill.charge, 175, 'partial progress survives death');
});
