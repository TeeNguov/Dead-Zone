import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat, tickCombat, useWeapon, reloadWeapon, WEAPONS } from '../src/combat.js';
import { GRENADE, throwGrenade, tickGrenade, blastDamage } from '../src/grenades.js';
import { isBlocked } from '../src/physics.js';

test('grenade throws consume stock, enforce cooldown, and reject empty inventory', () => {
  const combat = createCombat();
  assert.ok(throwGrenade(combat, { x: 0, z: 0 }, 0));
  assert.equal(combat.grenades, 4);
  assert.equal(throwGrenade(combat, { x: 0, z: 0 }, 0), null);
  tickCombat(combat, 1);
  assert.ok(throwGrenade(combat, { x: 0, z: 0 }, 0));
  combat.grenades = 0; tickCombat(combat, 1);
  assert.equal(throwGrenade(combat, { x: 0, z: 0 }, 0), null);
});

test('grenade arcs, bounces against walls without tunneling, and detonates once', () => {
  const combat = createCombat(), grenade = throwGrenade(combat, { x: 0, z: 4 }, 0);
  const wall = [{ x: 0, z: 0, w: 10, d: .1 }];
  let detonations = 0, rose = false, bounced = false;
  for (let i = 0; i < 60; i++) {
    if (tickGrenade(grenade, .05, wall)) detonations++;
    rose ||= grenade.y > 1.2; bounced ||= grenade.vz > 0;
    assert.equal(isBlocked(grenade.x, grenade.z, .18, wall), false);
  }
  assert.ok(rose && bounced); assert.equal(detonations, 1); assert.equal(grenade.active, false);
});

test('grenade blast damages multiple targets with falloff, cover, and a finite radius', () => {
  const origin = { x: 0, z: 0 };
  assert.ok(blastDamage(origin, { x: 1, z: 0 }, []) > blastDamage(origin, { x: 6, z: 0 }, []));
  assert.equal(blastDamage(origin, { x: GRENADE.radius, z: 0 }, []), 0);
  assert.equal(blastDamage(origin, { x: 5, z: 0 }, [{ x: 3, z: 0, w: .2, d: 10 }]), 0);
  assert.ok(blastDamage(origin, { x: -5, z: 0 }, [{ x: 3, z: 0, w: .2, d: 10 }]) > 0);
});

test('Gatling spins up before firing and maintains its fire interval and belt count', () => {
  const combat = createCombat(); combat.selected = 4;
  assert.equal(useWeapon(combat), null); assert.equal(combat.ammo[4], 120);
  tickCombat(combat, .2, true); assert.equal(useWeapon(combat), null);
  tickCombat(combat, .2, true); assert.equal(useWeapon(combat), WEAPONS[4]);
  assert.equal(combat.ammo[4], 119); assert.equal(useWeapon(combat), null);
  tickCombat(combat, .05, true); assert.ok(useWeapon(combat)); assert.equal(combat.ammo[4], 118);
  tickCombat(combat, 1, false); assert.equal(combat.spin, 0);
});

test('Gatling automatically feeds reserve ammunition and never reloads', () => {
  const combat = createCombat(); combat.selected = 4; combat.ammo[4] = 1; combat.reserve[4] = 2;
  assert.equal(reloadWeapon(combat), false);
  for (let i = 0; i < 3; i++) { tickCombat(combat, .4, true); assert.equal(useWeapon(combat), WEAPONS[4]); assert.equal(combat.reloadRemaining, 0); }
  assert.equal(combat.ammo[4], 0); assert.equal(combat.reserve[4], 0);
  tickCombat(combat, .4, true); assert.equal(useWeapon(combat), null);
  combat.selected = 5; assert.equal(useWeapon(combat), null); assert.equal(reloadWeapon(combat), false);
});
