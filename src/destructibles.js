import * as THREE from 'three';
const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
export function damageProp(city, prop, damage) {
  if (prop.destroyed || !Number.isFinite(damage) || damage <= 0) return false;
  prop.health = Math.max(0, prop.health - damage);
  if (prop.health > 0) return false;
  prop.destroyed = true;
  for (const index of prop.instances) city.staticMesh.setMatrixAt(index, hidden);
  city.staticMesh.instanceMatrix.needsUpdate = true;
  for (let i = city.colliders.length - 1; i >= 0; i--) {
    if (city.colliders[i].target === prop) city.colliders.splice(i, 1);
  }
  for (const visual of prop.visuals) visual.visible = false;
  if (prop.light) prop.light.destroyed = true;
  city.navigationDirty = true;
  return true;
}
