import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCity } from '../src/world.js';
import { moveBody, clearPath } from '../src/physics.js';
import { driveWithImpacts } from '../src/vehicle-impact.js';
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
test('tiny street details no longer block walking, driving or navigation', () => {
  const city = createCity(new THREE.Scene());
  const tiny = city.colliders.filter(c => c.w <= .4 && c.d <= .4);
  assert.ok(tiny.length > 0); assert.ok(tiny.every(c => c.walkThrough));
  for (const shape of tiny) {
    const player = { x: shape.x - 2, z: shape.z, radius: .5 };
    assert.equal(moveBody(player, 4, 0, [shape]), false);
    assert.ok(clearPath({ x: shape.x - 2, z: shape.z }, { x: shape.x + 2, z: shape.z }, .5, [shape]));
  }
  const detail = { x: 0, z: 0, w: .2, d: .2, walkThrough: true };
  const car = { x: 0, z: 5, heading: 0, speed: 10 };
  assert.equal(driveWithImpacts(car, .8, 0, () => [detail], () => assert.fail('no impact')).hit, false);
  assert.ok(car.z < 0);
  assert.ok(city.colliders.filter(c => c.target?.type === 'tree' || c.target?.type === 'bench').every(c => !c.walkThrough));
});
