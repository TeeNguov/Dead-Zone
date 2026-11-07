export const ROAD_CENTERS = [-90, -30, 30, 90];
export const WORLD_LIMIT = 115;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export function circleHitsRect(x, z, radius, rect) {
  const nearestX = clamp(x, rect.x - rect.w / 2, rect.x + rect.w / 2);
  const nearestZ = clamp(z, rect.z - rect.d / 2, rect.z + rect.d / 2);
  return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2;
}

export function isBlocked(x, z, radius, obstacles) {
  return Math.abs(x) + radius > WORLD_LIMIT || Math.abs(z) + radius > WORLD_LIMIT ||
    obstacles.some(shape => !shape.walkThrough && (shape.radius !== undefined
      ? (x - shape.x) ** 2 + (z - shape.z) ** 2 < (radius + shape.radius) ** 2
      : circleHitsRect(x, z, radius, shape)));
}

// Cars use overlapping circles along their full length, including bumpers.
export function bodyDiscs(body) {
  const radius = body.radius ?? .5;
  const offsets = body.length ? [-body.length / 2 + radius, 0, body.length / 2 - radius] : [0];
  return offsets.map(offset => ({ x: body.x - Math.sin(body.heading || 0) * offset, z: body.z - Math.cos(body.heading || 0) * offset, radius }));
}

export function bodyBlocked(body, obstacles) {
  return bodyDiscs(body).some(disc => isBlocked(disc.x, disc.z, disc.radius, obstacles));
}

export function moveBody(body, dx, dz, obstacles) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / ((body.radius ?? .5) * .5)));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    const x = body.x, z = body.z;
    body.x += dx / steps;
    if (bodyBlocked(body, obstacles)) { body.x = x; hit = true; }
    body.z += dz / steps;
    if (bodyBlocked(body, obstacles)) { body.z = z; hit = true; }
  }
  return hit;
}

function segmentRect(ax, az, bx, bz, left, right, top, bottom) {
  let near = 0, far = 1;
  const dx = bx - ax, dz = bz - az;
  if (Math.abs(dx) < 1e-10) { if (ax < left || ax > right) return false; }
  else { const a = (left - ax) / dx, b = (right - ax) / dx; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); }
  if (Math.abs(dz) < 1e-10) { if (az < top || az > bottom) return false; }
  else { const a = (top - az) / dz, b = (bottom - az) / dz; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); }
  return near <= far;
}
function segmentCircle(ax, az, bx, bz, x, z, radius) {
  const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? clamp(((x - ax) * dx + (z - az) * dz) / lengthSq, 0, 1) : 0;
  return (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2 < radius * radius;
}
export function clearPath(from, to, radius, obstacles) {
  const ax = from.x, az = from.z, bx = to.x, bz = to.z;
  if (Math.max(Math.abs(ax), Math.abs(az), Math.abs(bx), Math.abs(bz)) + radius > WORLD_LIMIT) return false;
  const minX = Math.min(ax, bx) - radius, maxX = Math.max(ax, bx) + radius;
  const minZ = Math.min(az, bz) - radius, maxZ = Math.max(az, bz) + radius;
  for (const shape of obstacles) {
    if (shape.walkThrough) continue;
    if (shape.radius !== undefined) {
      if (shape.x + shape.radius < minX || shape.x - shape.radius > maxX || shape.z + shape.radius < minZ || shape.z - shape.radius > maxZ) continue;
      if (segmentCircle(ax, az, bx, bz, shape.x, shape.z, radius + shape.radius)) return false;
    } else {
      const l = shape.x - shape.w / 2, r = shape.x + shape.w / 2, t = shape.z - shape.d / 2, b = shape.z + shape.d / 2;
      if (r < minX || l > maxX || b < minZ || t > maxZ) continue;
      // A swept circle against a rectangle is two expanded strips plus four rounded corners.
      if (segmentRect(ax, az, bx, bz, l - radius, r + radius, t, b) || segmentRect(ax, az, bx, bz, l, r, t - radius, b + radius) ||
          segmentCircle(ax, az, bx, bz, l, t, radius) || segmentCircle(ax, az, bx, bz, l, b, radius) ||
          segmentCircle(ax, az, bx, bz, r, t, radius) || segmentCircle(ax, az, bx, bz, r, b, radius)) return false;
    }
  }
  return true;
}

// Resolve in small steps so a boosted vehicle cannot tunnel through a wall.
export function moveWithCollision(position, dx, dz, radius, obstacles) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * .65)));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    const x = position.x + dx / steps;
    const z = position.z + dz / steps;
    if (!isBlocked(x, position.z, radius, obstacles)) position.x = x;
    else hit = true;
    if (!isBlocked(position.x, z, radius, obstacles)) position.z = z;
    else hit = true;
  }
  return hit;
}

