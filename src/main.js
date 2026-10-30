import './style.css';
import { createAtmosphere } from './atmosphere.js';
import { WEAPONS, createCombat, tickCombat, reloadWeapon, useWeapon, traceAttack } from './combat.js';
import * as THREE from 'three';
import { box, createCity, makePerson, makeCar, animatePerson } from './world.js';
import { bodyDiscs, bodyBlocked, moveBody, clamp, distance, lerpAngle, moveWithCollision, isBlocked, clearPath, nearestRoad, advancePath, roadRoute, JOBS, createMission, missionProgress, ROAD_CENTERS } from './physics.js';

const $ = id => document.getElementById(id);
document.body.classList.add('intro');
const canvas = $('world');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  $('loading').innerHTML = '<b>YOUR CITY NEEDS WEBGL</b><span>Please enable hardware acceleration or try another browser.</span>';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .95;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x65716b);
scene.fog = new THREE.Fog(0x65716b, 18, 105);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .1, 550);
const hemisphere = new THREE.HemisphereLight(0xb1beb4, 0x30342e, 1.65);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xc2c8b8, .8);
sun.position.set(-60, 100, 45); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -67, right: 67, top: 67, bottom: -67, near: 1, far: 230 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .045;
scene.add(sun, sun.target);
const city = createCity(scene);
const atmosphere = createAtmosphere(scene, city.streetLights);
const avatar = makePerson(true); scene.add(avatar.group);
avatar.group.position.set(38.4, .32, 44);
const player = { x: 38.4, z: 44, heading: 0, health: 100, jumpY: 0, jumpVelocity: 0, speed: 0 };
const state = { started: false, paused: false, cash: 250, completed: 0, heat: 0, heatGrace: 0, vehicle: null, mission: null, night: false, collisionCooldown: 0, invulnerability: 0, audio: false };
try {
  const saved = JSON.parse(localStorage.getItem('blocky-city-save-v1') || 'null');
  if (saved) { state.cash = clamp(Number(saved.cash) || 250, 0, 9999999); state.completed = clamp(Number(saved.completed) || 0, 0, 9999); }
} catch { /* Private browsing or an old save should not stop the game. */ }
function saveProgress() { try { localStorage.setItem('blocky-city-save-v1', JSON.stringify({ cash: state.cash, completed: state.completed })); } catch { /* Storage is optional. */ } }

const keys = new Set();
const police = [];
let elapsed = 0, uiClock = 0, saveClock = 0, toastTimer = 0, nearestCar = null;
let cameraYaw = .6, cameraPitch = .88, cameraDistance = 43;
let dragging = false, previousPointer = null;
const cameraTarget = new THREE.Vector3(30, 1.4, 30);
const cameraDesired = new THREE.Vector3();
const marker = new THREE.Group();
const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, .16, 5, 48), new THREE.MeshBasicMaterial({ color: 0xf6c65b }));
ring.rotation.x = Math.PI / 2; ring.position.y = .5; marker.add(ring);
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 10, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xf9ce6a, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide }));
beacon.position.y = 5; marker.add(beacon);
const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.9), new THREE.MeshLambertMaterial({ color: 0xffd568, emissive: 0x6b490e }));
diamond.position.y = 4.8; marker.add(diamond); marker.visible = false; scene.add(marker);
const playerRing = new THREE.Mesh(new THREE.RingGeometry(.62, .76, 32), new THREE.MeshBasicMaterial({ color: 0xf8e5ba, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
playerRing.rotation.x = -Math.PI / 2; scene.add(playerRing);
const engine = { context: null, oscillator: null, gain: null };

const combat = createCombat();
const aimRay = new THREE.Raycaster(), aimMouse = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.25);
const aimPoint = new THREE.Vector3();
let mouseAiming = false;
const effects = [];
const gun = new THREE.Group();
box(.2, .19, .7, 0x34454d, 0, 0, -.15, gun);
box(.17, .29, .2, 0x66584a, 0, -.16, .07, gun);
box(.12, .12, .1, 0x899b9b, 0, 0, -.54, gun);
gun.position.set(.34, 1.22, -.65); avatar.group.add(gun); gun.visible = false;

function selectWeapon(index) {
  if (!state.started || state.paused) return;
  combat.selected = index; combat.reloadRemaining = 0;
  updateUI();
}
function combatSound(shooting) {
  if (!state.audio || !engine.context) return;
  const ctx = engine.context, oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = shooting ? 'square' : 'triangle';
  oscillator.frequency.setValueAtTime(shooting ? 155 : 95, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + .1);
  gain.gain.setValueAtTime(.055, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12);
  oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .13);
}
function tracer(from, to, color = 0xffdc81) {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from.x, 1.25, from.z), new THREE.Vector3(to.x, 1.25, to.z)]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .95 });
  const line = new THREE.Line(geometry, material); scene.add(line); effects.push({ object: line, remaining: .1 });
}
function attack(melee = false) {
  if (!state.started || state.paused || state.vehicle) return;
  const weapon = useWeapon(combat, melee);
  if (!weapon) return;
  const direction = { x: -Math.sin(player.heading), z: -Math.cos(player.heading) };
  const targets = [];
  for (const person of city.pedestrians) {
    if (!person.down) targets.push({ ...person.group.position, radius: weapon.magazine ? .5 : .85, target: person });
  }
  for (const car of [...city.cars, ...police]) {
    targets.push(...bodyDiscs({ ...car, radius: 1.25, length: 4.9 }).map(disc => ({ ...disc, target: car })));
  }
  const impact = traceAttack(player, direction, weapon.range, city.colliders, targets);
  if (weapon.magazine) {
    tracer({ x: player.x + direction.x * .6, z: player.z + direction.z * .6 }, impact || { x: player.x + direction.x * weapon.range, z: player.z + direction.z * weapon.range });
    addHeat(.12);
    for (const person of city.pedestrians) if (!person.down && distance(person.group.position, player) < 24) person.panic = 7;
  }
  combatSound(!!weapon.magazine);
  if (impact?.target) {
    const target = impact.target;
    combat.hitTime = .18;
    target.health = (target.health ?? 100) - weapon.damage;
    if (target.legs || target.legL) {
      target.panic = 9;
      addHeat(.45);
      if (target.health <= 0) {
        target.down = 12; target.group.rotation.z = Math.PI / 2;
        target.group.position.y = .45;
        toast('Knocked out.', 'Something heard you in the fog.', '★', 2);
      }
    } else if (target.health <= 0) {
      target.disabled = 15; target.speed = 0; target.health = 100;
      toast('Vehicle disabled.', 'It will recover shortly.', 'Ⅱ', 2);
    }
  }
  updateUI();
}
function updateCombat(dt) {
  tickCombat(combat, dt);
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i]; effect.remaining -= dt;
    if (effect.remaining <= 0) { scene.remove(effect.object); effect.object.geometry.dispose(); effect.object.material.dispose(); effects.splice(i, 1); }
  }
  if (!state.vehicle && mouseAiming) {
    aimRay.setFromCamera(aimMouse, camera);
    if (aimRay.ray.intersectPlane(aimPlane, aimPoint) && Math.hypot(aimPoint.x - player.x, aimPoint.z - player.z) > .5) {
      player.heading = Math.atan2(player.x - aimPoint.x, player.z - aimPoint.z);
      avatar.group.rotation.y = player.heading;
    }
  }
  if (keys.has('KeyF') || keys.has('MouseFire')) attack();
  if (keys.has('KeyJ')) attack(true);
  gun.visible = combat.selected > 0 && !state.vehicle;
  gun.scale.z = combat.selected === 2 ? 1.5 : 1;
  gun.position.z = -.65 + combat.attackTime * .6;
  if (!state.vehicle && (combat.selected > 0 || combat.attackTime > 0)) {
    avatar.armR.rotation.x = -Math.PI / 2 + (combat.selected ? combat.attackTime : Math.sin(combat.attackTime / .3 * Math.PI) * .7);
    avatar.elbowR.rotation.x = 0;
  }
  $('crosshair').hidden = !mouseAiming || !!state.vehicle || !state.started;
  $('crosshair').classList.toggle('hit', combat.hitTime > 0);
}

