import * as THREE from 'three';

// One reusable flash and one shadow-free light for every weapon, even Gatling fire.
export function createMuzzleFlash(scene) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffb42b, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xfff8cf, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  const flare = new THREE.Mesh(new THREE.ConeGeometry(.23, .85, 5), glow);
  flare.rotation.x = -Math.PI / 2; flare.position.z = -.34; group.add(flare);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.16), coreMaterial);
  core.scale.set(1, 1, 2.4); core.position.z = -.12; group.add(core);
  const light = new THREE.PointLight(0xffc46d, 0, 13, 1.6); scene.add(light);
  let remaining = 0, duration = .04, strength = 1;
  return {
    group, light,
    fire(position, heading, weapon) {
      duration = weapon.pellets ? .065 : weapon.spinUp ? .03 : .045;
      remaining = duration; strength = weapon.pellets ? 1.5 : weapon.spinUp ? 1.15 : 1;
      group.position.copy(position); group.rotation.set(0, heading, 0); group.scale.setScalar(strength);
      group.visible = true; glow.opacity = .95; coreMaterial.opacity = 1;
      light.position.copy(position); light.intensity = 110 * strength;
    },
    update(dt, position, heading) {
      remaining = Math.max(0, remaining - dt);
      const fade = remaining / duration;
      group.visible = remaining > 0;
      if (position && group.visible) { group.position.copy(position); group.rotation.y = heading; light.position.copy(position); }
      glow.opacity = fade * .95; coreMaterial.opacity = fade;
      light.intensity = 110 * strength * fade;
    },
  };
}
