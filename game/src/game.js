// Gilded Vault Heist: the simulation itself, with no drawing and no browser in it.
// One job: own the game state, advance one fixed step from one input, and decide
// when the heist is won or blown. The renderer only reads this state; the
// screenshot stager drives it with the same autopilot a player could follow.
import {
  ALARM_MAX, DOOR_INTERACT_RADIUS, EXIT_RADIUS, LOOT_DEFS,
  PICKUP_RADIUS, PLAYER_RADIUS, PLAYER_SPEED, VIEW, clamp, distance,
} from './config.js';
import { SPAWN, buildLevel, circleHitsRects, moveCircle, pointInRect, solidRects } from './world.js';
import { createAlarm, updateAlarm } from './alarm.js';
import { createCameras, cameraSeesPlayer, updateCameras } from './cameras.js';
import { createGuards, guardSeesPlayer, updateGuards } from './guards.js';
import {
  createLockpick, createLoot, lootTakenCount, lootTotalValue,
  nearDoor, nearestLoot, tryPickup, updateLockpick,
} from './loot.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_FAIL = 'fail';

export const STEP = 1 / 60;

export function createGameState(seed) {
  const state = {
    seed: seed || 1,
    time: 0,
    screen: SCREEN_TITLE,
    level: buildLevel(),
    player: {
      x: SPAWN.x, y: SPAWN.y, r: PLAYER_RADIUS,
      facing: -Math.PI / 2, moving: false,
    },
    guards: createGuards(),
    cameras: createCameras(),
    loot: createLoot(),
    lockpick: createLockpick(),
    doorOpen: false,
    alarm: createAlarm(),
    result: null,
    clickTarget: null,
    auto: { detour: null, stuckTime: 0, lastX: SPAWN.x, lastY: SPAWN.y },
    stats: { timesSpotted: 0, pickups: 0 },
    flash: 0, // counts down after a pickup, for the renderer's sparkle
  };
  return state;
}

/** Put a state back at the start of a fresh heist, keeping its seed. */
export function resetGameState(state) {
  const fresh = createGameState(state.seed);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.screen = SCREEN_TITLE;
}

function exitCenter() {
  return { x: 640, y: 674 };
}

/** A normalised step toward (tx, ty), or {0,0} when already there. */
export function steerToward(state, tx, ty) {
  const dx = tx - state.player.x;
  const dy = ty - state.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) return { dx: 0, dy: 0 };
  return { dx: dx / dist, dy: dy / dist };
}

/** The vault wall splits the map in two: any route across it goes through the door gap. */
function viaDoor(state, target) {
  const inVault = state.player.y < 300;
  const targetInVault = target.y < 300;
  if (inVault === targetInVault) return target;
  return inVault ? { x: 640, y: 340 } : { x: 640, y: 250 };
}

/**
 * The autopilot: the route a careful thief walks — vault door, the three treasures,
 * then the getaway door — ducking to a hide spot when the alarm gets hot.
 * Returns the same input shape a keyboard hands stepGame.
 */
export function autopilotInput(state) {
  const input = { dx: 0, dy: 0, interactHeld: false, interactPressed: false };
  const player = state.player;
  const taken = lootTakenCount(state.loot);

  // Too hot: fall back to the nearest hide spot until nobody can see the thief.
  // Both spots sit south of the gallery lane, far from every cone and camera.
  if (state.alarm.value > 30 && state.alarm.spotted) {
    const hide = player.x < VIEW.width / 2 ? { x: 500, y: 680 } : { x: 780, y: 680 };
    const step = steerToward(state, viaDoor(state, hide).x, viaDoor(state, hide).y);
    input.dx = step.dx;
    input.dy = step.dy;
    return input;
  }

  let target = null;
  if (!state.doorOpen) {
    target = { x: 640, y: 340 };
    if (nearDoor(player)) {
      input.interactHeld = true;
      return input; // stand at the door and work the pick
    }
  } else if (taken < LOOT_DEFS.length) {
    const next = state.loot.find((piece) => !piece.taken);
    target = { x: next.x, y: next.y };
    if (nearestLoot(state.loot, player) !== null) {
      input.interactPressed = true;
      return input;
    }
  } else {
    target = exitCenter();
  }

  // Stuck watch: if the thief makes no progress toward the target, swing wide
  // around the nearer side of the hall before trying the straight line again.
  const auto = state.auto;
  const moved = distance(player.x, player.y, auto.lastX, auto.lastY);
  if (moved < 2) auto.stuckTime += STEP;
  else auto.stuckTime = 0;
  auto.lastX = player.x;
  auto.lastY = player.y;
  if (auto.stuckTime > 0.8 && !auto.detour) {
    auto.detour = player.x < VIEW.width / 2 ? { x: 500, y: 560 } : { x: 780, y: 560 };
    auto.stuckTime = 0;
  }
  if (auto.detour) {
    const waypoint = viaDoor(state, auto.detour);
    const step = steerToward(state, waypoint.x, waypoint.y);
    if (step.dx === 0 && step.dy === 0) auto.detour = null;
    else {
      input.dx = step.dx;
      input.dy = step.dy;
      return input;
    }
  }
  const waypoint = viaDoor(state, target);
  const step = steerToward(state, waypoint.x, waypoint.y);
  input.dx = step.dx;
  input.dy = step.dy;
  return input;
}

