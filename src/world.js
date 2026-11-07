import { createPickupModel } from './pickup-models.js';
import { createParkClock } from './clock.js';
import * as THREE from 'three';
import { PICKUP_TYPES, PICKUP_COLORS, randomPickupPosition } from './pickups.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bodyDiscs, bodyBlocked, ROAD_CENTERS } from './physics.js';

const palette = { road: 0x383d3b, sidewalk: 0x777970, curb: 0x9c9c88, grass: 0x535b46, foliage: 0x4b5141, dark: 0x202827, window: 0x26312f };
let seed = 7;
let worldTheme = 'horror';
export function setWorldTheme(theme) { worldTheme = theme === 'zombies' ? 'zombies' : 'horror'; }
export function getWorldTheme() { return worldTheme; }
export const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const pick = a => a[Math.floor(random() * a.length)];
const cube = new THREE.BoxGeometry(1, 1, 1);
const modelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const materialCache = new Map();
function material(color) {
  if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return materialCache.get(color);
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, parent) {
  const mesh = new THREE.Mesh(cube, material(color));
  mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent?.add(mesh);
  return mesh;
}

function mergedModel(parts) {
  const geometries = parts.map(([w, h, d, color, x, y, z]) => {
    const geometry = cube.clone();
    geometry.scale(w, h, d); geometry.translate(x, y, z);
    const c = new THREE.Color(color);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  });
  const merged = mergeGeometries(geometries);
  geometries.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(merged, modelMaterial);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function makeCar(color = 0xef8750, police = false) {
  const group = new THREE.Group();
  const parts = [
    [2.35, .62, 4.65, color, 0, .82, 0],
    [2.19, .25, 4.1, color, 0, 1.18, .05],
    [1.95, .73, 2.12, 0x3b6068, 0, 1.61, .13],
    [2.06, .16, 2.2, police ? 0xf2eddf : color, 0, 2.03, .13],
    [2.04, .77, .15, color, 0, 1.6, .2],
    [2.3, .12, .75, color, 0, 1.3, -1.72],
    [2.42, .22, .2, 0xd3d8ca, 0, .65, -2.34],
    [2.42, .22, .18, 0x43565a, 0, .64, 2.34],
    [.6, .23, .04, 0xffefbb, -.72, .99, -2.335], [.6, .23, .04, 0xffefbb, .72, .99, -2.335],
    [.56, .22, .04, 0xd35242, -.77, .97, 2.34], [.56, .22, .04, 0xd35242, .77, .97, 2.34],
    [.53, .2, .04, 0xf5e8c8, 0, .8, 2.35],
    [.2, .22, .35, color, -1.23, 1.48, -.7], [.2, .22, .35, color, 1.23, 1.48, -.7],
  ];
  for (const x of [-1.19, 1.19]) for (const z of [-1.48, 1.48]) {
    parts.push([.37, .82, .82, 0x303c40, x, .46, z], [.39, .37, .37, 0xb7bbb2, x, .46, z]);
  }
  if (police) {
    parts.push([2.38, .34, 1.65, 0xf2eddf, 0, 1, .1], [1.52, .12, .44, 0x374b55, 0, 2.16, .1]);
    group.userData.red = box(.66, .2, .37, 0xef5e52, -.4, 2.3, .1, group);
    group.userData.blue = box(.66, .2, .37, 0x4f94d8, .4, 2.3, .1, group);
  }
  group.add(mergedModel(parts));
  return group;
}

export function makeQuadruped() {
  const group = new THREE.Group(), rig = new THREE.Group(); group.add(rig);
  const infectedDog = worldTheme === 'zombies';
  const coat = infectedDog ? 0x232726 : 0x805f57, back = infectedDog ? 0x343a37 : 0x9a8070;
  group.userData.appearance = infectedDog ? 'infected-black-dog' : 'skinless-hound';
  box(.52, .34, .9, coat, 0, .47, 0, rig);
  box(.42, .2, .62, back, 0, .65, -.03, rig);
  box(.38, .31, .4, infectedDog ? 0x2b302d : 0x9f8b77, 0, .48, -.57, rig);
  box(.3, .12, .3, 0x191c1b, 0, .33, -.66, rig);
  for (const x of [-.12, .12]) {
    box(.065, .045, .025, 0xe7b365, x, .53, -.775, rig);
    box(.05, .1, .05, 0xd1c7ac, x, .36, -.79, rig);
    if (infectedDog) {
      const ear = box(.13, .27, .14, coat, x * 1.2, .73, -.48, rig); ear.rotation.z = Math.sign(x) * -.2;
    }
  }
  if (infectedDog) {
    box(.28, .18, .24, 0x252a27, 0, .44, -.77, rig);
    box(.15, .09, .06, 0x101412, 0, .5, -.91, rig);
    box(.035, .2, .25, 0x873c35, -.27, .49, -.12, rig);
    box(.035, .11, .19, 0xa05043, .27, .52, .2, rig);
    const tail = box(.09, .1, .5, coat, 0, .53, .62, rig); tail.rotation.x = -.35;
  } else for (const z of [-.28, -.1, .08, .26]) box(.1, .1, .08, 0xccc0a2, 0, .79, z, rig);
  const legs = [], knees = [];
  for (const [x, z] of [[-.28, -.3], [.28, -.3], [-.28, .3], [.28, .3]]) {
    const leg = new THREE.Group(), knee = new THREE.Group();
    leg.position.set(x, .49, z); rig.add(leg);
    box(.11, .23, .12, infectedDog ? 0x252a28 : 0x716355, 0, -.115, 0, leg);
    knee.position.y = -.22; leg.add(knee);
    box(.09, .21, .1, infectedDog ? 0x303632 : 0x998b74, 0, -.105, 0, knee);
    box(.14, .07, .2, infectedDog ? 0x191e1b : 0x403e37, 0, -.22, -.04, knee);
    legs.push(leg); knees.push(knee);
  }
  rig.scale.set(.95, 1.12, 1.2);
  return { group, monsterType: 'hound', quadrupedLegs: legs, quadrupedKnees: knees,
    legL: legs[2], legR: legs[3], armL: legs[0], armR: legs[1],
    kneeL: knees[2], kneeR: knees[3], elbowL: knees[0], elbowR: knees[1],
    health: 60, maxHealth: 60, attackDamage: 6, attackInterval: .9, phase: random() * 6 };
}

// Preserve the original articulated rig, but lengthen legs/torso and reduce
// the head-to-body ratio. Remap joint offsets and mesh extents together.
const bodyHeight = y => y <= 1.6 ? y * 1.4 : y <= 2.85 ? 2.24 + (y - 1.6) * 1.22 : 3.765 + (y - 2.85) * .78;
function elongateRig(rig) {
  function visit(node, parentY = 0) {
    const y = parentY + node.position.y;
    node.position.y = bodyHeight(y) - bodyHeight(parentY);
    if (node.isMesh) {
      if (node.geometry === cube) {
        const bottom = bodyHeight(y - node.scale.y / 2), top = bodyHeight(y + node.scale.y / 2);
        node.scale.y = top - bottom; node.position.y = (top + bottom) / 2 - bodyHeight(parentY);
      } else node.scale.y *= .9;
      if (y > 2.85) { node.scale.x *= .78; node.scale.z *= .78; node.position.z *= .78; }
      else { node.scale.x *= .93; node.scale.z *= .92; }
    }
    for (const child of node.children) visit(child, y);
  }
  for (const child of rig.children) visit(child);
}
// Articulated joint hierarchy adapted from Blocky Street.html.
export function makePerson(player = false, variant = null, elongated = true) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  // The original faces +Z; game movement headings face -Z.
  rig.rotation.y = Math.PI;
  rig.scale.setScalar(.5);
  group.add(rig);
  const skin = pick([0xe3b48f, 0x8a5a3c, 0xc98e62, 0xf0c8a4, 0x6b4328]);
  const top = player ? 0x666e55 : pick([0xe0443a, 0xe8672a, 0x3a5fc0, 0x2f8f5b, 0xf0c040, 0xe8e8f0]);
  const bottom = pick([0x2a3350, 0x9a9eaa, 0x1e1e26, 0x4a5a78]);
  const hair = pick([0xa4572a, 0x2a1a12, 0xd8b070, 0x5a3a22]);
  box(1.1, 1.2, .6, top, 0, 2.2, 0, rig);
  box(.9, .9, .9, skin, 0, 3.25, 0, rig);
  box(.96, .3, .96, hair, 0, 3.78, -.02, rig);
  box(.94, .5, .2, hair, 0, 3.4, -.42, rig);
  const limb = (parent, x, y, width, length, color) => {
    const joint = new THREE.Group();
    joint.position.set(x, y, 0);
    parent.add(joint);
    box(width, length, .4, color, 0, -length / 2, 0, joint);
    return joint;
  };
  const legL = limb(rig, -.28, 1.6, .45, .8, bottom);
  const legR = limb(rig, .28, 1.6, .45, .8, bottom);
  const kneeL = limb(legL, 0, -.8, .42, .8, bottom);
  const kneeR = limb(legR, 0, -.8, .42, .8, bottom);
  box(.5, .2, .7, 0xeeeeee, 0, -.75, .1, kneeL);
  box(.5, .2, .7, 0xeeeeee, 0, -.75, .1, kneeR);
  const armL = limb(rig, .72, 2.65, .3, .6, top);
  const armR = limb(rig, -.72, 2.65, .3, .6, top);
  const elbowL = limb(armL, 0, -.6, .28, .6, skin);
  const elbowR = limb(armR, 0, -.6, .28, .6, skin);
  elbowL.rotation.x = elbowR.rotation.x = -.3;
  const monsterType = player ? null : variant || pick(['nurse', 'nurse', 'lying-figure', 'pyramid-head']);
  if (monsterType) {
    // Keep the original joint rig and collision size beneath the creature costume.
    rig.traverse(node => {
      if (node.isMesh) node.material = material(0xa4a08a);
    });
    rig.children.slice(1, 4).forEach(headPart => { headPart.visible = false; });
    if (worldTheme === 'zombies') {
      const brute = monsterType === 'pyramid-head', spitter = monsterType === 'nurse';
      if (brute) rig.scale.setScalar(.68);
      const flesh = brute ? 0x957057 : spitter ? 0x9aa876 : 0x7f9274;
      rig.traverse(node => { if (node.isMesh) node.material = material(flesh); });
      rig.children[0].material = material(brute ? 0x71503d : spitter ? 0x727b52 : 0x53656b);
      box(brute ? .65 : .8, brute ? .7 : .9, .75, flesh, 0, 3.25, 0, rig);
      box(.62, .18, .08, 0x512e29, 0, 3.04, .41, rig);
      for (const x of [-.2, .2]) box(.12, .09, .04, 0xe2cb79, x, 3.44, .41, rig);
      box(.3, .5, .05, 0x7e3930, -.25, 2.3, .33, rig);
      box(.17, .3, .05, 0x6f3931, .28, 2, .33, rig);
      if (brute) {
        group.userData.appearance = 'brown-tank';
        box(1.9, 1.4, 1.05, 0x886047, 0, 2.35, -.06, rig);
        box(1.7, .45, .85, 0xa17b60, 0, 2.95, 0, rig);
        for (const [arm, elbow, side] of [[armL, elbowL, 1], [armR, elbowR, -1]]) {
          arm.position.x = side * .92;
          box(.68, .85, .7, 0x9a7053, 0, -.3, 0, arm);
          box(.72, .75, .72, 0x80563f, 0, -.3, 0, elbow);
          box(.75, .35, .8, 0xa17a59, 0, -.65, .12, elbow);
        }
        for (const leg of [legL, legR]) leg.traverse(n => { if (n.isMesh) n.material = material(0x4c4036); });
        box(.6, .28, .07, 0x673d30, -.35, 2.65, .51, rig);
      }
      if (spitter) for (const x of [-.36, .36]) box(.3, .35, .18, 0x9db750, x, 2.6, .38, rig);
    } else if (monsterType === 'pyramid-head') {
      rig.scale.setScalar(.68);
      const helmet = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.85, 4), new THREE.MeshLambertMaterial({ color: 0x734636, flatShading: true }));
      helmet.rotation.x = Math.PI / 2; helmet.rotation.z = Math.PI / 4;
      helmet.position.set(0, 3.45, .3); helmet.castShadow = true; rig.add(helmet);
      box(1.35, 1.3, .83, 0x8a8170, 0, 1.75, .03, rig);
      box(.65, 1.25, .08, 0x584333, .1, 1.8, .5, rig);
      box(.16, 2.35, .78, 0x66645b, 0, -1.6, .25, elbowR);
      box(.2, .55, .2, 0x393c32, 0, -.35, .25, elbowR);
    } else if (monsterType === 'nurse') {
      box(1.3, .65, .86, 0xb2ad96, 0, 1.58, 0, rig);
      box(.94, .92, .94, 0x9a9584, 0, 3.25, 0, rig);
      for (let y = 2.95; y < 3.7; y += .22) box(.97, .065, .97, 0xbbb6a0, 0, y, 0, rig);
      box(1.07, .24, .8, 0xc4bfaa, 0, 3.84, -.1, rig);
      box(.1, .24, .025, 0x78443b, 0, 3.84, .31, rig);
      box(.25, .075, .025, 0x78443b, 0, 3.84, .32, rig);
      box(.35, .55, .04, 0x786453, -.25, 2.1, .325, rig);
      box(.13, 1.3, .13, 0x6c6251, 0, -1.0, .15, elbowR);
    } else {
      box(1.2, 1.35, .78, 0x96917b, 0, 2.3, .04, rig);
      box(.78, .85, .7, 0xa6a18b, 0, 3.32, .08, rig);
      for (let y = 1.85; y < 3.6; y += .28) box(1.22, .06, .8, 0x6e6b5b, 0, y, .04, rig);
      armL.position.x = .38; armR.position.x = -.38;
    }
  }
  const rightHand = new THREE.Object3D(); rightHand.position.y = -.6; elbowR.add(rightHand);
  const leftHand = new THREE.Object3D(); leftHand.position.y = -.6; elbowL.add(leftHand);
  if (elongated) elongateRig(rig);
  return { group, rightHand, leftHand, height: bodyHeight(3.96) * rig.scale.y, mouthHeight: bodyHeight(3.25) * rig.scale.y, legL, legR, kneeL, kneeR, armL, armR, elbowL, elbowR, monsterType, visualTheme: worldTheme, radius: monsterType === 'pyramid-head' ? .8 : .5, phase: random() * 6 };
}

