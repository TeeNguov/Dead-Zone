import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { aimHeight, enemyAimShape, pickAimPoint, traceAimedVolley } from '../src/aiming.js';
import { WEAPONS } from '../src/combat.js';
test('near aim points are low and distant aim points approach muzzle height', () => {
  assert.equal(aimHeight(3), .55); assert.equal(aimHeight(40), 1.95); assert.ok(aimHeight(12) < aimHeight(22));
});
test('downward aim hits dogs while a level bullet passes above them', () => {
  const dog = { monsterType: 'hound', group: new THREE.Group() }; dog.group.position.set(0, .32, -5);
  const origin = { x: .12, y: 1.9, z: 0 }, shape = enemyAimShape(dog);
  const low = traceAimedVolley(origin, { x: 0, y: .8, z: -5 }, 0, WEAPONS[1], [], [shape]);
  assert.equal(low.hits[0].target, dog); assert.ok(low.shots[0].impact.y < 1.4);
  assert.equal(traceAimedVolley(origin, { x: 0, y: 1.9, z: -20 }, 0, WEAPONS[1], [], [shape]).hits.length, 0);
});
test('mouse ray recognises dog bodies, including long muzzles at rotated headings', () => {
  for (const angle of [0, Math.PI / 2, Math.PI]) {
    const dog = { monsterType: 'hound', group: new THREE.Group() }; dog.group.position.set(0, .32, -5); dog.group.rotation.y = angle;
    const point = dog.group.localToWorld(new THREE.Vector3(0, .6, -1));
    const ray = new THREE.Ray(point.clone().add(new THREE.Vector3(0, 10, 5)), new THREE.Vector3(0, -10, -5).normalize());
    const target = pickAimPoint(ray, { x: 0, z: 0 }, [dog]);
    assert.ok(target.y >= .32 && target.y <= 1.4);
  }
});
test('height-aware shots stop at cover and on the floor', () => {
  const origin = { x: 0, y: 2, z: 0 }, target = { x: 0, y: .6, z: -6 }, enemy = {};
  const volley = traceAimedVolley(origin, target, 0, WEAPONS[2], [{ x: 0, z: -2, w: 10, d: .2, height: 3 }], [{ x: 0, z: -6, radius: 1, height: 1, target: enemy }]);
  assert.equal(volley.hits.length, 0); assert.ok(volley.shots.every(s => s.impact && !s.impact.target));
  const ground = traceAimedVolley(origin, target, 0, WEAPONS[1], [], []);
  assert.ok(Math.abs(ground.shots[0].impact.y - .32) < 1e-6);
});
