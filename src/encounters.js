import { isBlocked, distance } from './physics.js';
export const SUMMON_LIMIT = 24;
export function summonType(parent) { return parent.isBoss ? (parent.summonBats ? 'bat' : 'pyramid-head') : parent.monsterType === 'pyramid-head' ? 'hound' : null; }
export function summonCap(type) { return type === 'hound' ? 18 : 3; }
export function canSummon(parent, monsters, target) {
  return !parent.down && !!summonType(parent) && distance(parent.group.position, target) < 45 &&
    monsters.filter(m => m.summoned && !m.down).length < SUMMON_LIMIT &&
    monsters.filter(m => m.summoned && !m.down && m.monsterType === summonType(parent)).length < summonCap(summonType(parent)) &&
    monsters.filter(m => m.summoner === parent && !m.down).length < (parent.isBoss ? 4 : 6);
}
export function ringSpawn(center, obstacles, radius = .5, min = 32, max = 46, random = Math.random, avoid = null, safeDistance = 10) {
  for (let i = 0; i < 80; i++) {
    const angle = random() * Math.PI * 2, distance = min + random() * (max - min);
    const point = { x: center.x + Math.cos(angle) * distance, z: center.z + Math.sin(angle) * distance };
    if (avoid && Math.hypot(point.x - avoid.x, point.z - avoid.z) < safeDistance) continue;
    if (!isBlocked(point.x, point.z, radius, obstacles)) return point;
  }
  return null;
}
export function shouldReposition(monster, target, speed) {
  return speed > 6 && !monster.down && !monster.isBoss && distance(monster.group.position, target) > 75;
}
