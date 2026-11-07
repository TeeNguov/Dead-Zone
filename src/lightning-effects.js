import * as THREE from 'three';
export function createLightningEffects(scene) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const material = new THREE.MeshBasicMaterial({ color: 0xfff3aa, toneMapped: false, fog: false });
  const halo = new THREE.MeshBasicMaterial({ color: 0xffce22, transparent: true, opacity: .24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  const geometry = new THREE.IcosahedronGeometry(.19, 1);
  const orbs = Array.from({ length: 3 }, () => {
    const orb = new THREE.Mesh(geometry, material), glow = new THREE.Mesh(geometry, halo);
    glow.scale.setScalar(2.2); orb.add(glow); group.add(orb); return orb;
  });
  const light = new THREE.PointLight(0xffd84a, 0, 9, 1.5); group.add(light);
  const bolts = Array.from({ length: 4 }, () => {
    const positions = new Float32Array(36), geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xffe45c, transparent: true, opacity: 1, toneMapped: false, fog: false }));
    line.frustumCulled = false; line.visible = false; scene.add(line);
    return { line, positions, life: 0 };
  });
  let phase = 0;
  return {
    group, orbs, bolts,
    update(dt, player, active) {
      phase += dt * 2.8; group.position.set(player.x, .32 + (player.jumpY || 0), player.z); group.visible = active;
      light.intensity = active ? 35 : 0; light.position.y = 2;
      orbs.forEach((orb, i) => { const angle = phase + i * Math.PI * 2 / 3; orb.position.set(Math.cos(angle) * 1.65, 1.65 + Math.sin(angle * 2) * .2, Math.sin(angle) * 1.65); orb.rotation.y += dt * 3; });
      for (const bolt of bolts) { bolt.life = active ? Math.max(0, bolt.life - dt) : 0; bolt.line.visible = bolt.life > 0; bolt.line.material.opacity = bolt.life / .18; }
      group.updateMatrixWorld(true);
    },
    strike(enemy, index) {
      const bolt = bolts[index], from = orbs[index % 3].getWorldPosition(new THREE.Vector3());
      const to = enemy.group.position.clone(); to.y += enemy.monsterType === 'hound' ? .6 : Math.min(2.3, (enemy.height || 2) * .65);
      let previous = from;
      for (let segment = 0; segment < 6; segment++) {
        const point = from.clone().lerp(to, (segment + 1) / 6);
        if (segment < 5) { point.x += (Math.random() - .5) * .6; point.y += (Math.random() - .5) * .5; point.z += (Math.random() - .5) * .6; }
        bolt.positions.set([previous.x, previous.y, previous.z, point.x, point.y, point.z], segment * 6); previous = point;
      }
      bolt.line.geometry.attributes.position.needsUpdate = true; bolt.life = .18; bolt.line.visible = true; bolt.line.material.opacity = 1;
    },
  };
}
