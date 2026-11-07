import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSoundSystem, SOUND_FILES, spatialMix, weaponSound } from '../src/audio.js';

function harness() {
  const sources = [];
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ connect() {}, disconnect() {} });
  const context = { currentTime: 0, destination: {}, suspended: false,
    createGain: () => ({ ...node(), gain: param() }),
    createDynamicsCompressor: node,
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createBufferSource() {
      const source = { ...node(), playbackRate: param(), start() { this.started = true; }, stop() { this.stopped = true; } };
      sources.push(source); return source;
    },
    decodeAudioData: async bytes => ({ bytes }),
    async resume() { this.suspended = false; }, async suspend() { this.suspended = true; },
  };
  const sound = createSoundSystem({ assets: Object.fromEntries(Object.entries(SOUND_FILES).map(([name, file]) => [file, name])), createContext: () => context, fetchAudio: async () => new ArrayBuffer(8) });
  return { sound, context, sources };
}

test('every mapped sound is an existing WAV, including uppercase extensions', () => {
  for (const file of Object.values(SOUND_FILES)) {
    const bytes = readFileSync(new URL('../sounds/' + file, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    assert.ok(bytes.length > 44);
  }
});

test('spatial audio attenuates out of range and pans relative to the camera', () => {
  assert.equal(spatialMix({ x: 30, z: 0 }, { x: 0, z: 0 }).gain, 0);
  const right = spatialMix({ x: 5, z: 0 }, { x: 0, z: 0 });
  const left = spatialMix({ x: -5, z: 0 }, { x: 0, z: 0 });
  assert.ok(right.gain < 1 && right.gain > 0); assert.ok(right.pan > 0); assert.ok(left.pan < 0);
  assert.ok(spatialMix({ x: 5, z: 0 }, { x: 0, z: 0 }, Math.PI).pan < 0);
});

test('audio waits for unlock, reuses loops, and stops everything on pause', async () => {
  const { sound, sources, context } = harness();
  assert.equal(sound.play('pistol'), null);
  await sound.unlock();
  sound.loop('walk', 'footsteps'); sound.loop('walk', 'footsteps', { rate: 1.4 });
  assert.equal(sources.length, 1); assert.equal(sources[0].playbackRate.value, 1.4);
  sound.play('pistol'); sound.setPaused(true);
  assert.ok(sources.every(s => s.stopped)); assert.equal(context.suspended, true);
  assert.equal(sound.play('smg'), null);
  sound.setPaused(false); sound.loop('walk', 'footsteps');
  assert.equal(sources.length, 3); assert.equal(context.suspended, false);
});

test('mute stops active sounds and prevents new ones until re-enabled', async () => {
  const { sound, sources } = harness(); await sound.unlock();
  sound.play('monsterAmbient'); sound.setEnabled(false);
  assert.ok(sources[0].stopped); assert.equal(sound.play('pistol'), null);
  sound.setEnabled(true); assert.ok(sound.play('pistol'));
});

test('rapid gunfire has a voice limit and distant sounds do not allocate voices', async () => {
  const { sound, sources } = harness(); await sound.unlock();
  for (let i = 0; i < 100; i++) sound.play('smg');
  assert.equal(sources.length, 6);
  assert.equal(sound.play('monsterAmbient', { position: { x: 100, z: 0 }, listener: { x: 0, z: 0 } }), null);
  assert.equal(sources.length, 6);
});

test('one missing audio file does not prevent the other sounds loading', async () => {
  const { context } = harness();
  const sound = createSoundSystem({ assets: { [SOUND_FILES.pistol]: 'ok', [SOUND_FILES.smg]: 'bad' }, createContext: () => context,
    fetchAudio: async url => { if (url === 'bad') throw new Error('missing'); return new ArrayBuffer(8); } });
  assert.equal(await sound.unlock(), true);
  assert.ok(sound.play('pistol')); assert.equal(sound.play('smg'), null);
});

test('weapon actions resolve to WAV clips in the shared sounds folder', () => {
  for (const event of ['pistol', 'smg', 'gatling', 'shotgun', 'spin', 'spinDown', 'grenadeThrow', 'explosion', 'carExplosion', 'wallHit']) assert.ok(SOUND_FILES[event].endsWith('.wav'), event);
  for (const index of [1, 2, 3, 4]) for (const action of ['equip', 'reload', 'ready']) assert.ok(SOUND_FILES[weaponSound(index, action)].endsWith('.wav'));
});

test('rapid weapon shots can replace the oldest tail without missing a new shot', async () => {
  const { sound, sources } = harness(); await sound.unlock();
  for (let i = 0; i < 12; i++) assert.ok(sound.play('smg', { stealOldest: true }));
  assert.equal(sources.length, 12); assert.equal(sources.filter(s => s.stopped).length, 6);
});

test('lightning, ambience and infected clips use consolidated filenames', () => {
  assert.ok(SOUND_FILES.lightningStart === 'lightning_strike_2.wav');
  assert.ok(SOUND_FILES.electric === 'zap1.wav');
  assert.ok(SOUND_FILES.wind === 'windingrass_loop.wav');
  assert.ok(SOUND_FILES.monsterAmbient === 'growl1.wav');
});

test('death scream survives game-over pause while other sounds stop, then audio suspends', async () => {
  const { sound, sources, context } = harness(); await sound.unlock();
  sound.play('smg'); sound.play('playerDown', { allowWhenPaused: true, priority: true });
  sound.setPaused(true);
  assert.equal(sources[0].stopped, true); assert.notEqual(sources[1].stopped, true);
  assert.equal(context.suspended, false); assert.equal(sound.play('smg'), null);
  sources[1].onended(); assert.equal(context.suspended, true);
});
test('hidden page force-pause stops a playing death scream', async () => {
  const { sound, sources, context } = harness(); await sound.unlock();
  sound.play('playerDown', { allowWhenPaused: true }); sound.setPaused(true);
  sound.setPaused(true, { force: true });
  assert.equal(sources[0].stopped, true); assert.equal(context.suspended, true);
});
