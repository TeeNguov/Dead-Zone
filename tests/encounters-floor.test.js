import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ringSpawn, canSummon, summonType, shouldReposition } from '../src/encounters.js';
import { createAcidFloor } from '../src/acid-floor.js';
import { isBlocked } from '../src/physics.js';
import { makePerson } from '../src/world.js';
import { createBloodParticles } from '../src/blood.js';
const monster = (type = 'pyramid-head', x = 0) => ({ monsterType: type, group: { position: { x, z: 0 } } });
test('triangle heads summon hounds, boss summons triangle heads, dead parents cannot summon', () => {
  const parent = monster(), boss = { ...monster(), isBoss: true }, target = { x: 20, z: 0 };
  assert.equal(summonType(parent), 'hound'); assert.equal(summonType(boss), 'pyramid-head');
  assert.ok(canSummon(parent, [parent], target));
  assert.equal(canSummon({ ...parent, down: Infinity }, [], target), false);
  const children = Array.from({ length: 6 }, () => ({ summoned: true, summoner: parent, monsterType: 'hound' }));
  assert.equal(canSummon(parent, children, target), false);
  children[0].down = Infinity; assert.ok(canSummon(parent, children, target));
  const hounds = Array.from({ length: 18 }, () => ({ summoned: true, monsterType: 'hound' }));
  assert.equal(canSummon(parent, hounds, target), false);
  assert.ok(canSummon(boss, hounds, target), 'reserve room for boss summons');
});
test('repositioning only affects distant living non-boss enemies when player is fast', () => {
  const target = { x: 0, z: 0 }, far = monster('hound', 90);
  assert.ok(shouldReposition(far, target, 8));
  assert.equal(shouldReposition(far, target, 4.4), false);
  assert.equal(shouldReposition({ ...far, isBoss: true }, target, 30), false);
  assert.equal(shouldReposition({ ...far, down: 12 }, target, 30), false);
  assert.equal(shouldReposition(monster('hound', 20), target, 30), false);
});
test('ring spawns stay at a safe distance and respect walls, other humans and world edge', () => {
  const obstacles = [{ x: 30, z: 0, w: 20, d: 20 }, { x: 0, z: 35, radius: 3 }];
  for (let i = 0; i < 30; i++) {
    const center = { x: i % 2 ? 105 : 0, z: 0 };
    const point = ringSpawn(center, obstacles);
    assert.ok(point); const d = Math.hypot(point.x - center.x, point.z);
    assert.ok(d >= 32 && d <= 46); assert.equal(isBlocked(point.x, point.z, .5, obstacles), false);
  }
  assert.equal(ringSpawn({ x: 0, z: 0 }, [{ x: 0, z: 0, w: 230, d: 230 }]), null);
});
test('acid contact resumes on re-entry and ends exactly when the two-second puddle expires', () => {
  const floor = createAcidFloor(new THREE.Scene(), 2); floor.add({ x: 0, z: 0 });
  const player = { x: -4, z: 0 };
  assert.equal(floor.contains(player), false);
  player.x = 0; assert.equal(floor.contains(player), true);
  player.x = 4; assert.equal(floor.contains(player), false);
  floor.update(1);
  player.x = 0; assert.equal(floor.contains(player), true, 'walking back into live acid still burns');
  floor.update(.99); assert.ok(floor.patches[0].mesh.visible);
  floor.update(.01); assert.equal(floor.patches[0].remaining, 0);
  assert.equal(floor.contains(player), false); assert.equal(floor.patches[0].mesh.visible, false);
});
test('acid particles expire with the two-second floor hazard', () => {
  const pool = createBloodParticles(new THREE.Scene(), 48, { lifetime: 2, lifetimeJitter: 0, splat: true });
  pool.burst({ x: 0, z: 0 }, { x: 0, z: 0 }); pool.update(2); assert.equal(pool.activeCount, 0);
});
test('right arm is on positive X when the model faces negative Z', () => {
  const avatar = makePerson(true); avatar.group.updateMatrixWorld(true);
  assert.ok(avatar.armR.getWorldPosition(new THREE.Vector3()).x > 0);
  assert.ok(avatar.armL.getWorldPosition(new THREE.Vector3()).x < 0);
});
