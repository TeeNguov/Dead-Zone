export function buildingIsClose(building, player, margin = 5) {
  const dx = Math.max(0, Math.abs(player.x - building.x) - building.w / 2);
  const dz = Math.max(0, Math.abs(player.z - building.z) - building.d / 2);
  return Math.hypot(dx, dz) <= margin;
}
export function updateBuildingVisibility(buildings, player) {
  for (const building of buildings) {
    // Separate enter/leave thresholds keep the upper half from flickering
    // when the player walks along the edge of the proximity zone.
    building.cutaway = buildingIsClose(building, player, building.cutaway ? 7 : 5);
    building.opacity = 1;
    for (const mesh of building.visuals) {
      if (mesh.material.transparent) { mesh.material.transparent = false; mesh.material.needsUpdate = true; }
      mesh.material.opacity = 1; mesh.material.depthWrite = true;
      mesh.visible = !(building.cutaway && mesh.userData.upperBuilding);
      mesh.castShadow = mesh.visible && !mesh.userData.doorway;
    }
  }
}
