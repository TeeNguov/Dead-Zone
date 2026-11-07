import test from 'node:test';
import assert from 'node:assert/strict';
import { createAntidoteGuide, nearestIngredient } from '../src/antidote-guide.js';
import { clearPath, distance } from '../src/physics.js';
test('guide switches to the nearest remaining ingredient after collection', () => {
  const items = [{ x: 2, z: 0 }, { x: 12, z: 0 }], player = { x: 0, z: 0 };
  assert.equal(nearestIngredient(items, player), items[0]); items[0].collected = true;
  assert.equal(nearestIngredient(items, player), items[1]); items[1].collected = true;
  assert.equal(nearestIngredient(items, player), null);
});
test('guide routes around buildings and vehicles without clipping cover', () => {
  const walls = [{ x: 0, z: 0, w: 6, d: 12 }], cars = [{ x: 6, z: 8, radius: 1.5 }];
  const from = { x: -12, z: 0 }, target = { x: 12, z: 0 };
  const guide = createAntidoteGuide(walls), path = guide.route(from, target, cars);
  assert.ok(path.length > 2); assert.ok(distance(path.at(-1), target) < .2);
  for (let i = 1; i < path.length; i++) assert.ok(clearPath(path[i - 1], path[i], .5, [...walls, ...cars]));
  walls.splice(0, 1); assert.deepEqual(guide.route(from, target), [from, target]);
  assert.deepEqual(guide.route(from, null), []);
});
