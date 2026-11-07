import test from 'node:test';
import assert from 'node:assert/strict';
import { createPursuitField } from '../src/pursuit.js';
import { distance, moveBody, bodyBlocked, bodyDiscs } from '../src/physics.js';

function walk(field, actor, target, obstacles, seconds = 60) {
  for (let t = 0; t < seconds; t += .05) {
    const waypoint = field.next(actor, target);
    if (!waypoint) continue;
    const d = distance(actor, waypoint), step = Math.min(d, .05);
    if (d > .01) moveBody(actor, (waypoint.x - actor.x) / d * step, (waypoint.z - actor.z) / d * step, obstacles);
    assert.equal(bodyBlocked(actor, obstacles), false);
  }
}

test('monster slowly routes around a building to reach the player', () => {
  const obstacles = [{ x: 0, z: 0, w: 6, d: 14 }];
  const field = createPursuitField(obstacles);
  const actor = { x: -10, z: 0 }, target = { x: 10, z: 0 };
  field.update(target);
  walk(field, actor, target, obstacles);
  assert.ok(distance(actor, target) < 1);
});

test('monster routes around a stopped vehicle rather than through its bumpers', () => {
  const cars = bodyDiscs({ x: 0, z: 0, heading: 0, radius: 1.25, length: 4.9 });
  const field = createPursuitField([]);
  const actor = { x: -8, z: 0 }, target = { x: 8, z: 0 };
  field.update(target, cars);
  walk(field, actor, target, cars, 35);
  assert.ok(distance(actor, target) < 1);
});

test('pursuit updates when the player changes direction or enters a car', () => {
  const field = createPursuitField([]), actor = { x: 0, z: 0 };
  field.update({ x: 10, z: 0 });
  assert.ok(field.next(actor, { x: 10, z: 0 }).x > 0);
  field.update({ x: -10, z: 0 });
  assert.ok(field.next(actor, { x: -10, z: 0 }).x < 0);
  const target = { x: 10, z: 0 }, car = bodyDiscs({ ...target, heading: 0, radius: 1.25, length: 4.9 });
  field.update(target, car);
  walk(field, actor, target, car, 30);
  assert.ok(distance(actor, target) < 5);
  assert.equal(bodyBlocked(actor, car), false);
});
