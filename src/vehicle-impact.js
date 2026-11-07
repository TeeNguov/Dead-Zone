import { bodyDiscs, bodyBlocked, circleHitsRect } from './physics.js';
export function impactProfile(speed, target) {
  speed = Math.abs(speed);
  if (target?.destructible) return { damage: Math.round(speed * speed * .45), knockback: 0, stagger: 0,
    retention: ({ tree: .5, bench: .65, bin: .84, hydrant: .65, lamp: .7, planter: .35, sign: .8 })[target.type] ?? .6 };
  const heavy = target?.isBoss || target?.monsterType === 'pyramid-head';
  return { damage: Math.min(45, Math.round(speed * 1.6)) * (heavy ? .55 : 1),
    knockback: Math.min(18, speed * .65), stagger: .5, retention: heavy ? .38 : .68 };
}
function contacts(body, obstacles) {
  return obstacles.filter(shape => !shape.walkThrough && bodyDiscs(body).some(disc => shape.radius !== undefined
    ? Math.hypot(disc.x - shape.x, disc.z - shape.z) < disc.radius + shape.radius
    : circleHitsRect(disc.x, disc.z, disc.radius, shape)));
}
export function driveWithImpacts(car, dt, now, getObstacles, onImpact) {
  car.impactTimes ??= new WeakMap();
  const steps = Math.max(1, Math.ceil(Math.abs(car.speed) * dt / .2));
  const result = { hit: false, solid: false };
  for (let step = 0; step < steps; step++) {
    const direction = { x: -Math.sin(car.heading) * Math.sign(car.speed), z: -Math.cos(car.heading) * Math.sign(car.speed) };
    const proposed = { ...car, x: car.x + direction.x * Math.abs(car.speed) * dt / steps, z: car.z + direction.z * Math.abs(car.speed) * dt / steps, radius: 1.25, length: 4.9 };
    const obstacles = getObstacles(), hits = contacts(proposed, obstacles);
    if (!hits.length && !bodyBlocked(proposed, [])) { car.x = proposed.x; car.z = proposed.z; continue; }
    result.hit = true;
    const targets = [...new Set(hits.map(h => h.target).filter(t => t?.destructible || t?.legL))];
    if (!targets.length || hits.some(h => !h.target || (!h.target.destructible && !h.target.legL))) {
      result.solid = true; car.speed *= -.12; break;
    }
    const speed = Math.abs(car.speed);
    for (const target of targets) {
      if (speed < 4 || now - (car.impactTimes.get(target) ?? -Infinity) < .9) continue;
      car.impactTimes.set(target, now);
      const profile = impactProfile(speed, target);
      onImpact(target, profile, direction);
      car.speed *= profile.retention;
    }
    // Destroyed props open a route immediately; living enemies remain solid
    // until knockback creates room. No tunnelling through surviving bodies.
    if (!bodyBlocked(proposed, getObstacles())) { car.x = proposed.x; car.z = proposed.z; }
    else { if (targets.some(t => t.destructible && !t.destroyed) || speed < 4) car.speed = 0; break; }
  }
  return result;
}
