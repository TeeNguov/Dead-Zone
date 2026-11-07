import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, createCombat, useWeapon, traceVolley } from '../src/combat.js';
import { collectItem, randomPickupPosition } from '../src/pickups.js';
import { isBlocked, distance } from '../src/physics.js';

test('shotgun fires eight pellets while consuming one shell', () => {
  const combat = createCombat(); combat.selected = 2;
  const weapon = useWeapon(combat);
  assert.equal(combat.ammo[2], 15);
  const target = {}, volley = traceVolley({ x: 0, z: 0 }, 0, weapon, [], [{ x: 0, z: -2, radius: .5, target }]);
  assert.equal(volley.shots.length, 8);
  assert.equal(volley.hits.length, 1);
  assert.ok(volley.hits[0].damage > 100);
  assert.equal(useWeapon(combat), null);
});

test('shotgun spread can hit multiple monsters, loses power at distance, and respects walls', () => {
  const weapon = WEAPONS[2], origin = { x: 0, z: 0 };
  const pair = [{ x: -.5, z: -4, radius: .4, target: {} }, { x: .5, z: -4, radius: .4, target: {} }];
  assert.equal(traceVolley(origin, 0, weapon, [], pair).hits.length, 2);
  assert.equal(traceVolley(origin, 0, weapon, [{ x: 0, z: -1, w: 10, d: .2 }], pair).hits.length, 0);
  const close = traceVolley(origin, 0, weapon, [], [{ x: 0, z: -2, radius: .5, target: {} }]);
  const far = traceVolley(origin, 0, weapon, [], [{ x: 0, z: -12, radius: .5, target: {} }]);
  assert.ok(close.hits[0].damage > far.hits[0].damage);
});

test('random loot spawns clear of obstacles, existing items and the player', () => {
  let seed = 71;
  const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const obstacles = [{ x: 30, z: 0, w: 20, d: 80 }, { x: -20, z: -20, radius: 3 }];
  const player = { x: 40, z: 44 }, occupied = [];
  for (let i = 0; i < 25; i++) {
    const point = randomPickupPosition(obstacles, occupied, player, random);
    assert.ok(point);
    assert.equal(isBlocked(point.x, point.z, .6, obstacles), false);
    assert.ok(distance(point, player) >= 8);
    assert.ok(occupied.every(p => distance(p, point) >= 5));
    occupied.push(point);
  }
  assert.equal(randomPickupPosition([{ x: 0, z: 0, w: 300, d: 300 }]), null);
});

test('health pickup heals once, clamps at full health, and remains unused when unnecessary', () => {
  const combat = createCombat(), player = { health: 90 }, state = { cash: 0 };
  assert.ok(collectItem('health', combat, player, state));
  assert.equal(player.health, 100);
  assert.equal(collectItem('health', combat, player, state), null);
  assert.equal(state.cash, 0);
});

test('weapon-specific ammunition grants matching rounds without currency', () => {
  const combat = createCombat(), player = { health: 100 }, state = { cash: 0 };
  const pistol = combat.reserve[1], shells = combat.reserve[2];
  assert.ok(collectItem('ammo', combat, player, state));
  assert.ok(combat.reserve[1] > pistol); assert.equal(combat.reserve[2], shells);
  const afterAmmo = combat.reserve[2];
  assert.ok(collectItem('shells', combat, player, state)); assert.equal(combat.reserve[2], afterAmmo + 16);
  assert.ok(collectItem('grenades', combat, player, state)); assert.equal(combat.grenades, 7);
  combat.grenades = 20; assert.equal(collectItem('grenades', combat, player, state), null);
  assert.equal(collectItem('cash', combat, player, state), null);
  const smg = combat.reserve[3], gatling = combat.reserve[4];
  collectItem('smgAmmo', combat, player, state); assert.equal(combat.reserve[3], smg + 60);
  collectItem('gatlingAmmo', combat, player, state); assert.equal(combat.reserve[4], gatling + 120);
});
