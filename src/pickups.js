import { MAX_SPEED_LEVEL } from './speed.js';
import { isBlocked, ROAD_CENTERS } from './physics.js';
import { WEAPONS } from './combat.js';

export const PICKUP_TYPES = ['ammo', 'health', 'grenades', 'lightning', 'shells', 'armor', 'speed', 'smgAmmo', 'gatlingAmmo'];
export const PICKUP_COLORS = { ammo: 0x7fa783, health: 0xe5dfca, grenades: 0x7f8758, lightning: 0xffdd35, smgAmmo: 0x91b787, gatlingAmmo: 0xa0b56c, shells: 0xd68c4c, armor: 0x69afcf, speed: 0xb18aef };
export function randomPickupPosition(obstacles, occupied = [], player = null, random = Math.random) {
  for (let attempt = 0; attempt < 160; attempt++) {
    const road = ROAD_CENTERS[Math.floor(random() * ROAD_CENTERS.length)];
    const along = -106 + random() * 212, side = random() > .5 ? 9.6 : -9.6;
    const horizontal = random() > .5;
    const p = { x: horizontal ? along : road + side, z: horizontal ? road + side : along };
    if (isBlocked(p.x, p.z, .6, obstacles)) continue;
    if (player && Math.hypot(p.x - player.x, p.z - player.z) < 8) continue;
    if (occupied.some(other => Math.hypot(p.x - other.x, p.z - other.z) < 5)) continue;
    return p;
  }
  return null;
}
export function collectItem(type, combat, player, state, lightning = null) {
  if (type === 'lightning') {
    if (!lightning || lightning.charge >= 300) return null;
    lightning.charge = Math.min(300, lightning.charge + 100);
    return { title: 'Lightning Charge Collected', sound: 'electric' };
  }
  if (type === 'speed') {
    if ((player.speedLevel || 0) >= MAX_SPEED_LEVEL) return null;
    player.speedLevel = (player.speedLevel || 0) + 1;
    return { title: `Speed level ${player.speedLevel} / ${MAX_SPEED_LEVEL}${player.speedLevel === MAX_SPEED_LEVEL ? ' · MAX' : ''}`, sound: 'pickup' };
  }
  if (type === 'armor') {
    if ((player.armor || 0) >= 100) return null;
    const restored = Math.min(40, 100 - (player.armor || 0)); player.armor = (player.armor || 0) + restored;
    return { title: `Armor restored. +${restored}`, sound: 'armor' };
  }
  if (type === 'health') {
    if (player.health >= 100) return null;
    const restored = Math.min(35, 100 - player.health); player.health += restored;
    return { title: `First aid. +${Math.ceil(restored)} health`, sound: 'heal' };
  }
  if (type === 'grenades') {
    if (combat.grenades >= 20) return null;
    const gained = Math.min(2, 20 - combat.grenades); combat.grenades += gained;
    return { title: `Launcher rounds collected. +${gained}`, sound: 'ammo' };
  }
  if (['ammo', 'shells', 'smgAmmo', 'gatlingAmmo'].includes(type)) {
    const amounts = type === 'shells' ? { 2: 16 } : type === 'smgAmmo' ? { 3: 60 } : type === 'gatlingAmmo' ? { 4: 120 } : { 1: 24 };
    let added = 0;
    for (const [index, count] of Object.entries(amounts)) {
      const before = combat.reserve[index];
      combat.reserve[index] = Math.min(WEAPONS[index].reserve * 3, before + count);
      if (combat.reserve[index] < before) combat.reserve[index] = before;
      added += combat.reserve[index] - before;
    }
    return added ? { title: type === 'shells' ? 'Shotgun shells collected.' : 'Ammunition collected.', sound: 'ammo' } : null;
  }
  return null;
}
