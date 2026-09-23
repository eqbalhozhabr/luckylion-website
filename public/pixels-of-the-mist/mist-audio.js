/* Audio - procedural, synthesized, in the spirit of an old handheld's own
 * sound chip (simple oscillator beeps, square/triangle waves) rather than
 * sampled/recorded audio. Keeps this at zero download weight and matches
 * the console's own monochrome-LCD pastiche instead of fighting it with
 * studio-quality SFX. See game-design-plan.md §9 for the brief this
 * implements.
 *
 * Plain script (loaded with <script src>, no module), same as the rest of
 * the game's own files.
 */
'use strict';

let actx = null;
let masterGain = null, musicGain = null, sfxGain = null, ambienceGain = null;
let audioUnlocked = false;
let ambienceHandle = null;

/* Browsers block audio until a real user gesture - this is that gesture,
   captured once on whichever element the player touches first (the boot
   splash, a menu button, anything), never a dedicated "enable sound"
   button of its own. */
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  actx = new Ctx();
  masterGain = actx.createGain();
  masterGain.connect(actx.destination);
  musicGain = actx.createGain();
  sfxGain = actx.createGain();
  ambienceGain = actx.createGain();
  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  ambienceGain.connect(masterGain);
  applyAudioVolumes();
  if (actx.state === 'suspended') actx.resume();
  sndPowerOn();
}
addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
addEventListener('keydown', unlockAudio, { once: true });

/* Reads straight off settings (see mist.html's own audio* fields) rather
   than caching its own copy, so a slider drag takes effect on the very
   next sound without a separate "apply" step. */
function applyAudioVolumes() {
  if (!actx) return;
  const s = (typeof settings !== 'undefined' && settings) || {};
  const t = actx.currentTime;
  musicGain.gain.setTargetAtTime((s.audioMusic ?? 0.6) * 0.5, t, 0.01);
  sfxGain.gain.setTargetAtTime(s.audioSfx ?? 0.8, t, 0.01);
  ambienceGain.gain.setTargetAtTime((s.audioAmbience ?? 0.5) * 0.35, t, 0.01);
}

function reduceSudden() {
  return typeof settings !== 'undefined' && settings && settings.audioReduceSudden;
}

/* One oscillator, one gain envelope - attack up, exponential decay down
   (exponential because a linear fade to zero on a decaying tone reads as a
   click at the very end; ramping toward a tiny non-zero floor first avoids
   that). glideTo lets a single call sweep pitch for the crackle/snuff
   pair without a second oscillator. */
function tone(freq, dur, opts = {}) {
  if (!actx) return;
  const { type = 'square', gain = sfxGain, vol = 0.18, attack = 0.004,
          glideTo = null, delay = 0 } = opts;
  const t0 = actx.currentTime + delay;
  const osc = actx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(gain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/* A short burst of filtered white noise - the crackle in a lit fire, the
   hiss in a snuffed one, the texture in the wind drone. Built fresh each
   call (noise buffers are cheap and one-shot; a shared buffer would need
   its own bookkeeping for no real saving here). */
function noiseBurst(dur, opts = {}) {
  if (!actx) return;
  const { gain = sfxGain, vol = 0.12, filterFreq = 1200, filterType = 'bandpass',
          filterQ = 1, delay = 0 } = opts;
  const t0 = actx.currentTime + delay;
  const n = Math.max(1, Math.floor(actx.sampleRate * dur));
  const buf = actx.createBuffer(1, n, actx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = actx.createBufferSource();
  src.buffer = buf;
  const filt = actx.createBiquadFilter();
  filt.type = filterType;
  filt.frequency.setValueAtTime(filterFreq, t0);
  filt.Q.value = filterQ;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(gain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/* ------------------------------------------------------------------ SFX */
function sndNavClick() { tone(660, 0.03, { type: 'square', vol: 0.06 }); }
function sndSwitchClick() { noiseBurst(0.02, { vol: 0.15, filterFreq: 2500, filterType: 'highpass' }); }
function sndPowerOn() {
  tone(392, 0.07, { type: 'triangle', vol: 0.12 });
  tone(523, 0.07, { type: 'triangle', vol: 0.12, delay: 0.07 });
  tone(784, 0.14, { type: 'triangle', vol: 0.14, delay: 0.14 });
}
function sndError() {
  if (reduceSudden()) { tone(180, 0.09, { type: 'square', vol: 0.08 }); return; }
  tone(180, 0.09, { type: 'square', vol: 0.14 });
  tone(150, 0.12, { type: 'square', vol: 0.14, delay: 0.09 });
}
function sndFireLight() {
  noiseBurst(0.16, { vol: 0.14, filterFreq: 900, filterType: 'bandpass', filterQ: 0.7 });
  tone(220, 0.12, { type: 'triangle', vol: 0.1, glideTo: 440 });
}
function sndFireUnlight() {
  noiseBurst(0.1, { vol: 0.1, filterFreq: 700, filterType: 'bandpass', filterQ: 0.7 });
  tone(440, 0.1, { type: 'triangle', vol: 0.08, glideTo: 180 });
}
function sndHeartLost() {
  const loud = !reduceSudden();
  tone(196, 0.16, { type: 'sawtooth', vol: loud ? 0.16 : 0.09, glideTo: 110 });
}
function sndOverrun() {
  const loud = !reduceSudden();
  tone(220, 0.1, { type: 'sawtooth', vol: loud ? 0.16 : 0.09 });
  tone(160, 0.1, { type: 'sawtooth', vol: loud ? 0.16 : 0.09, delay: 0.1 });
  tone(110, 0.35, { type: 'sawtooth', vol: loud ? 0.16 : 0.09, delay: 0.2 });
}
function sndWin() {
  tone(523, 0.09, { type: 'square', vol: 0.14 });
  tone(659, 0.09, { type: 'square', vol: 0.14, delay: 0.09 });
  tone(784, 0.22, { type: 'square', vol: 0.16, delay: 0.18 });
}
function sndChapterComplete() {
  sndWin();
  tone(1047, 0.28, { type: 'triangle', vol: 0.14, delay: 0.38 });
}
function sndHint() { tone(880, 0.05, { type: 'sine', vol: 0.1 }); tone(1175, 0.09, { type: 'sine', vol: 0.1, delay: 0.05 }); }

/* --------------------------------------------------------------- ambience */
/* A soft looping wind/fog bed under actual play - two long, slow, detuned
   noise loops through a low-pass filter that itself drifts, so it never
   sits still enough to read as a "clip" repeating. Off outside the game
   screen (see setScreen's own start/stopAmbience calls). */
function startAmbience() {
  if (!actx || ambienceHandle) return;
  const src = actx.createBufferSource();
  const n = actx.sampleRate * 4;
  const buf = actx.createBuffer(1, n, actx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  src.buffer = buf;
  src.loop = true;
  const filt = actx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(500, actx.currentTime);
  const lfo = actx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = actx.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain);
  lfoGain.connect(filt.frequency);
  lfo.start();
  const g = actx.createGain();
  g.gain.setValueAtTime(0, actx.currentTime);
  g.gain.linearRampToValueAtTime(1, actx.currentTime + 1.2);
  src.connect(filt); filt.connect(g); g.connect(ambienceGain);
  src.start();
  ambienceHandle = { src, lfo, g };
}
function stopAmbience() {
  if (!ambienceHandle) return;
  const { src, lfo, g } = ambienceHandle;
  const t = actx.currentTime;
  g.gain.setTargetAtTime(0, t, 0.25);
  setTimeout(() => { try { src.stop(); lfo.stop(); } catch (e) {} }, 900);
  ambienceHandle = null;
}
