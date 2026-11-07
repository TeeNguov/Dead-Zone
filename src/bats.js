import * as THREE from 'three';
import { moveBody, distance } from './physics.js';
export function makeBat() {
  const group = new THREE.Group(), rig = new THREE.Group(); group.add(rig);
  const dark = new THREE.MeshLambertMaterial({ color: 0x40352e }), membrane = new THREE.MeshLambertMaterial({ color: 0x70504b });
  function part(parent, w, h, d, x, y, z, mat = dark) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); mesh.position.set(x,y,z); parent.add(mesh); return mesh;
  }
  part(rig,.3,.3,.6,0,0,0); part(rig,.28,.3,.25,0,.06,-.35);
  for (const side of [-1,1]) { part(rig,.09,.24,.1,side*.1,.26,-.31); part(rig,.055,.055,.03,side*.08,.1,-.49,new THREE.MeshBasicMaterial({color:0xe45b3f})); }
  const wings = [];
  for (const side of [-1,1]) {
    const wing = new THREE.Group(); wing.position.x = side*.13; rig.add(wing);
    part(wing,.85,.055,.5,side*.4,0,.03,membrane); part(wing,.65,.055,.25,side*.95,0,.13,membrane);
    part(wing,.9,.065,.055,side*.4,.02,-.2); wings.push(wing);
  }
  return { group, flying: true, monsterType:'bat', wingL:wings[0], wingR:wings[1], legL:wings[0], legR:wings[1],
    armL:wings[0], armR:wings[1], elbowL:wings[0], elbowR:wings[1], health:40, maxHealth:40, height:.6, radius:.45, speed:7,
    attackDamage:7, attackInterval:1.2, attackCooldown:1, phase:Math.random()*Math.PI*2 };
}
export function tickBatFlight(bat, dt, target, obstacles) {
  bat.phase += dt*7;
  bat.wingL.rotation.z = Math.sin(bat.phase*2)*.65; bat.wingR.rotation.z = -Math.sin(bat.phase*2)*.65;
  const pos = bat.group.position, near = distance(pos,target)<10;
  const aim = {x:target.x+(near?Math.cos(bat.phase*.25)*.8:0),z:target.z+(near?Math.sin(bat.phase*.25)*.8:0)};
  const dx=aim.x-pos.x,dz=aim.z-pos.z,d=Math.hypot(dx,dz),step=Math.min(d,bat.speed*dt);
  const body={x:pos.x,z:pos.z,radius:bat.radius};
  if(d>.02) {moveBody(body,dx/d*step,dz/d*step,obstacles);bat.group.rotation.y=Math.atan2(-dx,-dz);}
  pos.set(body.x,1.8+Math.sin(bat.phase*.5)*.7,body.z);
}
