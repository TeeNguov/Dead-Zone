import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCombat, resetCombatAfterRespawn } from '../src/combat.js';
import { createRespawnShield, RESPAWN_PROTECTION } from '../src/respawn-shield.js';
test('respawning keeps each weapon selection and its ammunition while cancelling actions', () => {
  for (let selected=0;selected<6;selected++) {
    const combat=createCombat(); combat.selected=selected; combat.ammo[1]=3; combat.reserve[3]=40; combat.grenades=2;
    combat.reloadRemaining=1; combat.spin=.35; combat.attackTime=.1;
    resetCombatAfterRespawn(combat);
    assert.equal(combat.selected,selected); assert.equal(combat.ammo[1],3); assert.equal(combat.reserve[3],40); assert.equal(combat.grenades,2);
    assert.equal(combat.reloadRemaining,0); assert.equal(combat.spin,0); assert.equal(combat.attackTime,0);
  }
});
test('blue respawn shield follows the player and disappears at three seconds', () => {
  const scene=new THREE.Scene(), shield=createRespawnShield(scene);
  assert.equal(RESPAWN_PROTECTION,3);
  shield.update({x:2,z:4},3); assert.ok(shield.group.visible);
  assert.equal(shield.group.children[0].material.color.getHex(),0x369fff);
  shield.update({x:8,z:12,jumpY:1},.1); assert.equal(shield.group.position.x,8); assert.ok(shield.group.position.y>1);
  shield.update({x:8,z:12},0); assert.equal(shield.group.visible,false);
});
