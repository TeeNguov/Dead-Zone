import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makePerson } from '../src/world.js';
import { attachMuzzle, muzzlePosition } from '../src/weapon-mount.js';
import { traceVolley, WEAPONS } from '../src/combat.js';
test('muzzles stay on anatomical right and at barrel tips through every facing direction', () => {
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const [index, tip, scale] of [[1, -.59, 1], [3, -.59, 1.5], [4, -1.275, 1], [2, -1.295, 1]]) {
      const avatar = makePerson(true); avatar.group.position.set(12, .32, 8); avatar.group.rotation.y = heading;
      avatar.armR.rotation.x = -Math.PI / 2; avatar.elbowR.rotation.x = 0;
      avatar.group.updateMatrixWorld(true);
      const hand = avatar.rightHand.getWorldPosition(new THREE.Vector3());
      const gun = new THREE.Group(); avatar.group.add(gun);
      gun.position.copy(avatar.group.worldToLocal(hand.clone())); gun.scale.z = scale;
      const muzzle = attachMuzzle(gun, tip), origin = muzzlePosition(muzzle);
      const right = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
      const forward = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
      assert.ok(origin.clone().sub(avatar.group.position).dot(right) > .3);
      assert.ok(Math.abs(origin.clone().sub(hand).dot(forward) - Math.abs(tip) * scale) < 1e-8);
      const target = { x: origin.x + forward.x * 10, z: origin.z + forward.z * 10, radius: .5, target: 'monster' };
      assert.ok(traceVolley(origin, heading, WEAPONS[index], [], [target]).hits.some(h => h.target === 'monster'));
    }
  }
});
