import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeBat, tickBatFlight } from '../src/bats.js';
import { makeBoss } from '../src/world.js';
import { summonType, canSummon } from '../src/encounters.js';
import { enemyAimShape, traceAimedVolley } from '../src/aiming.js';
import { WEAPONS } from '../src/combat.js';
test('boss starts with bat summons and can alternate back to heavy infected', () => {
  const boss = makeBoss(); assert.equal(summonType(boss), 'bat');
  assert.ok(canSummon(boss, [], { x: 20, z: 0 }));
  boss.summonBats = false; assert.equal(summonType(boss), 'pyramid-head');
  boss.summonBats = true;
  const bats = Array.from({ length: 3 }, () => ({ summoned: true, monsterType: 'bat' }));
  assert.equal(canSummon(boss, bats, { x: 20, z: 0 }), false);
});
test('flying bats animate, approach the player, and remain above ground', () => {
  const bat = makeBat(); bat.group.position.set(0, 2, 20);
  for (let i = 0; i < 120; i++) {
    tickBatFlight(bat, 1 / 60, { x: 0, z: 0 }, []);
    assert.ok(bat.group.position.y > 1); assert.ok(bat.group.position.y < 3);
    assert.ok(Number.isFinite(bat.wingL.rotation.z));
  }
  assert.ok(bat.group.position.z < 10);
});
test('bat hitboxes sit at flight height and can be shot', () => {
  const bat = makeBat(); bat.group.position.set(0, 2, -5);
  const shape = enemyAimShape(bat); assert.ok(shape.bottom > 1);
  const volley = traceAimedVolley({ x: 0, y: 1.8, z: 0 }, { x: 0, y: 2.1, z: -5 }, 0, WEAPONS[1], [], [shape]);
  assert.equal(volley.hits[0].target, bat);
});