function initAudio() {
  if (engine.context) { engine.context.resume(); return; }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    engine.context = new AudioContext();
    engine.oscillator = engine.context.createOscillator(); engine.oscillator.type = 'sawtooth';
    const filter = engine.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 260;
    engine.gain = engine.context.createGain(); engine.gain.gain.value = 0;
    engine.oscillator.connect(filter); filter.connect(engine.gain); engine.gain.connect(engine.context.destination); engine.oscillator.start();
  } catch { state.audio = false; }
}
function chime(success = true) {
  if (!state.audio || !engine.context) return;
  const ctx = engine.context;
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = success ? [523, 659, 784][i] : [330, 262, 196][i];
    gain.gain.setValueAtTime(0, ctx.currentTime + i * .09);
    gain.gain.linearRampToValueAtTime(.045, ctx.currentTime + i * .09 + .02);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .09 + .3);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(ctx.currentTime + i * .09); osc.stop(ctx.currentTime + i * .09 + .35);
  }
}

function toast(title, copy = '', icon = '↗', duration = 4.5) {
  $('toast-title').textContent = title; $('toast-copy').textContent = copy; $('toast-icon').textContent = icon;
  $('toast').classList.add('visible'); toastTimer = duration;
}
function startGame() {
  if (state.started) return;
  state.started = true;
  document.body.classList.remove('intro');
  $('welcome').style.opacity = 0;
  setTimeout(() => { $('welcome').hidden = true; }, 500);
  canvas.focus();
  toast('You shouldn’t be here.', 'A car waits beside you. Press E. Keep your light close.');
  updateUI();
}
function updatePaused() {
  state.paused = [...document.querySelectorAll('dialog')].some(d => d.open) || document.hidden;
  keys.clear();
  if (engine.gain && state.paused) engine.gain.gain.setTargetAtTime(0, engine.context.currentTime, .1);
}
function openDialog(id) {
  if (!state.started) return;
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  $(id).showModal(); updatePaused();
  if (id === 'map-dialog') drawMap($('large-map'), true);
}
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); updatePaused(); canvas.focus(); }
function toggleMap() { $('map-dialog').open ? closeDialogs() : openDialog('map-dialog'); }

