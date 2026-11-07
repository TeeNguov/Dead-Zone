import { createRespawnShield, RESPAWN_PROTECTION } from './respawn-shield.js';
import { canSpawnWave, reusableWaveEnemy, startFreeWave, advanceFreeWave } from './waves.js';
import { makeBat, tickBatFlight } from './bats.js';
import { popEnemy } from './enemy-death.js';
import { pickAimPoint, enemyAimShape, traceAimedVolley } from './aiming.js';
import { createEnemyHealthBars } from './enemy-health.js';
import { driveWithImpacts } from './vehicle-impact.js';
import { rollEnemyLoot, lootPosition, ENEMY_DROP_LIFETIME, tickEnemyDrop } from './enemy-loot.js';
import { speedAtLevel } from './speed.js';
import { createMusic } from './music.js';
import menuMusic from '../sounds/menu.mp3?url';
import actionMusic from '../sounds/action-background.mp3?url';
import { createAntidoteGuide, nearestIngredient } from './antidote-guide.js';
import { THEMES, applyActorTheme } from './themes.js';
import { createLightning, activateLightning, tickLightning, interruptLightning, LIGHTNING } from './lightning.js';
import { createLightningEffects } from './lightning-effects.js';
import { poseWeaponArms } from './weapon-pose.js';
import { damagePlayer, loseLife } from './vitals.js';
import { createMuzzleFlash } from './muzzle-flash.js';
import { createPlayerFog } from './player-fog.js';
import { attachMuzzle, muzzlePosition } from './weapon-mount.js';
import { weaponIcon } from './weapon-picker.js';
import { createAcidFloor } from './acid-floor.js';
import { ringSpawn, canSummon, summonType, shouldReposition, SUMMON_LIMIT, summonCap } from './encounters.js';
import { damageProp } from './destructibles.js';
import { updateBuildingVisibility } from './visibility.js';
import { createObjectives, collectSymbol, SYMBOL_LOCATIONS, tickAcid, createAcidShot } from './objectives.js';
import './style.css';
import { damageVehicle } from './vehicles.js';
import { collectItem, randomPickupPosition, PICKUP_COLORS } from './pickups.js';
import { GRENADE, launchGrenade as createGrenade, tickGrenade, blastDamage } from './grenades.js';
import { createBloodParticles } from './blood.js';
import { createSoundSystem, weaponSound } from './audio.js';
import { createAtmosphere } from './atmosphere.js';
import { createPursuitField } from './pursuit.js';
import { WEAPONS, weaponSlot, createCombat, resetCombatAfterRespawn, tickCombat, reloadWeapon, useWeapon, traceVolley, traceAttack, applyKnockback, tickKnockback } from './combat.js';
import * as THREE from 'three';
import { box, createCity, setWorldTheme, makePerson, makeQuadruped, makeBoss, makeLightRing, makeSupplyPickup, animatePerson } from './world.js';
import { bodyDiscs, bodyBlocked, moveBody, clamp, distance, lerpAngle, isBlocked, clearPath, nearestRoad, JOBS, createMission, missionProgress, ROAD_CENTERS } from './physics.js';

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
const respawnShield = createRespawnShield(scene);
const blood = createBloodParticles(scene);
const deathBlood = createBloodParticles(scene, 512, { color: 0xd52a31, useHeight: true, splat: true, lifetime: .7, size: .11 });
const acidSplashes = createBloodParticles(scene, 384, { color: 0x70e52b, glow: true, useHeight: true, splat: true, lifetime: 2, lifetimeJitter: 0, size: .12 });
const acidFloor = createAcidFloor(scene);
const fireFloor = createAcidFloor(scene, 32, { color: 0xff6025 });
const fireSparks = createBloodParticles(scene, 256, { color: 0xff962a, glow: true, useHeight: true, lifetime: 1.5, size: .1 });
const debris = createBloodParticles(scene, 160, { color: 0x97856b, useHeight: true, lifetime: 1.2, size: .13 });
scene.background = new THREE.Color(0x65716b);
scene.fog = new THREE.Fog(0x65716b, 11, 43);
const playerFog = createPlayerFog(scene);
const muzzleFlash = createMuzzleFlash(scene);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .1, 550);
const hemisphere = new THREE.HemisphereLight(0xb1beb4, 0x30342e, 1.65);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xc2c8b8, .8);
sun.position.set(-60, 100, 45); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -67, right: 67, top: 67, bottom: -67, near: 1, far: 230 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .045;
scene.add(sun, sun.target);
setWorldTheme('zombies');
const city = createCity(scene);
const enemyHealthBars = createEnemyHealthBars(scene);
const atmosphere = createAtmosphere(scene, city.streetLights);
let pursuit = createPursuitField(city.colliders);
let largePursuit = createPursuitField(city.colliders, 2, 1.25);
let pursuitTimer = 0;
const objectives = createObjectives();
const symbols = [];
const antidoteGuide = createAntidoteGuide(city.colliders);
let autoGuide = true, guideTarget = null, guidePath = [], guideTimer = 0;
const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, .62); arrowShape.lineTo(.38, -.25); arrowShape.lineTo(0, -.05); arrowShape.lineTo(-.38, -.25); arrowShape.closePath();
const guidePointer = new THREE.Group();
const arrowMesh = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: 0xff675d, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
arrowMesh.rotation.x = -Math.PI / 2; arrowMesh.renderOrder = 20; guidePointer.add(arrowMesh);
guidePointer.visible = false; scene.add(guidePointer);
const ingredientNames = ['Serum sample', 'Stabilizer', 'Catalyst', 'Cell culture', 'Binding agent'];
const acidShots = [];
const acidGeometry = new THREE.IcosahedronGeometry(.32, 0);
const acidMaterial = new THREE.MeshBasicMaterial({ color: 0x98ff39, toneMapped: false });
const acidHaloMaterial = new THREE.MeshBasicMaterial({ color: 0x40d51d, transparent: true, opacity: .25, depthWrite: false, toneMapped: false });
const fireGeometry = new THREE.IcosahedronGeometry(.45, 1);
const flameGeometry = new THREE.ConeGeometry(.4, 1.5, 7);
const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xff8b24, toneMapped: false, fog: false });
const fireHaloMaterial = new THREE.MeshBasicMaterial({ color: 0xff471b, transparent: true, opacity: .65, depthWrite: false, toneMapped: false, fog: false });
let waveSpawnTimer = 0;
const avatar = makePerson(true); scene.add(avatar.group);
avatar.group.position.set(38.4, .32, 44);
const lightning = createLightning();
const lightningEffects = createLightningEffects(scene);
const player = { x: 38.4, z: 44, heading: 0, health: 100, armor: 50, lives: 5, speedLevel: 0, jumpY: 0, jumpVelocity: 0, speed: 0 };
const state = { started: false, gameOver: false, freeMode: false, freeWave: null, completionShown: false, paused: false, completed: 0, heat: 0, heatGrace: 0, vehicle: null, mission: null, night: false, collisionCooldown: 0, invulnerability: 0, respawnShield: false, audio: true };
try {
  const saved = JSON.parse(localStorage.getItem('blocky-city-save-v1') || 'null');
  if (saved) { state.completed = clamp(Number(saved.completed) || 0, 0, 9999); }
} catch { /* Private browsing or an old save should not stop the game. */ }
function saveProgress() { try { localStorage.setItem('blocky-city-save-v1', JSON.stringify({ completed: state.completed })); } catch { /* Storage is optional. */ } }

const keys = new Set();
let lastObjectiveKey = '', lastMainObjectiveKey = '';
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
const soundAssets = Object.fromEntries(Object.entries(import.meta.glob('../sounds/*.{wav,WAV}', { eager: true, query: '?url', import: 'default' })).map(([path, url]) => [path.split('/').pop(), url]));
const sound = createSoundSystem({ assets: soundAssets });
const music = createMusic({ menu: menuMusic, action: actionMusic, createAudio: url => $(url === menuMusic ? 'menu-music' : 'action-music'), onBlocked: () => { $('music-start-hint').hidden = state.started; }, onPlaying: () => { $('music-start-hint').hidden = true; } });
let titleMusicDelayElapsed = false;
const unlockMusic = event => {
  const interaction = event && ['pointerdown', 'click', 'touchend', 'keydown'].includes(event.type);
  if (!state.started && !titleMusicDelayElapsed && !interaction) return;
  if (state.audio && !document.hidden) music.unlock(state.started ? 'action' : 'menu');
};
document.addEventListener('pointerdown', unlockMusic, { capture: true });
document.addEventListener('click', unlockMusic, { capture: true });
document.addEventListener('touchend', unlockMusic, { capture: true, passive: true });
document.addEventListener('keydown', unlockMusic);
// A normal reload may finish while the document is still hidden/unfocused.
// Retry once it is visible, including cached page restoration.
addEventListener('pageshow', unlockMusic);
addEventListener('focus', unlockMusic);
let selectedTheme = 'horror';
let ambientTimer = 3, stormTimer = 18, stepDistance = 0, stepSide = 0;
let pendingWorldSound = null;
let lastAudioPosition = { x: player.x, z: player.z };
function spatialSound(name, position, gain = .5, range = 30) {
  sound.play(name, { position, listener: getPosition(), heading: cameraYaw, gain, range });
}
function beginReload() {
  if (!state.started || state.paused || state.vehicle) return;
  if (reloadWeapon(combat)) sound.play(weaponSound(combat.selected, 'reload'), { gain: .4 });
}
function updateSound(dt) {
  music.update(dt, state.started ? 'action' : 'menu', state.audio, document.hidden);
  sound.setPaused(!state.started || state.paused, { force: document.hidden });
  const pos = getPosition();
  if (!state.started || state.paused || !state.audio) { lastAudioPosition = { x: pos.x, z: pos.z }; return; }
  const travelled = Math.hypot(pos.x - lastAudioPosition.x, pos.z - lastAudioPosition.z);
  lastAudioPosition = { x: pos.x, z: pos.z };
  if (!state.vehicle && travelled > .001 && travelled < 2 && player.jumpY === 0) {
    stepDistance += travelled;
    if (stepDistance >= (player.speed > 6 ? 1.7 : 1.9)) {
      stepDistance = 0; stepSide++;
      sound.play('footsteps', { gain: .42, rate: stepSide % 2 ? 1 : 1.07 });
    }
  } else stepDistance = 0;
  sound.loop('cityWind', 'wind', { gain: state.night ? .09 : .065 });
  stormTimer -= dt;
  if (stormTimer <= 0) { sound.play('distantThunder', { gain: .12 }); stormTimer = 25 + Math.random() * 20; }
  if (state.vehicle && !state.vehicle.disabled) sound.loop('engine', 'machinery', { gain: .1 + Math.abs(state.vehicle.speed) * .002, rate: .8 + Math.abs(state.vehicle.speed) * .018 });
  else sound.stopLoop('engine');
  const lamp = city.streetLights.filter(light => !light.destroyed).reduce((best, light) => !best || distance(light, pos) < distance(best, pos) ? light : best, null);
  if (lamp && distance(lamp, pos) < 14) sound.loop('electricHum', 'machinery', { gain: .1, rate: .65, position: lamp, listener: pos, heading: cameraYaw, range: 14 });
  else sound.stopLoop('electricHum');
  ambientTimer -= dt;
  if (ambientTimer <= 0) {
    const monster = city.pedestrians.filter(p => !p.down).sort((a, b) => distance(a.group.position, pos) - distance(b.group.position, pos))[0];
    if (monster) spatialSound('monsterAmbient', monster.group.position, .45, 32);
    ambientTimer = 4 + Math.random() * 4;
  }
}

