import * as THREE from 'three';
export const ACID_FLOOR_LIFE = 2;
export function createAcidFloor(scene, capacity = 48, options = {}) {
  const geometry = new THREE.CircleGeometry(1, 16);
  const patches = Array.from({ length: capacity }, () => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: options.color ?? 0x65d525, transparent: true, opacity: .65, depthWrite: false, toneMapped: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.visible = false; scene.add(mesh);
    return { x: 0, z: 0, radius: 1.25, remaining: 0, mesh };
  });
  let cursor = 0;
  return { patches,
    add(position) {
      const patch = patches[cursor]; cursor = (cursor + 1) % capacity;
      Object.assign(patch, { x: position.x, z: position.z, remaining: ACID_FLOOR_LIFE });
      patch.mesh.position.set(patch.x, .44, patch.z); patch.mesh.scale.setScalar(patch.radius);
      patch.mesh.visible = true; patch.mesh.material.opacity = .65;
    },
    update(dt) {
      for (const patch of patches) {
        patch.remaining = Math.max(0, patch.remaining - dt);
        if (patch.remaining < 1e-8) patch.remaining = 0;
        patch.mesh.visible = patch.remaining > 0;
        patch.mesh.material.opacity = .65 * Math.min(1, patch.remaining / .25);
      }
    },
    contains(player) { return patches.some(p => p.remaining > 0 && Math.hypot(p.x - player.x, p.z - player.z) < p.radius + .3); },
  };
}
