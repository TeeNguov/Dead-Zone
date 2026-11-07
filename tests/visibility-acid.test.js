import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildingIsClose, updateBuildingVisibility } from '../src/visibility.js';
import { createAcidShot, tickAcid } from '../src/objectives.js';
import { weaponSlot, WEAPONS } from '../src/combat.js';
import { createCity } from '../src/world.js';
test('all nine number-row and keypad slots map safely; no phantom weapons', () => {
  for (let i = 1; i <= 9; i++) {
    assert.equal(weaponSlot(`Digit${i}`), i - 1); assert.equal(weaponSlot(`Numpad${i}`), i - 1);
  }
  assert.equal(weaponSlot('Digit0'), -1); assert.equal(weaponSlot('KeyQ'), -1);
  assert.equal(WEAPONS[weaponSlot('Digit7')], undefined);
});
test('acid launches outside the body, follows gravity, and converges on target height', () => {
  const target = { x: 20, z: 0 }, shot = createAcidShot({ x: 0, y: 1.8, z: 0 }, target);
  assert.ok(shot.x > .5); assert.ok(shot.vy > 0);
  const initial = { ...shot }, distant = { x: 40, z: 30 };
  tickAcid(shot, .25, distant, []); assert.ok(shot.y > initial.y); assert.ok(shot.vy < initial.vy);
  const flight = (20 - initial.x) / 10;
  const atTarget = { ...initial }; tickAcid(atTarget, flight, distant, []);
  assert.ok(Math.abs(atTarget.y - 1.2) < 1e-8);
  const fine = { ...initial }; for (let i = 0; i < 60; i++) tickAcid(fine, 1 / 60, distant, []);
  const coarse = { ...initial }; tickAcid(coarse, 1, distant, []);
  assert.ok(Math.abs(coarse.y - fine.y) < 1e-8);
});
test('acid above a player does not hit; low cover can be cleared', () => {
  const make = () => ({ x: 0, y: 5, z: 0, vx: 10, vy: 0, vz: 0, life: 5 });
  assert.equal(tickAcid(make(), .3, { x: 2, z: 0 }, []), 'flying');
  assert.equal(tickAcid(make(), .3, { x: 20, z: 0 }, [{ x: 2, z: 0, radius: 1, height: 2.5 }]), 'flying');
  assert.equal(tickAcid(make(), .3, { x: 20, z: 0 }, [{ x: 2, z: 0, w: 1, d: 4, height: 10 }]), 'wall');
});
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
test('near buildings hide their upper half while lower walls and doors remain opaque', () => {
  const city = createCity(new THREE.Scene()), b = city.buildings[0];
  const near = { x: b.x + b.w / 2 + 1, z: b.z };
  assert.equal(buildingIsClose(b, near), true);
  updateBuildingVisibility(city.buildings, near, 1);
  assert.ok(b.visuals.every(m => m.material.opacity === 1 && m.material.depthWrite && !m.material.transparent));
  assert.ok(b.visuals.filter(m => m.userData.upperBuilding).every(m => !m.visible));
  assert.ok(b.visuals.filter(m => !m.userData.upperBuilding && !m.userData.doorway).every(m => m.visible && m.material.opacity === 1));
  assert.ok(b.visuals.filter(m => m.userData.doorway).every(m => m.material.opacity === 1));
  assert.equal(city.staticMesh.material.opacity, 1);
  updateBuildingVisibility(city.buildings, { x: 1000, z: 1000 }, 1);
  assert.ok(b.visuals.every(m => m.visible && m.material.opacity === 1 && m.material.depthWrite && !m.material.transparent));
});