const combat = createCombat();
let repositionTimer = 0;
const aimRay = new THREE.Raycaster(), aimMouse = new THREE.Vector2();
const aimPoint = new THREE.Vector3();
const handPosition = new THREE.Vector3();
let mouseAiming = false;
const effects = [];
const pendingCarExplosions = [];
const wreckMaterial = new THREE.MeshLambertMaterial({ color: 0x302e28 });
const grenades = [];
const grenadeGeometry = new THREE.BoxGeometry(.25, .32, .25);
const grenadeMaterial = new THREE.MeshLambertMaterial({ color: 0x616e3c, emissive: 0x221200 });
const grenadeModels = Array.from({ length: 8 }, () => {
  const mesh = new THREE.Mesh(grenadeGeometry, grenadeMaterial); mesh.visible = false; scene.add(mesh); return mesh;
});
const gun = new THREE.Group();
box(.2, .19, .7, 0x34454d, 0, 0, -.15, gun);
box(.17, .29, .2, 0x66584a, 0, -.16, .07, gun);
box(.12, .12, .1, 0x899b9b, 0, 0, -.54, gun);
const gatling = new THREE.Group(), barrels = new THREE.Group();
box(.46, .42, .65, 0x404849, 0, 0, .12, gatling);
box(.54, .6, .4, 0x665b3f, -.1, -.22, .3, gatling);
for (let i = 0; i < 6; i++) { const angle = i / 6 * Math.PI * 2; box(.105, .105, 1.25, 0x7a8581, Math.cos(angle) * .2, Math.sin(angle) * .2, -.65, barrels); }
box(.58, .1, .22, 0x252f30, 0, .3, .1, gatling);
gatling.userData.supportGrip = new THREE.Vector3(-.22, -.03, -.2);
gatling.add(barrels); gatling.position.set(.32, 1.05, -.75); avatar.group.add(gatling); gatling.visible = false;
const shotgun = new THREE.Group();
box(.23, .22, 1.15, 0x6b4934, 0, 0, .1, shotgun);
box(.13, .13, 1.25, 0x596563, -.085, .07, -.67, shotgun);
box(.13, .13, 1.25, 0x596563, .085, .07, -.67, shotgun);
box(.3, .27, .32, 0x805b3c, 0, -.07, -.6, shotgun);
shotgun.position.set(.32, 1.17, -.65); avatar.group.add(shotgun); shotgun.visible = false;
const launcher = new THREE.Group();
box(.3, .34, .9, 0x3d4940, 0, 0, -.12, launcher);
box(.19, .27, .25, 0x725b3c, 0, -.2, .13, launcher);
box(.3, .24, .4, 0x725b3c, 0, -.02, .48, launcher);
box(.36, .36, .14, 0x222b27, 0, 0, -.62, launcher);
box(.2, .2, .025, 0x0c110f, 0, 0, -.7, launcher);
box(.3, .18, .3, 0x86704c, 0, -.17, -.25, launcher);
avatar.group.add(launcher); launcher.visible = false;
gun.position.set(.34, 1.22, -.65); avatar.group.add(gun); gun.visible = false;
const gunMuzzle = attachMuzzle(gun, -.59), shotgunMuzzle = attachMuzzle(shotgun, -1.295, .07), gatlingMuzzle = attachMuzzle(gatling, -1.275), launcherMuzzle = attachMuzzle(launcher, -.72);
function getMuzzlePosition() {
  avatar.group.updateMatrixWorld(true);
  return muzzlePosition(combat.selected === 5 ? launcherMuzzle : combat.selected === 4 ? gatlingMuzzle : combat.selected === 2 ? shotgunMuzzle : gunMuzzle);
}

function useLightning() {
  if (!state.started || state.paused || state.gameOver || state.vehicle) return;
  if (activateLightning(lightning)) { sound.play('lightningStart', { gain: .18 }); updateUI(); }
}
function updateLightning(dt) {
  if (state.gameOver || state.vehicle) lightning.remaining = 0;
  lightningEffects.update(dt, player, lightning.remaining > 0);
  const obstacles = [...city.colliders, ...city.cars.flatMap(c => bodyDiscs({ ...c, radius: 1.25, length: 4.9 }))];
  let struck = false;
  tickLightning(lightning, dt, player, city.pedestrians, obstacles, (enemy, index) => {
    lightningEffects.strike(enemy, index);
    const pos = enemy.group.position;
    damageTarget(enemy, LIGHTNING.damage, { x: pos.x - player.x, z: pos.z - player.z }, LIGHTNING);
    struck = true;
  });
  if (struck) sound.play(Math.random() > .5 ? 'electric' : 'electricAlt', { gain: .28 });
}

function selectWeapon(index) {
  if (!state.started || state.paused) return;
  if (!WEAPONS[index]) { toast(`Slot ${index + 1} is empty.`, 'Weapons are currently equipped in slots 1–6.', '▣', 2); return; }
  if (combat.selected === 4 && combat.spin > 0) sound.play('spinDown', { gain: .25 });
  sound.stopLoop('gatlingFire');
  combat.selected = index; combat.reloadRemaining = 0; combat.spin = 0;
  sound.play(weaponSound(index, 'equip'), { gain: .35 });
  updateUI();
}
function fireGrenadeLauncher() {
  if (!state.started || state.paused || state.vehicle || grenades.length >= grenadeModels.length) return;
  if (combat.selected !== 5) selectWeapon(5);
  poseHeldWeapons(0);
  const tip = muzzlePosition(launcherMuzzle);
  const origin = clearPath(player, tip, .18, collisionObstacles(player)) ? tip : { ...player, y: tip.y };
  const grenade = createGrenade(combat, origin, player.heading);
  if (!grenade) return;
  const model = grenadeModels.find(mesh => !mesh.visible);
  grenade.y = origin.y;
  muzzleFlash.fire(tip, player.heading, WEAPONS[5]);
  grenade.model = model; model.visible = true; model.position.set(grenade.x, grenade.y, grenade.z);
  grenades.push(grenade); sound.play('grenadeThrow', { gain: .3 }); addHeat(.25);
}
function destroyCar(car) {
  car.group.traverse(node => { if (node.isMesh) node.material = wreckMaterial; });
  car.group.scale.y = .68; car.group.rotation.z = .06;
  pendingCarExplosions.push({ x: car.x, z: car.z, sourceCar: car });
  if (state.vehicle === car) {
    const exit = clearSpawn(player, { x: car.x + 3, z: car.z });
    state.vehicle = null; avatar.group.visible = true;
    player.x = exit?.x ?? car.x; player.z = exit?.z ?? car.z; player.speed = 0;
    if (!exit) recover(false);
    avatar.group.position.set(player.x, .32, player.z);
  }
}
function dropEnemyLoot(enemy) {
  const type = rollEnemyLoot(enemy, player);
  if (!type) return;
  const point = lootPosition(enemy.group.position, [...city.colliders, ...city.cars.flatMap(car => bodyDiscs({ ...car, radius: 1.25, length: 4.9 }))]);
  if (!point) return;
  let pickup = city.pickups.find(p => p.enemyDrop && p.collected && p.type === type);
  if (!pickup) {
    if (city.pickups.filter(p => p.enemyDrop).length >= 35) return;
    pickup = makeSupplyPickup(scene, type, point); pickup.enemyDrop = true; city.pickups.push(pickup);
  }
  Object.assign(pickup, { x: point.x, z: point.z, collected: false, lifetime: ENEMY_DROP_LIFETIME });
  pickup.group.position.set(point.x, 1.1, point.z); pickup.lightRing.position.set(point.x, .42, point.z);
  pickup.group.visible = pickup.lightRing.visible = true;
}