/**
 * One fixed step of a live heist. `input` is {dx, dy, interactHeld, interactPressed}.
 * Moves the thief, patrols the guards, sweeps the cameras, works the alarm, the
 * lockpick and the loot, and flips the screen to win or fail when the job ends.
 */
export function stepGame(state, dt, input) {
  state.time += dt;
  const player = state.player;
  const solids = solidRects(state.level, state.doorOpen);

  // --- movement: keys first, click-to-move second ---
  let mx = input.dx || 0;
  let my = input.dy || 0;
  if (mx === 0 && my === 0 && state.clickTarget) {
    const step = steerToward(state, state.clickTarget.x, state.clickTarget.y);
    mx = step.dx;
    my = step.dy;
    if (step.dx === 0 && step.dy === 0) state.clickTarget = null;
  }
  const length = Math.hypot(mx, my);
  if (length > 0) {
    mx /= length;
    my /= length;
    player.facing = Math.atan2(my, mx);
    player.moving = true;
    moveCircle(player, mx * PLAYER_SPEED * dt, my * PLAYER_SPEED * dt, solids);
  } else {
    player.moving = false;
  }

  // --- the watchers ---
  updateGuards(state.guards, dt, player, state.level, state.doorOpen);
  updateCameras(state.cameras, dt, state.time);
  const blockers = state.level.walls.concat(state.level.cases);
  if (!state.doorOpen) blockers.push({ x: 560, y: 288, w: 160, h: 24 });

  let seen = null;
  for (let i = 0; i < state.guards.length; i += 1) {
    if (guardSeesPlayer(state.guards[i], player, blockers)) { seen = 'guard'; break; }
  }
  if (seen === null) {
    for (let i = 0; i < state.cameras.length; i += 1) {
      if (cameraSeesPlayer(state.cameras[i], player, blockers)) { seen = 'camera'; break; }
    }
  }
  if (seen !== null && !state.alarm.spotted) state.stats.timesSpotted += 1;
  if (updateAlarm(state.alarm, dt, seen)) {
    state.screen = SCREEN_FAIL;
    state.result = {
      reason: 'The alarm hit 100% — security swarmed the hall and the thief was caught.',
      time: state.time,
      value: lootTotalValue(state.loot),
      pieces: lootTakenCount(state.loot),
    };
    return;
  }

  // --- the vault door ---
  if (!state.doorOpen && nearDoor(player) && input.interactHeld) {
    if (updateLockpick(state.lockpick, dt, true)) {
      state.doorOpen = true;
      state.flash = 0.6;
    }
  }

  // --- the loot ---
  if (input.interactPressed) {
    const piece = tryPickup(state.loot, player);
    if (piece !== null) {
      state.stats.pickups += 1;
      state.flash = 0.6;
    }
  }
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

  // --- the getaway ---
  const exit = exitCenter();
  const allLoot = lootTakenCount(state.loot) === LOOT_DEFS.length;
  if (allLoot && distance(player.x, player.y, exit.x, exit.y) <= EXIT_RADIUS) {
    state.screen = SCREEN_WIN;
    state.result = {
      reason: '',
      time: state.time,
      value: lootTotalValue(state.loot),
      pieces: LOOT_DEFS.length,
    };
  }
}

/** The one-line objective the HUD shows right now. */
export function currentObjective(state) {
  if (!state.doorOpen) return 'Reach the vault door — hold E to pick the lock';
  const taken = lootTakenCount(state.loot);
  if (taken < LOOT_DEFS.length) return `Lift the treasures — ${taken}/3 taken (E to grab)`;
  return 'All loot secured — reach the getaway door!';
}

/** True when the thief stands in the exit zone before the job is done. */
export function atExitEarly(state) {
  const exit = exitCenter();
  return lootTakenCount(state.loot) < LOOT_DEFS.length
    && distance(state.player.x, state.player.y, exit.x, exit.y) <= EXIT_RADIUS;
}
