export const MAX_ACTIVE_ENEMIES = 160;
export function waveSize(number) { return 50 * 2 ** Math.max(0, number - 1); }
export function canSpawnWave(enemies) { return enemies.filter(enemy => !enemy.down).length < MAX_ACTIVE_ENEMIES; }
export function reusableWaveEnemy(enemies, type) { return enemies.find(enemy => enemy.down && !enemy.isBoss && !enemy.summoned && enemy.monsterType === type); }

export function startFreeWave(enemies) {
  const alive = enemies.filter(enemy => !enemy.down);
  for (const enemy of alive) enemy.freeWave = 1;
  return { number: 1, total: 1600, bosses: 2, bossPending: 2, pending: Math.max(0, 1600 - alive.length) };
}
export function advanceFreeWave(wave, pending, alive) {
  if (pending > 0 || alive > 0 || (wave.bossPending || 0) > 0) return false;
  wave.number++; wave.total *= 2; wave.bosses = (wave.bosses || 2) * 2; wave.bossPending = wave.bosses; return true;
}
