// Mark destruction before queuing the blast so splash damage cannot re-trigger it.
export function damageVehicle(car, damage) {
  if (car.destroyed || !Number.isFinite(damage) || damage <= 0) return false;
  car.health = Math.max(0, (car.health ?? 100) - damage);
  if (car.health > 0) return false;
  car.destroyed = true;
  car.speed = 0;
  car.disabled = Infinity;
  car.occupied = false;
  car.traffic = null;
  return true;
}
