import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCity } from '../src/world.js';
import { damageProp } from '../src/destructibles.js';
import { traceAttack } from '../src/combat.js';
import { isBlocked } from '../src/physics.js';
import { blastDamage } from '../src/grenades.js';
import { createBloodParticles } from '../src/blood.js';
import { buildingIsClose } from '../src/visibility.js';
import { createPursuitField } from '../src/pursuit.js';
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
test('props take weapon damage, disappear once, and remove their collision footprints', () => {
  const city = createCity(new THREE.Scene());
  for (const type of ['tree', 'bench', 'lamp', 'planter', 'sign']) {
    const prop = city.props.find(p => p.type === type);
    assert.ok(prop, type); assert.ok(prop.instances.length > 0);
    const collider = city.colliders.find(c => c.target === prop);
    const hit = traceAttack({ x: collider.x - collider.w / 2 - 1, z: collider.z }, { x: 1, z: 0 }, 5, [collider], []);
    assert.equal(hit.target, prop);
    assert.equal(damageProp(city, prop, 10), false);
    assert.equal(damageProp(city, prop, 100), true);
    assert.equal(damageProp(city, prop, 100), false);
    assert.ok(!city.colliders.some(c => c.target === prop));
    const matrix = new THREE.Matrix4();
    for (const index of prop.instances) { city.staticMesh.getMatrixAt(index, matrix); assert.equal(matrix.elements[0], 0); }
    assert.ok(prop.visuals.every(v => !v.visible));
    if (prop.light) assert.equal(prop.light.destroyed, true);
  }
  assert.equal(city.props.some(p => p.type === 'bin' || p.type === 'hydrant'), false);
  assert.equal(city.navigationDirty, true);
});
test('destroying a bench opens walking, shooting, and pursuit routes', () => {
  const city = createCity(new THREE.Scene()), prop = city.props.find(p => p.type === 'bench' && p.x === -7 && p.z === -9);
  assert.ok(isBlocked(prop.x, prop.z, .3, city.colliders));
  const blast = { x: prop.x, z: prop.z - 2 };
  const damage = blastDamage(blast, prop, city.colliders.filter(c => c.target !== prop));
  assert.ok(damage >= prop.health); damageProp(city, prop, damage);
  assert.equal(isBlocked(prop.x, prop.z, .3, city.colliders), false);
  const from = { x: prop.x, z: prop.z - 2 }, to = { x: prop.x, z: prop.z + 2 };
  assert.equal(traceAttack(from, { x: 0, z: 1 }, 4, city.colliders, []), null);
  const field = createPursuitField(city.colliders); field.update(to);
  assert.deepEqual(field.next(from, to), to);
});
test('acid droplets settle into flat floor particles, stay bounded and expire', () => {
  const scene = new THREE.Scene(), particles = createBloodParticles(scene, 48, { color: 0x70e52b, useHeight: true, splat: true, lifetime: 6 });
  particles.burst({ x: 0, y: .5, z: 0 }, { x: 0, z: 0 }, 22);
  for (let i = 0; i < 120; i++) particles.update(1 / 60);
  const matrix = new THREE.Matrix4(); scene.children[0].getMatrixAt(0, matrix);
  assert.ok(Math.abs(matrix.elements[13] - .43) < .001);
  assert.ok(matrix.elements[5] < matrix.elements[0]);
  for (let i = 0; i < 100; i++) particles.burst({ x: 0, y: .5, z: 0 }, { x: 0, z: 0 });
  assert.ok(particles.activeCount <= 48);
  particles.update(10); assert.equal(particles.activeCount, 0);
});
test('only player proximity triggers cutaways, regardless of camera direction', () => {
  const building = { x: 0, z: 20, w: 10, d: 10, h: 18 };
  assert.equal(buildingIsClose(building, { x: 0, z: 0 }), false);
  assert.equal(buildingIsClose(building, { x: 0, z: 11 }), true);
  assert.equal(buildingIsClose(building, { x: 0, z: 30.1 }), false);
});