export function animatePerson(person, dt, speed) {
  if (person.monsterType === 'hound') {
    person.phase += dt * speed * 5;
    const rig = person.group.children[0], running = speed > .05;
    for (let i = 0; i < 4; i++) {
      const phase = person.phase + (i === 0 || i === 3 ? 0 : Math.PI);
      person.quadrupedLegs[i].rotation.x = running ? Math.sin(phase) * .8 : 0;
      person.quadrupedKnees[i].rotation.x = running ? Math.max(0, Math.cos(phase)) * .7 : .12;
    }
    rig.position.y = running ? Math.abs(Math.sin(person.phase)) * .06 : 0;
    rig.rotation.x = running ? Math.sin(person.phase) * .035 : 0;
    return;
  }
  if (!person.monsterType) for (const joint of [person.armL, person.armR, person.elbowL, person.elbowR]) { joint.rotation.y = 0; joint.rotation.z = 0; }
  // Original walkers moved at speed * 2.2 world units per second.
  person.phase += dt * (speed / 2.2) * 5;
  const sw = Math.sin(person.phase), cw = Math.cos(person.phase);
  const moving = speed > 0 ? 1 : 0;
  person.legL.rotation.x = sw * .6 * moving;
  person.legR.rotation.x = -sw * .6 * moving;
  person.kneeL.rotation.x = Math.max(0, -cw) * .9 * moving;
  person.kneeR.rotation.x = Math.max(0, cw) * .9 * moving;
  person.armL.rotation.x = -sw * .5 * moving;
  person.armR.rotation.x = sw * .5 * moving;
  person.elbowL.rotation.x = -.3 - .4 * Math.max(0, sw) * moving;
  person.elbowR.rotation.x = -.3 - .4 * Math.max(0, -sw) * moving;
  if (person.monsterType) {
    const rig = person.group.children[0];
    rig.rotation.z = Math.sin(person.phase * .6) * .07;
    if (person.visualTheme === 'zombies') {
      person.armL.rotation.x = -.95 + sw * .12; person.armR.rotation.x = -1.1 - sw * .12;
      person.elbowL.rotation.x = person.elbowR.rotation.x = -.25;
      rig.rotation.x = .18; return;
    }
    rig.rotation.x = person.monsterType === 'nurse' ? .15 : .07;
    person.armR.rotation.x *= .2;
    person.elbowR.rotation.x = -.12;
    if (person.monsterType === 'lying-figure') {
      person.armL.rotation.x = person.armR.rotation.x = -.15;
      person.elbowL.rotation.x = person.elbowR.rotation.x = -1.1;
    }
  }
}

