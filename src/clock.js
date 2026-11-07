import * as THREE from 'three';
export function clockAngles(minutes) {
  return { minute: -(minutes % 60) / 60 * Math.PI * 2, hour: -(minutes % 720) / 720 * Math.PI * 2 };
}
export function createParkClock(scene) {
  const group = new THREE.Group(); group.userData.landmark = 'clock'; scene.add(group);
  const stone = new THREE.MeshLambertMaterial({ color: 0xa7a08a });
  const dark = new THREE.MeshBasicMaterial({ color: 0x242c28 });
  const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xe4dfbc });
  const block = (w, h, d, x, y, z, mat = stone, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  block(5, .45, 5, 0, .5, 0); block(3.2, 6.7, 3.2, 0, 3.95, 0);
  block(4.4, .35, 4.4, 0, 7.35, 0); block(4, 4, 4, 0, 9.5, 0);
  block(4.6, .35, 4.6, 0, 11.65, 0); block(3.3, .6, 3.3, 0, 12.1, 0);
  block(2.3, .6, 2.3, 0, 12.7, 0); block(.3, 1.4, .3, 0, 13.6, 0, dark);
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2, face = new THREE.Group(); face.position.set(Math.sin(angle) * 2.025, 9.5, Math.cos(angle) * 2.025); face.rotation.y = angle; group.add(face);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(1.65, 32), faceMaterial); face.add(disk);
    for (let tick = 0; tick < 12; tick++) {
      const a = tick * Math.PI / 6;
      const marker = block(.1, tick % 3 ? .18 : .3, .035, Math.sin(a) * 1.4, Math.cos(a) * 1.4, .035, dark, face); marker.rotation.z = -a;
    }
    const hour = new THREE.Group(), minute = new THREE.Group(); hour.position.z = .07; minute.position.z = .1; face.add(hour, minute);
    block(.16, .9, .05, 0, .4, 0, dark, hour); block(.09, 1.3, .04, 0, .6, 0, dark, minute);
    block(.22, .22, .08, 0, 0, .14, dark, face);
    faces.push({ hour, minute });
  }
  return { group, faces, update(minutes) { const angles = clockAngles(minutes); for (const face of faces) { face.hour.rotation.z = angles.hour; face.minute.rotation.z = angles.minute; } } };
}
