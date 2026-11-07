import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusic } from '../src/music.js';
function harness() {
  const tracks = [];
  const music = createMusic({ menu: 'menu.mp3', action: 'action-background.mp3', createAudio: url => {
    const track = { url, paused: true, volume: 0, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } };
    tracks.push(track); return track;
  } }); return { music, tracks };
}
test('music waits for interaction then transitions from menu to gameplay without duplicating tracks', () => {
  const { music, tracks } = harness(); music.update(1, 'menu'); assert.ok(tracks.every(t => t.paused));
  music.unlock(); music.update(1, 'menu'); assert.ok(tracks[0].volume > .2); assert.ok(tracks[1].paused);
  for (let i = 0; i < 120; i++) music.update(1 / 60, 'action');
  assert.ok(tracks[0].paused); assert.ok(tracks[1].volume > .2); assert.ok(tracks.every(t => t.loop));
});
test('music has independent volume, pauses in hidden tabs, and respects mute', async () => {
  const { music, tracks } = harness(); music.unlock('action'); music.setVolume(.5); music.update(2, 'action');
  assert.ok(tracks[1].volume > .49); await new Promise(resolve => setTimeout(resolve, 0)); music.update(0, 'action', true, true); assert.ok(tracks.every(t => t.paused));
  music.update(1, 'action'); assert.equal(tracks[1].paused, false);
  music.update(3, 'action', false); assert.ok(tracks.every(t => t.paused));
  music.setVolume(0); music.update(3, 'action'); assert.ok(tracks.every(t => t.paused));
});

test('autoplay rejection waits for interaction and then recovers', async () => {
  let allowed = false, attempts = 0;
  const tracks = [];
  const music = createMusic({ menu: 'menu', action: 'action', createAudio: () => {
    const track = { paused: true, volume: 0, pause() { this.paused = true; }, play() {
      attempts++; if (!allowed) return Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' }));
      this.paused = false; return Promise.resolve();
    } }; tracks.push(track); return track;
  } });
  music.unlock(); await Promise.resolve();
  for (let i = 0; i < 60; i++) music.update(1 / 60, 'menu');
  assert.equal(attempts, 1, 'blocked autoplay does not retry on every frame');
  allowed = true; music.unlock(); await Promise.resolve(); music.update(1, 'menu');
  assert.equal(tracks[0].paused, false); assert.ok(tracks[0].volume > 0);
});

test('a stale rejected request cannot disable later successful music playback', async () => {
  let rejectOld, calls = 0; const tracks = [];
  const music = createMusic({ menu: 'menu', action: 'action', createAudio: () => {
    const track = { paused: true, volume: 0, pause() { this.paused = true; }, play() {
      if (calls++ === 0) return new Promise((resolve, reject) => { rejectOld = reject; });
      this.paused = false; return Promise.resolve();
    } }; tracks.push(track); return track;
  } });
  music.unlock(); music.unlock(); await Promise.resolve();
  rejectOld(Object.assign(new Error(), { name: 'NotAllowedError' })); await Promise.resolve();
  music.update(1, 'action'); await Promise.resolve();
  assert.equal(tracks[1].paused, false); assert.ok(tracks[1].volume > .2);
});

test('music can start after loading hidden and becoming visible', async () => {
  const { music, tracks } = harness();
  music.update(1, 'menu', true, true); assert.ok(tracks.every(t => t.paused));
  music.unlock('menu'); await Promise.resolve(); music.update(1, 'menu');
  assert.equal(tracks[0].paused, false); assert.ok(tracks[0].volume > .2);
});

test('a stalled cached playback request can recover without a hard refresh', async () => {
  let calls = 0;
  const tracks = [];
  const music = createMusic({ menu: 'menu', action: 'action', createAudio: () => {
    const track = { volume: 0, paused: true, pause() { this.paused = true; }, play() {
      calls++;
      if (calls === 1) return new Promise(() => {});
      this.paused = false; return Promise.resolve();
    } }; tracks.push(track); return track;
  } });
  music.unlock(); music.update(5, 'menu'); await Promise.resolve();
  assert.equal(calls, 2); assert.equal(tracks[0].paused, false); assert.ok(tracks[0].volume > .2);
});
