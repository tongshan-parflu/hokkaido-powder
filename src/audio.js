/** Original procedural audio, dedicated CC0. No downloaded samples, no network. */

let ctx = null;
let wind = null;
let music = null;
let enabled = { sound: true, music: true };

function context() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function noiseBuffer(audio, seconds) {
  const rate = audio.sampleRate;
  const data = audio.createBuffer(1, rate * seconds, rate);
  const channel = data.getChannelData(0);
  let last = 0;
  for (let i = 0; i < channel.length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.94 + white * 0.06;
    channel[i] = last;
  }
  return data;
}

export function unlockAudio() {
  const audio = context();
  if (audio.state === 'suspended') audio.resume();
  if (!wind) {
    const src = audio.createBufferSource();
    src.buffer = noiseBuffer(audio, 2);
    src.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const gain = audio.createGain();
    gain.gain.value = 0.0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start();
    wind = gain;
  }
  startMusic();
}

function startMusic() {
  if (music || !enabled.music) return;
  const audio = context();
  const master = audio.createGain();
  master.gain.value = 0.045;
  master.connect(audio.destination);
  const notes = [220, 247, 294, 330, 370, 440, 330, 294];
  let step = 0;
  const timer = window.setInterval(() => {
    if (!enabled.music || !ctx) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.value = notes[step % notes.length];
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.4);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(audio.currentTime + 1.5);
    step += 1;
  }, 700);
  music = { timer, master };
}

export function setAudio(next) {
  enabled = { ...enabled, ...next };
  if (wind) wind.gain.value = enabled.sound ? 0.08 : 0;
  if (music) music.master.gain.value = enabled.music ? 0.045 : 0;
  if (enabled.music && ctx && !music) startMusic();
}

export function setWind(amount) {
  if (!wind || !enabled.sound) return;
  wind.gain.value = 0.04 + Math.min(1, amount) * 0.1;
}

export function playCarve() {
  if (!ctx || !enabled.sound) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900;
  osc.type = 'sawtooth';
  osc.frequency.value = 180 + Math.random() * 40;
  gain.gain.value = 0.03;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  osc.stop(ctx.currentTime + 0.2);
}

export function stopAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended' && (enabled.sound || enabled.music)) ctx.resume();
}
