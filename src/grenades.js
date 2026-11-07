import { clearPath, distance, moveWithCollision } from './physics.js';

export const GRENADE = { fuse: 1.7, radius: 9, damage: 150, knockback: 12, stagger: .6 };
export function throwGrenade(combat, origin, heading) {
  if (combat.grenades <= 0 || combat.grenadeCooldown > 0 || combat.reloadRemaining > 0) return null;
  combat.grenades--; combat.grenadeCooldown = .8; combat.attackTime = .3;
  return { x: origin.x, y: 1.2, z: origin.z, vx: -Math.sin(heading) * 12, vy: 6, vz: -Math.cos(heading) * 12, fuse: GRENADE.fuse, active: true };
}
export function launchGrenade(combat, origin, heading) {
  const grenade = throwGrenade(combat, origin, heading);
  if (!grenade) return null;
  Object.assign(grenade, { y: origin.y ?? 1.7, vx: -Math.sin(heading) * 24, vz: -Math.cos(heading) * 24, vy: 3.5, launcher: true });
  return grenade;
}
export function tickGrenade(grenade, dt, obstacles) {
  if (!grenade.active) return false;
  const hit = moveWithCollision(grenade, grenade.vx * dt, grenade.vz * dt, .18, obstacles);
  if (hit && grenade.launcher) { grenade.active = false; return true; }
  if (hit) { grenade.vx *= -.4; grenade.vz *= -.4; }
  grenade.vy -= 12 * dt; grenade.y += grenade.vy * dt;
  if (grenade.launcher && grenade.y < .4) { grenade.active = false; return true; }
  if (grenade.y < .4) { grenade.y = .4; grenade.vy = Math.abs(grenade.vy) > 1 ? -grenade.vy * .25 : 0; }
  const drag = Math.exp(-dt * (grenade.y <= .41 ? 4 : .15));
  grenade.vx *= drag; grenade.vz *= drag;
  grenade.fuse -= dt;
  if (grenade.fuse <= 0) { grenade.active = false; return true; }
  return false;
}
export function blastDamage(origin, target, walls) {
  const d = distance(origin, target);
  if (d >= GRENADE.radius || !clearPath(origin, target, .02, walls)) return 0;
  return Math.round(GRENADE.damage * (1 - d / GRENADE.radius));
}
