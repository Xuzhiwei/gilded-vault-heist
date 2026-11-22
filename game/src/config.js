// Gilded Vault Heist: shared tuning constants and the tiny seeded RNG.
// One job: every number the rest of the game agrees on lives here.
export const VIEW = { width: 1280, height: 720 };

export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 178;
export const GUARD_RADIUS = 15;
export const GUARD_SPEED = 74;
export const GUARD_PAUSE_SECONDS = 1.4;
export const GUARD_TURN_SPEED = 2.2; // radians per second a staring guard can turn its head
export const STARE_LIMIT = 1.2; // seconds a guard stares before giving up and walking on

export const CONE_RANGE = 235;
export const CONE_HALF_ANGLE = Math.PI / 6; // 30 degrees each side
export const CAMERA_RANGE = 360;
export const CAMERA_HALF_ANGLE = 0.38; // about 22 degrees each side
export const CAMERA_SWEEP_SPEED = 0.55;

export const ALARM_RISE_GUARD = 30; // points per second while a guard sees the thief
export const ALARM_RISE_CAMERA = 25; // points per second while a camera sees the thief
export const ALARM_DECAY = 14; // points per second while nobody sees the thief
export const ALARM_MAX = 100;

export const PICKUP_RADIUS = 40;
export const DOOR_INTERACT_RADIUS = 78;
export const EXIT_RADIUS = 46;

// The lockpick needle sweeps 0..1; progress only grows while it sits in this band.
export const LOCKPICK_GREEN_LOW = 0.42;
export const LOCKPICK_GREEN_HIGH = 0.58;
export const LOCKPICK_FILL_RATE = 1.6; // progress per second inside the green band
export const LOCKPICK_DRAIN_RATE = 0.1; // progress lost per second outside it

export const LOOT_DEFS = [
  { id: 'crown', name: 'Gilded Crown', value: 45000, x: 640, y: 118 },
  { id: 'gold', name: 'Gold Bars', value: 28000, x: 470, y: 172 },
  { id: 'painting', name: 'The Gilded Portrait', value: 60000, x: 810, y: 172 },
];

export const PALETTE = {
  floor: '#131c2e',
  floorTile: '#17223a',
  carpet: '#232c4a',
  wall: '#22304e',
  wallTrim: '#d4af37',
  gold: '#d4af37',
  goldBright: '#f2d06b',
  coneGuard: 'rgba(242, 176, 60, 0.20)',
  coneGuardEdge: 'rgba(242, 176, 60, 0.55)',
  coneCamera: 'rgba(224, 82, 82, 0.16)',
  coneCameraEdge: 'rgba(224, 82, 82, 0.5)',
  alarm: '#e05252',
  safe: '#57c785',
  ink: '#e8ecf4',
  dim: '#9aa7c2',
};

/** Small deterministic RNG so a seed always stages the same screenshot. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shortest signed angle from `from` to `to`, in (-PI, PI]. */
export function angleDifference(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}
