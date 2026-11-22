// Gilded Vault Heist: boot and the one loop.
// Input is read every frame, the heist advances in fixed 1/60 s steps (several in
// a slow frame, none in a fast one), and the renderer paints what is there.
// ?seed=N fixes the run. ?shot=start|play|end stages that scene instead of
// running the loop, paints it, and sets window.__shotReady for a screenshot.
// ?auto=win runs the autopilot; ?auto=caught walks into the nearest guard's cone
// and stands there — both exist so a play-test can drive the real game.
// window.__heist exposes the live state for testing; the game never reads it.
import { VIEW } from './config.js';
import {
  SCREEN_FAIL, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP,
  autopilotInput, createGameState, resetGameState, stepGame,
} from './game.js';
import { createInput } from './input.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const auto = params.get('auto');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const state = createGameState(seed);

window.__heist = { state, version: 'gilded-vault-heist-1' };

// --- small synthesized sounds: no audio files, no network ---
let audioCtx = null;
function beep(frequency, seconds, type, delay) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const when = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.12, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + seconds);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(when);
    osc.stop(when + seconds);
  } catch {
    // Sound is garnish: a browser without audio still plays the game.
  }
}
function playPickup() { beep(880, 0.12, 'triangle'); beep(1320, 0.14, 'triangle', 0.08); }
function playDoor() { beep(220, 0.2, 'square'); beep(330, 0.25, 'square', 0.12); }
function playWin() { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 'triangle', i * 0.12)); }
function playFail() { [330, 262, 196].forEach((f, i) => beep(f, 0.3, 'sawtooth', i * 0.16)); }

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, state);
  state.screen = scene.screen;
  let painted = 0;
  function paint() {
    drawGame(ctx, state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let prevPickups = 0;
  let prevDoorOpen = false;
  let prevScreen = SCREEN_TITLE;

  function startGame() {
    resetGameState(state);
    state.screen = SCREEN_PLAY;
    accumulator = 0;
    prevPickups = 0;
    prevDoorOpen = false;
    prevScreen = SCREEN_PLAY;
    announce('Playing. Lift all three treasures, then reach the getaway door.');
  }

  /** The caught demo: walk to the nearest guard and stand in their cone. */
  function caughtDemoInput() {
    let nearest = state.guards[0];
    let best = Infinity;
    for (let i = 0; i < state.guards.length; i += 1) {
      const d = Math.hypot(state.guards[i].x - state.player.x, state.guards[i].y - state.player.y);
      if (d < best) { best = d; nearest = state.guards[i]; }
    }
    const dx = nearest.x - state.player.x;
    const dy = nearest.y - state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 120) return { dx: dx / dist, dy: dy / dist, interactHeld: false, interactPressed: false };
    // Close enough to be seen: stand still and let the alarm do its work.
    return { dx: 0, dy: 0, interactHeld: false, interactPressed: false };
  }

  function readInput() {
    if (auto === 'win') return autopilotInput(state);
    if (auto === 'caught') return caughtDemoInput();
    const move = input.moveVector();
    return {
      dx: move.dx,
      dy: move.dy,
      interactHeld: input.interactHeld,
      interactPressed: input.takeInteractPressed(),
    };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const confirm = input.takeConfirm();
    const restart = input.takeRestart();
    const clickPoint = input.takeClickPoint();

    if (state.screen === SCREEN_TITLE && (confirm || auto)) startGame();
    else if ((state.screen === SCREEN_WIN || state.screen === SCREEN_FAIL) && (restart || confirm)) {
      startGame();
    }

    if (state.screen === SCREEN_PLAY) {
      if (clickPoint && !auto) state.clickTarget = clickPoint;
      while (accumulator >= STEP) {
        const stepInput = readInput();
        stepGame(state, STEP, stepInput);
        accumulator -= STEP;
        if (state.screen !== SCREEN_PLAY) break;
      }
      if (state.stats.pickups > prevPickups) {
        prevPickups = state.stats.pickups;
        playPickup();
      }
      if (state.doorOpen && !prevDoorOpen) {
        prevDoorOpen = true;
        playDoor();
      }
      if (state.screen !== prevScreen) {
        if (state.screen === SCREEN_WIN) playWin();
        if (state.screen === SCREEN_FAIL) playFail();
        prevScreen = state.screen;
      }
    } else {
      accumulator = 0;
      prevScreen = state.screen;
    }
    drawGame(ctx, state);
  }

  announce('Gilded Vault Heist. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