function damageTarget(target, damage, direction, weapon, impact = null) {
  if (target.destroyed || target.down) return;
  combat.hitTime = .18;
  if (target.destructible) {
    const destroyed = damageProp(city, target, damage);
    debris.burst({ ...target, y: .8 }, direction, destroyed ? 18 : 4);
    spatialSound('wallHit', target, destroyed ? .45 : .18);
    return;
  }
  if (!target.legL) {
    if (damageVehicle(target, damage)) destroyCar(target);
    return;
  }
  target.health = (target.health ?? 100) - damage;
  if (target.legL) {
    if (impact && target.health > 0) blood.burst(impact, direction, 16);
    applyKnockback(target, direction, weapon); addHeat(.45); combat.hitTime = .18;
    if (target.health > 0) spatialSound(Math.random() > .5 ? 'monsterHit' : 'monsterHitAlt', target.group.position, .55);
    else {
      spatialSound(target.monsterType === 'nurse' ? 'nurseDown' : target.monsterType === 'pyramid-head' ? 'pyramidDown' : 'figureDown', target.group.position, .6);
      popEnemy(target, deathBlood);
      dropEnemyLoot(target);
      if (target.isBoss && !state.freeMode) { objectives.complete = true; sound.play('pickup', { gain: .6 }); toast('The city falls silent.', 'All five antidote ingredients recovered. The final threat is defeated.', '✧', 12); }
    }
  }
}
function explode(grenade) {
  spatialSound(grenade.sourceCar ? 'carExplosion' : 'explosion', grenade, grenade.sourceCar ? .65 : .8, 70); addHeat(.8);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.83, 1, 36), new THREE.MeshBasicMaterial({ color: 0xffba66, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(grenade.x, .45, grenade.z); scene.add(ring);
  effects.push({ object: ring, remaining: .55, blast: true });
  const flash = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xef8535, transparent: true, opacity: .8, depthWrite: false }));
  flash.position.set(grenade.x, 1.2, grenade.z); scene.add(flash); effects.push({ object: flash, remaining: .35, fireball: true });
  for (const person of city.pedestrians) {
    if (person.down) continue;
    const pos = person.group.position, damage = blastDamage(grenade, pos, city.colliders);
    if (damage) damageTarget(person, damage, { x: pos.x - grenade.x, z: pos.z - grenade.z }, GRENADE, pos);
  }
  for (const car of city.cars) {
    if (car.destroyed) continue;
    const damage = blastDamage(grenade, car, city.colliders);
    if (damage) damageTarget(car, damage, { x: 0, z: 0 }, GRENADE);
  }
  // Exclude the prop's own footprint so it cannot shield itself from a blast.
  const propHits = city.props.filter(p => !p.destroyed && distance(p, grenade) <= GRENADE.radius).map(prop => ({ prop,
    damage: blastDamage(grenade, prop, city.colliders.filter(c => c.target !== prop)) }));
  for (const { prop, damage } of propHits) if (damage) damageTarget(prop, damage, { x: prop.x - grenade.x, z: prop.z - grenade.z }, GRENADE);
  if (state.invulnerability <= 0) {
    const damage = blastDamage(grenade, getPosition(), city.colliders);
    if (damage) { damagePlayer(player, damage * (state.vehicle ? .4 : 1)); sound.play('impact', { gain: .45 }); if (player.health <= 0) busted(); }
  }
}
function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const grenade = grenades[i];
    const obstacles = collisionObstacles(player).filter(o => o.radius !== undefined
      ? Math.abs(o.x - grenade.x) < o.radius + 2 && Math.abs(o.z - grenade.z) < o.radius + 2
      : Math.abs(o.x - grenade.x) < o.w / 2 + 2 && Math.abs(o.z - grenade.z) < o.d / 2 + 2);
    if (tickGrenade(grenade, dt, obstacles)) {
      grenade.model.visible = false; grenades.splice(i, 1); explode(grenade);
    } else { grenade.model.position.set(grenade.x, grenade.y, grenade.z); grenade.model.rotation.x += dt * 5; }
  }
}
function tracer(from, to, color = 0xffdc81) {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from.x, from.y ?? 2.05 + player.jumpY, from.z), new THREE.Vector3(to.x, to.y ?? from.y ?? 2.05 + player.jumpY, to.z)]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .95 });
  const line = new THREE.Line(geometry, material); scene.add(line); effects.push({ object: line, remaining: .1 });
}
function attack(melee = false) {
  if (!state.started || state.paused || state.vehicle) return;
  if (!melee && combat.selected === 5) { fireGrenadeLauncher(); return; }
  const wasReloading = combat.reloadRemaining > 0;
  const weapon = useWeapon(combat, melee);
  if (!wasReloading && combat.reloadRemaining > 0) sound.play(weaponSound(combat.selected, 'reload'), { gain: .4 });
  if (!weapon) return;
  const direction = { x: -Math.sin(player.heading), z: -Math.cos(player.heading) };
  const targets = [];
  for (const person of city.pedestrians) {
    if (!person.down) targets.push(weapon.magazine ? enemyAimShape(person) : { ...person.group.position, radius: (person.radius || .5) + .35, target: person });
  }
  for (const car of city.cars) {
    targets.push(...bodyDiscs({ ...car, radius: 1.25, length: 4.9 }).map(disc => ({ ...disc, height: 2.5, target: car })));
  }
  poseHeldWeapons(0);
  const origin = weapon.magazine ? getMuzzlePosition() : player;
  // A barrel poking through cover must not let the shot start beyond that cover.
  const reach = Math.hypot(origin.x - player.x, origin.z - player.z);
  const obstruction = weapon.magazine && traceAttack(player, { x: origin.x - player.x, z: origin.z - player.z }, reach, city.colliders, targets);
  const volley = obstruction
    ? traceVolley(player, Math.atan2(player.x - origin.x, player.z - origin.z), { ...weapon, range: reach + .001 }, city.colliders, targets)
    : weapon.magazine ? traceAimedVolley(origin, mouseAiming ? aimPoint : { x: origin.x - Math.sin(player.heading) * weapon.range, y: origin.y, z: origin.z - Math.cos(player.heading) * weapon.range }, player.heading, weapon, city.colliders, targets)
    : traceVolley(origin, player.heading, weapon, city.colliders, targets);
  if (weapon.magazine) {
    muzzleFlash.fire(origin, player.heading, weapon);
    if (!obstruction) for (const shot of volley.shots) tracer(origin, shot.impact || { x: origin.x + shot.direction.x * weapon.range, y: origin.y + (shot.direction.y || 0) * weapon.range, z: origin.z + shot.direction.z * weapon.range });
    addHeat(weapon.pellets ? .3 : .12);
  }
  const soundName = weapon.pellets ? 'shotgun' : weapon.magazine ? combat.selected === 4 ? 'gatling' : combat.selected === 3 ? 'smg' : 'pistol' : 'swing';
  if (weapon.spinUp) sound.loop('gatlingFire', 'gatling', { gain: .28 });
  else sound.play(soundName, { gain: weapon.magazine ? .4 : .35, stealOldest: !!weapon.magazine });
  if (volley.shots.some(shot => shot.impact && !shot.impact.target)) sound.play('wallHit', { gain: .15 });
  for (const hit of volley.hits) damageTarget(hit.target, hit.damage, direction, weapon, weapon.magazine ? hit.impact : null);
}

function updateCombat(dt) {
  const wasReloading = combat.reloadRemaining > 0;
  const firing = !state.vehicle && (keys.has('KeyF') || keys.has('MouseFire'));
  const previousSpin = combat.spin;
  tickCombat(combat, dt, firing);
  if (combat.selected === 4 && previousSpin === 0 && combat.spin > 0) sound.play('spin', { gain: .25, rate: 1 / .35 });
  if (combat.selected === 4 && previousSpin > 0 && combat.spin === 0) sound.play('spinDown', { gain: .25 });
  if (!firing || combat.selected !== 4 || combat.reloadRemaining > 0 || (combat.ammo[4] + combat.reserve[4]) <= 0) sound.stopLoop('gatlingFire');
  muzzleFlash.update(dt);
  // Limit chain reactions to four blasts per frame; destroyed flags prevent repeats.
  const blastCount = Math.min(4, pendingCarExplosions.length);
  for (let i = 0; i < blastCount; i++) explode(pendingCarExplosions.shift());
  updateGrenades(dt);
  blood.update(dt); deathBlood.update(dt); acidSplashes.update(dt); fireSparks.update(dt); debris.update(dt);
  if (wasReloading && combat.reloadRemaining === 0) sound.play(weaponSound(combat.selected, 'ready'), { gain: .25 });
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i]; effect.remaining -= dt;
    if (effect.blast) { effect.object.scale.setScalar(GRENADE.radius * (1 - Math.max(0, effect.remaining) / .55)); effect.object.material.opacity = Math.max(0, effect.remaining / .55) * .7; }
    if (effect.fireball) { effect.object.scale.setScalar(1 + (1 - Math.max(0, effect.remaining) / .35) * 3); effect.object.material.opacity = Math.max(0, effect.remaining / .35) * .8; }
    if (effect.remaining <= 0) { scene.remove(effect.object); effect.object.geometry.dispose(); effect.object.material.dispose(); effects.splice(i, 1); }
  }
  if (!state.vehicle && mouseAiming) {
    aimRay.setFromCamera(aimMouse, camera);
    const target = pickAimPoint(aimRay.ray, player, city.pedestrians);
    if (target && Math.hypot(target.x - player.x, target.z - player.z) > .25) {
      aimPoint.copy(target);
      player.heading = Math.atan2(player.x - aimPoint.x, player.z - aimPoint.z);
      avatar.group.rotation.y = player.heading;
    }
  }
  poseHeldWeapons(dt);
  if (keys.has('KeyF') || keys.has('MouseFire')) attack();
  if (keys.has('KeyJ')) attack(true);
  $('crosshair').hidden = !mouseAiming || state.paused || !state.started;
  $('crosshair').classList.toggle('hit', combat.hitTime > 0);
}

function poseHeldWeapons(dt) {
  gun.visible = [1, 3].includes(combat.selected) && !state.vehicle;
  gatling.visible = combat.selected === 4 && !state.vehicle;
  launcher.visible = combat.selected === 5 && !state.vehicle;
  shotgun.visible = combat.selected === 2 && !state.vehicle;
  gun.scale.z = combat.selected === 3 ? 1.5 : 1;
  if (gatling.visible) barrels.rotation.z += dt * (4 + combat.spin * 90);
  if (state.vehicle) return;
  const held = combat.selected === 4 ? gatling : combat.selected === 5 ? launcher : combat.selected === 2 ? shotgun : gun;
  if (combat.selected > 0) {
    const twoHands = combat.selected !== 1;
    held.position.set(twoHands ? .12 : .32, combat.selected === 4 ? 1.48 : 1.65, -.35 + combat.attackTime * .18);
    held.rotation.set(0, 0, 0);
    if (mouseAiming) {
      avatar.group.updateMatrixWorld(true);
      const mount = held.getWorldPosition(new THREE.Vector3());
      const dx = aimPoint.x - mount.x, dz = aimPoint.z - mount.z;
      held.rotation.x = Math.atan2(aimPoint.y - mount.y, Math.max(.25, Math.hypot(dx, dz)));
      held.rotation.y = Math.atan2(-dx, -dz) - player.heading;
    }
    poseWeaponArms(avatar, held, twoHands);
  } else if (combat.attackTime > 0) {
    avatar.armR.rotation.x = -Math.PI / 2 + Math.sin(combat.attackTime / .3 * Math.PI) * .7;
    avatar.elbowR.rotation.x = 0;
  }
}

function chime(success = true) { sound.play(success ? 'pickup' : 'error', { gain: .35 }); }

function toast(title, copy = '', icon = '↗', duration = 4.5) {
  $('toast-title').textContent = title; $('toast-copy').textContent = copy; $('toast-icon').textContent = icon;
  $('toast').classList.add('visible'); toastTimer = duration;
}
function fitObjectiveHeadline() {
  const title = $('objective-announcement-title');
  if ($('objective-announcement').hidden) return;
  title.style.fontSize = '';
  const base = parseFloat(getComputedStyle(title).fontSize);
  if (title.scrollWidth > title.clientWidth) title.style.fontSize = `${Math.max(12, Math.floor(base * (title.clientWidth - 4) / title.scrollWidth))}px`;
}
addEventListener('resize', fitObjectiveHeadline);

function announceObjective(title, copy, kicker = 'New Objective') {
  const message = $('objective-announcement');
  $('objective-announcement-title').textContent = title;
  $('objective-announcement-copy').textContent = copy;
  $('objective-announcement-kicker').textContent = kicker;
  message.classList.remove('show-objective'); message.hidden = false;
  void message.offsetWidth;
  message.classList.add('show-objective');
  fitObjectiveHeadline();
}
$('objective-announcement').addEventListener('animationend', event => {
  if (event.animationName === 'objective-message-fade') $('objective-announcement').hidden = true;
});

