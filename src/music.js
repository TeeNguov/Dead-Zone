// Stream the MP3s. Track playback attempts separately so a rejected, older
// request cannot cancel music that was successfully started by a later gesture.
export function createMusic({ menu, action, createAudio = url => new Audio(url), onBlocked = () => {}, onPlaying = () => {} }) {
  const tracks = [createAudio(menu), createAudio(action)];
  for (const track of tracks) { track.loop = true; track.preload = 'auto'; track.volume = 0; }
  const playback = tracks.map(() => ({ pending: false, blocked: false, request: 0, retry: 0, startedAt: 0 }));
  let unlocked = false, mode = 'menu', volume = .25, clock = 0;
  function stop(index) {
    const track = tracks[index], state = playback[index];
    if (!track.paused || state.pending) { state.request++; state.pending = false; track.pause(); }
  }
  function start(index, gesture = false) {
    const track = tracks[index], state = playback[index];
    if (!track.paused && !state.pending) return;
    if (!gesture && (state.pending || state.blocked || clock < state.retry)) return;
    const request = ++state.request; state.pending = true; state.startedAt = clock;
    function failed(error) {
      if (request !== state.request) return;
      state.pending = false;
      if (error?.name === 'NotAllowedError') { state.blocked = true; onBlocked(); }
      else state.retry = clock + 1;
    }
    try {
      Promise.resolve(track.play()).then(() => {
        if (request !== state.request) return;
        state.pending = false; state.blocked = false; onPlaying();
      }, failed);
    } catch (error) { failed(error); }
  }
  return {
    unlock(nextMode = mode) {
      mode = nextMode; unlocked = true;
      playback.forEach(state => { state.blocked = false; state.retry = 0; });
      if (volume > 0) {
        const index = mode === 'action' ? 1 : 0;
        // Request audible playback inside the interaction event, rather than
        // depending on a silent autoplay request becoming audible later.
        tracks[index].volume = volume; start(index, true);
      }
    },
    setVolume(value) { volume = Math.max(0, Math.min(1, value)); },
    update(dt, nextMode, enabled = true, hidden = false) {
      mode = nextMode; clock += dt;
      tracks.forEach((track, index) => {
        if (hidden) { stop(index); return; }
        const target = enabled && unlocked && (mode === 'action' ? index === 1 : index === 0) ? volume : 0;
        // Some cached media requests can remain pending after navigation.
        // Invalidate a stalled request so a fresh play attempt can recover.
        const state = playback[index];
        if (target > 0 && state.pending && track.paused && clock - state.startedAt > 4) {
          state.request++; state.pending = false; state.retry = clock;
        }
        if (target > 0) start(index);
        track.volume += (target - track.volume) * (1 - Math.exp(-4 * dt));
        if (target === 0 && track.volume < .001) { track.volume = 0; stop(index); }
      });
    },
  };
}
