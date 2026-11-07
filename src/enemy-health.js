import * as THREE from 'three';
export function enemyHealthFraction(enemy) { return Math.max(0, Math.min(1, (enemy.health ?? 100) / (enemy.maxHealth || 100))); }
// All billboard bars share a single draw call, including spawned enemies.
export function createEnemyHealthBars(scene, capacity = 256) {
  const geometry = new THREE.PlaneGeometry(1, 1), fractions = new Float32Array(capacity);
  geometry.setAttribute('enemyHealth', new THREE.InstancedBufferAttribute(fractions, 1));
  const white = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1); white.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: white, color: 0x39e769, toneMapped: false, fog: false });
  material.customProgramCacheKey = () => 'enemy-health-green-v2';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float enemyHealth;\nvarying float barHealth;').replace('#include <begin_vertex>', '#include <begin_vertex>\nbarHealth = enemyHealth;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float barHealth;').replace('#include <color_fragment>', `#include <color_fragment>
      if (vMapUv.x < .025 || vMapUv.x > .975 || vMapUv.y < .14 || vMapUv.y > .86) diffuseColor.rgb = vec3(.13, .17, .14);
      else if (vMapUv.x > .025 + .95 * barHealth) diffuseColor.rgb = vec3(.06, .09, .07);
      else diffuseColor.rgb = vec3(.04, .8, .13);
    `);
  };
  const mesh = new THREE.InstancedMesh(geometry, material, capacity); mesh.count = 0; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  const dummy = new THREE.Object3D();
  return { mesh, fractions,
    update(enemies, camera, player, visible = true) {
      let count = 0;
      if (visible) for (const enemy of enemies) {
        if (count >= capacity) break;
        const pos = enemy.group.position;
        if (enemy.down || enemy.destroyed || (pos.x - player.x) ** 2 + (pos.z - player.z) ** 2 > 1225) continue;
        const height = enemy.monsterType === 'hound' ? 1.05 : enemy.height || 2.3;
        dummy.position.set(pos.x, pos.y + height + .3, pos.z); dummy.quaternion.copy(camera.quaternion);
        dummy.scale.set(enemy.isBoss ? 3.5 : enemy.monsterType === 'hound' ? 1.05 : 1.4, enemy.isBoss ? .28 : .18, 1);
        dummy.updateMatrix(); mesh.setMatrixAt(count, dummy.matrix);
        fractions[count++] = enemyHealthFraction(enemy);
      }
      mesh.count = count; mesh.visible = count > 0; mesh.instanceMatrix.needsUpdate = true;
      geometry.attributes.enemyHealth.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
