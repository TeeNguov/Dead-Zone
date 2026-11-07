import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat, useWeapon, reloadWeapon, tickCombat, traceAttack, WEAPONS } from '../src/combat.js';

test('firing consumes ammunition and enforces rate of fire', () => {
  const c = createCombat(); c.selected = 1;
  assert.equal(useWeapon(c), WEAPONS[1]);
  assert.equal(c.ammo[1], 23);
  assert.equal(useWeapon(c), null);
  tickCombat(c, .3);
  assert.ok(useWeapon(c));
  assert.equal(c.ammo[1], 22);
});

test('reload waits, blocks shooting, and conserves total ammunition', () => {
  const c = createCombat(); c.selected = 3; c.ammo[3] = 2; c.reserve[3] = 5;
  assert.equal(reloadWeapon(c), true);
  assert.equal(useWeapon(c), null);
  tickCombat(c, .3); assert.equal(c.ammo[3], 2);
  tickCombat(c, .4); assert.equal(c.ammo[3], 7); assert.equal(c.reserve[3], 0);
  assert.equal(reloadWeapon(c), false);
});

test('empty gun starts reloading without creating a shot', () => {
  const c = createCombat(); c.selected = 1; c.ammo[1] = 0;
  assert.equal(useWeapon(c), null);
  assert.ok(c.reloadRemaining > 0);
  tickCombat(c, 2);
  assert.equal(c.ammo[1], 24); assert.equal(c.reserve[1], 72);
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

test('hits push away from the attacker, with stronger melee and heavier Pyramid Head', async () => {
  const { applyKnockback } = await import('../src/combat.js');
  const fist = {}, pistol = {}, heavy = { monsterType: 'pyramid-head' };
  applyKnockback(fist, { x: 0, z: -2 }, WEAPONS[0]);
  applyKnockback(pistol, { x: 0, z: -2 }, WEAPONS[1]);
  applyKnockback(heavy, { x: 0, z: -2 }, WEAPONS[0]);
  assert.ok(fist.knockbackZ < pistol.knockbackZ);
  assert.ok(Math.abs(heavy.knockbackZ) < Math.abs(fist.knockbackZ));
  assert.equal(fist.knockbackX, 0);
  assert.ok(fist.staggerRemaining > 0);
});

test('knockback decays consistently across frame rates and caps repeated hits', async () => {
  const { applyKnockback, tickKnockback } = await import('../src/combat.js');
  function run(dt) {
    const monster = {}; let x = 0;
    applyKnockback(monster, { x: 1, z: 0 }, WEAPONS[0]);
    for (let t = 0; t < 1 - dt / 2; t += dt) tickKnockback(monster, dt, dx => { x += dx; return false; });
    assert.equal(monster.staggerRemaining, 0);
    return x;
  }
  assert.ok(Math.abs(run(1 / 30) - run(1 / 120)) < .01);
  const monster = {};
  for (let i = 0; i < 100; i++) applyKnockback(monster, { x: 1, z: 1 }, WEAPONS[3]);
  assert.ok(Math.hypot(monster.knockbackX, monster.knockbackZ) <= 12.00001);
});

test('knockback respects walls, vehicles and other characters, then stops on impact', async () => {
  const { applyKnockback, tickKnockback } = await import('../src/combat.js');
  const { moveBody, bodyBlocked, bodyDiscs } = await import('../src/physics.js');
  for (const obstacles of [[{ x: 0, z: 0, w: .2, d: 10 }], bodyDiscs({ x: 0, z: 0, radius: 1.25, length: 4.9 }), bodyDiscs({ x: 0, z: 0 })]) {
    const monster = {}, body = { x: -3, z: 0 };
    applyKnockback(monster, { x: 1, z: 0 }, WEAPONS[0]);
    for (let i = 0; i < 40; i++) tickKnockback(monster, .05, (dx, dz) => moveBody(body, dx, dz, obstacles));
    assert.equal(bodyBlocked(body, obstacles), false);
    assert.ok(body.x < 0);
    assert.equal(monster.knockbackX, 0);
  }
});

test('larger guns hit harder per bullet and maintain higher sustained firepower than the pistol', () => {
  const pistol = WEAPONS[1], smg = WEAPONS[3], gatling = WEAPONS[4], shotgun = WEAPONS[2];
  assert.ok(smg.damage > pistol.damage); assert.ok(gatling.damage > smg.damage);
  assert.ok(shotgun.damage * shotgun.pellets > gatling.damage);
  assert.ok(smg.damage / smg.interval > pistol.damage / pistol.interval);
  assert.ok(gatling.damage / gatling.interval > smg.damage / smg.interval);
});

test('weapon slots follow fists, pistol, shotgun, SMG, Gatling, launcher', () => {
  assert.deepEqual(WEAPONS.map(weapon => weapon.name), ['Fists', 'Pistol', 'Shotgun', 'SMG', 'Gatling', 'Grenade Launcher']);
  assert.equal(WEAPONS[4].noReload, true); assert.equal(WEAPONS[4].reload, 0);
});
