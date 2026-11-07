import test from 'node:test';
import assert from 'node:assert/strict';
import { speedAtLevel } from '../src/speed.js';
import { collectItem } from '../src/pickups.js';
test('speed pickups increase movement progressively to level five, then remain uncollected', () => {
  const player = { speedLevel: 0 }; let speed = speedAtLevel(0);
  for (let i = 1; i <= 5; i++) {
    assert.ok(collectItem('speed', {}, player, {})); assert.equal(player.speedLevel, i);
    assert.ok(speedAtLevel(i) > speed); speed = speedAtLevel(i);
  }
  assert.equal(collectItem('speed', {}, player, {}), null); assert.equal(player.speedLevel, 5);
  assert.ok(Math.abs(speedAtLevel(5) - 8.2) < 1e-8);
});
test('speed calculations clamp invalid levels to safe values', () => {
  assert.equal(speedAtLevel(-10), 4.4); assert.equal(speedAtLevel(NaN), 4.4);
  assert.equal(speedAtLevel(99), speedAtLevel(5));
});
