import * as THREE from 'three';
// Solve both arm bones against an actual grip, rather than lifting two parallel arms.
export function poseArm(rig, upper, elbow, hand, worldTarget) {
  rig.updateWorldMatrix(true, true);
  const target = rig.worldToLocal(worldTarget.clone()), shoulder = upper.position.clone();
  const direction = target.sub(shoulder), length = direction.length();
  const a = elbow.position.length(), b = hand.position.length();
  const d = Math.max(.001, Math.min(a + b - .001, length)); direction.normalize();
  const along = (a * a - b * b + d * d) / (2 * d);
  const bend = Math.sqrt(Math.max(0, a * a - along * along));
  const pole = new THREE.Vector3(upper.position.x > 0 ? .3 : -.3, -1, 0);
  pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  const joint = shoulder.clone().addScaledVector(direction, along).addScaledVector(pole, bend);
  upper.quaternion.setFromUnitVectors(elbow.position.clone().normalize(), joint.clone().sub(shoulder).normalize());
  const forearm = shoulder.clone().addScaledVector(direction, d).sub(joint).normalize();
  const lowerRotation = new THREE.Quaternion().setFromUnitVectors(hand.position.clone().normalize(), forearm);
  elbow.quaternion.copy(upper.quaternion.clone().invert().multiply(lowerRotation));
  rig.updateWorldMatrix(true, true);
}
export function poseWeaponArms(avatar, weapon, twoHands) {
  avatar.group.updateMatrixWorld(true);
  const trigger = weapon.localToWorld(new THREE.Vector3(0, -.12, .07));
  poseArm(avatar.group.children[0], avatar.armR, avatar.elbowR, avatar.rightHand, trigger);
  if (twoHands) {
    const support = weapon.localToWorld(weapon.userData.supportGrip?.clone() || new THREE.Vector3(-.16, -.12, weapon.scale.z > 1 ? -.18 : -.28));
    poseArm(avatar.group.children[0], avatar.armL, avatar.elbowL, avatar.leftHand, support);
  }
}
