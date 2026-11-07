import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBloodParticles } from '../src/blood.js';
import { clearPath } from '../src/physics.js';

test('blood particles reuse one bounded mesh under sustained fire and expire completely', () => {
  const scene = new THREE.Scene(), blood = createBloodParticles(scene, 64);
  for (let i = 0; i < 100; i++) blood.burst({ x: 5, z: 8 }, { x: 0, z: -1 });
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0].count, 64);
  assert.equal(blood.activeCount, 64);
  for (let i = 0; i < 30; i++) blood.update(.05);
  assert.equal(blood.activeCount, 0);
  assert.equal(scene.children[0].visible, false);
  for (const n of scene.children[0].instanceMatrix.array) assert.ok(Number.isFinite(n));
  blood.burst({ x: -3, z: -2 }, { x: 1, z: 0 }, 16);
  blood.update(.016);
  assert.equal(blood.activeCount, 16);
  assert.equal(scene.children[0].visible, true);
});

test('continuous navigation sweeps detect thin obstacles and allow rounded corner clearance', () => {
  assert.equal(clearPath({ x: -10, z: 0 }, { x: 10, z: 0 }, .5, [{ x: .73, z: 0, w: .01, d: 1 }]), false);
  assert.equal(clearPath({ x: -10, z: 0 }, { x: 10, z: 0 }, .5, [{ x: .73, z: 0, radius: .01 }]), false);
  const wall = [{ x: 0, z: 0, w: 10, d: 10 }];
  assert.equal(clearPath({ x: 5.8, z: 5.8 }, { x: 7, z: 7 }, 1, wall), true);
  assert.equal(clearPath({ x: 5.4, z: 5.4 }, { x: 7, z: 7 }, 1, wall), false);
});
