import * as THREE from 'three';
export function shapeBounds(shape) {
  const halfX = shape.radius ?? shape.w / 2, halfZ = shape.radius ?? shape.d / 2;
  return new THREE.Box3(new THREE.Vector3(shape.x - halfX, shape.bottom ?? 0, shape.z - halfZ), new THREE.Vector3(shape.x + halfX, (shape.bottom ?? 0) + (shape.height ?? 5), shape.z + halfZ));
}
export function enemyAimShape(enemy) {
  const pos = enemy.group.position;
  if (enemy.flying) return { x: pos.x, z: pos.z, w: 1.6, d: .9, bottom: pos.y - .2, height: .7, target: enemy };
  if (enemy.monsterType === 'hound') {
    const angle = enemy.group.rotation?.y || 0, c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
    return { x: pos.x, z: pos.z, w: 2 * (c * .38 + s * 1.12), d: 2 * (s * .38 + c * 1.12), bottom: pos.y, height: 1.05, target: enemy };
  }
  return { x: pos.x, z: pos.z, radius: enemy.radius || .5, bottom: pos.y, height: enemy.height || 2.3, target: enemy };
}
export function aimHeight(distance, muzzleHeight = 1.95) {
  const t = THREE.MathUtils.smoothstep(distance, 5, 28);
  return THREE.MathUtils.lerp(.55, muzzleHeight, t);
}
export function pickAimPoint(ray, player, enemies) {
  const point = new THREE.Vector3(); let nearest = Infinity, selected = null;
  for (const enemy of enemies) {
    if (enemy.down || enemy.destroyed) continue;
    if (ray.intersectBox(shapeBounds(enemyAimShape(enemy)), point)) {
      const distance = point.distanceTo(ray.origin);
      if (distance < nearest) { nearest = distance; selected = point.clone(); }
    }
  }
  if (selected) return selected;
  const ground = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.32), point);
  if (!ground) return null;
  point.y = aimHeight(Math.hypot(point.x - player.x, point.z - player.z), 1.95 + (player.jumpY || 0));
  return point;
}
export function traceAimedVolley(origin, aim, heading, weapon, obstacles, targets) {
  const shots = [], hits = new Map(), count = weapon.pellets || 1;
  const base = new THREE.Vector3(aim.x - origin.x, aim.y - origin.y, aim.z - origin.z).normalize();
  if (base.lengthSq() < .1) base.set(-Math.sin(heading), 0, -Math.cos(heading));
  for (let i = 0; i < count; i++) {
    const direction = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), count > 1 ? (i / (count - 1) - .5) * weapon.spread : 0);
    const ray = new THREE.Ray(new THREE.Vector3(origin.x, origin.y, origin.z), direction), point = new THREE.Vector3();
    let nearest = weapon.range, impact = null;
    // Downward shots stop on the floor rather than continuing underground.
    const ground = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.32), point);
    if (ground && point.distanceTo(ray.origin) < nearest) { nearest = point.distanceTo(ray.origin); impact = { ...point, target: null }; }
    for (const shape of [...obstacles, ...targets]) {
      if (!ray.intersectBox(shapeBounds(shape), point)) continue;
      const distance = point.distanceTo(ray.origin);
      if (distance < nearest) { nearest = distance; impact = { x: point.x, y: point.y, z: point.z, target: shape.target || null }; }
    }
    shots.push({ direction, impact });
    if (impact?.target) {
      const damage = weapon.damage * (count > 1 ? 1 - .65 * nearest / weapon.range : 1);
      const previous = hits.get(impact.target);
      if (previous) previous.damage += damage;
      else hits.set(impact.target, { target: impact.target, damage, impact });
    }
  }
  return { shots, hits: [...hits.values()] };
}
