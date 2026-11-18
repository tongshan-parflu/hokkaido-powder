const KEY = 'hokkaido-powder-save-v1';

const defaults = {
  lang: 'zh',
  sound: true,
  music: true,
  haptics: true,
  controls: 'both',
  quality: 'auto',
  tutorialDone: false,
  tiltZero: 0,
  best: {},
  stars: {},
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults, best: {}, stars: {} };
  } catch {
    return { ...defaults, best: {}, stars: {} };
  }
}

let state = read();

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

export function getSave() {
  return state;
}

export function patchSave(partial) {
  state = { ...state, ...partial };
  write();
  return state;
}

export function bestFor(level) {
  return state.best[level] || null;
}

export function starsFor(level) {
  return state.stars[level] || 0;
}

export function recordRun(level, { time, stars }) {
  const prev = state.best[level];
  const best = !prev || time < prev.time ? { time, stars: Math.max(stars, prev?.stars || 0) } : { ...prev, stars: Math.max(prev.stars || 0, stars) };
  state = {
    ...state,
    best: { ...state.best, [level]: best },
    stars: { ...state.stars, [level]: Math.max(state.stars[level] || 0, stars) },
  };
  write();
  return state;
}

export function isUnlocked(level) {
  if (level === 'green') return true;
  if (level === 'red' || level === 'night') return starsFor('green') >= 1;
  if (level === 'black') return starsFor('red') >= 1;
  return false;
}