function makeSign(text, x, y, z, rotation, width, bg = '#55584c', fg = '#c4c0a9') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 56px sans-serif';
  ctx.fillText(text, 256, 69, 455);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshLambertMaterial({ map: texture }));
  mesh.position.set(x, y, z); mesh.rotation.y = rotation;
  return mesh;
}

export function createCity(scene) {
  seed = 7;
  const staticBoxes = [], colliders = [], mapBuildings = [], streetLights = [], buildings = [], props = [], landmarks = [];
  let activeBuilding = null, activeProp = null;
  const beginProp = (type, x, z, health) => { activeProp = { type, x, z, health, destructible: true, destroyed: false, instances: [], visuals: [] }; props.push(activeProp); };
  const endProp = () => { activeProp = null; };
  const stat = (w, h, d, color, x, y, z, rotation = 0) => {
    const faded = new THREE.Color(color);
    const luminance = faded.r * .3 + faded.g * .5 + faded.b * .2;
    faded.lerp(new THREE.Color(luminance, luminance * .98, luminance * .88), .65).multiplyScalar(.7);
    if (activeProp) activeProp.instances.push(staticBoxes.length);
    (activeBuilding ? activeBuilding.boxes : staticBoxes).push({ w, h, d, color: faded.getHex(), x, y, z, rotation });
  };
  const obstacle = (x, z, w, d) => colliders.push({ x, z, w, d, walkThrough: w <= .4 && d <= .4, ...(activeProp ? { target: activeProp } : {}) });

  stat(245, 1.5, 245, 0xc6c4aa, 0, -.85, 0);
  stat(242, .18, 242, palette.grass, 0, -.08, 0);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshLambertMaterial({ color: 0x424e4b }));
  water.rotation.x = -Math.PI / 2; water.position.y = -1.25; water.receiveShadow = true; scene.add(water);
  for (let i = 0; i < 85; i++) {
    const x = 125 + random() * 170, z = random() * 420 - 210;
    stat(2 + random() * 7, .04, .16, 0xb1d5ca, x, -1.2, z);
  }
  for (const road of ROAD_CENTERS) {
    stat(14, .16, 242, palette.road, road, .02, 0);
    stat(242, .16, 14, palette.road, 0, .025, road);
    for (const side of [-1, 1]) {
      stat(3.9, .36, 242, palette.sidewalk, road + side * 9, .12, 0);
      stat(242, .36, 3.9, palette.sidewalk, 0, .12, road + side * 9);
      stat(.26, .39, 242, palette.curb, road + side * 7.15, .13, 0);
      stat(242, .39, .26, palette.curb, 0, .13, road + side * 7.15);
    }
  }
  // Put intersections over the sidewalks, then add zebra crossings.
  for (const x of ROAD_CENTERS) for (const z of ROAD_CENTERS) {
    stat(22, .46, 14, palette.road, x, .1, z);
    stat(14, .46, 22, palette.road, x, .1, z);
    for (const side of [-1, 1]) for (let k = -5; k <= 5; k += 2) {
      stat(1, .04, 2.5, 0xe9e5cf, x + k, .35, z + side * 9);
      stat(2.5, .04, 1, 0xe9e5cf, x + side * 9, .35, z + k);
    }
  }
  for (const r of ROAD_CENTERS) for (let i = -117; i < 120; i += 6) {
    if (ROAD_CENTERS.some(v => Math.abs(v - i) < 13)) continue;
    stat(.16, .025, 2.5, 0xf0ce7f, r - .23, .13, i);
    stat(.16, .025, 2.5, 0xf0ce7f, r + .23, .13, i);
    stat(2.5, .025, .16, 0xf0ce7f, i, .14, r - .23);
    stat(2.5, .025, .16, 0xf0ce7f, i, .14, r + .23);
  }

  function tree(x, z, scale = 1) {
    beginProp('tree', x, z, 75);
    stat(.48 * scale, 2.7 * scale, .48 * scale, 0x967757, x, 1.35 * scale + .3, z);
    stat(2.9 * scale, 2.2 * scale, 2.65 * scale, pick([0x6e9865, 0x81a46b, 0x93ac70]), x, 3.6 * scale, z);
    stat(2.1 * scale, 1.4 * scale, 2.1 * scale, 0x8ead78, x + .3 * scale, 4.85 * scale, z - .2 * scale);
    obstacle(x, z, .5, .5); endProp();
  }
  function bench(x, z, rot = 0) {
    beginProp('bench', x, z, 45);
    obstacle(x, z, Math.abs(Math.cos(rot)) * 2.6 + Math.abs(Math.sin(rot)) * .9, Math.abs(Math.sin(rot)) * 2.6 + Math.abs(Math.cos(rot)) * .9);
    const parts = [[2.6, .18, .7, 0xb48962, 0, .8, 0], [2.6, .6, .12, 0xb48962, 0, 1.25, .4], [.14, .8, .6, 0x526460, -1, .4, 0], [.14, .8, .6, 0x526460, 1, .4, 0]];
    for (const [w, h, d, c, xx, y, zz] of parts) stat(w, h, d, c, x + xx * Math.cos(rot) + zz * Math.sin(rot), y + .3, z - xx * Math.sin(rot) + zz * Math.cos(rot), rot);
    endProp();
  }
  const buildingColors = [0xdb9b81, 0xe5cba2, 0xacc3b5, 0xe8d8ba, 0xd6ae91, 0xa4bac1, 0xc79884, 0xd7c49b];
  function building(x, z, w, d, h, color, name) {
    activeBuilding = { x, z, w, d, h, boxes: [], visuals: [], opacity: 1 };
    buildings.push(activeBuilding);
    stat(w, h, d, color, x, h / 2 + .3, z); obstacle(x, z, w + .3, d + .3); colliders[colliders.length - 1].height = h + 1.8;
    mapBuildings.push({ x, z, w, d, color: '#' + color.toString(16) });
    stat(w + .4, .35, d + .4, 0xeee3c9, x, h + .45, z);
    stat(w - .8, .2, d - .8, 0x9aaba2, x, h + .67, z);
    stat(2.3, 1.1, 2, 0xc8c9b7, x + 1.5, h + 1.2, z);
    stat(2.4, .12, 2.1, 0xadb9b1, x + 1.5, h + 1.8, z);
    const floors = Math.floor((h - 3) / 3);
    for (const sign of [-1, 1]) {
      for (let floor = 0; floor < floors; floor++) {
        for (let xx = -w / 2 + 1.7; xx < w / 2 - 1; xx += 2.8) {
          stat(1.25, 1.6, .08, palette.window, x + xx, 4.3 + floor * 3, z + sign * (d / 2 + .05));
          stat(1.5, .13, .35, 0xeae1ca, x + xx, 3.45 + floor * 3, z + sign * (d / 2 + .16));
        }
        for (let zz = -d / 2 + 1.7; zz < d / 2 - 1; zz += 2.8) {
          stat(.08, 1.6, 1.25, palette.window, x + sign * (w / 2 + .05), 4.3 + floor * 3, z + zz);
          stat(.35, .13, 1.5, 0xeae1ca, x + sign * (w / 2 + .16), 3.45 + floor * 3, z + zz);
        }
      }
      stat(w - 1.4, 1.8, .1, 0x46696a, x, 1.4, z + sign * (d / 2 + .05));
      stat(.13, 1.8, .15, color, x, 1.4, z + sign * (d / 2 + .1));
      stat(w + .3, .22, 1.2, pick([0xd08261, 0x719b8e, 0xe7bc69]), x, 2.55, z + sign * (d / 2 + .5));
      // Light door frame, inset panels and hardware stay legible against dark shopfronts.
      const doorway = mergedModel([
        [1.3, 2.25, .13, 0x9caa9c, 0, 1.43, 0],
        [.12, 2.45, .22, 0xe3d7af, -.76, 1.48, .06], [.12, 2.45, .22, 0xe3d7af, .76, 1.48, .06],
        [1.64, .15, .22, 0xe3d7af, 0, 2.7, .06],
        [.1, 2.2, .19, 0xe3d7af, 0, 1.43, .09],
        [.07, .32, .09, 0xffd78b, -.17, 1.38, .18], [.07, .32, .09, 0xffd78b, .17, 1.38, .18],
        [1.7, .06, .65, 0xb3a780, 0, .35, .2],
      ]);
      doorway.material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x817757, emissiveIntensity: .4 });
      doorway.position.set(x, 0, z + sign * (d / 2 + .17)); doorway.rotation.y = sign < 0 ? Math.PI : 0;
      doorway.userData.doorway = true; doorway.castShadow = false;
      scene.add(doorway); activeBuilding.visuals.push(doorway);

    }
    if (name) {
      const sign = makeSign(name, x, 3.1, z + d / 2 + .1, 0, Math.min(w - 1, 7.5));
      scene.add(sign); activeBuilding.visuals.push(sign);
    }
    activeBuilding = null;
  }

  function landmark(kind, x, z) {
    const specs = { church: [18, 26, 11, 0xaaa38c, 'ST. MARY CHURCH'], school: [30, 20, 7, 0xa88c67, 'CITY SCHOOL'], hospital: [28, 24, 12, 0xaab3ab, 'GENERAL HOSPITAL'] };
    building(x, z, ...specs[kind]);
    const record = buildings[buildings.length - 1]; record.kind = kind; record.name = specs[kind][4];
    Object.assign(mapBuildings[mapBuildings.length - 1], { kind, name: kind.toUpperCase() });
    landmarks.push(record); activeBuilding = record;
    if (kind === 'church') {
      for (let step = 0; step < 7; step++) stat(20 - step * 2.5, .65, 28, 0x55544e, x, 11.9 + step * .6, z);
      stat(4.5, 10, 4.5, 0xb3aa91, x, 16, z - 7);
      stat(5.3, .4, 5.3, 0xd1c7a5, x, 21.2, z - 7);
      for (let step = 0; step < 5; step++) stat(5 - step * .9, .6, 5 - step * .9, 0x514d42, x, 21.7 + step * .6, z - 7);
      stat(.3, 2.5, .3, 0xe3d5ad, x, 25.4, z - 7); stat(1.5, .3, .3, 0xe3d5ad, x, 25.8, z - 7);
      record.h = 27;
    } else if (kind === 'school') {
      stat(32, .5, 22, 0x625b4f, x, 7.9, z);
      stat(9, .45, 3, 0xb5a76e, x, 3, z + 10.8);
      stat(30, .06, 7, 0x878b79, x, .36, z + 15);
      stat(.15, 7, .15, 0xd4d4b7, x + 12, 3.8, z + 15); obstacle(x + 12, z + 15, .2, .2);
      stat(2.4, 1.3, .06, 0x7e4c42, x + 13.2, 6.25, z + 15);
      record.h = 8.5;
    } else {
      stat(30, .45, 26, 0xd0d4bd, x, 12.9, z);
      stat(3.6, .7, .15, 0xb8493d, x, 8, z + 12.2); stat(.7, 3.6, .15, 0xb8493d, x, 8, z + 12.2);
      stat(13, .08, 13, 0x566258, x, 13.2, z);
      for (const side of [-1, 1]) stat(.6, .05, 5, 0xeee8ce, x + side * 1.7, 13.27, z);
      stat(3.4, .05, .6, 0xeee8ce, x, 13.27, z);
      stat(7, .35, 3, 0xb84b3c, x, 3, z + 12.8);
      record.h = 14;
    }
    const footprint = colliders.find(c => c.x === x && c.z === z && c.w > 10); if (footprint) footprint.height = record.h;
    activeBuilding = null;
  }
  const names = ['BROOKHAVEN', 'CLOSED', 'CAFE 5to2', 'RECORDS', 'LAUNDRY', 'AUTO REPAIR', 'MARKET', 'POST OFFICE', 'CLINIC', 'PHARMACY', 'JACKS INN', 'NEELY’S BAR'];
  let nameIndex = 0;
  for (const cx of [-60, 0, 60]) for (const cz of [-60, 0, 60]) {
    if (cx === 0 && cz === 0) continue;
    const special = cx === -60 && cz === -60 ? 'church' : cx === 60 && cz === -60 ? 'school' : cx === -60 && cz === 60 ? 'hospital' : null;
    if (special) { landmark(special, cx, cz); continue; }
    for (const dx of [-11, 11]) for (const dz of [-11, 11]) {
      const w = 12 + random() * 4, d = 12 + random() * 4;
      const h = (cz === -60 ? 12 : 7) + Math.floor(random() * 4) * 3;
      building(cx + dx, cz + dz, w, d, h, pick(buildingColors), names[nameIndex++ % names.length]);
    }
    stat(3, .1, 38, 0xd5cfb9, cx, .03, cz);
    for (const dz of [-17, 0, 17]) tree(cx, cz + dz, .8);
  }
  // Small shops around the outer edges frame the island.
  for (let i = -60; i <= 60; i += 30) {
    building(-108, i, 10, 18, 6 + random() * 8, pick(buildingColors), worldTheme === 'zombies' ? 'QUARANTINE' : 'SILENT HILL');
    building(i, -108, 18, 10, 8 + random() * 7, pick(buildingColors), names[nameIndex++ % names.length]);
    building(i, 108, 18, 10, 6 + random() * 7, pick(buildingColors), names[nameIndex++ % names.length]);
  }

  // Paloma Park, a low garden wall, fountain and stepped water.
  stat(37, .35, 37, 0xa5b97e, 0, .14, 0);
  stat(5, .06, 40, 0xe3d4ad, 0, .36, 0); stat(40, .06, 5, 0xe3d4ad, 0, .36, 0);
  const parkClock = createParkClock(scene); parkClock.update(197);
  obstacle(0, 0, 5, 5); colliders[colliders.length - 1].height = 14.5;
  for (const x of [-13, 13]) for (const z of [-13, 13]) { tree(x, z, 1.3); beginProp('planter', x, z, 65); stat(5, .4, 5, 0x829b66, x, .4, z); obstacle(x, z, 5, 5); endProp(); }
  for (const z of [-9, 9]) { bench(-7, z); bench(7, z, Math.PI); }
  beginProp('sign', 0, 19.5, 45);
  const parkSign = makeSign('ROSEWATER PARK', 0, 2.5, 19.5, 0, 6); scene.add(parkSign); activeProp.visuals.push(parkSign);
  obstacle(-2.5, 19.5, .18, .18); obstacle(2.5, 19.5, .18, .18);
  stat(.18, 2.4, .18, 0x6d7968, -2.5, 1.4, 19.5); stat(.18, 2.4, .18, 0x6d7968, 2.5, 1.4, 19.5); endProp();

  // Tree-lined boulevards and lamps; small curbside clutter is removed.
  for (const r of ROAD_CENTERS) for (let q = -108; q <= 108; q += 18) {
    if (ROAD_CENTERS.some(v => Math.abs(v - q) < 14)) continue;
    for (const s of [-1, 1]) {
      tree(r + s * 9.2, q, .8 + random() * .3);
      tree(q, r + s * 9.2, .85);
    }
    beginProp('lamp', r - 8.4, q + 5, 55);
    stat(.2, 5.1, .2, 0x6c7b71, r - 8.4, 2.85, q + 5);
    obstacle(r - 8.4, q + 5, .2, .2);
    stat(1.5, .16, .2, 0x6c7b71, r - 7.8, 5.35, q + 5);
    stat(.9, .14, .46, 0xf1e5ba, r - 7.5, 5.22, q + 5);
    const light = { x: r - 7.5, z: q + 5 }; streetLights.push(light); activeProp.light = light; endProp();

  }
  // The east waterfront: promenade, rails, piers, and a little sailboat.
  stat(13, .4, 240, 0xdcc8a3, 113, .12, 0);
  stat(.18, .18, 235, 0xf2e1bd, 120, 1.55, 0);
  for (let z = -117; z <= 117; z += 6) { stat(.15, 1.3, .15, 0xf2e1bd, 120, .95, z); if (z % 18 === 9) bench(115, z, Math.PI / 2); }
  for (const z of [-60, 60]) {
    stat(22, .4, 7, 0xb3936c, 129, .03, z);
    for (let x = 121; x < 140; x += 1.6) stat(.08, .04, 6.8, 0xd0b18a, x, .25, z);
  }
  stat(3.8, .8, 8.5, 0xf2e7c9, 145, -.35, 64);
  stat(.18, 9, .18, 0xb3a88e, 145, 4, 64);
  stat(.1, 5.5, 4.5, 0xf0d2a5, 145, 5.2, 65.5);

  function batchBoxes(boxes) {
    const mesh = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial(), boxes.length);
    const dummy = new THREE.Object3D(), color = new THREE.Color();
    boxes.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.rotation.set(0, b.rotation, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, color.set(b.color)); });
    mesh.castShadow = mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere(); scene.add(mesh);
    return mesh;
  }
  const mesh = batchBoxes(staticBoxes);
  for (const building of buildings) {
    const lower = [], upper = [], cut = building.h / 2 + .3;
    for (const b of building.boxes) {
      const bottom = b.y - b.h / 2, top = b.y + b.h / 2;
      if (bottom < cut) { const h = Math.min(top, cut) - bottom; lower.push({ ...b, h, y: bottom + h / 2 }); }
      if (top > cut) { const h = top - Math.max(bottom, cut); upper.push({ ...b, h, y: top - h / 2 }); }
    }
    for (const visual of building.visuals) visual.userData.upperBuilding = visual.position.y >= cut;
    const lowerMesh = batchBoxes(lower), upperMesh = batchBoxes(upper);
    upperMesh.userData.upperBuilding = true;
    building.visuals.push(lowerMesh, upperMesh);
    delete building.boxes;
  }

  const cars = [];
  const colors = [0x7c5b41, 0x5b6b62, 0x88816a, 0x704d47, 0x9a9787, 0x4f5b5f, 0x69606d];
  const carNames = ['Sunset GT', 'Paloma Classic', 'Honeybee', 'Redwood Coupe', 'Cloud Nine', 'Ocean Runner', 'Lilac Cruiser'];
  const addCar = (x, z, heading, colorIndex, traffic = null) => {
    const group = makeCar(colors[colorIndex]); group.position.set(x, .15, z); group.rotation.y = heading; scene.add(group);
    const c = { group, x, z, heading, speed: 0, name: carNames[colorIndex], traffic, occupied: false, hitCooldown: 0 };
    cars.push(c); return c;
  };
  addCar(34.2, 44, 0, 0);
  addCar(-26, -12, Math.PI, 4); addCar(4, 34, Math.PI / 2, 1); addCar(86, -53, 0, 2);
  addCar(-68, -86, -Math.PI / 2, 3); addCar(-86, 55, Math.PI, 5); addCar(58, 86, Math.PI / 2, 6);
  // Seeded abandoned vehicles, with irregular spacing and slightly crooked parking.
  for (let i = 0, attempts = 0; i < 18 && attempts < 500; attempts++) {
    const horizontal = random() > .5;
    const road = pick(ROAD_CENTERS), along = -105 + random() * 210;
    const lane = (random() > .5 ? 1 : -1) * (2.8 + random() * 1.5);
    const candidate = { x: horizontal ? along : road + lane, z: horizontal ? road + lane : along,
      heading: (horizontal ? Math.PI / 2 : 0) + (random() - .5) * .4, radius: 1.25, length: 4.9 };
    if (bodyBlocked(candidate, colliders) || cars.some(car => Math.hypot(car.x - candidate.x, car.z - candidate.z) < 8)) continue;
    addCar(candidate.x, candidate.z, candidate.heading, i % colors.length);
    i++;
  }
  const pedestrians = [];
  for (let i = 0; i < 36; i++) {
    const person = i % 5 === 0 ? makeQuadruped() : makePerson();
    const road = pick(ROAD_CENTERS), direction = i % 2 ? 1 : -1;
    const horizontal = i % 3 === 0;
    const offset = road + direction * 10.3;
    const progress = -110 + random() * 220;
    person.group.position.set(horizontal ? progress : offset, .32, horizontal ? offset : progress);
    person.group.rotation.y = horizontal ? -direction * Math.PI / 2 : direction > 0 ? Math.PI : 0;
    scene.add(person.group); pedestrians.push({ ...person, horizontal, direction, speed: person.monsterType === 'hound' ? 4.6 + random() * .7 : person.monsterType === 'pyramid-head' ? 1.35 : 2.6 + random() * .7, attackCooldown: 0 });
  }

  const pickups = [];
  const itemObstacles = [...colliders, ...cars.flatMap(car => bodyDiscs({ ...car, radius: 1.25, length: 4.9 }))];
  for (let i = 0; i < 25; i++) {
    const point = randomPickupPosition(itemObstacles, pickups, { x: 38.4, z: 44 });
    if (!point) break;
    pickups.push(makeSupplyPickup(scene, PICKUP_TYPES[i % PICKUP_TYPES.length], point));
  }
  return { parkClock, landmarks, colliders, props, mapBuildings, buildings, streetLights, cars, pedestrians, pickups, water, staticMesh: mesh };
}

