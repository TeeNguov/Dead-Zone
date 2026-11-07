export function popEnemy(enemy, particles) {
  if (enemy.down) return false;
  enemy.health = 0; enemy.down = Infinity; enemy.group.visible = false;
  enemy.knockbackX = enemy.knockbackZ = 0;
  const position = { x: enemy.group.position.x, y: enemy.group.position.y + (enemy.monsterType === 'hound' ? .5 : Math.min(1.6, (enemy.height || 2.3) * .5)), z: enemy.group.position.z };
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    particles.burst(position, { x: Math.cos(angle), z: Math.sin(angle) }, enemy.isBoss ? 9 : 6);
  }
  return true;
}
