export const MAX_SPEED_LEVEL = 5;
export function speedAtLevel(level = 0) {
  return 4.4 + Math.min(MAX_SPEED_LEVEL, Math.max(0, Math.floor(Number(level) || 0))) * .76;
}
