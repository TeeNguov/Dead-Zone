import test from 'node:test';
import assert from 'node:assert/strict';
import { rollEnemyLoot, lootPosition } from '../src/enemy-loot.js';
import { isBlocked } from '../src/physics.js';
test('loot includes all supplies and replaces speed drops at maximum speed', () => {
  const values = [.05, .15, .25, .4, .6, .7, .85, .93, .99], expected = ['ammo','smgAmmo','gatlingAmmo','health','armor','shells','grenades','speed','lightning'];
  for (let i = 0; i < values.length; i++) {
    let call = 0; assert.equal(rollEnemyLoot({}, { speedLevel: 0 }, () => call++ ? values[i] : 0), expected[i]);
  }
  let call = 0; assert.equal(rollEnemyLoot({}, { speedLevel: 5 }, () => call++ ? .93 : 0), 'ammo');
});
test('every enemy has a flat twenty percent drop chance', () => {
  for (const enemy of [{}, { monsterType: 'pyramid-head' }, { isBoss: true }]) {
    assert.equal(rollEnemyLoot(enemy, {}, () => .2), null);
    assert.equal(rollEnemyLoot(enemy, {}, () => .99), null);
    assert.notEqual(rollEnemyLoot(enemy, {}, () => .199), null);
  }
});
test('loot stays near the corpse but clear of cars, buildings and world boundaries', () => {
  const obstacles = [{ x: 0, z: 0, w: 2, d: 2 }];
  const point = lootPosition({ x: 0, z: 0 }, obstacles); assert.ok(point);
  assert.equal(isBlocked(point.x, point.z, .6, obstacles), false); assert.ok(Math.hypot(point.x, point.z) <= 4);
  assert.equal(lootPosition({ x: 0, z: 0 }, [{ x: 0, z: 0, w: 20, d: 20 }]), null);
});