export function makeLightRing(color = 0xc6e996) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(.85, 1.1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

export function makeBoss() {
  const boss = makePerson(false, 'lying-figure', false);
  boss.group.children[0].scale.setScalar(1.2);
  // A towering, caged silhouette with a red core and oversized hooked arms.
  const rig = boss.group.children[0];
  box(1.6, 1.7, 1, 0x51423d, 0, 2.1, 0, rig);
  box(.65, .7, .12, 0xcf4c32, 0, 2.3, .57, rig);
  if (worldTheme !== 'zombies') for (const x of [-.65, -.32, 0, .32, .65]) box(.08, 2.3, .09, 0x948575, x, 2.7, .68, rig);
  for (const arm of [boss.elbowL, boss.elbowR]) box(.4, 1.5, .5, 0x78675b, 0, -.9, .1, arm);
  if (worldTheme === 'zombies') {
    box(1.8, 1.8, 1.3, 0x73804b, 0, 2.1, 0, rig);
    for (const x of [-.65, .65]) box(.65, .7, .6, 0x9aaf58, x, 2.7, .35, rig);
  }
  elongateRig(rig);
  boss.height = bodyHeight(3.96) * 1.2; boss.mouthHeight = bodyHeight(3.25) * 1.2;
  Object.assign(boss, { isBoss: true, summonBats: true, permanent: true, health: 1800, maxHealth: 1800, radius: 1.25, speed: 1.6, attackDamage: 24, attackInterval: 2, attackCooldown: 2 });
  return boss;
}

export function makeSupplyPickup(scene, type, point) {
  const group = new THREE.Group();
  group.add(createPickupModel(type));
    group.position.set(point.x, 1.1, point.z); scene.add(group);
    const lightRing = makeLightRing(PICKUP_COLORS[type]);
    lightRing.position.set(point.x, .42, point.z); scene.add(lightRing);
  return { group, lightRing, type, ...point, collected: false, respawnRemaining: 0 };
}
