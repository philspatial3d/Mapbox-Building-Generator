/* Almost nothing. Three quiet, spatially placed sounds, synthesised so there is no
   recognisable sample: a thin movement of air, teeth meeting, one dry exhale.
   All are near the threshold of hearing and none is tied to a visual event. */

let ctx = null;
let master = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    ctx = null;
  }
}

export const audioReady = () => Boolean(ctx && ctx.state === 'running');

function noiseBuffer(seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/* Listener follows the camera; sources sit at real positions in the local frame. */
export function setListener(position, forward, up) {
  if (!audioReady()) return;
  const l = ctx.listener;
  if (l.positionX) {
    l.positionX.value = position.x; l.positionY.value = position.y; l.positionZ.value = position.z;
    l.forwardX.value = forward.x; l.forwardY.value = forward.y; l.forwardZ.value = forward.z;
    l.upX.value = up.x; l.upY.value = up.y; l.upZ.value = up.z;
  } else {
    l.setPosition(position.x, position.y, position.z);
    l.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
  }
}

function panner(at) {
  const p = ctx.createPanner();
  p.panningModel = 'HRTF';
  p.distanceModel = 'inverse';
  p.refDistance = 2;
  p.rolloffFactor = 0.6;
  if (p.positionX) {
    p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z;
  } else p.setPosition(at.x, at.y, at.z);
  p.connect(master);
  return p;
}

/* Wind through dry reeds or cracked stone, passing close by. */
export function airPass(at) {
  if (!audioReady()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(2.4);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 2.2;
  band.frequency.setValueAtTime(900, t);
  band.frequency.linearRampToValueAtTime(1700, t + 1.1);
  band.frequency.linearRampToValueAtTime(700, t + 2.3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
  src.connect(band).connect(g).connect(panner(at));
  src.start(t);
  src.stop(t + 2.4);
}

/* One click. Silence. Another. */
export function teeth(at) {
  if (!audioReady()) return;
  [0, 0.9 + Math.random() * 0.5].forEach(offset => {
    const t = ctx.currentTime + offset;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.03);
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 3200;
    hp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    src.connect(hp).connect(g).connect(panner(at));
    src.start(t);
  });
}

/* Dry material passing over teeth, very slowly. */
export function exhale(at, seconds = 4) {
  if (!audioReady()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(seconds + 0.2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.03, t + seconds * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(hp).connect(lp).connect(g).connect(panner(at));
  src.start(t);
  src.stop(t + seconds + 0.2);
}
