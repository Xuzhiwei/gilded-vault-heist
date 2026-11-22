// Gilded Vault Heist: keyboard and mouse input.
// One job: turn keys and clicks into one input shape the simulation reads.
// Held keys steer; E is both a hold (the lockpick) and a press edge (grab loot);
// Enter starts, R retries, and a click both starts the game and sets a
// click-to-move target. One-shot presses are queued and taken once, so a press
// between two frames is never lost and never counted twice.
import { VIEW } from './config.js';

const MOVE_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

export function createInput(canvas) {
  const held = new Set();
  const input = {
    interactHeld: false,
    interactPressed: false,
    confirmPressed: false,
    restartPressed: false,
    clickTarget: null,
    clickPoint: null,
    _pressedE: false,
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (MOVE_KEYS.has(event.code) || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'KeyE') {
      input.interactHeld = true;
      input.interactPressed = true;
      input._pressedE = true;
    }
    if (event.code === 'Enter' || event.code === 'Space') input.confirmPressed = true;
    if (event.code === 'KeyR') input.restartPressed = true;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    if (event.code === 'KeyE') input.interactHeld = false;
  });
  window.addEventListener('blur', () => {
    held.clear();
    input.interactHeld = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    input.clickPoint = point;
    input.clickTarget = point;
    input.confirmPressed = true;
  });

  return {
    /** The steering vector from held keys, normalised, or {0,0}. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) x -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) x += 1;
      if (held.has('ArrowUp') || held.has('KeyW')) y -= 1;
      if (held.has('ArrowDown') || held.has('KeyS')) y += 1;
      const length = Math.hypot(x, y);
      if (length === 0) return { dx: 0, dy: 0 };
      return { dx: x / length, dy: y / length };
    },
    /** True while E is held down (the lockpick). */
    get interactHeld() {
      return input.interactHeld;
    },
    /** Take the queued E press edge, if one arrived since the last take. */
    takeInteractPressed() {
      const pressed = input.interactPressed;
      input.interactPressed = false;
      return pressed;
    },
    /** Take the queued confirm (Enter / Space / click), if one arrived. */
    takeConfirm() {
      const pressed = input.confirmPressed;
      input.confirmPressed = false;
      return pressed;
    },
    /** Take the queued R press, if one arrived. */
    takeRestart() {
      const pressed = input.restartPressed;
      input.restartPressed = false;
      return pressed;
    },
    /** Take the queued click point, if the player clicked since the last take. */
    takeClickPoint() {
      const point = input.clickPoint;
      input.clickPoint = null;
      return point;
    },
    /** The current click-to-move target, or null. */
    get clickTarget() {
      return input.clickTarget;
    },
    clearClickTarget() {
      input.clickTarget = null;
    },
  };
}
