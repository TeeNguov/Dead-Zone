export const WEAPONS = [
  { name: 'Fists', damage: 34, range: 1.8, interval: .45, magazine: 0, reserve: 0, reload: 0, knockback: 11, stagger: .3 },
  { name: 'Pistol', damage: 20, range: 65, interval: .28, magazine: 24, reserve: 96, reload: .45, knockback: 7, stagger: .2 },
  { name: 'Shotgun', damage: 24, range: 28, interval: .7, magazine: 16, reserve: 40, reload: .55, knockback: 12, stagger: .4, pellets: 8, spread: .38 },
  { name: 'SMG', damage: 28, range: 48, interval: .09, magazine: 60, reserve: 180, reload: .625, knockback: 4, stagger: .12 },
  { name: 'Gatling', damage: 36, range: 65, interval: .045, magazine: 120, reserve: 360, reload: 0, noReload: true, knockback: 3, stagger: .1, spinUp: .35 },
  { name: 'Grenade Launcher', type: 'grenade', magazine: 0, reserve: 0, reload: 0 },
];

export function applyKnockback(target, direction, weapon) {
  const length = Math.hypot(direction.x, direction.z);
  if (length < 1e-8) return;
  const resistance = target.monsterType === 'pyramid-head' ? .6 : 1;
  let x = (target.knockbackX || 0) + direction.x / length * weapon.knockback * resistance;
  let z = (target.knockbackZ || 0) + direction.z / length * weapon.knockback * resistance;
  const scale = Math.min(1, 12 / Math.max(.001, Math.hypot(x, z)));
  target.knockbackX = x * scale; target.knockbackZ = z * scale;
  target.staggerRemaining = weapon.stagger;
}

export function traceVolley(origin, heading, weapon, obstacles, targets) {
  const shots = [], hits = new Map(), count = weapon.pellets || 1;
  for (let i = 0; i < count; i++) {
    const angle = heading + (count > 1 ? (i / (count - 1) - .5) * weapon.spread : 0);
    const direction = { x: -Math.sin(angle), z: -Math.cos(angle) };
    const impact = traceAttack(origin, direction, weapon.range, obstacles, targets);
    shots.push({ direction, impact });
    if (impact?.target) {
      const damage = weapon.damage * (count > 1 ? 1 - .65 * impact.distance / weapon.range : 1);
      const previous = hits.get(impact.target);
      if (previous) previous.damage += damage;
      else hits.set(impact.target, { target: impact.target, damage, impact });
    }
  }
  return { shots, hits: [...hits.values()] };
}

export function tickKnockback(target, dt, move) {
  target.staggerRemaining = Math.max(0, (target.staggerRemaining || 0) - dt);
  const x = target.knockbackX || 0, z = target.knockbackZ || 0;
  if (Math.hypot(x, z) < .05) { target.knockbackX = target.knockbackZ = 0; return; }
  // Integrate exponential drag exactly so the shove feels the same at any FPS.
  const decay = Math.exp(-6 * dt), displacement = (1 - decay) / 6;
  const blocked = move(x * displacement, z * displacement);
  target.knockbackX = blocked ? 0 : x * decay;
  target.knockbackZ = blocked ? 0 : z * decay;
}
export function createCombat() {
  return { selected: 0, cooldown: 0, reloadRemaining: 0, attackTime: 0, hitTime: 0, spin: 0, grenades: 5, grenadeCooldown: 0,
    ammo: WEAPONS.map(w => w.magazine), reserve: WEAPONS.map(w => w.reserve) };
}
export function reloadWeapon(combat) {
  const w = WEAPONS[combat.selected];
  if (w.noReload || !w.magazine || combat.reloadRemaining > 0 || combat.ammo[combat.selected] >= w.magazine || !combat.reserve[combat.selected]) return false;
  combat.reloadRemaining = w.reload;
  return true;
}
export function tickCombat(combat, dt, firing = false) {
  const spinUp = WEAPONS[combat.selected].spinUp || 0;
  combat.spin = firing && spinUp && !combat.reloadRemaining ? Math.min(spinUp, combat.spin + dt) : Math.max(0, combat.spin - dt * 2);
  combat.grenadeCooldown = Math.max(0, combat.grenadeCooldown - dt);
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
  if (w.type === 'grenade' || (w.spinUp && combat.spin < w.spinUp)) return null;
  if (combat.cooldown > 0 || combat.reloadRemaining > 0) return null;
  if (w.noReload) {
    if (combat.ammo[i] > 0) combat.ammo[i]--;
    else if (combat.reserve[i] > 0) combat.reserve[i]--;
    else return null;
  }
  if (!w.noReload && w.magazine && combat.ammo[i] <= 0) { reloadWeapon(combat); return null; }
  if (w.magazine && !w.noReload) combat.ammo[i]--;
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

// Nine direct slots, shared by the number row and numeric keypad.
export function weaponSlot(code) {
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  return match ? Number(match[1]) - 1 : -1;
}

export function resetCombatAfterRespawn(combat) {
  // Keep selection, ammunition and launcher rounds; cancel interrupted actions.
  combat.reloadRemaining = combat.cooldown = combat.spin = combat.attackTime = combat.hitTime = combat.grenadeCooldown = 0;
}
