import test from 'node:test';
import assert from 'node:assert/strict';
import { applyActorTheme } from '../src/themes.js';
import { makePerson, makeBoss, makeQuadruped, getWorldTheme, setWorldTheme } from '../src/world.js';
test('theme switching changes models while retaining combat state, roots and position references', () => {
  const brute = makePerson(false, 'pyramid-head'), boss = makeBoss(), hound = makeQuadruped();
  const group = brute.group, position = group.position; position.set(12, .32, 8);
  Object.assign(brute, { health: 23, down: 0, speed: 1.35, summoned: true });
  const hasCone = p => { let result = false; p.group.traverse(n => { if (n.geometry?.type === 'ConeGeometry') result = true; }); return result; };
  assert.ok(hasCone(brute));
  assert.ok(applyActorTheme([brute, boss, hound], 'zombies'));
  assert.equal(brute.group, group); assert.equal(brute.group.position, position); assert.equal(position.x, 12);
  assert.equal(brute.health, 23); assert.equal(brute.speed, 1.35); assert.equal(brute.summoned, true);
  assert.equal(hasCone(brute), false); assert.equal(brute.visualTheme, 'zombies');
  assert.equal(makePerson(false, 'nurse').visualTheme, 'zombies');
  assert.equal(boss.isBoss, true); assert.equal(hound.quadrupedLegs.length, 4);
  applyActorTheme([brute, boss, hound], 'horror'); assert.ok(hasCone(brute)); assert.equal(brute.health, 23);
  assert.equal(getWorldTheme(), 'horror');
});
test('invalid themes cannot replace actor models', () => {
  setWorldTheme('horror'); const actor = makePerson(), rig = actor.group.children[0];
  assert.equal(applyActorTheme([actor], 'invalid'), false); assert.equal(actor.group.children[0], rig);
});
