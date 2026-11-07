import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makePerson, makeBoss, makeQuadruped, animatePerson } from '../src/world.js';
test('humanoids have longer leg segments and smaller heads, with grounded feet', () => {
  const player = makePerson(true), original = makePerson(true, null, false);
  const bounds = p => new THREE.Box3().setFromObject(p.group);
  assert.ok(bounds(player).getSize(new THREE.Vector3()).y > 2.25);
  assert.ok(Math.abs(player.kneeR.position.y) > Math.abs(original.kneeR.position.y) * 1.3);
  const head = player.group.children[0].children[1], oldHead = original.group.children[0].children[1];
  assert.ok(head.scale.x < oldHead.scale.x * .8); assert.ok(head.scale.y < oldHead.scale.y);
  assert.ok(bounds(player).min.y > -.1);
});
test('right-hand attachment stays connected and finite throughout the longer gait', () => {
  const player = makePerson(true);
  assert.equal(player.rightHand.parent, player.elbowR);
  for (let i = 0; i < 120; i++) {
    animatePerson(player, 1 / 60, 8.2); player.group.updateMatrixWorld(true);
    const hand = player.rightHand.getWorldPosition(new THREE.Vector3());
    assert.ok([hand.x, hand.y, hand.z].every(Number.isFinite)); assert.ok(hand.x > 0);
  }
});
test('monster size hierarchy survives the new proportions', () => {
  const player = makePerson(true), triangle = makePerson(false, 'pyramid-head'), boss = makeBoss();
  assert.ok(triangle.height > player.height); assert.ok(boss.height > triangle.height);
  assert.ok(boss.mouthHeight < boss.height);
  const houndHeight = new THREE.Box3().setFromObject(makeQuadruped().group).getSize(new THREE.Vector3()).y;
  assert.ok(houndHeight < player.height / 2);
});
