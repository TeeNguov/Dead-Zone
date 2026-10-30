import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROAD_CENTERS } from './physics.js';

const palette = { road: 0x383d3b, sidewalk: 0x777970, curb: 0x9c9c88, grass: 0x535b46, foliage: 0x4b5141, dark: 0x202827, window: 0x26312f };
let seed = 7;
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

// Model dimensions, palettes and joint hierarchy copied from Blocky Street.html.
export function makePerson(player = false, variant = null) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  // The original faces +Z; game movement headings face -Z.
  rig.rotation.y = Math.PI;
  rig.scale.setScalar(.45);
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
  const armL = limb(rig, -.72, 2.65, .3, .6, top);
  const armR = limb(rig, .72, 2.65, .3, .6, top);
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
    if (monsterType === 'pyramid-head') {
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
      armL.position.x = -.38; armR.position.x = .38;
    }
  }
  return { group, legL, legR, kneeL, kneeR, armL, armR, elbowL, elbowR, monsterType, phase: random() * 6 };
}

export function animatePerson(person, dt, speed) {
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
  const staticBoxes = [], colliders = [], mapBuildings = [], streetLights = [];
  const stat = (w, h, d, color, x, y, z, rotation = 0) => {
    const faded = new THREE.Color(color);
    const luminance = faded.r * .3 + faded.g * .5 + faded.b * .2;
    faded.lerp(new THREE.Color(luminance, luminance * .98, luminance * .88), .65).multiplyScalar(.7);
    staticBoxes.push({ w, h, d, color: faded.getHex(), x, y, z, rotation });
  };
  const obstacle = (x, z, w, d) => colliders.push({ x, z, w, d });

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
    stat(.48 * scale, 2.7 * scale, .48 * scale, 0x967757, x, 1.35 * scale + .3, z);
    stat(2.9 * scale, 2.2 * scale, 2.65 * scale, pick([0x6e9865, 0x81a46b, 0x93ac70]), x, 3.6 * scale, z);
    stat(2.1 * scale, 1.4 * scale, 2.1 * scale, 0x8ead78, x + .3 * scale, 4.85 * scale, z - .2 * scale);
    obstacle(x, z, .5, .5);
  }
  function bench(x, z, rot = 0) {
    obstacle(x, z, Math.abs(Math.cos(rot)) * 2.6 + Math.abs(Math.sin(rot)) * .9, Math.abs(Math.sin(rot)) * 2.6 + Math.abs(Math.cos(rot)) * .9);
    const parts = [[2.6, .18, .7, 0xb48962, 0, .8, 0], [2.6, .6, .12, 0xb48962, 0, 1.25, .4], [.14, .8, .6, 0x526460, -1, .4, 0], [.14, .8, .6, 0x526460, 1, .4, 0]];
    for (const [w, h, d, c, xx, y, zz] of parts) stat(w, h, d, c, x + xx * Math.cos(rot) + zz * Math.sin(rot), y + .3, z - xx * Math.sin(rot) + zz * Math.cos(rot), rot);
  }
  const buildingColors = [0xdb9b81, 0xe5cba2, 0xacc3b5, 0xe8d8ba, 0xd6ae91, 0xa4bac1, 0xc79884, 0xd7c49b];
  function building(x, z, w, d, h, color, name) {
    stat(w, h, d, color, x, h / 2 + .3, z); obstacle(x, z, w + .3, d + .3);
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
    }
    if (name) scene.add(makeSign(name, x, 3.1, z + d / 2 + .1, 0, Math.min(w - 1, 7.5)));
  }

  const names = ['BROOKHAVEN', 'CLOSED', 'CAFE 5to2', 'RECORDS', 'LAUNDRY', 'AUTO REPAIR', 'MARKET', 'POST OFFICE', 'HOSPITAL', 'PHARMACY', 'JACKS INN', 'NEELY’S BAR'];
  let nameIndex = 0;
  for (const cx of [-60, 0, 60]) for (const cz of [-60, 0, 60]) {
    if (cx === 0 && cz === 0) continue;
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
    building(-108, i, 10, 18, 6 + random() * 8, pick(buildingColors), 'SILENT HILL');
    building(i, -108, 18, 10, 8 + random() * 7, pick(buildingColors), names[nameIndex++ % names.length]);
    building(i, 108, 18, 10, 6 + random() * 7, pick(buildingColors), names[nameIndex++ % names.length]);
  }

  // Paloma Park, a low garden wall, fountain and stepped water.
  stat(37, .35, 37, 0xa5b97e, 0, .14, 0);
  stat(5, .06, 40, 0xe3d4ad, 0, .36, 0); stat(40, .06, 5, 0xe3d4ad, 0, .36, 0);
  stat(9, .7, 9, 0xe1d9bc, 0, .65, 0); obstacle(0, 0, 9, 9);
  stat(7.8, .05, 7.8, 0x7cb7b8, 0, 1.03, 0);
  stat(1.6, 1.7, 1.6, 0xd3d3ba, 0, 1.7, 0); stat(4, .4, 4, 0xe2ddc7, 0, 2.6, 0);
  stat(3.5, .08, 3.5, 0x95c9ca, 0, 2.83, 0); stat(.8, 1.5, .8, 0xb7c7b5, 0, 3.4, 0);
  for (const x of [-13, 13]) for (const z of [-13, 13]) { tree(x, z, 1.3); stat(5, .4, 5, 0x829b66, x, .4, z); obstacle(x, z, 5, 5); }
  for (const z of [-9, 9]) { bench(-7, z); bench(7, z, Math.PI); }
  scene.add(makeSign('ROSEWATER PARK', 0, 2.5, 19.5, 0, 6));
  obstacle(-2.5, 19.5, .18, .18); obstacle(2.5, 19.5, .18, .18);
  stat(.18, 2.4, .18, 0x6d7968, -2.5, 1.4, 19.5); stat(.18, 2.4, .18, 0x6d7968, 2.5, 1.4, 19.5);

  // Tree-lined boulevards, lamps, fire hydrants and bins.
  for (const r of ROAD_CENTERS) for (let q = -108; q <= 108; q += 18) {
    if (ROAD_CENTERS.some(v => Math.abs(v - q) < 14)) continue;
    for (const s of [-1, 1]) {
      tree(r + s * 9.2, q, .8 + random() * .3);
      tree(q, r + s * 9.2, .85);
    }
    stat(.2, 5.1, .2, 0x6c7b71, r - 8.4, 2.85, q + 5);
    obstacle(r - 8.4, q + 5, .2, .2);
    stat(1.5, .16, .2, 0x6c7b71, r - 7.8, 5.35, q + 5);
    stat(.9, .14, .46, 0xf1e5ba, r - 7.5, 5.22, q + 5);
    streetLights.push({ x: r - 7.5, z: q + 5 });
    stat(.65, 1, .65, 0x5d8175, r + 8.3, .8, q + 4);
    obstacle(r + 8.3, q + 4, .65, .65);
    stat(.4, .65, .4, 0xcd7855, r - 8, .6, q - 4);
    obstacle(r - 8, q - 4, .4, .4);
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

  const mesh = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial(), staticBoxes.length);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  staticBoxes.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.rotation.set(0, b.rotation, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, color.set(b.color)); });
  mesh.castShadow = mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere(); scene.add(mesh);

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
  for (let i = 0; i < 18; i++) {
    const ring = i % 3;
    const lo = -90 + (ring === 1 ? 60 : 0), hi = ring === 2 ? 30 : 90;
    const path = [{ x: lo + 3.2, z: hi - 3.2 }, { x: lo + 3.2, z: lo + 3.2 }, { x: hi - 3.2, z: lo + 3.2 }, { x: hi - 3.2, z: hi - 3.2 }];
    const corner = i % 4, next = (corner + 1) % 4, t = (Math.floor(i / 4) + 1) / 6;
    const p = { x: path[corner].x + (path[next].x - path[corner].x) * t, z: path[corner].z + (path[next].z - path[corner].z) * t };
    const heading = Math.atan2(-(path[next].x - p.x), -(path[next].z - p.z));
    const traffic = { ...p, path, target: next, speed: 5 + random() * 3, heading };
    addCar(p.x, p.z, heading, i % colors.length, traffic);
  }
  const pedestrians = [];
  for (let i = 0; i < 36; i++) {
    const person = makePerson();
    const road = pick(ROAD_CENTERS), direction = i % 2 ? 1 : -1;
    const horizontal = i % 3 === 0;
    const offset = road + direction * 10.3;
    const progress = -110 + random() * 220;
    person.group.position.set(horizontal ? progress : offset, .32, horizontal ? offset : progress);
    person.group.rotation.y = horizontal ? -direction * Math.PI / 2 : direction > 0 ? Math.PI : 0;
    scene.add(person.group); pedestrians.push({ ...person, horizontal, direction, speed: 1 + random() * .7, wait: 0 });
  }

  const pickups = [];
  for (const [x, z] of [[21, 42], [-18, 18], [81, 12], [-42, -21], [12, -81], [-81, 80], [102, 60], [72, 102]]) {
    const group = new THREE.Group(); box(.65, .65, .65, 0xf2c861, 0, 0, 0, group); box(.69, .18, .69, 0xffe7a0, 0, 0, 0, group);
    group.position.set(x, 1.3, z); scene.add(group); pickups.push({ group, x, z, collected: false });
  }
  return { colliders, mapBuildings, streetLights, cars, pedestrians, pickups, water, staticMesh: mesh };
}