function getPosition() { return state.vehicle || player; }
// One collision world for every moving actor; occupied cars replace their driver.
function collisionObstacles(self) {
  const obstacles = [...city.colliders];
  for (const car of [...city.cars, ...police]) {
    if (car !== self) obstacles.push(...bodyDiscs({ ...car, radius: 1.25, length: 4.9 }));
  }
  if (!state.vehicle && self !== player) obstacles.push(...bodyDiscs(player));
  for (const person of city.pedestrians) {
    if (!person.down && person.group.position !== self) obstacles.push(...bodyDiscs(person.group.position));
  }
  return obstacles;
}
function moveActor(actor, dx, dz, vehicle = false) {
  const obstacles = collisionObstacles(actor);
  const body = { x: actor.x, z: actor.z, heading: actor.heading || 0, radius: vehicle ? 1.25 : .5, length: vehicle ? 4.9 : 0 };
  const hit = moveBody(body, dx, dz, obstacles);
  actor.x = body.x; actor.z = body.z;
  return hit;
}
function turnVehicle(car, heading) {
  if (!bodyBlocked({ ...car, heading, radius: 1.25, length: 4.9 }, collisionObstacles(car))) car.heading = heading;
}
function clearSpawn(actor, position, vehicle = false) {
  const obstacles = collisionObstacles(actor);
  for (let r = 0; r <= 20; r += .75) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const body = { x: position.x + Math.cos(angle) * r, z: position.z + Math.sin(angle) * r, heading: 0, radius: vehicle ? 1.25 : .5, length: vehicle ? 4.9 : 0 };
      if (!bodyBlocked(body, obstacles)) return body;
    }
  }
  return null;
}
function updateNearestCar() {
  nearestCar = null;
  if (state.vehicle) return;
  let nearest = 5;
  for (const car of city.cars) {
    const d = distance(car, player);
    if (d < nearest && Math.abs(car.speed) < 10) { nearestCar = car; nearest = d; }
  }
}
function enterExitCar() {
  if (!state.started || state.paused) return;
  if (state.vehicle) {
    const car = state.vehicle;
    if (Math.abs(car.speed) > 7) { toast('Easy there.', 'Slow down before getting out.', 'Ⅱ', 2.5); return; }
    const candidates = [1, -1, 2, -2].map(side => ({ x: car.x + Math.cos(car.heading) * 3 * Math.sign(side) + (Math.abs(side) - 1) * 3, z: car.z - Math.sin(car.heading) * 3 * Math.sign(side) }));
    const exit = candidates.find(p => !isBlocked(p.x, p.z, .55, collisionObstacles(player)));
    if (!exit) { toast('A tight parking spot.', 'Pull away from the wall to get out.', '↔', 2.5); return; }
    player.x = exit.x; player.z = exit.z; player.heading = car.heading; car.speed = 0; car.occupied = false;
    state.vehicle = null; avatar.group.visible = true; player.speed = 0; player.jumpY = 0;
  } else {
    updateNearestCar();
    if (!nearestCar) { toast('Find yourself some wheels.', 'Walk close to a car, then press E.', '↗', 2.5); return; }
    const wasTraffic = !!nearestCar.traffic;
    nearestCar.traffic = null; nearestCar.speed = 0; nearestCar.occupied = true; state.vehicle = nearestCar;
    avatar.group.visible = false; player.jumpY = 0;
    toast(nearestCar.name, 'W / S to drive · A / D to steer · Space to drift', '↗', 3);
    if (wasTraffic) addHeat(.6);
  }
  updateUI();
}

function addHeat(amount) {
  const previous = Math.ceil(state.heat);
  state.heat = clamp(state.heat + amount, 0, 5); state.heatGrace = 7;
  if (Math.ceil(state.heat) > previous) toast('You got their attention.', 'Keep moving. Lose the patrols to clear your heat.', '★', 3);
}
function spawnPolice() {
  const pos = getPosition();
  const side = police.length % 2 ? -1 : 1;
  const start = clearSpawn(null, nearestRoad({ x: clamp(pos.x + side * 45, -100, 100), z: clamp(pos.z + 42, -100, 100) }), true);
  if (!start) return;
  const group = makeCar(0x3e5966, true); group.position.set(start.x, .15, start.z); scene.add(group);
  police.push({ ...start, group, heading: 0, speed: 12, path: [], routeTimer: 0, collisionTimer: 0 });
}
function disposePolice() {
  for (const cop of police) {
    scene.remove(cop.group);
    cop.group.traverse(child => { if (child.isMesh && child.geometry !== city.staticMesh.geometry && !['red', 'blue'].some(k => cop.group.userData[k] === child)) child.geometry.dispose(); });
  }
  police.length = 0;
}
function recover(showToast = true) {
  const pos = getPosition(), safe = clearSpawn(pos, nearestRoad(pos), !!state.vehicle);
  if (!safe) return;
  pos.x = safe.x; pos.z = safe.z; pos.heading = 0; pos.speed = 0;
  player.jumpY = 0; player.jumpVelocity = 0; state.invulnerability = 3;
  if (showToast) toast('Back on the road.', 'A fresh start, just around the corner.', '↺', 3);
}
function busted() {
  Object.assign(combat, createCombat());
  player.health = 100; state.heat = 0; state.heatGrace = 0;
  state.cash = Math.max(0, state.cash - 100); state.mission = null; marker.visible = false;
  disposePolice(); recover(false); state.invulnerability = 6; saveProgress();
  toast('A little too much trouble.', '$100 recovery fee. You’re back on the streets.', '✚', 5);
  chime(false); updateUI();
}

function startMission(index) {
  if (state.mission) { toast('One thing at a time.', 'Finish your current job before starting another.', '▣'); return; }
  state.mission = createMission(index);
  state.mission.initialDistance = distance(getPosition(), JOBS[index].points[0]);
  closeDialogs(); updateMissionMarker();
  toast('Job accepted: ' + JOBS[index].title, 'Hop in a car and head for the gold marker.', '▣', 5);
  chime(); updateUI();
}
function updateMissionMarker() {
  const mission = state.mission;
  marker.visible = !!mission && !mission.escaping;
  if (marker.visible) { const target = JOBS[mission.index].points[mission.stage]; marker.position.set(target.x, .15, target.z); }
}
function completeMission() {
  const job = JOBS[state.mission.index];
  state.cash += job.reward; state.completed++; state.mission = null; marker.visible = false;
  player.health = Math.min(100, player.health + 25); saveProgress(); chime();
  toast('Job well done. +$' + job.reward, 'That’s how you make a name in Silent Hill.', '✓', 5);
  updateUI();
}
function updateMission(dt) {
  if (!state.mission) return;
  state.mission.remaining -= dt;
  const result = missionProgress(state.mission, getPosition(), !!state.vehicle, state.heat);
  if (result === 'complete') { completeMission(); return; }
  if (result === 'expired') {
    state.mission = null; marker.visible = false;
    toast('Time got away from you.', 'No worries. There’s always another job on the board.', '◷', 4); chime(false); updateUI();
  } else if (result === 'checkpoint') {
    chime();
    const mission = state.mission, job = JOBS[mission.index];
    mission.initialDistance = distance(getPosition(), job.points[mission.stage]);
    toast(mission.index === 0 ? 'Parcel collected.' : 'Checkpoint cleared.', mission.index === 0 ? 'Next stop: the Northside shop.' : 'Keep going. Follow the next gold marker.', '✓', 3);
    updateMissionMarker(); updateUI();
  } else if (result === 'chase') {
    state.heat = Math.max(2, state.heat); state.heatGrace = 10;
    toast('You have company.', 'Get away from the patrols. Clear every star to get paid.', '★', 5);
    updateMissionMarker(); updateUI();
  }
}

