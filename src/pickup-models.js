import * as THREE from 'three';
const cube = new THREE.BoxGeometry(1,1,1), prefabs = new Map();
export function createPickupModel(type) {
  if (prefabs.has(type)) return prefabs.get(type).clone(true);
  const group = new THREE.Group(); group.userData.pickupModel = type;
  const mats = new Map();
  const mat = color => { if (!mats.has(color)) mats.set(color,new THREE.MeshLambertMaterial({color})); return mats.get(color); };
  const box = (w,h,d,x=0,y=0,z=0,color=0x65746b) => { const mesh = new THREE.Mesh(cube,mat(color)); mesh.scale.set(w,h,d); mesh.position.set(x,y,z); group.add(mesh); return mesh; };
  if (['ammo','smgAmmo','gatlingAmmo','shells','grenades'].includes(type)) {
    const shotgun = type==='shells', heavy = type==='gatlingAmmo', launcher = type==='grenades';
    box(shotgun?1.05:.7,.2,.2,0,.1,0,shotgun?0x9b6b42:0x73827a);
    box(.16,.38,.18,-.2,-.15,0,0x453c32);
    if (heavy || launcher) {
      const count = heavy?6:1;
      for(let i=0;i<count;i++) {
        const angle=i/count*Math.PI*2, radius=heavy?.065:.18;
        const tube=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.85,8),mat(0x9aa79d));
        tube.rotation.z=Math.PI/2; tube.position.set(.55,.12+(heavy?Math.cos(angle)*.14:0),heavy?Math.sin(angle)*.14:0);group.add(tube);
      }
      box(.35,.28,.35,-.3,.1,0,0x64714c);
    } else box(shotgun?.8:.4,.11,.13,shotgun?.75:.5,.15,0,0xb5beb1);
    if (type==='smgAmmo') { box(.15,.35,.18,.1,-.16); box(.35,.17,.18,-.5,.12,0,0x413c35); }
    if (shotgun) box(.3,.24,.26,.45,.03,0,0x8e5e36);
  } else if (type==='armor') {
    box(.65,.65,.25,0,-.05,0,0x5d9abc);
    for (const side of [-1,1]) { box(.24,.28,.23,side*.22,.35,0,0x8bc5dd); box(.23,.22,.12,side*.18,-.1,.17,0x35657d); }
    box(.7,.1,.3,0,-.34,0,0x304f60);
  } else if (type==='health') {
    box(.75,.5,.3,0,-.06,0,0xe4e5cf);
    box(.4,.08,.15,0,.32,0,0xb3bfa8); for(const side of [-1,1]) box(.08,.13,.15,side*.16,.24,0,0xb3bfa8);
    box(.12,.32,.04,0,-.03,.17,0xc65345); box(.32,.12,.04,0,-.03,.17,0xc65345);
  } else if (type==='speed') {
    for (const side of [-1,1]) { box(.23,.45,.25,side*.18,.05,0,0x8c6cb5); box(.24,.18,.5,side*.18,-.23,-.1,0xa992cb); box(.25,.07,.52,side*.18,-.35,-.1,0xd4d6c1); }
  } else if (type==='lightning') {
    const shape=new THREE.Shape();shape.moveTo(.12,.62);shape.lineTo(-.4,-.08);shape.lineTo(-.05,-.08);shape.lineTo(-.17,-.62);shape.lineTo(.42,.12);shape.lineTo(.07,.12);shape.closePath();
    const bolt=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:false}),new THREE.MeshBasicMaterial({color:0xffdd35,toneMapped:false}));bolt.position.z=-.075;group.add(bolt);
  }
  prefabs.set(type,group);return group.clone(true);
}
