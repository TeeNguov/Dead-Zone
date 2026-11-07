import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { bodyDiscs, bodyBlocked, moveBody, moveWithCollision, isBlocked, circleHitsRect, clearPath, nearestRoad, roadRoute, advancePath, distance, JOBS, createMission, missionProgress } from '../src/physics.js';
import { createCity } from '../src/world.js';

test('boosted movement cannot tunnel through a building and slides along walls', () => {
  const walls = [{ x: 0, z: 0, w: 4, d: 20 }];
  const driver = { x: -10, z: 0 };
  assert.equal(moveWithCollision(driver, 30, 0, 1.65, walls), true);
  assert.ok(driver.x < -3.64);
  assert.equal(isBlocked(driver.x, driver.z, 1.65, walls), false);
  moveWithCollision(driver, 8, 5, 1.65, walls);
  assert.ok(driver.z > 4.9);
  assert.ok(driver.x < -3.64);
});

test('world edge keeps cars out of the water and recovery is safe', () => {
  const car = { x: 110, z: 112 };
  moveWithCollision(car, 30, 30, 1.65, []);
  assert.ok(car.x <= 113.35 && car.z <= 113.35);
  const safe = nearestRoad(car);
  assert.equal(isBlocked(safe.x, safe.z, 1.65, []), false);
  assert.ok(Math.abs(safe.x) <= 105 && Math.abs(safe.z) <= 105);
});

test('circle collision detects corners while allowing clear sidewalk movement', () => {
  const rect = { x: 0, z: 0, w: 10, d: 10 };
  assert.equal(circleHitsRect(5.4, 5.4, 1, rect), true);
  assert.equal(circleHitsRect(5.8, 5.8, 1, rect), false);
  assert.equal(circleHitsRect(0, 0, .5, rect), true);
});

test('police cannot take a direct shortcut through a building', () => {
  const block = [{ x: 0, z: 0, w: 10, d: 10 }];
  assert.equal(clearPath({ x: -10, z: 4 }, { x: 10, z: 4 }, 1.55, block), false);
  assert.equal(clearPath({ x: -10, z: 8 }, { x: 10, z: 8 }, 1.55, block), true);
});

test('traffic follows a complete route without teleporting at corners', () => {
  const actor = { x: 0, z: 0, target: 1, speed: 10, path: [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }] };
  advancePath(actor, 1.5);
  assert.equal(actor.x, 10); assert.equal(actor.z, 5); assert.equal(actor.target, 2);
  advancePath(actor, 2.5);
  assert.equal(actor.x, 0); assert.equal(actor.z, 0);
  assert.ok(Number.isFinite(actor.heading));
});

test('delivery needs a car, pickup, then drop-off, and pays only once', () => {
  const mission = createMission(0);
  assert.equal(missionProgress(mission, JOBS[0].points[1], true, 0), 'traveling');
  assert.equal(missionProgress(mission, JOBS[0].points[0], false, 0), 'traveling');
  assert.equal(missionProgress(mission, JOBS[0].points[0], true, 0), 'checkpoint');
  assert.equal(mission.stage, 1);
  assert.equal(missionProgress(mission, JOBS[0].points[1], true, 0), 'complete');
  assert.equal(missionProgress(null, JOBS[0].points[1], true, 0), 'inactive');
});

test('timed run requires every checkpoint in order', () => {
  const mission = createMission(1);
  assert.equal(missionProgress(mission, JOBS[1].points[3], true, 0), 'traveling');
  JOBS[1].points.forEach((point, index) => {
    assert.equal(missionProgress(mission, point, true, 0), index === 3 ? 'complete' : 'checkpoint');
  });
  const expired = createMission(1); expired.remaining = 0;
  assert.equal(missionProgress(expired, JOBS[1].points[0], true, 0), 'expired');
});

test('escape job requires triggering pursuit before clearing wanted level', () => {
  const mission = createMission(2);
  assert.equal(missionProgress(mission, { x: 30, z: 30 }, true, 0), 'traveling');
  assert.equal(missionProgress(mission, JOBS[2].points[0], true, 0), 'chase');
  assert.equal(missionProgress(mission, { x: 90, z: -90 }, true, 2), 'escaping');
  assert.equal(missionProgress(mission, { x: 90, z: -90 }, true, 0), 'complete');
});

// The scene graph can be checked without a GPU. Canvas text drawing is stubbed;
// this does not replace the browser visual/playability check.
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const scene = new THREE.Scene();
const city = createCity(scene);

test('player starts within entry range of a parked car, clear of buildings', () => {
  const spawn = { x: 38.4, z: 44 };
  assert.ok(distance(spawn, city.cars[0]) < 5);
  assert.equal(isBlocked(spawn.x, spawn.z, .5, city.colliders), false);
  for (const car of city.cars) assert.equal(isBlocked(car.x, car.z, 1.65, city.colliders), false, `Car spawn at ${car.x}, ${car.z}`);
});