function updatePlayer(dt) {
  const forward = +(keys.has('KeyW') || keys.has('ArrowUp')) - +(keys.has('KeyS') || keys.has('ArrowDown'));
  const turn = +(keys.has('KeyA') || keys.has('ArrowLeft')) - +(keys.has('KeyD') || keys.has('ArrowRight'));
  const shift = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (state.vehicle) {
    const car = state.vehicle;
    const disabled = car.disabled > 0;
    const handbrake = keys.has('Space');
    const maxSpeed = shift ? 39 : 28;
    if (forward !== 0) {
      const braking = Math.sign(car.speed) !== Math.sign(forward) && Math.abs(car.speed) > .5;
      car.speed += forward * (braking ? 28 : shift ? 20 : 14) * dt;
    } else car.speed *= Math.exp(-.7 * dt);
    if (handbrake) car.speed *= Math.exp(-2.1 * dt);
    car.speed = clamp(car.speed, -10, maxSpeed);
    if (Math.abs(car.speed) < .05) car.speed = 0;
    const steering = Math.min(Math.abs(car.speed) / 5, 1) * (1.5 - .45 * Math.min(Math.abs(car.speed) / 35, 1));
    turnVehicle(car, car.heading + turn * steering * dt * Math.sign(car.speed) * (handbrake ? 1.75 : 1));
    if (disabled) car.speed = 0;
    const before = Math.abs(car.speed);
    const hit = moveActor(car, -Math.sin(car.heading) * car.speed * dt, -Math.cos(car.heading) * car.speed * dt, true);
    if (hit) {
      if (before > 8 && state.collisionCooldown <= 0 && state.invulnerability <= 0) {
        player.health -= Math.min(15, before * .38); state.collisionCooldown = .8; addHeat(.22);
      }
      car.speed *= -.24;
    }
    car.group.position.set(car.x, .15, car.z);
    car.group.rotation.y = car.heading;
    car.group.rotation.z = -turn * clamp(car.speed / 33, -.03, .03);
    player.x = car.x; player.z = car.z; player.heading = car.heading; player.speed = Math.abs(car.speed);
  } else {
    let dx = -Math.sin(cameraYaw) * forward - Math.cos(cameraYaw) * turn;
    let dz = -Math.cos(cameraYaw) * forward + Math.sin(cameraYaw) * turn;
    const magnitude = Math.hypot(dx, dz);
    const speed = shift ? 8.2 : 4.4;
    if (magnitude > 0) {
      dx /= magnitude; dz /= magnitude;
      moveActor(player, dx * speed * dt, dz * speed * dt);
      player.heading = lerpAngle(player.heading, Math.atan2(-dx, -dz), 1 - Math.exp(-14 * dt));
    }
    player.speed = magnitude ? speed : 0;
    if (keys.has('Space') && player.jumpY === 0) { player.jumpVelocity = 6.5; player.jumpY = .001; }
    if (player.jumpY > 0) { player.jumpVelocity -= 19 * dt; player.jumpY = Math.max(0, player.jumpY + player.jumpVelocity * dt); }
    avatar.group.position.set(player.x, .32 + player.jumpY, player.z);
    avatar.group.rotation.y = player.heading;
    animatePerson(avatar, dt, player.speed);
  }
  playerRing.visible = !state.vehicle;
  playerRing.position.set(player.x, .41, player.z);
  if (player.health <= 0) busted();
}

function updateTraffic(dt) {
  const pos = getPosition();
  for (const car of city.cars) {
    car.hitCooldown = Math.max(0, car.hitCooldown - dt);
    if (car.disabled > 0) { car.disabled = Math.max(0, car.disabled - dt); car.speed = 0; continue; }
    if (!car.traffic || car.occupied) continue;
    const traffic = car.traffic;
    const nearPlayer = state.started && distance(car, pos) < 7;
    // Traffic slows for the player and queues behind other cars in its lane.
    const fx = -Math.sin(car.heading), fz = -Math.cos(car.heading);
    const blocked = city.cars.some(other => {
      if (other === car) return false;
      const dx = other.x - car.x, dz = other.z - car.z;
      const along = dx * fx + dz * fz;
      return along > 0 && along < 7 && Math.abs(dx * fz - dz * fx) < 2;
    });
    const cruise = traffic.speed;
    if (nearPlayer || blocked) traffic.speed = Math.min(traffic.speed, 1.2);
    const next = { ...traffic };
    advancePath(next, dt);
    turnVehicle(car, lerpAngle(car.heading, next.heading, Math.min(1, dt * 9)));
    const hit = moveActor(car, next.x - car.x, next.z - car.z, true);
    car.speed = hit ? 0 : traffic.speed;
    traffic.speed = cruise;
    traffic.x = car.x; traffic.z = car.z;
    if (!hit) { traffic.target = next.target; traffic.heading = next.heading; }
    car.group.position.set(car.x, .15, car.z); car.group.rotation.y = car.heading;
  }
}

