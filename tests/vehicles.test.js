import test from 'node:test';
import assert from 'node:assert/strict';
import { damageVehicle } from '../src/vehicles.js';
import { blastDamage } from '../src/grenades.js';

test('repeated shots accumulate damage and destroy a car exactly once', () => {
  const car = { speed: 8, occupied: true, traffic: {} };
  assert.equal(damageVehicle(car, 34), false); assert.equal(car.health, 66);
  assert.equal(damageVehicle(car, 34), false); assert.equal(car.health, 32);
  assert.equal(damageVehicle(car, 34), true);
  assert.equal(car.health, 0); assert.equal(car.destroyed, true);
  assert.equal(car.speed, 0); assert.equal(car.occupied, false); assert.equal(car.traffic, null);
  assert.equal(car.disabled, Infinity);
  assert.equal(damageVehicle(car, 150), false); assert.equal(car.health, 0);
});

test('car blast chain reactions terminate without re-exploding wrecks', () => {
  const cars = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 6, z: 0 }], queue = [];
  if (damageVehicle(cars[0], 100)) queue.push(cars[0]);
  let explosions = 0;
  while (queue.length) {
    const origin = queue.shift(); explosions++;
    assert.ok(explosions <= cars.length);
    for (const car of cars) if (damageVehicle(car, blastDamage(origin, car, []))) queue.push(car);
  }
  assert.equal(explosions, 3);
  assert.ok(cars.every(car => car.destroyed));
});

test('walls protect another car from blast damage and invalid damage cannot destroy cars', () => {
  const car = { x: 4, z: 0 };
  const damage = blastDamage({ x: 0, z: 0 }, car, [{ x: 2, z: 0, w: .2, d: 10 }]);
  assert.equal(damage, 0); assert.equal(damageVehicle(car, damage), false);
  for (const amount of [-20, NaN, Infinity]) assert.equal(damageVehicle(car, amount), false);
  assert.equal(car.destroyed, undefined);
});