function startGame() {
  if (state.started) return;
  state.started = true;
  sound.setPaused(false);
  if (state.audio) sound.unlock();
  document.body.classList.remove('intro');
  $('welcome').style.opacity = 0;
  setTimeout(() => { $('welcome').hidden = true; }, 500);
  canvas.focus();
  toast('You shouldn’t be here.', 'A car waits beside you. Press E. Keep your light close.');
  updateUI();
}
function updatePaused() {
  state.paused = state.gameOver || [...document.querySelectorAll('dialog')].some(d => d.open) || document.hidden;
  document.body.classList.toggle('game-paused', state.paused);
  $('crosshair').hidden = state.paused || !state.started || !mouseAiming;
  keys.clear();
  sound.setPaused(state.paused || !state.started, { force: document.hidden });
  if (!state.paused && pendingWorldSound) { sound.play(pendingWorldSound, { gain: .3 }); pendingWorldSound = null; }
}
function openDialog(id) {
  if ($('completion-dialog').open && !state.freeMode && id !== 'gameover-dialog') return;
  if (state.gameOver && id !== 'gameover-dialog') return;
  if (!state.started) return;
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  $(id).showModal(); updatePaused();
  if (id === 'map-dialog') drawMap($('large-map'), true);
}
function closeDialogs() { if (state.gameOver || ($('completion-dialog').open && !state.freeMode)) return; document.querySelectorAll('dialog[open]').forEach(d => d.close()); updatePaused(); canvas.focus(); }
function toggleMap() { $('map-dialog').open ? closeDialogs() : openDialog('map-dialog'); }

function getPosition() { return state.vehicle || player; }
// One collision world for every moving actor; occupied cars replace their driver.
function collisionObstacles(self, local = false) {
  const obstacles = local ? city.colliders.filter(r => Math.abs(r.x - self.x) < r.w / 2 + 5.5 && Math.abs(r.z - self.z) < r.d / 2 + 5.5) : [...city.colliders];
  for (const car of city.cars) {
    if (car !== self && (!local || (car.x - self.x) ** 2 + (car.z - self.z) ** 2 < 81)) obstacles.push(...bodyDiscs({ ...car, radius: 1.25, length: 4.9 }));
  }
  if (!state.vehicle && self !== player && (!local || (player.x - self.x) ** 2 + (player.z - self.z) ** 2 < 36)) obstacles.push(...bodyDiscs(player));
  for (const person of city.pedestrians) {
    if (!person.down && !person.flying && person.group.position !== self && (!local || (person.group.position.x - self.x) ** 2 + (person.group.position.z - self.z) ** 2 < 36)) obstacles.push(...bodyDiscs({ x: person.group.position.x, z: person.group.position.z, radius: person.radius || .5 }).map(disc => ({ ...disc, target: person })));
  }
  return obstacles;
}
function moveActor(actor, dx, dz, vehicle = false) {
  const obstacles = collisionObstacles(actor, true);
  const body = { x: actor.x, z: actor.z, heading: actor.heading || 0, radius: vehicle ? 1.25 : actor.radius || .5, length: vehicle ? 4.9 : 0 };
  const hit = moveBody(body, dx, dz, obstacles);
  actor.x = body.x; actor.z = body.z;
  return hit;
}
function turnVehicle(car, heading) {
  if (!bodyBlocked({ ...car, heading, radius: 1.25, length: 4.9 }, collisionObstacles(car, true))) car.heading = heading;
}
function clearSpawn(actor, position, vehicle = false) {
  const obstacles = collisionObstacles(actor);
  for (let r = 0; r <= 20; r += .75) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const body = { x: position.x + Math.cos(angle) * r, z: position.z + Math.sin(angle) * r, heading: 0, radius: vehicle ? 1.25 : actor.radius || .5, length: vehicle ? 4.9 : 0 };
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
    if (car.destroyed) continue;
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
    nearestCar.traffic = null; nearestCar.speed = 0; nearestCar.occupied = true; state.vehicle = nearestCar;
    avatar.group.visible = false; player.jumpY = 0;
    toast(nearestCar.name, 'W / S to drive · A / D to steer · Space to drift', '↗', 3);
  }
  sound.play('door', { gain: .28 });
  updateUI();
}

function addHeat(amount) {
  const previous = Math.ceil(state.heat);
  state.heat = clamp(state.heat + amount, 0, 5); state.heatGrace = 7;
  if (Math.ceil(state.heat) > previous) toast('You got their attention.', 'Keep moving. The creatures heard you.', '★', 3);
}
function recover(showToast = true) {
  const pos = getPosition(), safe = clearSpawn(pos, nearestRoad(pos), !!state.vehicle);
  if (!safe) return;
  pos.x = safe.x; pos.z = safe.z; pos.heading = 0; pos.speed = 0;
  player.jumpY = 0; player.jumpVelocity = 0; state.invulnerability = 3;
  if (showToast) toast('Back on the road.', 'A fresh start, just around the corner.', '↺', 3);
}
function busted() {
  if (state.gameOver) return;
  interruptLightning(lightning);
  if (!loseLife(player)) {
    state.gameOver = true; sound.play('playerDown', { gain: .8, allowWhenPaused: true, priority: true });
    saveProgress(); updateUI(); openDialog('gameover-dialog'); return;
  }
  sound.play('playerDown', { gain: .8, allowWhenPaused: true, priority: true });
  resetCombatAfterRespawn(combat);
  sound.stopLoop('gatlingFire');
  if (state.vehicle) { state.vehicle.occupied = false; state.vehicle.speed = 0; state.vehicle = null; avatar.group.visible = true; }
  player.health = 100; state.heat = 0; state.heatGrace = 0;
  state.mission = null; marker.visible = false;
  recover(false); state.invulnerability = RESPAWN_PROTECTION; state.respawnShield = true; avatar.group.position.set(player.x, .32, player.z); saveProgress();
  toast('Back from the brink.', `${player.lives} lives remaining.`, '✚', 5);
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
  for (const type of ['ammo', 'smgAmmo', 'shells']) collectItem(type, combat, player, state, lightning);
  state.completed++; state.mission = null; marker.visible = false;
  player.health = Math.min(100, player.health + 25); saveProgress(); sound.play('heal', { gain: .35 });
  toast('Job Complete · Supplies Recovered', 'More supplies for the fight against the outbreak.', '✓', 5);
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
    toast('You have company.', 'Get away from the creatures. Clear every star to get paid.', '★', 5);
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
    const impact = driveWithImpacts(car, dt, elapsed, () => collisionObstacles(car, true), (target, profile, direction) => {
      damageTarget(target, profile.damage, direction, profile);
      spatialSound('impact', car, .45, 28);
    });
    const hit = impact.hit;
    if (hit) {
      if (impact.solid && before > 8 && state.collisionCooldown <= 0 && state.invulnerability <= 0) {
        sound.play('impact', { gain: .5 });
        damagePlayer(player, Math.min(15, before * .38)); state.collisionCooldown = .8; addHeat(.22);
      }
    }
    car.group.position.set(car.x, .15, car.z);
    car.group.rotation.y = car.heading;
    car.group.rotation.z = -turn * clamp(car.speed / 33, -.03, .03);
    player.x = car.x; player.z = car.z; player.heading = car.heading; player.speed = Math.abs(car.speed);
  } else {
    let dx = -Math.sin(cameraYaw) * forward - Math.cos(cameraYaw) * turn;
    let dz = -Math.cos(cameraYaw) * forward + Math.sin(cameraYaw) * turn;
    const magnitude = Math.hypot(dx, dz);
    const speed = speedAtLevel(player.speedLevel);
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
  // Abandoned cars have no autonomous movement; only the player's car can drive.
  for (const car of city.cars) {
    car.hitCooldown = Math.max(0, car.hitCooldown - dt);
    if (car.disabled > 0) car.disabled = Math.max(0, car.disabled - dt);
    if (car !== state.vehicle) car.speed = 0;
  }
}

function updatePedestrians(dt) {
  if (city.navigationDirty) {
    pursuit = createPursuitField(city.colliders);
    largePursuit = createPursuitField(city.colliders, 2, 1.25);
    pursuitTimer = 0; city.navigationDirty = false;
    for (const person of city.pedestrians) person.routeTimer = 0;
  }
  const target = getPosition();
  if (state.started) {
    pursuitTimer -= dt;
    if (pursuitTimer <= 0) {
      pursuit.update(target, city.cars.flatMap(car => bodyDiscs({ ...car, radius: 1.25, length: 4.9 })));
      largePursuit.update(target, city.cars.flatMap(car => bodyDiscs({ ...car, radius: 1.25, length: 4.9 })));
      pursuitTimer = .75;
    }
  }
  for (const person of city.pedestrians) {
    const pos = person.group.position;
    pos.radius = person.radius || .5;
    tickKnockback(person, dt, (dx, dz) => moveActor(pos, dx, dz));
    if (person.down > 0) {
      person.down = Math.max(0, person.down - dt);
      if (person.down === 0) {
        const safe = clearSpawn(pos, pos);
        if (!safe) { person.down = 1; continue; }
        pos.set(safe.x, .32, safe.z); person.group.rotation.z = 0; person.health = person.maxHealth || 100;
        person.knockbackX = person.knockbackZ = person.staggerRemaining = 0;
      } else continue;
    }
    if (person.flying) {
      if (state.started) {
        const flightObstacles = city.colliders.filter(c => (c.height || 0) > 4 && !c.target?.destructible);
        const flightTarget = clearPath(pos, target, .5, flightObstacles) ? target : pursuit.next(pos, target) || target;
        tickBatFlight(person, dt, flightTarget, flightObstacles);
      }
      person.attackCooldown = Math.max(0, person.attackCooldown - dt);
      if (state.started && !state.vehicle && distance(pos, player) < 1.8 && pos.y < 2.5 && person.attackCooldown <= 0 && state.invulnerability <= 0 && clearPath(pos, player, .1, city.colliders)) {
        damagePlayer(player, person.attackDamage); person.attackCooldown = person.attackInterval;
        spatialSound('figureAttack', pos, .3, 15);
        if (player.health <= 0) { busted(); return; }
      }
      continue;
    }
    if (person.staggerRemaining > 0) {
      animatePerson(person, dt, 0);
      person.group.children[0].rotation.x -= Math.min(.25, person.staggerRemaining);
      continue;
    }
    if (state.started && (person.monsterType === 'nurse' || person.monsterType === 'lying-figure')) {
      person.acidCooldown = (person.acidCooldown ?? (1 + Math.random() * 3)) - dt;
      if (person.acidCooldown <= 0 && distance(pos, target) < (person.isBoss ? 32 : 20) && distance(pos, target) > 3) {
        const cover = [...city.colliders, ...city.cars.filter(c => c !== state.vehicle).flatMap(c => bodyDiscs({ ...c, radius: 1.25, length: 4.9 }).map(d => ({ ...d, height: 2.5 })))];
        if (clearPath(pos, target, .3, cover)) spitAcid(person, target);
        person.acidCooldown = person.isBoss ? 2.2 : 4 + Math.random() * 2;
      }
    }
    person.attackCooldown = Math.max(0, (person.attackCooldown || 0) - dt);
    // Gunshots no longer make monsters flee. Their approach remains slow.
    person.panic = 0;
    let moved = 0;
    if (state.started && distance(pos, target) > (person.radius || .5) + .65) {
      person.routeTimer = (person.routeTimer || 0) - dt;
      if (person.routeTimer <= 0 || !person.waypoint || distance(pos, person.waypoint) < .25) {
        person.waypoint = (person.radius > .5 ? largePursuit : pursuit).next(pos, target);
        person.routeTimer = .18;
      }
      const waypoint = person.waypoint;
      if (waypoint) {
        const dx = waypoint.x - pos.x, dz = waypoint.z - pos.z;
        const d = Math.hypot(dx, dz), step = Math.min(d, person.speed * dt);
        if (d > .02) {
          const x = pos.x, z = pos.z;
          moveActor(pos, dx / d * step, dz / d * step);
          moved = Math.hypot(pos.x - x, pos.z - z) / Math.max(dt, .001);
          person.group.rotation.y = lerpAngle(person.group.rotation.y, Math.atan2(-dx, -dz), 1 - Math.exp(-3 * dt));
        }
      }
    }
    animatePerson(person, dt, moved);
    if (state.started && !state.vehicle && distance(pos, player) < (person.radius || .5) + .9 && person.attackCooldown === 0 && state.invulnerability <= 0 && clearPath(pos, player, .1, city.colliders)) {
      spatialSound(person.monsterType === 'nurse' ? 'nurseAttack' : person.monsterType === 'pyramid-head' ? 'pyramidAttack' : 'figureAttack', pos, .55, 20);
      sound.play('impact', { gain: .25 });
      damagePlayer(player, person.attackDamage || 8); person.attackCooldown = person.attackInterval || 1.5;
      person.armL.rotation.x = -1.3;
      if (player.health <= 0) { busted(); return; }
    }
  }
}

