import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPickupModel } from '../src/pickup-models.js';
import { PICKUP_TYPES, collectItem } from '../src/pickups.js';
import { createLightning } from '../src/lightning.js';
import { createLightningEffects } from '../src/lightning-effects.js';
test('all pickups have identifiable multi-part models or a lightning silhouette, without money', () => {
  assert.ok(!PICKUP_TYPES.includes('cash'));
  for (const type of PICKUP_TYPES) {
    const model = createPickupModel(type), bounds = new THREE.Box3().setFromObject(model);
    assert.ok(!bounds.isEmpty()); assert.equal(model.userData.pickupModel, type);
    assert.ok(model.children.length >= (type === 'lightning' ? 1 : 3));
    assert.notEqual(createPickupModel(type), model);
  }
});
test('lightning pickup adds one use, clamps at three, and stays when full', () => {
  const skill = createLightning(); skill.charge = 175;
  assert.ok(collectItem('lightning', {}, {}, {}, skill)); assert.equal(skill.charge, 275);
  assert.ok(collectItem('lightning', {}, {}, {}, skill)); assert.equal(skill.charge, 300);
  assert.equal(collectItem('lightning', {}, {}, {}, skill), null);
  const fx = createLightningEffects(new THREE.Scene());
  assert.equal(fx.orbs[0].material.color.getHex(), 0xfff3aa);
  assert.equal(fx.bolts[0].line.material.color.getHex(), 0xffe45c);
});
