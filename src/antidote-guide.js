import { createPursuitField } from './pursuit.js';
import { distance } from './physics.js';
export function nearestIngredient(items, position) {
  return items.filter(item => !item.collected).sort((a, b) => distance(a, position) - distance(b, position))[0] || null;
}
export function createAntidoteGuide(colliders) {
  let field = createPursuitField(colliders), colliderCount = colliders.length;
  return {
    route(position, target, cars = []) {
      if (!target) return [];
      if (colliderCount !== colliders.length) { field = createPursuitField(colliders); colliderCount = colliders.length; }
      field.update(target, cars);
      const path = [{ x: position.x, z: position.z }], seen = new Set();
      for (let i = 0; i < 256; i++) {
        const from = path[path.length - 1], next = field.next(from, target);
        if (!next || distance(from, next) < .05) break;
        const key = `${next.x.toFixed(2)},${next.z.toFixed(2)}`;
        if (seen.has(key)) break;
        seen.add(key); path.push({ x: next.x, z: next.z });
        if (distance(next, target) < .2) break;
      }
      return path;
    },
  };
}
