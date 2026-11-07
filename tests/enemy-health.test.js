import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEnemyHealthBars, enemyHealthFraction } from '../src/enemy-health.js';
test('health fractions track normal enemies, dogs and boss health without overflow', () => {
  assert.equal(enemyHealthFraction({ health: 50 }), .5);
  assert.equal(enemyHealthFraction({ health: 30, maxHealth: 60 }), .5);
  assert.equal(enemyHealthFraction({ health: 900, maxHealth: 1800 }), .5);
  assert.equal(enemyHealthFraction({ health: -20 }), 0); assert.equal(enemyHealthFraction({ health: 150 }), 1);
});
test('health bars include spawned enemies, face the camera and hide defeated enemies', () => {
  const scene = new THREE.Scene(), bars = createEnemyHealthBars(scene), camera = new THREE.PerspectiveCamera();
  camera.rotation.set(-.6, .2, 0); camera.updateMatrixWorld();
  const enemy = { health: 25, group: new THREE.Group() };
  const dog = { health: 30, maxHealth: 60, monsterType: 'hound', group: new THREE.Group() };
  const boss = { health: 900, maxHealth: 1800, isBoss: true, group: new THREE.Group() };
  const crowd = [enemy, dog]; bars.update(crowd, camera, { x: 0, z: 0 });
  assert.equal(bars.mesh.count, 2); assert.equal(bars.fractions[0], .25);
  crowd.push(boss); enemy.down = 12; bars.update(crowd, camera, { x: 0, z: 0 });
  assert.equal(bars.mesh.count, 2); assert.equal(bars.fractions[0], .5);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  bars.mesh.getMatrixAt(0, matrix); matrix.decompose(position, rotation, scale);
  assert.ok(Math.abs(rotation.dot(camera.quaternion)) > .999);
  bars.update(crowd, camera, { x: 0, z: 0 }, false); assert.equal(bars.mesh.count, 0);
});

test('enemy bars use an explicit bright green fill without fog tinting', () => {
  const bars = createEnemyHealthBars(new THREE.Scene());
  assert.equal(bars.mesh.material.color.getHex(), 0x39e769);
  assert.equal(bars.mesh.material.fog, false);
  const shader = { vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
  bars.mesh.material.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes('else diffuseColor.rgb = vec3(.04, .8, .13)'));
  assert.equal(bars.mesh.material.customProgramCacheKey(), 'enemy-health-green-v2');
});
