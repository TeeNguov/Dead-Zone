export const WEAPONS = [
  { name: 'Fists', damage: 34, range: 1.8, interval: .45, magazine: 0, reserve: 0, reload: 0 },
  { name: 'Pistol', damage: 34, range: 65, interval: .28, magazine: 12, reserve: 96, reload: 1.2 },
  { name: 'SMG', damage: 18, range: 48, interval: .09, magazine: 30, reserve: 180, reload: 1.7 },
];
export function createCombat() {
  return { selected: 0, cooldown: 0, reloadRemaining: 0, attackTime: 0, hitTime: 0,
    ammo: WEAPONS.map(w => w.magazine), reserve: WEAPONS.map(w => w.reserve) };
}
export function reloadWeapon(combat) {
  const w = WEAPONS[combat.selected];
  if (!w.magazine || combat.reloadRemaining > 0 || combat.ammo[combat.selected] >= w.magazine || !combat.reserve[combat.selected]) return false;
  combat.reloadRemaining = w.reload;
  return true;
}
export function tickCombat(combat, dt) {
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.attackTime = Math.max(0, combat.attackTime - dt);
  combat.hitTime = Math.max(0, combat.hitTime - dt);
  if (combat.reloadRemaining > 0) {
    combat.reloadRemaining = Math.max(0, combat.reloadRemaining - dt);
    if (combat.reloadRemaining === 0) {
      const i = combat.selected, count = Math.min(WEAPONS[i].magazine - combat.ammo[i], combat.reserve[i]);
      combat.ammo[i] += count; combat.reserve[i] -= count;
    }
  }
}
export function useWeapon(combat, melee = false) {
  const i = melee ? 0 : combat.selected, w = WEAPONS[i];
  if (combat.cooldown > 0 || combat.reloadRemaining > 0) return null;
  if (w.magazine && combat.ammo[i] <= 0) { reloadWeapon(combat); return null; }
  if (w.magazine) combat.ammo[i]--;
  combat.cooldown = w.interval; combat.attackTime = w.magazine ? .12 : .3;
  return w;
}

// Return the first impact along a world-space ray. Walls and vehicles block shots.
export function traceAttack(origin, direction, range, obstacles, targets) {
  const length = Math.hypot(direction.x, direction.z);
  if (length < 1e-8) return null;
  const dx = direction.x / length, dz = direction.z / length;
  function intersection(shape) {
    if (shape.radius !== undefined) {
      const x = origin.x - shape.x, z = origin.z - shape.z;
      const b = x * dx + z * dz, c = x * x + z * z - shape.radius * shape.radius;
      if (c <= 0) return 0;
      const disc = b * b - c;
      if (disc < 0) return Infinity;
      const t = -b - Math.sqrt(disc);
      return t >= 0 ? t : Infinity;
    }
    let near = 0, far = range;
    for (const [o, d, center, size] of [[origin.x, dx, shape.x, shape.w], [origin.z, dz, shape.z, shape.d]]) {
      if (Math.abs(d) < 1e-8) { if (o < center - size / 2 || o > center + size / 2) return Infinity; }
      else {
        const a = (center - size / 2 - o) / d, b = (center + size / 2 - o) / d;
        near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        if (near > far) return Infinity;
      }
    }
    return near;
  }
  let result = null, nearest = range;
  for (const shape of [...obstacles, ...targets]) {
    const t = intersection(shape);
    if (t < nearest) { nearest = t; result = { target: shape.target ?? null, distance: t, x: origin.x + dx * t, z: origin.z + dz * t }; }
  }
  return result;
}
