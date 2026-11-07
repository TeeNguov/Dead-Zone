export function damagePlayer(player, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || player.health <= 0) return;
  const absorbed = Math.min(player.armor || 0, amount);
  player.armor = Math.max(0, (player.armor || 0) - absorbed);
  player.health = Math.max(0, player.health - amount + absorbed);
}
export function loseLife(player) {
  player.lives = Math.max(0, player.lives - 1);
  player.armor = 0;
  player.health = player.lives ? 100 : 0;
  return player.lives > 0;
}
