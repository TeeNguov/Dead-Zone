import { clearPath, distance } from './physics.js';
export const LIGHTNING = { duration: 8, recharge: 20, maxCharges: 3, range: 18, damage: 45, targets: 4, interval: .5, knockback: 4, stagger: .18 };
export function createLightning() { return { charge: 100, remaining: 0, pulse: 0 }; }
export function activateLightning(skill) {
  if (skill.remaining > 0 || skill.charge < 100) return false;
  skill.charge -= 100; skill.remaining = LIGHTNING.duration; skill.pulse = 0; return true;
}
export function tickLightning(skill, dt, origin, enemies, obstacles, strike) {
  if (skill.remaining <= 0) { skill.charge = Math.min(100 * LIGHTNING.maxCharges, skill.charge + dt * 100 / LIGHTNING.recharge); return; }
  const activeTime = Math.min(dt, skill.remaining);
  while (skill.pulse <= activeTime && skill.pulse < skill.remaining - 1e-7) {
    const targets = enemies.filter(e => !e.down && !e.destroyed && distance(origin, e.group.position) <= LIGHTNING.range && clearPath(origin, e.group.position, .05, obstacles))
      .sort((a, b) => distance(origin, a.group.position) - distance(origin, b.group.position)).slice(0, LIGHTNING.targets);
    targets.forEach((enemy, i) => strike(enemy, i));
    skill.pulse += LIGHTNING.interval;
  }
  skill.pulse -= activeTime;
  skill.remaining = Math.max(0, skill.remaining - activeTime);
  if (skill.remaining < 1e-8) skill.remaining = 0;
}

export function interruptLightning(skill) { skill.remaining = 0; skill.pulse = 0; }
