import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCity } from '../src/world.js';
import { clockAngles } from '../src/clock.js';
import { isBlocked } from '../src/physics.js';
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
test('city replaces three blocks with exactly one church, school and hospital', () => {
  const city = createCity(new THREE.Scene());
  assert.deepEqual(city.landmarks.map(l => l.kind).sort(), ['church','hospital','school']);
  for (const landmark of city.landmarks) {
    assert.ok(city.mapBuildings.some(b => b.kind === landmark.kind));
    assert.equal(isBlocked(landmark.x, landmark.z, .5, city.colliders), true);
    assert.ok(landmark.visuals.length > 0);
  }
  assert.equal(city.parkClock.faces.length, 4);
  assert.equal(isBlocked(0, 0, .5, city.colliders), true);
  assert.equal(isBlocked(0, -12, 1.25, city.colliders), false, 'boss spawn stays clear');
});
test('clock hands advance together on all four faces and wrap at twelve hours', () => {
  const city = createCity(new THREE.Scene()); city.parkClock.update(195);
  const expected = clockAngles(195);
  for (const face of city.parkClock.faces) {
    assert.equal(face.minute.rotation.z, expected.minute); assert.equal(face.hour.rotation.z, expected.hour);
  }
  assert.deepEqual(clockAngles(0), clockAngles(720));
  assert.ok(Math.abs(clockAngles(15).minute + Math.PI / 2) < 1e-8);
});