test('every pickup and mission marker is reachable without entering a building', () => {
  for (const pickup of city.pickups) assert.equal(isBlocked(pickup.x, pickup.z, .5, city.colliders), false, `Pickup ${pickup.x}, ${pickup.z}`);
  for (const job of JOBS) for (const point of job.points) {
    let reachable = false;
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) {
      if (Math.hypot(x, z) < 6 && !isBlocked(point.x + x, point.z + z, 1.65, city.colliders)) reachable = true;
    }
    assert.ok(reachable, `${job.title} marker at ${point.x}, ${point.z}`);
  }
});

test('police road routes avoid building colliders across city districts', () => {
  const positions = [{ x: 33, z: 44 }, { x: -87, z: -55 }, { x: 58, z: -27 }, { x: 90, z: 100 }, { x: -18, z: 18 }];
  for (const from of positions.slice(0, 4)) for (const to of positions) {
    const route = roadRoute(from, to);
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i];
      assert.ok(a.x === b.x || a.z === b.z, 'Route segments must follow street grid');
      for (let t = 0; t <= 1; t += .05) {
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        assert.equal(isBlocked(x, z, 1.55, city.colliders), false, `Blocked pursuit route at ${x}, ${z}`);
      }
    }
  }
});

test('generated world uses instancing and finite geometry throughout', () => {
  assert.ok(city.staticMesh.isInstancedMesh);
  assert.ok(city.staticMesh.count > 1000);
  assert.ok(city.staticMesh.count < 20000);
  for (const n of city.staticMesh.instanceMatrix.array) assert.ok(Number.isFinite(n));
  scene.traverse(object => {
    if (!object.isMesh) return;
    const vertices = object.geometry.attributes.position.array;
    for (const n of vertices) assert.ok(Number.isFinite(n));
  });
  assert.equal(city.cars.length, 25);
  assert.equal(city.pedestrians.length, 36);
});

test('streets contain stopped cars and pursuing monsters', () => {
  assert.ok(city.cars.every(car => car.speed === 0 && car.traffic === null));
  assert.ok(city.pedestrians.every(monster => monster.monsterType && monster.speed >= 1.35 && monster.speed <= 5.3));
  assert.ok(new Set(city.cars.slice(7).map(car => car.heading)).size > 5);
});


test('sprinting player cannot tunnel through another human', () => {
  const player = { x: -8, z: 0, radius: .5 };
  const human = { x: 0, z: 0, radius: .5 };
  assert.equal(moveBody(player, 20, 0, bodyDiscs(human)), true);
  assert.ok(distance(player, human) >= 1);
});

test('fast cars stop at humans, parked vehicles, and thin street furniture', () => {
  for (const target of [bodyDiscs({ x: 0, z: 0 }), bodyDiscs({ x: 0, z: 0, radius: 1.25, length: 4.9 }), [{ x: 0, z: 0, w: .2, d: .2 }]]) {
    const car = { x: 0, z: 12, heading: 0, radius: 1.25, length: 4.9 };
    assert.equal(moveBody(car, 0, -30, target), true);
    assert.ok(car.z > 2.4);
    assert.equal(bodyBlocked(car, target), false);
  }
});

test('human cannot walk through a car bumper or side at any heading', () => {
  for (const heading of [0, Math.PI / 2, Math.PI / 4]) {
    const car = { x: 0, z: 0, heading, radius: 1.25, length: 4.9 };
    const human = { x: 0, z: 8, radius: .5 };
    moveBody(human, 0, -16, bodyDiscs(car));
    assert.equal(bodyBlocked(human, bodyDiscs(car)), false);
    assert.ok(human.z > 1.5);
  }
});

test('car footprint detects bumper contacts and allows a clear side', () => {
  const car = { x: 0, z: 0, radius: 1.25, length: 4.9, heading: 0 };
  assert.equal(bodyBlocked(car, [{ x: 0, z: -2.6, radius: .5 }]), true);
  assert.equal(bodyBlocked(car, [{ x: 2, z: 0, radius: .5 }]), false);
  assert.equal(bodyBlocked({ ...car, heading: Math.PI / 2 }, [{ x: 2.6, z: 0, radius: .5 }]), true);
});

test('humans meeting head-on remain separate over repeated updates', () => {
  const a = { x: -2, z: 0 }, b = { x: 2, z: 0 };
  for (let i = 0; i < 100; i++) {
    moveBody(a, .1, 0, bodyDiscs(b));
    moveBody(b, -.1, 0, bodyDiscs(a));
    assert.ok(distance(a, b) >= 1 - 1e-9);
  }
});
