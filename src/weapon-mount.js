import * as THREE from 'three';
export function attachMuzzle(weapon, z, y = 0) {
  const socket = new THREE.Object3D(); socket.position.set(0, y, z); weapon.add(socket); return socket;
}
export function muzzlePosition(socket) {
  socket.updateWorldMatrix(true, false);
  return socket.getWorldPosition(new THREE.Vector3());
}