function updateThreat(dt) {
  // Threat now comes from monsters, never from spawning moving patrol cars.
  if (state.heat <= 0) return;
  const closest = city.pedestrians.reduce((d, person) => person.down ? d : Math.min(d, distance(person.group.position, getPosition())), Infinity);
  state.heatGrace = Math.max(0, state.heatGrace - dt);
  if (state.heatGrace === 0 && closest > 22) state.heat = Math.max(0, state.heat - dt * (closest > 50 ? .15 : .075));
}

function updatePickups(dt) {
  for (const pickup of city.pickups) {
    if (pickup.enemyDrop) {
      if (pickup.collected) continue;
      if (!tickEnemyDrop(pickup, state.started ? dt : 0)) continue;
    }
    if (pickup.collected) {
      if (!state.started) continue;
      pickup.respawnRemaining -= dt;
      if (pickup.respawnRemaining > 0) continue;
      const obstacles = [...city.colliders, ...city.cars.flatMap(car => bodyDiscs({ ...car, radius: 1.25, length: 4.9 }))];
      const point = randomPickupPosition(obstacles, city.pickups.filter(p => p !== pickup && !p.collected), getPosition());
      if (!point) { pickup.respawnRemaining = 1; continue; }
      pickup.x = point.x; pickup.z = point.z; pickup.collected = false;
      pickup.group.position.set(point.x, 1.1, point.z); pickup.group.visible = true;
      pickup.lightRing.position.set(point.x, .42, point.z); pickup.lightRing.visible = true;
    }
    pickup.lightRing.scale.setScalar(1 + Math.sin(elapsed * 3 + pickup.x) * .08);
    pickup.group.rotation.y += dt;
    pickup.group.position.y = 1.1 + Math.sin(elapsed * 2 + pickup.x) * .15;
    if (state.started && !state.vehicle && distance(player, pickup) < 1.6 && clearPath(player, pickup, .1, city.colliders)) {
      const reward = collectItem(pickup.type, combat, player, state, lightning);
      if (!reward) continue;
      pickup.collected = true; pickup.group.visible = false; pickup.lightRing.visible = false;
      pickup.respawnRemaining = 30 + Math.random() * 20;
      saveProgress(); sound.play(reward.sound, { gain: .4 });
      toast(reward.title, pickup.enemyDrop ? 'Supplies recovered from a fallen enemy.' : 'Keep searching the city for more supplies.', '▣', 2.5);
    }
  }
}

function spitAcid(person, target) {
  const pos = person.group.position;
  for (const offset of person.isBoss ? [-.18, 0, .18] : [0]) {
    if (acidShots.length >= 48) break;
    const mesh = new THREE.Mesh(person.isBoss ? fireGeometry : acidGeometry, person.isBoss ? fireMaterial : acidMaterial);
    const halo = new THREE.Mesh(acidGeometry, person.isBoss ? fireHaloMaterial : acidHaloMaterial); halo.scale.setScalar(1.8); mesh.add(halo);
    const tail = new THREE.Mesh(person.isBoss ? flameGeometry : acidGeometry, person.isBoss ? fireHaloMaterial : acidHaloMaterial);
    if (person.isBoss) { tail.rotation.x = Math.PI / 2; tail.position.z = .65; }
    else { tail.scale.set(.65, .65, 2.5); tail.position.z = .55; }
    mesh.add(tail);
    const launchY = pos.y + (person.mouthHeight || 2.05);
    const shot = createAcidShot({ x: pos.x, y: launchY, z: pos.z }, { ...target, aimY: state.vehicle ? 1.5 : 1.8 + player.jumpY }, person.radius || .5, offset);
    // Face the target before spitting; local -Z is the projectile nose.
    person.group.rotation.y = Math.atan2(-shot.vx, -shot.vz);
    mesh.position.set(shot.x, shot.y, shot.z);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(shot.vx, shot.vy, shot.vz).normalize());
    scene.add(mesh); acidShots.push({ ...shot, fire: !!person.isBoss, damage: person.isBoss ? 18 : 10, mesh });
  }
  spatialSound(person.isBoss ? 'fireball' : 'figureAttack', pos, .35);
}
function updateAcid(dt) {
  acidFloor.update(dt); fireFloor.update(dt);
  if (!state.vehicle && player.jumpY < .35 && state.invulnerability <= 0 && acidFloor.contains(player)) {
    damagePlayer(player, 8 * dt);
    if (player.health <= 0) busted();
  }
  if (!state.vehicle && player.jumpY < .35 && state.invulnerability <= 0 && fireFloor.contains(player)) {
    damagePlayer(player, 12 * dt); if (player.health <= 0) busted();
  }
  if (!acidShots.length) return;
  const obstacles = [...city.colliders, ...city.cars.filter(c => c !== state.vehicle).flatMap(c => bodyDiscs({ ...c, radius: 1.25, length: 4.9 }).map(d => ({ ...d, height: 2.5 })))];
  for (let i = acidShots.length - 1; i >= 0; i--) {
    const shot = acidShots[i], result = tickAcid(shot, dt, { ...getPosition(), bottom: .32 + (state.vehicle ? 0 : player.jumpY), height: state.vehicle ? 2.5 : avatar.height }, obstacles, state.vehicle ? 2 : .5);
    shot.mesh.position.set(shot.x, shot.y, shot.z);
    shot.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(shot.vx, shot.vy, shot.vz).normalize());
    shot.mesh.scale.setScalar(1 + Math.sin(shot.life * 30) * .15);
    if (result === 'flying') {
      if (shot.fire) {
        shot.emberTimer = (shot.emberTimer || 0) - dt;
        if (shot.emberTimer <= 0) { shot.emberTimer = .06; fireSparks.burst(shot, { x: -shot.vx * .01, z: -shot.vz * .01 }, 2); }
      }
      continue;
    }
    if (result !== 'expired') {
      (shot.fire ? fireSparks : acidSplashes).burst({ x: shot.x, y: .5, z: shot.z }, { x: shot.vx * .025, z: shot.vz * .025 }, shot.fire ? 36 : 22);
      (shot.fire ? fireFloor : acidFloor).add(shot);
    }
    scene.remove(shot.mesh); acidShots.splice(i, 1);
    if (result === 'hit' && state.invulnerability <= 0) {
      damagePlayer(player, shot.damage * (state.vehicle ? .4 : 1));
      state.invulnerability = .25; sound.play('impact', { gain: .3 });
      if (player.health <= 0) { busted(); break; }
    }
  }
}
function spawnEnemy(person, location) {
  const point = clearSpawn({ radius: person.radius || .5 }, location);
  if (!point) return false;
  person.group.position.set(point.x, .32, point.z);
  person.group.position.radius = person.radius || .5;
  scene.add(person.group); city.pedestrians.push(person);
  return true;
}
function updateEncounters(dt) {
  if (objectives.complete && !state.freeMode) return;
  const target = getPosition();
  repositionTimer -= dt;
  if (repositionTimer <= 0) {
    repositionTimer = .6;
    let moved = 0;
    for (const person of city.pedestrians) {
      if (moved >= 2) break;
      if (!shouldReposition(person, target, player.speed)) continue;
      const point = ringSpawn(target, collisionObstacles(person.group.position), person.radius || .5);
      if (!point) continue;
      person.group.position.set(point.x, person.flying ? 2 : .32, point.z);
      person.waypoint = null; person.routeTimer = 0;
      person.knockbackX = person.knockbackZ = person.staggerRemaining = 0;
      person.attackCooldown = 1.5; person.acidCooldown = 2;
      moved++;
    }
  }
  for (const parent of [...city.pedestrians]) {
    if (parent.down || !summonType(parent)) continue;
    parent.summonCooldown = (parent.summonCooldown ?? (parent.isBoss ? 8 : 10)) - dt;
    if (parent.summonCooldown > 0 || !canSummon(parent, city.pedestrians, target)) continue;
    parent.summonCooldown = parent.isBoss ? 10 : 12;
    let spawned = 0;
    for (let i = 0; i < 2 && canSummon(parent, city.pedestrians, target); i++) {
      const type = summonType(parent), radius = type === 'hound' || type === 'bat' ? .5 : .8;
      const point = ringSpawn(parent.group.position, collisionObstacles(null), radius, 4, 12, Math.random, target, 10);
      if (!point) continue;
      let child = city.pedestrians.find(p => p.summoned && p.down && p.monsterType === type);
      if (!child) {
        // Bound total summoned models as well as active summons.
        if (city.pedestrians.filter(p => p.summoned).length >= SUMMON_LIMIT || city.pedestrians.filter(p => p.summoned && p.monsterType === type).length >= summonCap(type)) continue;
        child = type === 'bat' ? makeBat() : type === 'hound' ? makeQuadruped() : makePerson(false, 'pyramid-head');
        city.pedestrians.push(child); scene.add(child.group);
      }
      Object.assign(child, { freeWave: 0, summoned: true, summoner: parent, permanent: true, down: 0, health: child.maxHealth || 100,
        speed: type === 'bat' ? 7 : type === 'hound' ? 5 : 1.35, attackCooldown: 2, summonCooldown: 12,
        knockbackX: 0, knockbackZ: 0, staggerRemaining: 0, waypoint: null, routeTimer: 0 });
      child.group.position.set(point.x, child.flying ? 2 : .32, point.z); child.group.rotation.z = 0; child.group.visible = true;
      spawned++;
    }
    if (spawned && parent.isBoss) parent.summonBats = !parent.summonBats;
    if (spawned) spatialSound(parent.isBoss ? 'pyramidAttack' : 'figureAttack', parent.group.position, .6, 50);
  }
}

