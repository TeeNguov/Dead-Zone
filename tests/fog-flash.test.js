import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMuzzleFlash } from '../src/muzzle-flash.js';
import { createPlayerFog, fogAmount } from '../src/player-fog.js';
import { WEAPONS } from '../src/combat.js';
test('muzzle flashes emit brief light, track the muzzle and reuse objects under sustained fire', () => {
  const scene = new THREE.Scene(), flash = createMuzzleFlash(scene), position = new THREE.Vector3(4, 2, -3);
  flash.fire(position, Math.PI / 2, WEAPONS[1]);
  assert.ok(flash.group.visible); assert.ok(flash.light.intensity > 0); assert.deepEqual(flash.group.position, position);
  const pistol = flash.light.intensity;
  flash.fire(position, 0, WEAPONS[2]); assert.ok(flash.light.intensity > pistol);
  flash.update(.01, new THREE.Vector3(5, 2, -3), 1); assert.equal(flash.group.position.x, 5); assert.equal(flash.group.rotation.y, 1);
  const count = scene.children.length;
  for (let i = 0; i < 200; i++) { flash.fire(position, 0, WEAPONS[4]); flash.update(.016); }
  assert.equal(scene.children.length, count);
  flash.update(.1); assert.equal(flash.group.visible, false); assert.equal(flash.light.intensity, 0);
});
test('fog keeps a near-clear player area and obscures the distant city', () => {
  assert.equal(fogAmount(0), .025); assert.equal(fogAmount(11), .025);
  assert.ok(fogAmount(25) > fogAmount(15)); assert.ok(fogAmount(35) > .8);
  assert.equal(fogAmount(43), 1); assert.equal(fogAmount(100), 1);
});
test('fog hooks support instanced city, monsters, particles and newly added materials', () => {
  const scene = new THREE.Scene(), fog = createPlayerFog(scene);
  const material = new THREE.MeshLambertMaterial();
  scene.add(new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 1));
  fog.update(1, { x: 12, z: -3 });
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader };
  material.onBeforeCompile(shader, {});
  assert.match(shader.vertexShader, /instanceMatrix \* cityFogPosition/);
  assert.match(shader.fragmentShader, /cityFogWorld.xz - cityFogPlayer/);
  assert.equal(shader.uniforms.cityFogPlayer.value.x, 12);
  fog.update(.5, { x: 30, z: 4 }); assert.equal(shader.uniforms.cityFogPlayer.value.x, 30);
  assert.equal(shader.uniforms.cityFogTime.value, 1.5);
  const points = new THREE.PointsMaterial(); scene.add(new THREE.Points(new THREE.BufferGeometry(), points));
  fog.update(0, { x: 30, z: 4 });
  const pointsShader = { uniforms: {}, vertexShader: THREE.ShaderLib.points.vertexShader, fragmentShader: THREE.ShaderLib.points.fragmentShader };
  points.onBeforeCompile(pointsShader, {}); assert.ok(pointsShader.uniforms.cityFogPlayer);
  const flash = createMuzzleFlash(scene); fog.update(0, { x: 30, z: 4 });
  assert.equal(flash.group.children[0].material.fog, false);
});
