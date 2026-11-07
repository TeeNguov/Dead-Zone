import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makePerson } from '../src/world.js';
import { poseWeaponArms } from '../src/weapon-pose.js';
import { createCombat } from '../src/combat.js';
import { launchGrenade, tickGrenade } from '../src/grenades.js';
test('two-handed poses put both hands on their grips in all facing directions', () => {
  for (const heading of [0, 1, Math.PI, -2]) for (const kind of ['smg', 'shotgun', 'gatling', 'launcher']) {
    const avatar = makePerson(true); avatar.group.position.set(7, .32, 9); avatar.group.rotation.y = heading;
    const weapon = new THREE.Group(); avatar.group.add(weapon);
    weapon.position.set(.12, kind === 'gatling' ? 1.48 : 1.65, -.35);
    if (kind === 'smg') weapon.scale.z = 1.5;
    if (kind === 'gatling') weapon.userData.supportGrip = new THREE.Vector3(-.22, -.03, -.2);
    poseWeaponArms(avatar, weapon, true);
    const trigger = weapon.localToWorld(new THREE.Vector3(0, -.12, .07));
    const support = weapon.localToWorld(weapon.userData.supportGrip?.clone() || new THREE.Vector3(-.16, -.12, kind === 'smg' ? -.18 : -.28));
    assert.ok(avatar.rightHand.getWorldPosition(new THREE.Vector3()).distanceTo(trigger) < .03, kind + ' trigger');
    assert.ok(avatar.leftHand.getWorldPosition(new THREE.Vector3()).distanceTo(support) < .03, kind + ' support');
  }
});
test('launcher launches from muzzle height, uses rounds and detonates once on impact', () => {
  const combat = createCombat(), shot = launchGrenade(combat, { x: 0, y: 2, z: 4 }, 0);
  assert.equal(shot.y, 2); assert.equal(combat.grenades, 4); assert.ok(shot.vz < -20);
  const walls = [{ x: 0, z: 0, w: 10, d: .1 }];
  let hits = 0;
  for (let i = 0; i < 60; i++) if (tickGrenade(shot, .05, walls)) hits++;
  assert.equal(hits, 1); assert.equal(shot.active, false); assert.ok(shot.z > 0);
});
test('launcher ground impacts explode, and cooldown or empty rounds prevent firing', () => {
  const combat = createCombat(), shot = launchGrenade(combat, { x: 0, y: 2, z: 0 }, 0);
  assert.equal(launchGrenade(combat, { x: 0, z: 0 }, 0), null);
  let exploded = false;
  for (let i = 0; i < 100; i++) exploded = tickGrenade(shot, .02, []) || exploded;
  assert.ok(exploded); combat.grenades = 0; combat.grenadeCooldown = 0;
  assert.equal(launchGrenade(combat, { x: 0, z: 0 }, 0), null);
});