function updateAntidoteGuide(dt) {
  const freeBoss = state.freeMode ? city.pedestrians.filter(enemy => enemy.isBoss && !enemy.down).sort((a,b) => distance(a.group.position, getPosition()) - distance(b.group.position, getPosition()))[0] : null;
  const bossTarget = freeBoss ? freeBoss.group.position : objectives.boss && !objectives.boss.down && !objectives.complete ? objectives.boss.group.position : null;
  const target = bossTarget || (autoGuide ? nearestIngredient(symbols, getPosition()) : null);
  arrowMesh.material.color.set(bossTarget ? 0xffc66b : 0xff675d);
  guidePointer.visible = state.started && !!target;
  if (target) {
    const pos = getPosition(), dx = target.x - pos.x, dz = target.z - pos.z, length = Math.max(.001, Math.hypot(dx, dz));
    guidePointer.position.set(pos.x + dx / length * 2.3, .65 + (state.vehicle ? .2 : player.jumpY), pos.z + dz / length * 2.3);
    guidePointer.rotation.y = Math.atan2(-dx, -dz);
  }
  if (!target) { guideTarget = null; guidePath = []; return; }
  guideTimer -= dt;
  if (target === guideTarget && guideTimer > 0) return;
  guideTarget = target; guideTimer = 1;
  guidePath = antidoteGuide.route(getPosition(), target, city.cars.flatMap(car => bodyDiscs({ ...car, radius: 1.25, length: 4.9 })));

}
$('auto-guide-toggle').addEventListener('change', event => { autoGuide = event.target.checked; guideTimer = 0; updateAntidoteGuide(0); });