function updatePedestrians(dt) {
  for (const person of city.pedestrians) {
    const pos = person.group.position;
    if (person.down > 0) {
      person.down = Math.max(0, person.down - dt);
      if (person.down === 0) {
        const safe = clearSpawn(pos, pos);
        if (!safe) { person.down = 1; continue; }
        pos.set(safe.x, .32, safe.z); person.group.rotation.z = 0; person.health = 100;
      } else continue;
    }
    if (person.panic > 0) {
      person.panic = Math.max(0, person.panic - dt);
      const dx = pos.x - player.x, dz = pos.z - player.z, d = Math.max(.1, Math.hypot(dx, dz));
      moveActor(pos, dx / d * dt * 4, dz / d * dt * 4);
      person.group.rotation.y = Math.atan2(-dx, -dz);
      animatePerson(person, dt, 4); continue;
    }
    const nearby = state.started && distance(pos, getPosition()) < (state.vehicle ? 5 : 1.7);
    const speed = nearby ? 0 : person.speed;
    let blocked = false;
    if (!nearby) {
      blocked = moveActor(pos, person.horizontal ? person.direction * speed * dt : 0, person.horizontal ? 0 : person.direction * speed * dt);
      if (blocked || Math.abs(person.horizontal ? pos.x : pos.z) > 112) {
        person.direction *= -1;
        person.group.rotation.y += Math.PI;
      }
    }
    animatePerson(person, dt, blocked ? 0 : speed);
  }
}

function updatePolice(dt) {
  if (state.heat <= 0) { if (police.length) { disposePolice(); toast('All clear.', 'The city has a short memory. Keep it that way.', '✓', 4); } return; }
  if (police.length < Math.min(3, Math.ceil(state.heat))) spawnPolice();
  const target = getPosition();
  let closest = Infinity;
  for (const cop of police) {
    if (cop.disabled > 0) { cop.disabled = Math.max(0, cop.disabled - dt); continue; }
    const d = distance(cop, target); closest = Math.min(closest, d);
    cop.routeTimer -= dt; cop.collisionTimer = Math.max(0, cop.collisionTimer - dt);
    if (cop.routeTimer <= 0) { cop.path = roadRoute(cop, target); cop.routeTimer = 2.4; }
    while (cop.path.length && distance(cop, cop.path[0]) < 2.5) cop.path.shift();
    const direct = d < 18 && clearPath(cop, target, 1.55, city.colliders);
    const waypoint = direct ? target : cop.path[0];
    if (waypoint) {
      const dx = waypoint.x - cop.x, dz = waypoint.z - cop.z;
      const heading = Math.atan2(-dx, -dz);
      turnVehicle(cop, lerpAngle(cop.heading, heading, Math.min(1, dt * 5)));
      const speed = (10 + state.heat * 1.5) * Math.min(1, Math.hypot(dx, dz) / 3);
      const hit = moveActor(cop, -Math.sin(cop.heading) * speed * dt, -Math.cos(cop.heading) * speed * dt, true);
      if (hit) cop.routeTimer = 0;
    }
    cop.group.position.set(cop.x, .15, cop.z); cop.group.rotation.y = cop.heading;
    cop.group.userData.red.visible = Math.sin(elapsed * 13) > 0;
    cop.group.userData.blue.visible = !cop.group.userData.red.visible;
    if (d < 3.6 && cop.collisionTimer <= 0 && state.invulnerability <= 0) {
      player.health -= state.vehicle ? 11 : 16; cop.collisionTimer = 1.1;
      state.heatGrace = Math.max(2, state.heatGrace);
      if (state.vehicle) state.vehicle.speed *= .5;
    }
  }
  state.heatGrace = Math.max(0, state.heatGrace - dt);
  if (state.heatGrace === 0 && closest > 22) state.heat = Math.max(0, state.heat - dt * (closest > 50 ? .15 : .075));
}

function updatePickups(dt) {
  for (const pickup of city.pickups) {
    if (pickup.collected) continue;
    pickup.group.rotation.y += dt;
    pickup.group.position.y = 1.3 + Math.sin(elapsed * 2 + pickup.x) * .2;
    if (state.started && distance(getPosition(), pickup) < 2.2) {
      pickup.collected = true; pickup.group.visible = false;
      state.cash += 75; saveProgress(); chime(); toast('A little pocket money. +$75', 'Keep an eye out for more gold packages.', '▣', 3);
    }
  }
}

function district(p) {
  if (p.x > 75) return 'OCEAN DRIVE';
  if (p.z < -45) return 'NORTHSIDE';
  if (p.z > 65) return 'OLD TOWN';
  if (p.x < -45) return 'WEST VILLAGE';
  if (Math.abs(p.x) < 24 && Math.abs(p.z) < 24) return 'ROSEWATER PARK';
  return 'DOWNTOWN';
}

