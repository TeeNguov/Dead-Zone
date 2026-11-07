import { waveSize } from './waves.js';
import { distance } from './physics.js';
export const SYMBOL_LOCATIONS = [{ x: -80, z: -60 }, { x: 20, z: -70 }, { x: 100, z: 0 }, { x: 20, z: 70 }, { x: -80, z: 60 }];
export function createObjectives() { return { found: new Set(), pending: 0, boss: null, complete: false }; }
export function collectSymbol(objectives, id) {
  if (id < 0 || id >= 5 || objectives.found.has(id)) return 0;
  objectives.found.add(id);
  const count = waveSize(objectives.found.size);
  objectives.pending += count;
  return count;
}
export const ACID_GRAVITY = 9.8;
export function createAcidShot(origin, target, radius = .5, offset = 0) {
  const angle = Math.atan2(target.z - origin.z, target.x - origin.x) + offset;
  const dx = Math.cos(angle), dz = Math.sin(angle), muzzle = radius + .4;
  const flight = Math.max(.25, (distance(origin, target) - muzzle) / 10);
  return { x: origin.x + dx * muzzle, y: origin.y, z: origin.z + dz * muzzle,
    vx: dx * 10, vz: dz * 10, vy: ((target.aimY ?? 1.2) - origin.y) / flight + .5 * ACID_GRAVITY * flight, life: 5 };
}
// Intersect a swept sphere with the vertical extent and horizontal footprint.
function volumeHit(a, b, shape, radius = .28) {
  let near = 0, far = 1;
  const slab = (start, end, low, high) => {
    const delta = end - start;
    if (Math.abs(delta) < 1e-9) return start >= low && start <= high;
    const t1 = (low - start) / delta, t2 = (high - start) / delta;
    near = Math.max(near, Math.min(t1, t2)); far = Math.min(far, Math.max(t1, t2));
    return near <= far;
  };
  if (!slab(a.y, b.y, (shape.bottom || 0) - radius, (shape.bottom || 0) + (shape.height ?? 5) + radius)) return Infinity;
  if (shape.radius !== undefined) {
    const dx = b.x - a.x, dz = b.z - a.z, x = a.x - shape.x, z = a.z - shape.z;
    const aa = dx * dx + dz * dz, bb = x * dx + z * dz, cc = x * x + z * z - (shape.radius + radius) ** 2;
    if (aa < 1e-12) { if (cc > 0) return Infinity; }
    else {
      const disc = bb * bb - aa * cc;
      if (disc < 0) return Infinity;
      near = Math.max(near, (-bb - Math.sqrt(disc)) / aa);
      far = Math.min(far, (-bb + Math.sqrt(disc)) / aa);
    }
  } else if (!slab(a.x, b.x, shape.x - shape.w / 2 - radius, shape.x + shape.w / 2 + radius) ||
    !slab(a.z, b.z, shape.z - shape.d / 2 - radius, shape.z + shape.d / 2 + radius)) return Infinity;
  return near <= far ? near : Infinity;
}
export function tickAcid(shot, dt, target, obstacles, targetRadius = .5) {
  // Small ballistic segments keep the curved sweep accurate even after a long frame.
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / steps;
  for (let i = 0; i < steps; i++) {
    const next = { x: shot.x + shot.vx * step, y: shot.y + shot.vy * step - .5 * ACID_GRAVITY * step * step, z: shot.z + shot.vz * step };
    let nearest = next.y <= .55 ? Math.max(0, (shot.y - .55) / (shot.y - next.y)) : Infinity;
    let result = 'ground';
    for (const obstacle of obstacles) {
      const t = volumeHit(shot, next, obstacle);
      if (t < nearest) { nearest = t; result = 'wall'; }
    }
    const hit = volumeHit(shot, next, { ...target, height: target.height ?? 1.8, radius: targetRadius });
    if (hit < nearest) { nearest = hit; result = 'hit'; }
    const fraction = Number.isFinite(nearest) ? nearest : 1;
    shot.x += (next.x - shot.x) * fraction; shot.y += (next.y - shot.y) * fraction; shot.z += (next.z - shot.z) * fraction;
    shot.vy -= ACID_GRAVITY * step * fraction; shot.life -= step * fraction;
    if (Number.isFinite(nearest)) return result;
    if (shot.life <= 0 || distance(shot, target) > 100) return 'expired';
  }
  return 'flying';
}