function updateObjectives(dt) {
  if (state.freeMode) {
    const living = city.pedestrians.filter(enemy => !enemy.down && enemy.freeWave === state.freeWave.number).length;
    if (advanceFreeWave(state.freeWave, objectives.pending, living)) {
      objectives.pending = state.freeWave.total;
      announceObjective(`Wave ${state.freeWave.number} · ${state.freeWave.total.toLocaleString()} Enemies + ${state.freeWave.bosses} Bosses`, 'Survive the next wave.', 'Free Mode');
    }
  }
  if (state.freeMode && state.freeWave.bossPending > 0 && city.pedestrians.filter(enemy => enemy.isBoss && !enemy.down).length < 8) {
    const point = ringSpawn(getPosition(), collisionObstacles(null), 1.25, 24, 38);
    if (point) {
      let boss = city.pedestrians.find(enemy => enemy.isBoss && enemy.down);
      if (!boss) { boss = makeBoss(); city.pedestrians.push(boss); scene.add(boss.group); }
      Object.assign(boss, { freeWave: state.freeWave.number, down: 0, health: boss.maxHealth, summonBats: true,
        attackCooldown: 2, acidCooldown: 3, summonCooldown: 6, knockbackX: 0, knockbackZ: 0, staggerRemaining: 0, waypoint: null, routeTimer: 0 });
      boss.group.position.set(point.x, .32, point.z); boss.group.rotation.z = 0; boss.group.visible = true;
      state.freeWave.bossPending--;
    }
  }
  for (const symbol of symbols) {
    if (symbol.collected) continue;
    symbol.glyph.rotation.y += dt;
    symbol.glyph.position.y = 1.6 + Math.sin(elapsed * 2) * .12;
    if (!state.vehicle && distance(player, symbol) < 1.7 && clearPath(player, symbol, .1, city.colliders)) {
      symbol.collected = true; symbol.group.visible = false;
      const count = collectSymbol(objectives, symbol.id);
      sound.play('otherworld', { gain: .45 }); addHeat(1);
      toast(`${ingredientNames[symbol.id]} recovered · ${objectives.found.size} / 5`, `${count} enemies are entering the streets.`, '✧', 6);
    }
  }
  waveSpawnTimer -= dt;
  if (objectives.pending > 0 && waveSpawnTimer <= 0 && canSpawnWave(city.pedestrians)) {
    waveSpawnTimer = .12;
    const types = ['hound', 'nurse', 'lying-figure', 'pyramid-head'];
    const type = types[Math.floor(Math.random() * types.length)];
    const target = getPosition();
    const point = ringSpawn(target, collisionObstacles(null), type === 'pyramid-head' ? .8 : .5, 28, 42);
    if (point) {
      let person = reusableWaveEnemy(city.pedestrians, type);
      if (!person) {
        person = type === 'hound' ? makeQuadruped() : makePerson(false, type);
        scene.add(person.group); city.pedestrians.push(person);
      }
      Object.assign(person, { freeWave: state.freeMode ? state.freeWave.number : 0, permanent: true, down: 0, health: person.maxHealth || 100, speed: type === 'hound' ? 5 : type === 'pyramid-head' ? 1.35 : 3,
        attackCooldown: 1, acidCooldown: 2, summonCooldown: 10, knockbackX: 0, knockbackZ: 0, staggerRemaining: 0, waypoint: null, routeTimer: 0 });
      person.group.position.set(point.x, .32, point.z); person.group.rotation.z = 0; person.group.visible = true;
      objectives.pending--;
    }
  }
  if (objectives.found.size === 5 && !objectives.boss) {
    const boss = makeBoss();
    if (spawnEnemy(boss, { x: 0, z: -12 })) {
      objectives.boss = boss;
      toast(selectedTheme === 'zombies' ? 'The Alpha Infected awakens.' : 'The Park Warden awakens.', 'All antidote ingredients recovered. Clear the final threat in the central park.', '☠', 10);
      sound.play('otherworld', { gain: .6 });
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
  $('reload-button').disabled = !WEAPONS[combat.selected].magazine || !!WEAPONS[combat.selected].noReload || !!state.vehicle;
  $('weapon-icon').innerHTML = weaponIcon(combat.selected);
  $('weapon-slot-number').textContent = combat.selected + 1;
  $('weapon-switch').setAttribute('aria-label', `${WEAPONS[combat.selected].name}, slot ${combat.selected + 1}. Click to switch.`);
  const skillActive = lightning.remaining > 0;
  $('skill-fill').style.width = lightning.charge / LIGHTNING.maxCharges + '%';
  const storedCharges = Math.floor(lightning.charge / 100);
  $('skill-charges').textContent = `${storedCharges}/${LIGHTNING.maxCharges}`;
  $('skill-button').title = `Lightning Orbit · V · ${storedCharges} charges${skillActive ? ` · ${lightning.remaining.toFixed(1)}s active` : ''}`;
  $('skill-bar').setAttribute('aria-valuenow', Math.round(lightning.charge));
  $('skill-state').textContent = skillActive ? `${lightning.remaining.toFixed(1)}s ACTIVE` : lightning.charge >= 100 ? `${storedCharges} Charges Ready` : `${Math.ceil(lightning.charge)}% Charging`;
  $('skill-button').disabled = skillActive || lightning.charge < 100 || !!state.vehicle || state.gameOver;
  $('skill-button').classList.toggle('ready', !skillActive && lightning.charge >= 100);
  const driving = !!state.vehicle, pos = getPosition();
  for (const person of city.pedestrians) person.group.visible = !person.down && (person.group.position.x - pos.x) ** 2 + (person.group.position.z - pos.z) ** 2 < 2500;
  $('weapon-name').textContent = WEAPONS[combat.selected].name;
  $('ammo-count').textContent = combat.selected === 5 ? `${combat.grenades} ROUNDS` : WEAPONS[combat.selected].noReload ? `${combat.ammo[combat.selected] + combat.reserve[combat.selected]} ROUNDS` : combat.selected ? `${combat.ammo[combat.selected]} / ${combat.reserve[combat.selected]}` : 'MELEE';
  $('combat-state').textContent = state.vehicle ? 'EXIT VEHICLE TO ATTACK' : combat.reloadRemaining > 0 ? 'RELOADING…' : combat.selected === 4 && combat.spin > 0 && combat.spin < .35 ? 'SPINNING UP…' : 'Q / SCROLL';
  $('lives-hearts').setAttribute('aria-label', `${player.lives} of 5 lives remaining`);
  [...$('lives-hearts').children].forEach((heart, index) => heart.classList.toggle('lost-life', index >= player.lives));
  $('speed-level').textContent = player.speedLevel === 5 ? 'SPD MAX' : `SPD ${player.speedLevel}/5`;
  $('speed-level').title = `Movement speed level ${player.speedLevel} of 5`;
  $('armor-value').textContent = Math.ceil(player.armor);
  $('armor-fill').style.width = player.armor + '%';
  $('health-bar').setAttribute('aria-valuenow', Math.ceil(player.health));
  $('armor-bar').setAttribute('aria-valuenow', Math.ceil(player.armor));
  const wanted = Math.ceil(state.heat);
  $('wanted').innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < wanted ? 'active' : ''}">★</span>`).join('');
  $('wanted').setAttribute('aria-label', `Wanted level ${wanted} of 5`);
  $('heat-label').textContent = wanted ? state.heatGrace > 0 ? 'THEY HEAR YOU' : 'LOSE THE HEAT' : 'KEEP IT CLEAN';
  $('health-fill').style.width = Math.max(0, player.health) + '%';
  $('health-fill').style.backgroundColor = player.health < 30 ? '#df775a' : '#86a285';
  $('health-value').textContent = Math.ceil(Math.max(0, player.health));
  $('district').textContent = district(pos); $('map-district').textContent = district(pos);
  $('vehicle-label').textContent = driving ? state.vehicle.name.toUpperCase() : 'ON FOOT';
  $('speed').textContent = Math.round(player.speed * 3.6).toString().padStart(2, '0');
  $('gear').textContent = driving ? state.vehicle.speed < -.1 ? 'REVERSE' : Math.abs(state.vehicle.speed) < .5 ? 'IDLE' : 'GEAR ' + Math.min(5, Math.ceil(Math.abs(state.vehicle.speed) / 8)) : `SPEED LV ${player.speedLevel}`;
  speedBars.forEach((el, i) => el.classList.toggle('active', i < player.speed / (driving ? 4 : .85)));
  $('move-hint').textContent = driving ? 'Drive' : 'Move';
  $('shift-hint').textContent = driving ? 'Boost' : 'Speed pickups';
  $('space-hint').textContent = driving ? 'Handbrake' : 'Jump';
  $('completed-jobs').textContent = String(state.completed).padStart(2, '0');
  updateNearestCar();
  $('interaction').hidden = !state.started || state.paused || (!driving && !nearestCar);
  if (driving || nearestCar) $('interaction').innerHTML = driving ? '<kbd>E</kbd><span>Exit vehicle</span>' : `<kbd>E</kbd><span>Get in the <b>${nearestCar.name}</b></span>`;
  const count = objectives.found.size, boss = objectives.boss;
  $('mission-kicker').textContent = state.freeMode ? 'FREE MODE' : objectives.complete ? 'CITY CLEARED' : boss ? 'FINAL ENCOUNTER' : 'ANTIDOTE INGREDIENTS';
  $('mission-number').textContent = `${count} / 5`;
  $('mission-title').textContent = state.freeMode ? `Survive Wave ${state.freeWave.number}.` : objectives.complete ? 'Antidote supplies secured.' : boss ? (selectedTheme === 'zombies' ? 'The Alpha Infected' : 'The Park Warden') : 'Find all five ingredients.';
  $('mission-copy').textContent = state.freeMode ? 'Defeat the wave to advance. Each new wave has twice as many enemies.' : objectives.complete ? 'All five ingredients recovered and the final threat defeated.' : boss ? (selectedTheme === 'zombies' ? 'Find the Alpha Infected in the central park.' : 'Find the Warden in Rosewater Park. Dodge its fireball volleys.') : 'Search the city for five antidote ingredients. Each pickup attracts a larger wave. Nearby samples appear on your map.';
  if (state.started && !state.gameOver && !state.freeMode) {
    const mainKey = `${count}:${!!boss}:${objectives.complete}`;
    const job = state.mission;
    const key = `${mainKey}:${job ? `${job.index}:${job.stage}:${!!job.escaping}` : 'none'}`;
    if (key !== lastObjectiveKey) {
      if (mainKey !== lastMainObjectiveKey || !job) {
        announceObjective(objectives.complete ? 'Antidote Supplies Secured' : boss ? $('mission-title').textContent : count ? `${count} / 5 Ingredients Recovered` : 'Find All Five Ingredients',
          objectives.complete ? 'All ingredients recovered. The final threat is defeated.' : boss ? 'Reach the central park and defeat the boss.' : count ? 'Find the remaining antidote ingredients. A new wave is approaching.' : 'Search the city for antidote ingredients. Follow the red guide.',
          objectives.complete ? 'Objective Complete' : boss ? 'Final Objective' : count ? 'Objective Updated' : 'New Objective');
      } else {
        const task = JOBS[job.index];
        announceObjective(task.title, task.instructions[Math.min(job.stage, task.instructions.length - 1)], 'New Objective');
      }
      lastObjectiveKey = key; lastMainObjectiveKey = mainKey;
    }
  }
  $('mission-action').textContent = 'Open City Map';
  $('mission-progress').hidden = false; $('mission-meta').hidden = false;
  $('mission-progress-fill').style.backgroundColor = boss && !objectives.complete ? '#39e769' : '#e76a60';
  $('mission-progress-fill').style.width = (boss && !objectives.complete ? Math.max(0, boss.health) / boss.maxHealth : count / 5) * 100 + '%';
  $('mission-distance').textContent = boss && !objectives.complete ? `${selectedTheme === 'zombies' ? 'ALPHA' : 'WARDEN'} · ${Math.max(0, Math.ceil(boss.health))} / ${boss.maxHealth} HP` : `WAVE ${count} · ${city.pedestrians.filter(p => p.permanent && !p.down && !p.isBoss).length + objectives.pending} REMAINING`;
  $('mission-timer').textContent = objectives.complete ? 'COMPLETE' : boss ? 'CENTRAL PARK' : autoGuide && guideTarget ? `${Math.round(distance(getPosition(), guideTarget))}m TO SAMPLE` : 'EXPLORE';
  if (state.freeMode) {
    const living = city.pedestrians.filter(enemy => !enemy.down && enemy.freeWave === state.freeWave.number).length;
    const livingBosses = city.pedestrians.filter(enemy => !enemy.down && enemy.isBoss && enemy.freeWave === state.freeWave.number).length;
    const remaining = objectives.pending + living;
    const bossesLeft = state.freeWave.bossPending + livingBosses;
    $('mission-number').textContent = `WAVE ${state.freeWave.number}`;
    $('mission-distance').textContent = `${(remaining - livingBosses).toLocaleString()} ENEMIES · ${bossesLeft} BOSSES`;
    $('mission-timer').textContent = 'SURVIVE';
    $('mission-progress-fill').style.width = Math.max(0, 1 - (remaining + state.freeWave.bossPending) / (state.freeWave.total + state.freeWave.bosses)) * 100 + '%';
  }
  $('job-notice').textContent = 'Optional supply jobs. Your main objective is to find all five antidote ingredients.';
  document.querySelectorAll('[data-job]').forEach(button => { button.disabled = !!state.mission; });
  const minutes = ((state.night ? 213 : 137) + Math.floor(elapsed / 3)) % 1440;
  $('world-time').textContent = String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
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
  ctx.fillStyle = '#c8bb8a'; ctx.fillRect(tx(-2.5), tz(-2.5), 5 * scale, 5 * scale);
  if (full) {
    ctx.font = '600 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#333f35';
    for (const [name, x, z] of [['NORTHSIDE', 0, -61], ['OLD TOWN', 0, 61], ['WEST VILLAGE', -60, 0], ['OCEAN DRIVE', 107, 0], ['ROSEWATER PARK', 0, 15]]) { ctx.save(); ctx.translate(tx(x), tz(z)); if (name === 'OCEAN DRIVE') ctx.rotate(-Math.PI / 2); ctx.fillText(name, 0, 0); ctx.restore(); }
    for (const landmark of city.landmarks) { ctx.fillStyle = '#f0dfaa'; ctx.fillText(landmark.kind.toUpperCase(), tx(landmark.x), tz(landmark.z)); }
    ctx.fillText('CLOCK', tx(0), tz(0));
    ctx.fillText('N ↑', w - 32, 30);
  }
  if (state.mission && !state.mission.escaping) {
    const point = JOBS[state.mission.index].points[state.mission.stage];
    const x = clamp(tx(point.x), 13, w - 13), y = clamp(tz(point.z), 13, h - 13);
    ctx.strokeStyle = '#dda63e'; ctx.lineWidth = full ? 3 : 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(tx(pos.x), tz(pos.z)); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, full ? 10 : 9, 0, Math.PI * 2); ctx.fillStyle = '#edbb52'; ctx.fill(); ctx.strokeStyle = '#fff8de'; ctx.lineWidth = 3; ctx.stroke();
  }
  if (autoGuide && guideTarget && guidePath.length > 1) {
    ctx.strokeStyle = '#ff675d'; ctx.lineWidth = full ? 3 : 2; ctx.setLineDash([4, 4]); ctx.beginPath();
    guidePath.forEach((point, index) => index ? ctx.lineTo(tx(point.x), tz(point.z)) : ctx.moveTo(tx(point.x), tz(point.z)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(clamp(tx(guideTarget.x), 8, w - 8), clamp(tz(guideTarget.z), 8, h - 8), 6, 0, Math.PI * 2); ctx.stroke();
  }
  for (const pickup of city.pickups) { if (pickup.collected) continue; ctx.fillStyle = '#' + PICKUP_COLORS[pickup.type].toString(16).padStart(6, '0'); ctx.fillRect(tx(pickup.x) - 2, tz(pickup.z) - 2, 4, 4); }
  for (const symbol of symbols) {
    if (symbol.collected || distance(symbol, pos) > 28) continue;
    ctx.fillStyle = '#ff675d'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▣', tx(symbol.x), tz(symbol.z));
  }
  for (const enemy of city.pedestrians) if (enemy.isBoss && !enemy.down) {
    const bp = enemy.group.position;
    ctx.fillStyle = '#ff5948'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠', tx(bp.x), tz(bp.z));
  }
  ctx.save(); ctx.translate(tx(pos.x), tz(pos.z)); ctx.rotate(-pos.heading);
  ctx.shadowColor = '#4f5b4650'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath();
  ctx.fillStyle = '#c29c63'; ctx.fill(); ctx.strokeStyle = '#fff7df'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
}

function selectTheme(theme) {
  if (!THEMES[theme] || theme === selectedTheme) return;
  selectedTheme = theme;
  applyActorTheme(city.pedestrians, theme);
  document.body.dataset.theme = theme;
  document.querySelectorAll('[data-theme-select]').forEach(select => { select.value = theme; });
  const zombie = theme === 'zombies';
  $('city-name').textContent = zombie ? 'QUARANTINE ZONE' : 'SILENT HILL';
  $('map-city-name').textContent = zombie ? 'Quarantine Zone' : 'Silent Hill';
  $('brand-title').textContent = THEMES[theme].title;
  $('brand-subtitle').textContent = THEMES[theme].subtitle;
  $('welcome-title').textContent = THEMES[theme].title;
  $('welcome-subtitle').textContent = zombie ? 'SURVIVE THE OUTBREAK' : 'THE FOG KNOWS YOUR NAME';
  $('welcome-copy').textContent = zombie ? 'An infected city. An endless horde. Find supplies, fight the outbreak, and survive.' : 'Empty streets. A broken signal. Shapes in the mist. Keep moving. Some things are better left in the fog.';
  document.title = zombie ? 'Dead Zone — Zombie Survival' : 'Dead Zone: Fogbound';
  const bg = state.night ? THEMES[theme].nightFog : THEMES[theme].fog;
  scene.background.set(bg); scene.fog.color.set(bg);
  updateUI();
}
document.querySelectorAll('[data-theme-select]').forEach(select => select.addEventListener('change', event => selectTheme(event.target.value)));

function setNight() {
  state.night = !state.night;
  const transitionSound = state.night ? 'otherworld' : 'fogworld';
  if (state.paused) pendingWorldSound = transitionSound;
  else sound.play(transitionSound, { gain: .3 });
  const bg = state.night ? THEMES[selectedTheme].nightFog : THEMES[selectedTheme].fog;
  scene.background.set(bg); scene.fog.color.set(bg);
  hemisphere.intensity = state.night ? 1.3 : 1.65;
  hemisphere.color.set(state.night ? 0xb29a86 : 0xb1beb4);
  sun.intensity = state.night ? .5 : .8;
  sun.color.set(state.night ? 0xb98062 : 0xc2c8b8);
  renderer.toneMappingExposure = state.night ? .9 : .95;
  $('day-toggle').textContent = selectedTheme === 'zombies' ? (state.night ? 'Night' : 'Daylight') : (state.night ? 'Otherworld ◈' : 'Fog world ≋');
  $('weather-icon').textContent = state.night ? '◈' : '≋';
  updateUI();
}

canvas.tabIndex = 0;
$('skill-button').addEventListener('click', useLightning);
$('free-mode-button').addEventListener('click', () => {
  state.freeMode = true;
  const first = startFreeWave(city.pedestrians);
  state.freeWave = { number: first.number, total: first.total, bosses: first.bosses, bossPending: first.bossPending }; objectives.pending = first.pending;
  waveSpawnTimer = 0;
  closeDialogs(); updateUI();
  announceObjective('Wave 1 · 1,600 Enemies + 2 Bosses', 'Clear the wave to face twice as many enemies.', 'Free Mode');
});
$('return-demo-button').addEventListener('click', () => { saveProgress(); location.reload(); });
$('restart-button').addEventListener('click', () => location.reload());
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
  const high = e.target.value === 'high', low = e.target.value === 'low';
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : low ? 1 : 1.25));
  renderer.shadowMap.enabled = !low;
  const shadowSize = high ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== shadowSize) {
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
  }
  scene.traverse(object => { if (object.material) { const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(mat => { mat.needsUpdate = true; }); } });
});
document.querySelector('.sound-slash').style.display = 'none';
$('sound-button').setAttribute('aria-label', 'Mute sound');
$('sound-button').addEventListener('click', () => {
  state.audio = !state.audio;
  sound.setEnabled(state.audio);
  if (state.audio) sound.unlock();
  $('sound-button').setAttribute('aria-label', state.audio ? 'Mute sound' : 'Enable sound');
  document.querySelector('.sound-slash').style.display = state.audio ? 'none' : '';
});
$('music-volume-slider').addEventListener('input', event => music.setVolume(Number(event.target.value) / 100));
$('volume-slider').addEventListener('input', event => sound.setVolume(Number(event.target.value) / 100));
let lastHover = 0;
document.addEventListener('pointerover', event => {
  const button = event.target.closest('button');
  if (!button || button.contains(event.relatedTarget) || performance.now() - lastHover < 100) return;
  lastHover = performance.now(); sound.play('hover', { gain: .08 });
});
document.addEventListener('click', event => {
  if (event.target.closest('button') && !event.target.closest('#sound-button')) sound.play('click', { gain: .16 });
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeDialogs));
document.querySelectorAll('[data-job]').forEach(button => button.addEventListener('click', () => startMission(Number(button.dataset.job))));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', updatePaused);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialogs(); });
});
const capturedKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyM', 'KeyR', 'KeyX', 'KeyF', 'KeyJ', 'KeyQ', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'KeyG', 'KeyV'];
addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (capturedKeys.includes(event.code) || weaponSlot(event.code) >= 0) event.preventDefault();
  if (event.repeat && weaponSlot(event.code) >= 0) return;
  if (event.repeat && ['KeyE', 'KeyM', 'KeyR', 'KeyX', 'KeyQ', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'KeyG', 'KeyV', 'Escape'].includes(event.code)) return;
  if (!state.started) { if (event.code === 'Enter' || event.code === 'Space') startGame(); return; }
  if (event.code === 'Escape') { event.preventDefault(); state.paused ? closeDialogs() : openDialog('pause-dialog'); return; }
  if (event.code === 'KeyM') { toggleMap(); return; }
  if (state.paused) return;
  if (event.code === 'KeyE') enterExitCar();
  else if (event.code === 'KeyX') recover();
  else if (event.code === 'KeyR') beginReload();
  else if (event.code === 'KeyV') useLightning();
  else if (event.code === 'KeyG') fireGrenadeLauncher();
  else if (event.code === 'KeyQ') selectWeapon((combat.selected + 1) % WEAPONS.length);
  else if (weaponSlot(event.code) >= 0) selectWeapon(weaponSlot(event.code));
  else keys.add(event.code);
});
addEventListener('keyup', event => keys.delete(event.code));
addEventListener('blur', () => { keys.clear(); if (state.started && !state.paused) openDialog('pause-dialog'); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) music.update(0, state.started ? 'action' : 'menu', state.audio, true);
  else unlockMusic();
  if (document.hidden && state.started && !state.paused) openDialog('pause-dialog'); updatePaused(); });
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => { if (state.paused || !state.started) return; if (event.button === 0 && event.pointerType !== 'touch') { keys.add('MouseFire'); mouseAiming = true; aimMouse.set(event.clientX / innerWidth * 2 - 1, -event.clientY / innerHeight * 2 + 1); return; } dragging = true; previousPointer = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => {
  if (event.pointerType !== 'touch') { mouseAiming = true; aimMouse.set(event.clientX / innerWidth * 2 - 1, -event.clientY / innerHeight * 2 + 1); $('crosshair').style.left = event.clientX + 'px'; $('crosshair').style.top = event.clientY + 'px'; $('crosshair').hidden = state.paused || !state.started; }
  if (!dragging) return;
  cameraYaw -= (event.clientX - previousPointer.x) * .006;
  cameraPitch = clamp(cameraPitch + (event.clientY - previousPointer.y) * .004, .5, 1.24);
  previousPointer = { x: event.clientX, y: event.clientY };
});
const endDrag = () => { dragging = false; previousPointer = null; };
addEventListener('pointerup', () => keys.delete('MouseFire'));
canvas.addEventListener('pointerleave', () => { keys.delete('MouseFire'); mouseAiming = false; $('crosshair').hidden = true; });
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
let wheelTime = 0;
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  if (!state.started || state.paused) return;
  if (event.shiftKey) { cameraDistance = clamp(cameraDistance + event.deltaY * .035, 22, 90); return; }
  if (!event.deltaY || performance.now() - wheelTime < 140) return;
  wheelTime = performance.now();
  selectWeapon((combat.selected + (event.deltaY > 0 ? 1 : -1) + WEAPONS.length) % WEAPONS.length);
}, { passive: false });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
if (matchMedia('(pointer: coarse)').matches) { $('touch-controls').hidden = false; document.body.classList.add('touch'); }
document.querySelectorAll('[data-key]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); if (!state.paused && state.started) keys.add(button.dataset.key); button.setPointerCapture(event.pointerId); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.key));
});
$('touch-enter').addEventListener('click', enterExitCar);
$('touch-grenade').addEventListener('click', fireGrenadeLauncher);
$('touch-weapon').addEventListener('click', () => selectWeapon((combat.selected + 1) % WEAPONS.length));
$('weapon-switch').addEventListener('click', () => selectWeapon((combat.selected + 1) % WEAPONS.length));
$('reload-button').addEventListener('click', beginReload);


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
  pos.radius = person.radius || .5;
  const safe = clearSpawn(pos, pos);
  if (safe) { pos.x = safe.x; pos.z = safe.z; }
}
for (const [id, location] of SYMBOL_LOCATIONS.entries()) {
  const point = clearSpawn(player, location);
  if (!point) throw new Error('No accessible symbol location');
  const group = new THREE.Group(), ring = makeLightRing(0xff675d);
  ring.position.y = .42; group.add(ring);
  const glyph = new THREE.Group();
  box(.45, .75, .45, 0xe76a60, 0, 0, 0, glyph);
  box(.52, .18, .52, 0xe1e4ce, 0, .45, 0, glyph);
  box(.47, .32, .47, 0x943d38, 0, -.1, 0, glyph);
  box(.12, .25, .035, 0xf2f2dd, 0, .12, .25, glyph);
  box(.25, .08, .035, 0xf2f2dd, 0, .12, .25, glyph);
  glyph.position.y = 1.6; group.add(glyph);
  group.position.set(point.x, 0, point.z); scene.add(group);
  symbols.push({ id, x: point.x, z: point.z, group, glyph, collected: false });
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
      updatePlayer(dt); updateCombat(dt); updateThreat(dt); updateMission(dt); updateObjectives(dt); updateAcid(dt); updateEncounters(dt); updateLightning(dt); updateAntidoteGuide(dt);
      if (objectives.complete && !state.gameOver && !state.completionShown) {
        state.completionShown = true; objectives.pending = 0; state.invulnerability = Math.max(state.invulnerability, 3);
        saveProgress(); updateUI(); openDialog('completion-dialog');
      }
      if (!state.gameOver && state.heat === 0 && player.health < 100) player.health = Math.min(100, player.health + dt * 1.2);
      saveClock += dt; if (saveClock > 15) { saveClock = 0; saveProgress(); }
    }
    updateTraffic(dt); updatePedestrians(dt); updatePickups(dt);
    city.parkClock.update((state.night ? 213 : 137) + elapsed / 3);
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
  updateSound(dt);
  uiClock += dt;
  if (uiClock > .12) { updateUI(); uiClock = 0; }
  updateBuildingVisibility(city.buildings, pos);
  if (state.invulnerability <= 0 || state.gameOver) state.respawnShield = false;
  respawnShield.update(getPosition(), state.respawnShield ? state.invulnerability : 0, state.started && !state.gameOver);
  enemyHealthBars.update(city.pedestrians, camera, pos, state.started);
  playerFog.update(state.paused ? 0 : dt, pos);
  if (muzzleFlash.group.visible && !state.paused) {
    muzzleFlash.update(0, getMuzzlePosition(), player.heading);
    if (mouseAiming) {
      const origin = getMuzzlePosition();
      muzzleFlash.group.rotation.x = Math.atan2(aimPoint.y - origin.y, Math.hypot(aimPoint.x - origin.x, aimPoint.z - origin.z));
    }
  }
  renderer.render(scene, camera);
}
selectTheme('zombies');
setNight();
setTimeout(() => { titleMusicDelayElapsed = true; if (!state.started) unlockMusic(); }, 1000);
camera.position.set(59, 59, 75);
updateUI(); playerFog.update(0, getPosition()); renderer.render(scene, camera); requestAnimationFrame(frame);
$('loading').style.opacity = 0;
setTimeout(() => { $('loading').hidden = true; }, 450);
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); if (state.started) openDialog('pause-dialog'); toast('Graphics paused.', 'Reload the page to restore the city. Your completed jobs are saved.', 'Ⅱ', 100); });
