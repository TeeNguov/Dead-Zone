import test from 'node:test';
import assert from 'node:assert/strict';
import { damagePlayer, loseLife } from '../src/vitals.js';
import { collectItem } from '../src/pickups.js';
import { createCombat } from '../src/combat.js';
test('armor absorbs hits first, excess damage reaches health, and lethal damage clamps at zero', () => {
  const player = { health: 100, armor: 50, lives: 3 };
  damagePlayer(player, 20); assert.equal(player.armor, 30); assert.equal(player.health, 100);
  damagePlayer(player, 45); assert.equal(player.armor, 0); assert.equal(player.health, 85);
  damagePlayer(player, 200); assert.equal(player.health, 0);
  damagePlayer(player, 20); assert.equal(player.health, 0);
});
test('continuous acid damage drains armor consistently and invalid damage is ignored', () => {
  const player = { health: 100, armor: 50 };
  for (let i = 0; i < 120; i++) damagePlayer(player, 8 / 60);
  assert.ok(Math.abs(player.armor - 34) < 1e-8); assert.equal(player.health, 100);
  for (const damage of [NaN, Infinity, -1, 0]) damagePlayer(player, damage);
  assert.ok(Math.abs(player.armor - 34) < 1e-8);
});
test('three lives permit two recoveries and then end the run', () => {
  const player = { health: 0, armor: 0, lives: 3 };
  assert.equal(loseLife(player), true); assert.equal(player.lives, 2); assert.equal(player.health, 100);
  player.health = 0; assert.equal(loseLife(player), true); assert.equal(player.lives, 1);
  player.health = 0; assert.equal(loseLife(player), false); assert.equal(player.lives, 0); assert.equal(player.health, 0);
  assert.equal(loseLife(player), false); assert.equal(player.lives, 0);
});
test('blue armor pickups restore armor, clamp at full and stay available if unnecessary', () => {
  const combat = createCombat(), player = { health: 60, armor: 70 };
  assert.ok(collectItem('armor', combat, player, {})); assert.equal(player.armor, 100); assert.equal(player.health, 60);
  assert.equal(collectItem('armor', combat, player, {}), null);
});
