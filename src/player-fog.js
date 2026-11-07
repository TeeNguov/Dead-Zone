import * as THREE from 'three';
export const FOG_CLEAR_RADIUS = 11;
export const FOG_DENSE_RADIUS = 43;
export function fogAmount(distance) {
  const t = Math.max(0, Math.min(1, (distance - FOG_CLEAR_RADIUS) / (FOG_DENSE_RADIUS - FOG_CLEAR_RADIUS)));
  return .025 + .975 * t * t * (3 - 2 * t);
}
export function createPlayerFog(scene) {
  const player = { value: new THREE.Vector2() }, time = { value: 0 };
  const installed = new WeakSet();
  function install(material) {
    if (!material || !material.fog || installed.has(material)) return;
    installed.add(material);
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = function(shader, renderer) {
      previous.call(this, shader, renderer);
      shader.uniforms.cityFogPlayer = player; shader.uniforms.cityFogTime = time;
      shader.vertexShader = shader.vertexShader.replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\nvarying vec3 cityFogWorld;');
      shader.vertexShader = shader.vertexShader.replace('#include <fog_vertex>', `
        #include <fog_vertex>
        vec4 cityFogPosition = vec4(${material.isSpriteMaterial ? 'position' : 'transformed'}, 1.0);
        #ifdef USE_INSTANCING
          cityFogPosition = instanceMatrix * cityFogPosition;
        #endif
        cityFogWorld = (modelMatrix * cityFogPosition).xyz;
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nvarying vec3 cityFogWorld;\nuniform vec2 cityFogPlayer;\nuniform float cityFogTime;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `
        #ifdef USE_FOG
          float cityDistance = length(cityFogWorld.xz - cityFogPlayer);
          float cityDrift = sin(cityFogWorld.x * .14 + cityFogTime * .16) * sin(cityFogWorld.z * .11 - cityFogTime * .12);
          float cityFog = .025 + .975 * smoothstep(${FOG_CLEAR_RADIUS.toFixed(1)}, ${FOG_DENSE_RADIUS.toFixed(1)}, cityDistance + cityDrift * 2.0 * smoothstep(10.0, 22.0, cityDistance));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, cityFog);
        #endif
      `);
    };
    material.customProgramCacheKey = () => 'player-radial-fog-v1';
    material.needsUpdate = true;
  }
  return {
    update(dt, position) {
      player.value.set(position.x, position.z); time.value += dt;
      // Also catches spawned monsters, replacement wreck materials and new effects.
      scene.traverse(object => {
        if (!object.material) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) install(material);
      });
    },
  };
}