export function nearestRoad(position) {
  const x = ROAD_CENTERS.reduce((a, b) => Math.abs(a - position.x) < Math.abs(b - position.x) ? a : b);
  const z = ROAD_CENTERS.reduce((a, b) => Math.abs(a - position.z) < Math.abs(b - position.z) ? a : b);
  if (Math.abs(x - position.x) < Math.abs(z - position.z)) return { x: x + 3, z: clamp(position.z, -105, 105) };
  return { x: clamp(position.x, -105, 105), z: z + 3 };
}

export function advancePath(actor, dt) {
  let remaining = actor.speed * dt;
  let iterations = 0;
  while (remaining > 0 && iterations++ < 20) {
    const target = actor.path[actor.target];
    const dx = target.x - actor.x, dz = target.z - actor.z;
    const d = Math.hypot(dx, dz);
    if (d < .001) { actor.target = (actor.target + 1) % actor.path.length; continue; }
    const step = Math.min(d, remaining);
    actor.x += dx / d * step;
    actor.z += dz / d * step;
    actor.heading = Math.atan2(-dx, -dz);
    remaining -= step;
    if (step === d) actor.target = (actor.target + 1) % actor.path.length;
  }
}

// A road-grid route keeps pursuing cars out of solid city blocks.
export function roadRoute(from, to) {
  const snap = p => ({
    x: ROAD_CENTERS.reduce((a, b) => Math.abs(a - p.x) < Math.abs(b - p.x) ? a : b),
    z: ROAD_CENTERS.reduce((a, b) => Math.abs(a - p.z) < Math.abs(b - p.z) ? a : b),
  });
  const a = snap(from), b = snap(to);
  const fromVertical = Math.abs(a.x - from.x) < Math.abs(a.z - from.z);
  const toVertical = Math.abs(b.x - to.x) < Math.abs(b.z - to.z);
  const start = fromVertical
    ? { x: a.x, z: from.z } : { x: from.x, z: a.z };
  const end = toVertical
    ? { x: b.x, z: to.z } : { x: to.x, z: b.z };
  let route;
  if (fromVertical && toVertical) {
    const cross = ROAD_CENTERS.reduce((best, road) => Math.abs(start.z - road) + Math.abs(end.z - road) < Math.abs(start.z - best) + Math.abs(end.z - best) ? road : best);
    route = start.x === end.x ? [start, end] : [start, { x: start.x, z: cross }, { x: end.x, z: cross }, end];
  } else if (!fromVertical && !toVertical) {
    const cross = ROAD_CENTERS.reduce((best, road) => Math.abs(start.x - road) + Math.abs(end.x - road) < Math.abs(start.x - best) + Math.abs(end.x - best) ? road : best);
    route = start.z === end.z ? [start, end] : [start, { x: cross, z: start.z }, { x: cross, z: end.z }, end];
  } else {
    route = [start, fromVertical ? { x: start.x, z: end.z } : { x: end.x, z: start.z }, end];
  }
  return route.filter((p, i, arr) => i === 0 || distance(p, arr[i - 1]) > 1);
}

export const JOBS = [
  { title: 'Special delivery', reward: 400, duration: 150, points: [{ x: 39, z: 19 }, { x: -30, z: -72 }], instructions: ['Collect the parcel outside Paloma Post.', 'Deliver the parcel to the Northside shop.'] },
  { title: 'Coast to coast', reward: 650, duration: 100, points: [{ x: 90, z: 30 }, { x: 90, z: -90 }, { x: -30, z: -90 }, { x: -90, z: 30 }], instructions: ['Take a car through all four checkpoints.'] },
  { title: 'Lose the tail', reward: 900, duration: 140, points: [{ x: -30, z: 90 }], instructions: ['Drive to the marker. Your contact is waiting.', 'Lose the creatures. Keep your distance until the heat fades.'] },
];

export function createMission(index) {
  const job = JOBS[index];
  if (!job) throw new RangeError('Unknown job');
  return { index, stage: 0, remaining: job.duration, initialDistance: 1, escaping: false };
}

export function missionProgress(mission, position, driving, heat) {
  if (!mission) return 'inactive';
  if (mission.remaining <= 0) return 'expired';
  if (mission.escaping) return heat <= 0 ? 'complete' : 'escaping';
  const job = JOBS[mission.index];
  if (!driving || distance(position, job.points[mission.stage]) > 6) return 'traveling';
  if (mission.index === 2) { mission.escaping = true; return 'chase'; }
  mission.stage++;
  return mission.stage >= job.points.length ? 'complete' : 'checkpoint';
}
