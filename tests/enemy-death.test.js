import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { popEnemy } from '../src/enemy-death.js';
import { tickEnemyDrop, ENEMY_DROP_LIFETIME } from '../src/enemy-loot.js';
test('enemy death pops once into red particles and hides the model permanently', () => {
  const enemy = { health: -10, group: new THREE.Group(), knockbackX: 4, knockbackZ: 1 };
  let particles = 0; const blood = { burst(position, direction, count) { particles += count; assert.ok(position.y > 0); } };
  assert.ok(popEnemy(enemy, blood)); assert.equal(particles, 48); assert.equal(enemy.group.visible, false);
  assert.equal(enemy.health, 0); assert.equal(enemy.down, Infinity); assert.equal(enemy.knockbackX, 0);
  assert.equal(popEnemy(enemy, blood), false); assert.equal(particles, 48);
});
test('uncollected enemy drops disappear exactly after five seconds at different frame rates', () => {
  for (const dt of [1 / 30, 1 / 60, .1]) {
    const pickup = { lifetime: ENEMY_DROP_LIFETIME, group: { visible: true }, lightRing: { visible: true }, collected: false };
    for (let i = 0; i < Math.round(5 / dt) - 1; i++) assert.ok(tickEnemyDrop(pickup, dt));
    assert.equal(tickEnemyDrop(pickup, dt), false); assert.equal(pickup.group.visible, false); assert.equal(pickup.lightRing.visible, false);
    assert.equal(tickEnemyDrop(pickup, 60), false); assert.equal(pickup.lifetime, 0);
  }
});
