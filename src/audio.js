export const SOUND_FILES = {
  pistol: 'pistol_fire.wav', smg: 'smg_fire_1.wav', swing: 'miss_hit.wav',
  gatling: 'minigun_fire.wav', grenadeThrow: 'grenade_launcher_fire_1.wav', explosion: 'grenade_launcher_explode_1.wav', spin: 'minigun_wind_up.wav',
  shotgun: 'shotgun_fire_1.wav', shell: 'shotgun_pump_1.wav',
  carExplosion: 'explode3.wav', fireball: 'molotov_detonate_1.wav',
  monsterHit: 'hurt2.wav', monsterHitAlt: 'hurt3.wav',
  nurseAttack: 'monster2_attack.wav', pyramidAttack: 'monster1_attack.wav', figureAttack: 'attack1.wav',
  nurseDown: 'monster_death2.wav', pyramidDown: 'monster4_death.wav', figureDown: 'death1.wav',
  monsterAmbient: 'growl1.wav', footsteps: 'footsteps.wav', machinery: 'generator.wav',
  electric: 'zap1.wav', electricAlt: 'zap3.wav', lightningStart: 'lightning_strike_2.wav', wind: 'windingrass_loop.wav', distantThunder: 'thunder_far_away_1.wav', armor: 'pick_armor.wav', impact: 'armor_hit1.wav', wallHit: 'ric1.wav', carDisabled: 'broke_armor.wav',
  playerDown: 'male_death.wav', pickup: 'drop_item.wav', equip: 'weapon_pickup.wav',
  ammo: 'ammo_pickup.wav', reload: 'pistol_clip_out_1.wav', heal: 'take_healh.wav',
  buy: 'buy.wav', click: 'mouse_click.wav', hover: 'mouse_over.wav', error: 'mouse_error.wav',
  door: 'big_door.wav', otherworld: 'energy_off.wav', fogworld: 'energy_on.wav',
  spinDown: 'minigun_wind_down.wav',
  pistolEquip: 'pistol_silver_deploy_1.wav', smgEquip: 'smg_deploy_1.wav',
  gatlingEquip: 'rifle_deploy_1.wav', shotgunEquip: 'shotgun_deploy_1.wav', grenadeEquip: 'grenade_launcher_deploy_1.wav',
  smgReload: 'smg_clip_out_1.wav', gatlingReload: 'rifle_clip_out_1.wav', shotgunReload: 'shotgun_load_shell_2.wav',
  pistolReady: 'pistol_slideforward_1.wav', smgReady: 'smg_slideforward_1.wav', gatlingReady: 'rifle_slideforward.wav',

};

export function spatialMix(position, listener, heading = 0, range = 30) {
  if (!position || !listener) return { gain: 1, pan: 0 };
  const x = position.x - listener.x, z = position.z - listener.z, distance = Math.hypot(x, z);
  return { gain: Math.max(0, 1 - distance / range) ** 2,
    pan: Math.max(-1, Math.min(1, (x * Math.cos(heading) - z * Math.sin(heading)) / Math.max(3, distance))) };
}

export function createSoundSystem({ assets, createContext = () => new (window.AudioContext || window.webkitAudioContext)(), fetchAudio = url => fetch(url).then(r => { if (!r.ok) throw new Error('Audio unavailable'); return r.arrayBuffer(); }) }) {
  let context, master, compressor, loading, enabled = true, paused = false, volume = .65;
  const buffers = new Map(), voices = new Set(), loops = new Map();
  const hasPauseAudio = () => [...voices].some(voice => voice.allowWhenPaused);
  function stopVoice(voice) {
    voices.delete(voice); if (voice.key) loops.delete(voice.key);
    try { voice.source.stop(); } catch { /* Already ended. */ }
    voice.source.disconnect(); voice.gain.disconnect(); voice.pan.disconnect();
    if (context && paused && !hasPauseAudio()) context.suspend().catch(() => {});
  }
  function stopAll() { for (const voice of [...voices]) stopVoice(voice); }
  function route(voice, options) {
    const mix = spatialMix(options.position, options.listener, options.heading, options.range ?? 30);
    voice.gain.gain.setTargetAtTime((options.gain ?? .5) * mix.gain, context.currentTime, .03);
    voice.pan.pan.setTargetAtTime(mix.pan, context.currentTime, .03);
    voice.source.playbackRate.setTargetAtTime(options.rate ?? 1, context.currentTime, .05);
  }
  function play(name, options = {}) {
    if (!context || !enabled || (paused && !options.allowWhenPaused) || !buffers.has(name)) return null;
    if (spatialMix(options.position, options.listener, options.heading, options.range ?? 30).gain === 0) return null;
    const matching = [...voices].filter(v => v.name === name);
    if (matching.length >= 6 && options.stealOldest) stopVoice(matching[0]);
    if (voices.size >= 32 && options.priority) stopVoice(voices.values().next().value);
    if (voices.size >= 32 || [...voices].filter(v => v.name === name).length >= 6) return null;
    const source = context.createBufferSource(), gain = context.createGain(), pan = context.createStereoPanner();
    source.buffer = buffers.get(name); source.loop = !!options.loop;
    source.connect(gain); gain.connect(pan); pan.connect(master);
    const voice = { source, gain, pan, name, key: options.key, allowWhenPaused: !!options.allowWhenPaused };
    voices.add(voice); if (options.key) loops.set(options.key, voice);
    route(voice, options);
    source.onended = () => { if (voices.has(voice)) stopVoice(voice); };
    if (paused && options.allowWhenPaused) context.resume().catch(() => {});
    source.start(); return voice;
  }
  return {
    async unlock() {
      try {
        if (!context) {
          context = createContext(); master = context.createGain(); compressor = context.createDynamicsCompressor();
          master.gain.value = volume; master.connect(compressor); compressor.connect(context.destination);
          loading = Promise.allSettled(Object.entries(SOUND_FILES).map(async ([name, file]) => {
            const url = assets[file]; if (!url) return;
            buffers.set(name, await context.decodeAudioData(await fetchAudio(url)));
          }));
        }
        if (enabled && !paused) await context.resume();
        await loading;
        return true;
      } catch { return false; }
    },
    play,
    loop(key, name, options = {}) {
      const voice = loops.get(key);
      if (voice) route(voice, options);
      else play(name, { ...options, key, loop: true });
    },
    stopLoop(key) { const voice = loops.get(key); if (voice) stopVoice(voice); },
    setVolume(value) { volume = Math.max(0, Math.min(1, value)); if (master) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .04); },
    setEnabled(value) {
      enabled = value;
      if (!enabled) stopAll();
      if (master) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .04);
      if (context) (enabled && (!paused || hasPauseAudio()) ? context.resume() : context.suspend()).catch(() => {});
    },
    setPaused(value, { force = false } = {}) {
      if (paused === value && !force) return;
      paused = value;
      if (paused) for (const voice of [...voices]) if (force || !voice.allowWhenPaused) stopVoice(voice);
      if (context) ((paused && !hasPauseAudio()) || !enabled || force ? context.suspend() : context.resume()).catch(() => {});
    },
  };
}

export function weaponSound(index, action) {
  const events = {
    equip: ['equip', 'pistolEquip', 'shotgunEquip', 'smgEquip', 'gatlingEquip', 'grenadeEquip'],
    reload: ['reload', 'reload', 'shotgunReload', 'smgReload', 'gatlingReload', 'reload'],
    ready: ['equip', 'pistolReady', 'shell', 'smgReady', 'gatlingReady', 'grenadeEquip'],
  };
  return events[action]?.[index] || 'equip';
}
