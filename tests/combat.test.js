import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat, useWeapon, reloadWeapon, tickCombat, traceAttack, WEAPONS } from '../src/combat.js';

test('firing consumes ammunition and enforces rate of fire', () => {
  const c = createCombat(); c.selected = 1;
  assert.equal(useWeapon(c), WEAPONS[1]);
  assert.equal(c.ammo[1], 11);
  assert.equal(useWeapon(c), null);
  tickCombat(c, .3);
  assert.ok(useWeapon(c));
  assert.equal(c.ammo[1], 10);
});

test('reload waits, blocks shooting, and conserves total ammunition', () => {
  const c = createCombat(); c.selected = 2; c.ammo[2] = 2; c.reserve[2] = 5;
  assert.equal(reloadWeapon(c), true);
  assert.equal(useWeapon(c), null);
  tickCombat(c, 1); assert.equal(c.ammo[2], 2);
  tickCombat(c, 1); assert.equal(c.ammo[2], 7); assert.equal(c.reserve[2], 0);
  assert.equal(reloadWeapon(c), false);
});

test('empty gun starts reloading without creating a shot', () => {
  const c = createCombat(); c.selected = 1; c.ammo[1] = 0;
  assert.equal(useWeapon(c), null);
  assert.ok(c.reloadRemaining > 0);
  tickCombat(c, 2);
  assert.equal(c.ammo[1], 12); assert.equal(c.reserve[1], 84);
});

test('punching works without ammunition and has a cooldown', () => {
  const c = createCombat(); c.selected = 1; c.ammo[1] = 0; c.reserve[1] = 0;
  assert.equal(useWeapon(c, true), WEAPONS[0]);
  assert.equal(useWeapon(c, true), null);
  tickCombat(c, .5);
  assert.equal(useWeapon(c, true), WEAPONS[0]);
});

const origin = { x: 0, z: 0 }, direction = { x: 0, z: -1 };
test('shots hit the nearest target and cannot pass through walls or cars', () => {
  const far = { x: 0, z: -10, radius: .5, target: 'far' };
  const near = { x: 0, z: -5, radius: .5, target: 'near' };
  assert.equal(traceAttack(origin, direction, 50, [], [far, near]).target, 'near');
  const wall = { x: 0, z: -2, w: 4, d: 1 };
  const impact = traceAttack(origin, direction, 50, [wall], [near]);
  assert.equal(impact.target, null); assert.equal(impact.distance, 1.5);
  const car = { x: 0, z: -3, radius: 1.25, target: 'car' };
  assert.equal(traceAttack(origin, direction, 50, [], [near, car]).target, 'car');
});

test('attacks miss targets behind the player, outside range, or beside the aim ray', () => {
  for (const target of [{ x: 0, z: 4, radius: .5 }, { x: 0, z: -10, radius: .5 }, { x: 2, z: -1, radius: .5 }]) {
    assert.equal(traceAttack(origin, direction, 1.8, [], [target]), null);
  }
  assert.equal(traceAttack(origin, { x: 0, z: 0 }, 50, [], []), null);
});

test('ray intersection handles wall edges, parallel rays and an origin inside a collider', () => {
  assert.equal(traceAttack(origin, direction, 50, [{ x: 3, z: -2, w: 1, d: 1 }], []), null);
  assert.equal(traceAttack(origin, direction, 50, [{ x: 0, z: 0, w: 1, d: 1 }], []).distance, 0);
  assert.equal(traceAttack(origin, direction, 50, [], [{ x: 0, z: 0, radius: 1, target: 'inside' }]).distance, 0);
});
