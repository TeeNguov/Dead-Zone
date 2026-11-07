import * as THREE from 'three';

// Cosmetic atmosphere only: no collision, navigation, camera or combat changes.
export function createAtmosphere(scene, streetLights) {
  let seed = 83;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const count = 700, positions = new Float32Array(count * 3), drift = [];
  for (let i = 0; i < count; i++) {
    positions.set([(rnd() - .5) * 110, rnd() * 25, (rnd() - .5) * 110], i * 3);
    drift.push(.25 + rnd() * .55);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const ash = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd2d0bd, size: .075, transparent: true, opacity: .45, depthWrite: false }));
  ash.frustumCulled = false; scene.add(ash);
  const pool = new THREE.PointLight(0xe0dbb7, 30, 18, 1.5); scene.add(pool);
  const beam = new THREE.SpotLight(0xe9e4c5, 75, 32, .65, .85, 1.4);
  scene.add(beam, beam.target);
  const lamps = Array.from({ length: 4 }, () => {
    const light = new THREE.PointLight(0xc3ae79, 22, 15, 1.5);
    scene.add(light); return light;
  });
  let time = 0, lampTimer = 0, nearest = [];
  return {
    update(dt, position, heading, otherworld) {
      time += dt;
      ash.position.set(position.x, 0, position.z);
      for (let i = 0; i < count; i++) {
        positions[i * 3] += dt * .3;
        positions[i * 3 + 1] -= dt * drift[i];
        positions[i * 3 + 2] += Math.sin(time * .4 + i) * dt * .2;
        if (positions[i * 3 + 1] < .3) positions[i * 3 + 1] = 25;
        if (positions[i * 3] > 55) positions[i * 3] = -55;
      }
      geometry.attributes.position.needsUpdate = true;
      pool.position.set(position.x, 4, position.z);
      beam.position.set(position.x, 3, position.z);
      beam.target.position.set(position.x - Math.sin(heading || 0) * 9, .2, position.z - Math.cos(heading || 0) * 9);
      lampTimer -= dt;
      if (lampTimer <= 0) {
        nearest = streetLights.filter(p => !p.destroyed).sort((a, b) => (a.x - position.x) ** 2 + (a.z - position.z) ** 2 - (b.x - position.x) ** 2 - (b.z - position.z) ** 2).slice(0, 4);
        lampTimer = .5;
      }
      lamps.forEach(lamp => { lamp.intensity = 0; });
      nearest.forEach((p, i) => {
        if (p.destroyed) return;
        lamps[i].position.set(p.x, 4.8, p.z);
        lamps[i].intensity = (otherworld ? 15 : 22) * (.96 + Math.sin(time * 1.6 + i * 3) * .04);
        lamps[i].color.set(otherworld ? 0xc86d45 : 0xc3ae79);
      });
    },
  };
}
