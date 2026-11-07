import { clearPath, isBlocked, WORLD_LIMIT } from './physics.js';

// A shared breadth-first distance field lets every creature find a route around
// buildings and abandoned cars without running a separate search every frame.
export function createPursuitField(obstacles, step = 2, radius = .5) {
  const edge = WORLD_LIMIT - 1, size = Math.floor(edge * 2 / step) + 1;
  const total = size * size, base = new Uint8Array(total);
  let blocked = base.slice(), distances = new Int32Array(total), currentObstacles = obstacles;
  distances.fill(-1);
  const point = i => ({ x: (i % size) * step - edge, z: Math.floor(i / size) * step - edge });
  const index = p => {
    const x = Math.max(0, Math.min(size - 1, Math.round((p.x + edge) / step)));
    const z = Math.max(0, Math.min(size - 1, Math.round((p.z + edge) / step)));
    return z * size + x;
  };
  const neighbors = i => {
    const result = [];
    if (i % size > 0) result.push(i - 1);
    if (i % size < size - 1) result.push(i + 1);
    if (i >= size) result.push(i - size);
    if (i < total - size) result.push(i + size);
    return result;
  };
  for (let i = 0; i < total; i++) { const p = point(i); base[i] = +isBlocked(p.x, p.z, (radius + .05), obstacles); }
  const staticLinks = Array.from({ length: total }, (_, i) => base[i] ? [] : neighbors(i).filter(n => !base[n] && clearPath(point(i), point(n), radius, obstacles)));
  let links = staticLinks, vehicleKey = null;
  function nearest(p, reachable = false) {
    const start = index(p), queue = [start], visited = new Set(queue);
    for (let head = 0; head < queue.length && head < total; head++) {
      const i = queue[head];
      if (!blocked[i] && (!reachable || distances[i] >= 0) && clearPath(p, point(i), radius, currentObstacles)) return i;
      for (const n of neighbors(i)) if (!visited.has(n)) { visited.add(n); queue.push(n); }
    }
    return -1;
  }
  return {
    update(target, carDiscs = []) {
      currentObstacles = [...obstacles, ...carDiscs];
      const key = carDiscs.map(d => `${d.x.toFixed(2)},${d.z.toFixed(2)}`).join(';');
      if (key !== vehicleKey) {
      vehicleKey = key;
      blocked = base.slice();
      for (const disc of carDiscs) {
        const c = index(disc), cx = c % size, cz = Math.floor(c / size), span = Math.ceil((disc.radius + (radius + .05)) / step) + 1;
        for (let z = Math.max(0, cz - span); z <= Math.min(size - 1, cz + span); z++) for (let x = Math.max(0, cx - span); x <= Math.min(size - 1, cx + span); x++) {
          const i = z * size + x, p = point(i);
          if (Math.hypot(p.x - disc.x, p.z - disc.z) < disc.radius + (radius + .05)) blocked[i] = 1;
        }
      }
      links = staticLinks.map((edges, i) => {
        if (blocked[i]) return [];
        const p = point(i), nearby = carDiscs.filter(d => Math.abs(d.x - p.x) < 5 && Math.abs(d.z - p.z) < 5);
        return edges.filter(n => !blocked[n] && clearPath(p, point(n), radius, nearby));
      });
      }
      distances.fill(-1);
      // The player may be inside a car: seed the closest available ground cell.
      let start = -1, best = Infinity;
      for (let i = 0; i < total; i++) if (!blocked[i]) {
        const p = point(i), d = (p.x - target.x) ** 2 + (p.z - target.z) ** 2;
        if (d < best) { best = d; start = i; }
      }
      if (start < 0) return;
      const queue = new Int32Array(total); let head = 0, tail = 1;
      queue[0] = start; distances[start] = 0;
      while (head < tail) {
        const i = queue[head++];
        for (const n of links[i]) {
          if (distances[n] >= 0) continue;
          distances[n] = distances[i] + 1; queue[tail++] = n;
        }
      }
    },
    next(from, target) {
      if (clearPath(from, target, radius, currentObstacles)) return target;
      let i = index(from);
      if (blocked[i] || distances[i] < 0 || !clearPath(from, point(i), radius, currentObstacles)) i = nearest(from, true);
      if (i < 0) return null;
      const candidates = [i, ...neighbors(i)].filter(n => !blocked[n] && distances[n] >= 0 && clearPath(from, point(n), radius, currentObstacles));
      candidates.sort((a, b) => distances[a] - distances[b]);
      return candidates.length ? point(candidates[0]) : null;
    },
  };
}