const speedBars = Array.from({ length: 10 }, () => { const el = document.createElement('i'); $('speed-bars').appendChild(el); return el; });
function updateUI() {
  const driving = !!state.vehicle, pos = getPosition();
  $('weapon-name').textContent = WEAPONS[combat.selected].name.toUpperCase();
  $('ammo-count').textContent = combat.selected ? `${combat.ammo[combat.selected]} / ${combat.reserve[combat.selected]}` : 'MELEE';
  $('combat-state').textContent = state.vehicle ? 'EXIT VEHICLE TO ATTACK' : combat.reloadRemaining > 0 ? 'RELOADING…' : '1–3 EQUIP · F ATTACK · R RELOAD';
  $('cash').textContent = '$' + Math.floor(state.cash).toLocaleString('en-US');
  const wanted = Math.ceil(state.heat);
  $('wanted').innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < wanted ? 'active' : ''}">★</span>`).join('');
  $('wanted').setAttribute('aria-label', `Wanted level ${wanted} of 5`);
  $('heat-label').textContent = wanted ? state.heatGrace > 0 ? 'POLICE ARE ON YOU' : 'LOSE THE HEAT' : 'KEEP IT CLEAN';
  $('health-fill').style.width = Math.max(0, player.health) + '%';
  $('health-fill').style.backgroundColor = player.health < 30 ? '#df775a' : '#86a285';
  $('health-value').textContent = Math.ceil(Math.max(0, player.health));
  $('district').textContent = district(pos); $('map-district').textContent = district(pos);
  $('vehicle-label').textContent = driving ? state.vehicle.name.toUpperCase() : 'ON FOOT';
  $('speed').textContent = Math.round(player.speed * 3.6).toString().padStart(2, '0');
  $('gear').textContent = driving ? state.vehicle.speed < -.1 ? 'REVERSE' : Math.abs(state.vehicle.speed) < .5 ? 'IDLE' : 'GEAR ' + Math.min(5, Math.ceil(Math.abs(state.vehicle.speed) / 8)) : player.speed > 6 ? 'SPRINT' : 'WALK';
  speedBars.forEach((el, i) => el.classList.toggle('active', i < player.speed / (driving ? 4 : .85)));
  $('move-hint').textContent = driving ? 'Drive' : 'Move';
  $('shift-hint').textContent = driving ? 'Boost' : 'Sprint';
  $('space-hint').textContent = driving ? 'Handbrake' : 'Jump';
  $('completed-jobs').textContent = String(state.completed).padStart(2, '0');
  updateNearestCar();
  $('interaction').hidden = !state.started || state.paused || (!driving && !nearestCar);
  if (driving || nearestCar) $('interaction').innerHTML = driving ? '<kbd>E</kbd><span>Exit vehicle</span>' : `<kbd>E</kbd><span>Get in the <b>${nearestCar.name}</b></span>`;
  const mission = state.mission;
  $('mission-progress').hidden = !mission; $('mission-meta').hidden = !mission;
  if (mission) {
    const job = JOBS[mission.index];
    $('mission-kicker').textContent = mission.escaping ? 'MAKE YOUR ESCAPE' : 'JOB IN PROGRESS';
    $('mission-number').textContent = '$' + job.reward;
    $('mission-title').textContent = job.title;
    $('mission-copy').textContent = mission.escaping ? job.instructions[1] : job.instructions[Math.min(mission.stage, job.instructions.length - 1)];
    $('mission-action').textContent = 'View route on map';
    const target = job.points[Math.min(mission.stage, job.points.length - 1)];
    const d = distance(pos, target);
    $('mission-distance').textContent = mission.escaping ? `${wanted} STAR${wanted === 1 ? '' : 'S'} TO LOSE` : `${Math.round(d)} m TO ${mission.index === 0 && mission.stage === 0 ? 'PICKUP' : 'DESTINATION'}`;
    const seconds = Math.max(0, Math.ceil(mission.remaining));
    $('mission-timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('mission-timer').style.color = seconds < 20 ? '#d36b46' : '';
    $('mission-progress-fill').style.width = (mission.escaping ? clamp(1 - state.heat / 2, 0, 1) : clamp(1 - d / Math.max(1, mission.initialDistance), 0, 1)) * 100 + '%';
  } else {
    $('mission-kicker').textContent = 'YOUR NEXT MOVE'; $('mission-number').textContent = '01 / 03';
    $('mission-title').textContent = state.completed ? 'Still here. Still breathing.' : 'Something is out there.';
    $('mission-copy').textContent = 'Find a ride. Follow the signal. Watch the fog.';
    $('mission-action').textContent = state.completed ? 'Find your next gig' : 'Find your first gig';
  }
  $('job-notice').textContent = mission ? 'You have an active job. Finish it to take another.' : 'Follow the gold marker after accepting a job.';
  document.querySelectorAll('[data-job]').forEach(button => { button.disabled = !!mission; });
  const minutes = (2 * 60 + 17 + Math.floor(elapsed / 3)) % 1440;
  $('world-time').textContent = state.night ? '03:33' : String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  drawMap($('minimap'), false);
  if ($('map-dialog').open) drawMap($('large-map'), true);
}

function drawMap(targetCanvas, full) {
  const ctx = targetCanvas.getContext('2d'), w = targetCanvas.width, h = targetCanvas.height;
  const pos = getPosition();
  const scale = full ? w / 258 : w / 130;
  const centerX = full ? 0 : pos.x, centerZ = full ? 0 : pos.z;
  const tx = x => w / 2 + (x - centerX) * scale;
  const tz = z => h / 2 + (z - centerZ) * scale;
  ctx.fillStyle = '#2e3937'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#777b69'; ctx.fillRect(tx(-122), tz(-122), 244 * scale, 244 * scale);
  ctx.fillStyle = '#a8a58d';
  for (const r of ROAD_CENTERS) { ctx.fillRect(tx(r - 10), tz(-120), 20 * scale, 240 * scale); ctx.fillRect(tx(-120), tz(r - 10), 240 * scale, 20 * scale); }
  ctx.fillStyle = '#444d46';
  for (const r of ROAD_CENTERS) { ctx.fillRect(tx(r - 6.7), tz(-120), 13.4 * scale, 240 * scale); ctx.fillRect(tx(-120), tz(r - 6.7), 240 * scale, 13.4 * scale); }
  ctx.strokeStyle = '#8b8d79'; ctx.lineWidth = full ? 1.5 : 1;
  ctx.setLineDash([4, 5]);
  for (const r of ROAD_CENTERS) { ctx.beginPath(); ctx.moveTo(tx(r), tz(-120)); ctx.lineTo(tx(r), tz(120)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(tx(-120), tz(r)); ctx.lineTo(tx(120), tz(r)); ctx.stroke(); }
  ctx.setLineDash([]);
  for (const b of city.mapBuildings) { ctx.fillStyle = '#545e50'; ctx.fillRect(tx(b.x - b.w / 2), tz(b.z - b.d / 2), b.w * scale, b.d * scale); ctx.fillStyle = '#68715d'; ctx.fillRect(tx(b.x - b.w / 2) + 2, tz(b.z - b.d / 2) + 2, b.w * scale - 4, b.d * scale - 4); }
  ctx.fillStyle = '#5c664e'; ctx.fillRect(tx(-19), tz(-19), 38 * scale, 38 * scale);
  ctx.fillStyle = '#8a8970'; ctx.fillRect(tx(-2), tz(-19), 4 * scale, 38 * scale); ctx.fillRect(tx(-19), tz(-2), 38 * scale, 4 * scale);
  ctx.fillStyle = '#435a54'; ctx.fillRect(tx(-4), tz(-4), 8 * scale, 8 * scale);
  if (full) {
    ctx.font = '600 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#333f35';
    for (const [name, x, z] of [['NORTHSIDE', 0, -61], ['OLD TOWN', 0, 61], ['WEST VILLAGE', -60, 0], ['OCEAN DRIVE', 107, 0], ['ROSEWATER PARK', 0, 15]]) { ctx.save(); ctx.translate(tx(x), tz(z)); if (name === 'OCEAN DRIVE') ctx.rotate(-Math.PI / 2); ctx.fillText(name, 0, 0); ctx.restore(); }
    ctx.fillText('N ↑', w - 32, 30);
  }
  if (state.mission && !state.mission.escaping) {
    const point = JOBS[state.mission.index].points[state.mission.stage];
    const x = clamp(tx(point.x), 13, w - 13), y = clamp(tz(point.z), 13, h - 13);
    ctx.strokeStyle = '#dda63e'; ctx.lineWidth = full ? 3 : 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(tx(pos.x), tz(pos.z)); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, full ? 10 : 9, 0, Math.PI * 2); ctx.fillStyle = '#edbb52'; ctx.fill(); ctx.strokeStyle = '#fff8de'; ctx.lineWidth = 3; ctx.stroke();
  }
  for (const cop of police) { ctx.beginPath(); ctx.arc(tx(cop.x), tz(cop.z), full ? 4 : 5, 0, Math.PI * 2); ctx.fillStyle = '#6e91b8'; ctx.fill(); }
  for (const pickup of city.pickups) { if (pickup.collected) continue; ctx.fillStyle = '#d9b759'; ctx.fillRect(tx(pickup.x) - 2, tz(pickup.z) - 2, 4, 4); }
  ctx.save(); ctx.translate(tx(pos.x), tz(pos.z)); ctx.rotate(-pos.heading);
  ctx.shadowColor = '#4f5b4650'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath();
  ctx.fillStyle = '#c29c63'; ctx.fill(); ctx.strokeStyle = '#fff7df'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
}

