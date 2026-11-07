import test from 'node:test';
import assert from 'node:assert/strict';
import { createObjectives, collectSymbol, tickAcid, SYMBOL_LOCATIONS } from '../src/objectives.js';
import { makeBoss, makePerson, createCity } from '../src/world.js';
import { isBlocked } from '../src/physics.js';
import * as THREE from 'three';
test('five unique seals trigger strictly growing waves exactly once', () => {
  const state = createObjectives();
  assert.deepEqual([3, 0, 4, 2, 1].map(id => collectSymbol(state, id)), [50, 100, 200, 400, 800]);
  assert.equal(collectSymbol(state, 3), 0); assert.equal(collectSymbol(state, 5), 0);
  assert.equal(state.pending, 1550); assert.equal(state.found.size, 5);
});
const shot = () => ({ x: 0, y: 1.4, z: 0, vx: 10, vy: 3, vz: 0, life: 4 });
test('acid sweeps hit players, stop at cover, and can be dodged', () => {
  assert.equal(tickAcid(shot(), 1, { x: 5, z: 0 }, []), 'hit');
  assert.equal(tickAcid(shot(), 1, { x: 5, z: 0 }, [{ x: 2, z: 0, w: .1, d: 4 }]), 'wall');
  assert.equal(tickAcid(shot(), 1, { x: 2, z: 0 }, [{ x: 5, z: 0, w: .1, d: 4 }]), 'hit');
  assert.equal(tickAcid(shot(), .5, { x: 5, z: 3 }, []), 'flying');
  assert.equal(tickAcid(shot(), 5, { x: 5, z: 3 }, []), 'ground');
});
test('boss has finite geometry, larger collision body, and permanent defeat', () => {
  const boss = makeBoss(), triangle = makePerson(false, 'pyramid-head'), nurse = makePerson(false, 'nurse');
  const size = p => new THREE.Box3().setFromObject(p.group).getSize(new THREE.Vector3()).y;
  assert.ok(size(boss) > size(triangle)); assert.ok(size(triangle) > size(nurse));
  assert.ok(boss.health > 1000); assert.equal(boss.permanent, true); assert.ok(boss.radius > triangle.radius);
});
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
test('symbols and boss have clear city spawn positions; every supply has a ring', () => {
  const city = createCity(new THREE.Scene());
  for (const point of SYMBOL_LOCATIONS) assert.equal(isBlocked(point.x, point.z, .5, city.colliders), false);
  assert.equal(isBlocked(0, -12, 1.25, city.colliders), false);
  assert.ok(city.pickups.every(p => p.lightRing?.isMesh && p.lightRing.position.x === p.x));
});
