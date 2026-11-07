import test from 'node:test';
import assert from 'node:assert/strict';
import { driveWithImpacts, impactProfile } from '../src/vehicle-impact.js';
import { applyKnockback } from '../src/combat.js';
const car = speed => ({ x: 0, z: 8, heading: 0, speed });
test('speed-based enemy impacts knock back and require repeated hits rather than guaranteed kills', () => {
  const enemy = { health: 100, legL: {}, monsterType: 'walker' }, vehicle = car(35);
  const obstacles = () => enemy.health > 0 ? [{ x: 0, z: 0, radius: .5, target: enemy }] : [];
  let hits = 0;
  const damage = (target, profile, direction) => { target.health -= profile.damage; applyKnockback(target, direction, profile); hits++; };
  driveWithImpacts(vehicle, .4, 0, obstacles, damage);
  assert.equal(enemy.health, 55); assert.ok(enemy.knockbackZ < 0); assert.ok(vehicle.z > 2);
  // Staying pressed against an enemy doesn't deal damage every frame.
  vehicle.speed = 10; driveWithImpacts(vehicle, .05, .05, obstacles, damage); assert.equal(hits, 1);
  vehicle.z = 8; vehicle.speed = 35; driveWithImpacts(vehicle, .4, 2, obstacles, damage); assert.equal(enemy.health, 10);
  vehicle.z = 8; vehicle.speed = 35; driveWithImpacts(vehicle, .4, 4, obstacles, damage); assert.ok(enemy.health <= 0);
});
test('crashing destroys props and slows the car according to their resistance', () => {
  const speeds = {};
  for (const type of ['tree', 'bench', 'bin', 'planter']) {
    const prop = { type, health: 45, destructible: true }, vehicle = car(20);
    const obstacles = () => prop.destroyed ? [] : [{ x: 0, z: 0, w: 1, d: 1, target: prop }];
    driveWithImpacts(vehicle, .5, 0, obstacles, (target, profile) => { target.health -= profile.damage; target.destroyed = target.health <= 0; });
    assert.ok(prop.destroyed); assert.ok(vehicle.speed > 0 && vehicle.speed < 20); speeds[type] = vehicle.speed;
  }
  assert.ok(speeds.bin > speeds.bench); assert.ok(speeds.bench > speeds.tree); assert.ok(speeds.tree > speeds.planter);
});
test('low-speed bumps do not repeatedly chip enemies; solid walls and surviving props block cars', () => {
  const enemy = { legL: {} }, vehicle = car(3); let count = 0;
  driveWithImpacts(vehicle, 3, 0, () => [{ x: 0, z: 0, radius: .5, target: enemy }], () => count++);
  assert.equal(count, 0); assert.equal(vehicle.speed, 0); assert.ok(vehicle.z > 2);
  const wallCar = car(39);
  const result = driveWithImpacts(wallCar, 1, 0, () => [{ x: 0, z: 0, w: 20, d: .1 }], () => assert.fail('walls are not damageable targets'));
  assert.ok(result.solid); assert.ok(wallCar.z > 2); assert.ok(wallCar.speed < 0);
});
test('heavier enemies resist damage and take more momentum from the car', () => {
  const normal = impactProfile(25, {}), heavy = impactProfile(25, { monsterType: 'pyramid-head' });
  assert.ok(heavy.damage < normal.damage); assert.ok(heavy.retention < normal.retention);
  assert.ok(impactProfile(100, {}).damage < 60, 'even dogs survive one full-health impact');
});
