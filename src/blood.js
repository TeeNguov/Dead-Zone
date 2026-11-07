import * as THREE from 'three';

// Fixed-size reusable particle pool: one draw call even during sustained gunfire.
export function createBloodParticles(scene, capacity = 256, options = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: options.color ?? 0xbb171c, toneMapped: !options.glow }), capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  const positions = new Float32Array(capacity * 3), velocities = new Float32Array(capacity * 3);
  const life = new Float32Array(capacity), duration = new Float32Array(capacity), sizes = new Float32Array(capacity);
  const dummy = new THREE.Object3D(); let cursor = 0, active = 0;
  dummy.scale.setScalar(0); dummy.updateMatrix();
  for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, dummy.matrix);
  return {
    get activeCount() { return active; },
    burst(position, direction, count = 18) {
      for (let n = 0; n < Math.min(count, capacity); n++) {
        const i = cursor, j = i * 3; cursor = (cursor + 1) % capacity;
        if (life[i] <= 0) active++;
        positions[j] = position.x; positions[j + 1] = options.useHeight ? Math.max(.43, position.y ?? .6) : 1.2; positions[j + 2] = position.z;
        velocities[j] = direction.x * (1 + Math.random() * 2) + (Math.random() - .5) * 3;
        velocities[j + 1] = 1.2 + Math.random() * 3;
        velocities[j + 2] = direction.z * (1 + Math.random() * 2) + (Math.random() - .5) * 3;
        life[i] = duration[i] = (options.lifetime ?? .5) + Math.random() * (options.lifetimeJitter ?? .5);
        sizes[i] = (options.size ?? .07) + Math.random() * .09;
      }
      mesh.visible = true;
    },
    update(dt) {
      if (!active) return;
      for (let i = 0; i < capacity; i++) {
        if (life[i] <= 0) continue;
        const j = i * 3; life[i] = Math.max(0, life[i] - dt);
        if (life[i] === 0) { active--; dummy.scale.setScalar(0); }
        else {
          velocities[j + 1] -= 9 * dt;
          positions[j] += velocities[j] * dt; positions[j + 1] = Math.max(.43, positions[j + 1] + velocities[j + 1] * dt); positions[j + 2] += velocities[j + 2] * dt;
          const drag = Math.exp(-dt * (positions[j + 1] <= .431 ? 12 : 1));
          velocities[j] *= drag; velocities[j + 2] *= drag;
          dummy.position.set(positions[j], positions[j + 1], positions[j + 2]);
          const size = sizes[i] * Math.min(1, life[i] / duration[i] * 3);
          if (options.splat && positions[j + 1] <= .431) dummy.scale.set(size * 2.5, .025, size * 2.5);
          else dummy.scale.setScalar(size);
        }
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.visible = active > 0;
    },
  };
}