function setNight() {
  state.night = !state.night;
  const bg = state.night ? 0x51433b : 0x65716b;
  scene.background.set(bg); scene.fog.color.set(bg);
  hemisphere.intensity = state.night ? 1.3 : 1.65;
  hemisphere.color.set(state.night ? 0xb29a86 : 0xb1beb4);
  sun.intensity = state.night ? .5 : .8;
  sun.color.set(state.night ? 0xb98062 : 0xc2c8b8);
  renderer.toneMappingExposure = state.night ? .9 : .95;
  $('day-toggle').textContent = state.night ? 'Otherworld ◈' : 'Fog world ≋';
  $('weather-icon').textContent = state.night ? '◈' : '≋';
  updateUI();
}

canvas.tabIndex = 0;
$('play-button').addEventListener('click', startGame);
document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); if (state.started) openDialog('pause-dialog'); });
$('pause-button').addEventListener('click', () => $('pause-dialog').open ? closeDialogs() : openDialog('pause-dialog'));
$('resume-button').addEventListener('click', closeDialogs);
$('map-button').addEventListener('click', toggleMap);
$('mission-button').addEventListener('click', () => openDialog('map-dialog'));
$('help-button').addEventListener('click', () => openDialog('help-dialog'));
$('recover-button').addEventListener('click', () => { recover(); closeDialogs(); });
$('day-toggle').addEventListener('click', setNight);
$('quality-select').addEventListener('change', e => {
  const high = e.target.value === 'high'; renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : 1));
  renderer.shadowMap.enabled = high;
  scene.traverse(object => { if (object.material) { const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(mat => { mat.needsUpdate = true; }); } });
});
$('sound-button').addEventListener('click', () => {
  state.audio = !state.audio; if (state.audio) initAudio();
  $('sound-button').setAttribute('aria-label', state.audio ? 'Mute sound' : 'Enable sound');
  document.querySelector('.sound-slash').style.display = state.audio ? 'none' : '';
  if (!state.audio && engine.gain) engine.gain.gain.setTargetAtTime(0, engine.context.currentTime, .1);
  if (state.audio) chime();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeDialogs));
