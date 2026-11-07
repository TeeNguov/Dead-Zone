import { isBlocked } from './physics.js';
export function rollEnemyLoot(enemy, player, random = Math.random) {
  const chance = .2;
  if (random() >= chance) return null;
  const roll = random();
  if (roll < .1) return 'ammo';
  if (roll < .2) return 'smgAmmo';
  if (roll < .3) return 'gatlingAmmo';
  if (roll < .5) return 'health';
  if (roll < .65) return 'armor';
  if (roll < .8) return 'shells';
  if (roll < .9) return 'grenades';
  if (roll < .96) return player.speedLevel >= 5 ? 'ammo' : 'speed';
  return 'lightning';
}
export function lootPosition(origin, obstacles) {
  for (let r = 0; r <= 4; r += .5) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const point = { x: origin.x + Math.cos(angle) * r, z: origin.z + Math.sin(angle) * r };
    if (!isBlocked(point.x, point.z, .6, obstacles)) return point;
  }
  return null;
}

export const ENEMY_DROP_LIFETIME = 5;
export function tickEnemyDrop(pickup, dt) {
  if (pickup.collected) return false;
  pickup.lifetime = Math.max(0, pickup.lifetime - dt);
  if (pickup.lifetime < 1e-8) {
    pickup.lifetime = 0; pickup.collected = true;
    pickup.group.visible = pickup.lightRing.visible = false;
  }
  return !pickup.collected;
}
