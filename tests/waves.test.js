import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { waveSize, canSpawnWave, reusableWaveEnemy, MAX_ACTIVE_ENEMIES, startFreeWave, advanceFreeWave } from '../src/waves.js';
import { createAcidFloor } from '../src/acid-floor.js';
test('waves begin at fifty and double with each ingredient', () => {
  assert.deepEqual([1,2,3,4,5].map(waveSize), [50,100,200,400,800]);
});
test('reinforcements wait for capacity and reuse defeated non-summoned models', () => {
  const alive = Array.from({length:MAX_ACTIVE_ENEMIES}, () => ({ down:0 }));
  assert.equal(canSpawnWave(alive), false); alive[0].down = Infinity; assert.equal(canSpawnWave(alive), true);
  const reusable = { monsterType:'hound', down:Infinity };
  assert.equal(reusableWaveEnemy([{ ...reusable, summoned:true }, { ...reusable, isBoss:true }, reusable], 'hound'), reusable);
  assert.equal(reusableWaveEnemy([reusable], 'nurse'), undefined);
});
test('fire impacts use orange floor patches while normal acid remains green', () => {
  const fire = createAcidFloor(new THREE.Scene(), 1, { color:0xff6025 }), acid = createAcidFloor(new THREE.Scene(), 1);
  assert.equal(fire.patches[0].mesh.material.color.getHex(), 0xff6025);
  assert.equal(acid.patches[0].mesh.material.color.getHex(), 0x65d525);
  fire.add({x:2,z:3}); assert.ok(fire.contains({x:2,z:3})); fire.update(2); assert.equal(fire.contains({x:2,z:3}), false);
});

test('free mode starts at 1600, counts survivors and doubles only after a wave is cleared', () => {
  const enemies = [{ down: 0 }, { down: Infinity }, { down: 0 }];
  const first = startFreeWave(enemies);
  assert.equal(first.total, 1600); assert.equal(first.pending, 1598); assert.equal(enemies[0].freeWave, 1);
  assert.equal(enemies[1].freeWave, undefined);
  const wave = { number: first.number, total: first.total };
  assert.equal(advanceFreeWave(wave, 1, 0), false); assert.equal(advanceFreeWave(wave, 0, 1), false);
  assert.ok(advanceFreeWave(wave, 0, 0)); assert.equal(wave.total, 3200); assert.equal(wave.number, 2);
  wave.bossPending = 0; assert.ok(advanceFreeWave(wave, 0, 0)); assert.equal(wave.total, 6400); assert.equal(wave.number, 3);
});

test('free mode boss totals double with enemies and queued bosses prevent advancing', () => {
  const first = startFreeWave([]); assert.equal(first.bosses, 2); assert.equal(first.bossPending, 2);
  assert.equal(advanceFreeWave(first, 0, 0), false);
  first.bossPending = 0; assert.equal(advanceFreeWave(first, 0, 1), false);
  assert.ok(advanceFreeWave(first, 0, 0)); assert.equal(first.bosses, 4); assert.equal(first.bossPending, 4);
  first.bossPending = 0; assert.ok(advanceFreeWave(first, 0, 0)); assert.equal(first.bosses, 8);
});