document.querySelectorAll('[data-job]').forEach(button => button.addEventListener('click', () => startMission(Number(button.dataset.job))));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', updatePaused);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialogs(); });
});
const capturedKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyM', 'KeyR', 'KeyX', 'KeyF', 'KeyJ', 'KeyQ', 'Digit1', 'Digit2', 'Digit3'];
addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (capturedKeys.includes(event.code)) event.preventDefault();
  if (event.repeat && ['KeyE', 'KeyM', 'KeyR', 'KeyX', 'KeyQ', 'Digit1', 'Digit2', 'Digit3', 'Escape'].includes(event.code)) return;
  if (!state.started) { if (event.code === 'Enter' || event.code === 'Space') startGame(); return; }
  if (event.code === 'Escape') { event.preventDefault(); state.paused ? closeDialogs() : openDialog('pause-dialog'); return; }
  if (event.code === 'KeyM') { toggleMap(); return; }
  if (state.paused) return;
  if (event.code === 'KeyE') enterExitCar();
  else if (event.code === 'KeyX') recover();
  else if (event.code === 'KeyR') { if (!state.vehicle) reloadWeapon(combat); }
  else if (event.code === 'KeyQ') selectWeapon((combat.selected + 1) % 3);
  else if (event.code.startsWith('Digit') && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) selectWeapon(Number(event.code.slice(-1)) - 1);
  else keys.add(event.code);
});
addEventListener('keyup', event => keys.delete(event.code));
addEventListener('blur', () => { keys.clear(); if (state.started && !state.paused) openDialog('pause-dialog'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started && !state.paused) openDialog('pause-dialog'); updatePaused(); });
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => { if (state.paused || !state.started) return; if (event.button === 0 && event.pointerType !== 'touch') { keys.add('MouseFire'); mouseAiming = true; aimMouse.set(event.clientX / innerWidth * 2 - 1, -event.clientY / innerHeight * 2 + 1); return; } dragging = true; previousPointer = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => {
  if (event.pointerType !== 'touch') { mouseAiming = true; aimMouse.set(event.clientX / innerWidth * 2 - 1, -event.clientY / innerHeight * 2 + 1); $('crosshair').style.left = event.clientX + 'px'; $('crosshair').style.top = event.clientY + 'px'; }
  if (!dragging) return;
  cameraYaw -= (event.clientX - previousPointer.x) * .006;
  cameraPitch = clamp(cameraPitch + (event.clientY - previousPointer.y) * .004, .5, 1.24);
  previousPointer = { x: event.clientX, y: event.clientY };
});
const endDrag = () => { dragging = false; previousPointer = null; };
addEventListener('pointerup', () => keys.delete('MouseFire'));
canvas.addEventListener('pointerleave', () => { keys.delete('MouseFire'); mouseAiming = false; });
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', event => { event.preventDefault(); cameraDistance = clamp(cameraDistance + event.deltaY * .035, 22, 90); }, { passive: false });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
if (matchMedia('(pointer: coarse)').matches) { $('touch-controls').hidden = false; document.body.classList.add('touch'); }
document.querySelectorAll('[data-key]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); if (!state.paused && state.started) keys.add(button.dataset.key); button.setPointerCapture(event.pointerId); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.key));
});
$('touch-enter').addEventListener('click', enterExitCar);
$('touch-weapon').addEventListener('click', () => selectWeapon((combat.selected + 1) % 3));
$('weapon-switch').addEventListener('click', () => selectWeapon((combat.selected + 1) % 3));
$('reload-button').addEventListener('click', () => { if (!state.vehicle) reloadWeapon(combat); });
$('ammo-button').addEventListener('click', () => {
  if (!state.started || state.paused) return;
  if (state.cash < 50) { toast('Need $50 for ammo.', 'Earn cash from jobs or gold packages.', '▣', 2); return; }
  state.cash -= 50; combat.reserve[1] += 48; combat.reserve[2] += 90; saveProgress(); updateUI();
});

// Resolve procedural spawn overlaps before the first frame.
for (const car of city.cars) {
  if (bodyBlocked({ ...car, radius: 1.25, length: 4.9 }, collisionObstacles(car))) {
    const safe = clearSpawn(car, nearestRoad(car), true);
    if (safe) {
      car.x = safe.x; car.z = safe.z; car.heading = 0;
      if (car.traffic) { car.traffic.x = safe.x; car.traffic.z = safe.z; }
      car.group.position.set(car.x, .15, car.z); car.group.rotation.y = car.heading;
    }
  }
}
for (const person of city.pedestrians) {
  const pos = person.group.position;
  const safe = clearSpawn(pos, pos);
  if (safe) { pos.x = safe.x; pos.z = safe.z; }
}
let lastTime = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, .05); lastTime = now;
  if (!state.paused) {
    elapsed += dt;
    if (state.started) {
      state.collisionCooldown = Math.max(0, state.collisionCooldown - dt);
      state.invulnerability = Math.max(0, state.invulnerability - dt);
      updatePlayer(dt); updateCombat(dt); updatePolice(dt); updateMission(dt);
      if (state.heat === 0 && player.health < 100) player.health = Math.min(100, player.health + dt * 1.2);
      saveClock += dt; if (saveClock > 15) { saveClock = 0; saveProgress(); }
    }
    updateTraffic(dt); updatePedestrians(dt); updatePickups(dt);
    atmosphere.update(dt, getPosition(), getPosition().heading, state.night);
    if (marker.visible) { diamond.rotation.y += dt; diamond.position.y = 4.8 + Math.sin(elapsed * 2) * .4; ring.scale.setScalar(1 + Math.sin(elapsed * 2) * .04); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('visible'); }
  }
  const pos = getPosition();
  if (state.started) {
    cameraTarget.lerp(new THREE.Vector3(pos.x, 1.5, pos.z), 1 - Math.exp(-5.5 * dt));
    const distance = cameraDistance + (state.vehicle ? Math.min(5, Math.abs(state.vehicle.speed) * .15) : 0);
    cameraDesired.set(cameraTarget.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * distance, cameraTarget.y + Math.sin(cameraPitch) * distance, cameraTarget.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * distance);
  } else {
    cameraTarget.set(24, 1, 29);
    const angle = .62 + Math.sin(elapsed * .07) * .08;
    cameraDesired.set(24 + Math.sin(angle) * 78 * .67, 59, 29 + Math.cos(angle) * 78 * .67);
  }
  camera.position.lerp(cameraDesired, 1 - Math.exp(-5 * dt)); camera.lookAt(cameraTarget);
  sun.position.set(pos.x - 55, 100, pos.z + 35); sun.target.position.set(pos.x, 0, pos.z);
  if (engine.gain && state.audio) {
    const speed = state.vehicle ? Math.abs(state.vehicle.speed) : 0;
    engine.gain.gain.setTargetAtTime(state.vehicle && !state.paused ? .025 + speed * .0009 : 0, engine.context.currentTime, .15);
    engine.oscillator.frequency.setTargetAtTime(35 + speed * 3.5, engine.context.currentTime, .15);
  }
  uiClock += dt;
  if (uiClock > .12) { updateUI(); uiClock = 0; }
  renderer.render(scene, camera);
}
camera.position.set(59, 59, 75);
updateUI(); renderer.render(scene, camera); requestAnimationFrame(frame);
$('loading').style.opacity = 0;
setTimeout(() => { $('loading').hidden = true; }, 450);
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); if (state.started) openDialog('pause-dialog'); toast('Graphics paused.', 'Reload the page to restore the city. Your cash and jobs are saved.', 'Ⅱ', 100); });
