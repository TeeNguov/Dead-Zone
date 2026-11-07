import * as THREE from 'three';
export const RESPAWN_PROTECTION = 3;
export function createRespawnShield(scene) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const geometry = new THREE.SphereGeometry(1, 20, 12);
  const material = new THREE.MeshBasicMaterial({ color:0x369fff, transparent:true, opacity:.2, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false, fog:false });
  const bubble = new THREE.Mesh(geometry,material); bubble.scale.set(.95,1.55,.95); bubble.position.y=1.5; group.add(bubble);
  const wireMaterial = new THREE.MeshBasicMaterial({ color:0x8ddfff, wireframe:true, transparent:true, opacity:.14, depthWrite:false, toneMapped:false, fog:false });
  const wire = new THREE.Mesh(geometry,wireMaterial); wire.scale.copy(bubble.scale); wire.position.copy(bubble.position); group.add(wire);
  const ringMaterial = new THREE.MeshBasicMaterial({ color:0x72d5ff, transparent:true, opacity:.7, depthWrite:false, toneMapped:false, fog:false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.88,1.02,32),ringMaterial); ring.rotation.x=-Math.PI/2; ring.position.y=.14; group.add(ring);
  return { group,
    update(position, remaining, visible = true) {
      group.visible = visible && remaining > 0;
      group.position.set(position.x,.32+(position.jumpY||0),position.z);
      const fade = Math.min(1,Math.max(0,remaining/.45));
      material.opacity = (.18+Math.sin(remaining*10)*.035)*fade;
      wireMaterial.opacity=.14*fade; ringMaterial.opacity=.7*fade;
      wire.rotation.y=remaining*.7;
    },
  };
}
