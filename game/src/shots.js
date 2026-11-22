// Gilded Vault Heist: the screenshot scenes behind ?shot=start|play|end.
// One job: play the real rules forward from a fresh heist with the autopilot, so
// every frame is what a short game really looks like and the same seed always
// gives the same frame. No state is faked: the alarm reading in the play shot is
// the meter the simulation itself raised while the thief stood in a camera sector.
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP, autopilotInput, resetGameState, steerToward, stepGame } from './game.js';
import { lootTakenCount } from './loot.js';

const TITLE_SECONDS = 5;
const PHOTO_SPOT = { x: 440, y: 510 }; // inside Camera West's sweep, clear of cover
const PHOTO_ALARM = 40;
const PHOTO_MAX_SECONDS = 12;
const END_LIMIT_SECONDS = 240;

function idle(state, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    stepGame(state, STEP, { dx: 0, dy: 0, interactHeld: false, interactPressed: false });
  }
}

/**
 * Set `state` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, state) {
  resetGameState(state);
  state.screen = SCREEN_TITLE;
  if (name !== 'play' && name !== 'end') {
    idle(state, TITLE_SECONDS);
    return { screen: SCREEN_TITLE };
  }

  if (name === 'play') {
    // Walk the heist until two treasures are lifted, then step onto the photo
    // spot and stand in the camera's sweep until the alarm reads about 40%.
    // The photo spot is across the hall: leave the vault through the door gap
    // first, or the wall pins the thief in the vault guard's cone.
    let photoSeconds = 0;
    let arrived = false;
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      if (state.screen !== SCREEN_TITLE && state.screen !== SCREEN_PLAY) break;
      state.screen = SCREEN_PLAY;
      let input;
      if (lootTakenCount(state.loot) < 2) {
        input = autopilotInput(state);
      } else if (state.alarm.spotted && state.alarm.value > 30) {
        input = autopilotInput(state); // too hot: duck away first, then resume
      } else if (!arrived) {
        const waypoint = state.player.y < 300 ? { x: 640, y: 340 } : PHOTO_SPOT;
        const step = steerToward(state, waypoint.x, waypoint.y);
        input = { dx: step.dx, dy: step.dy, interactHeld: false, interactPressed: false };
        if (waypoint === PHOTO_SPOT && step.dx === 0 && step.dy === 0) arrived = true;
      } else {
        input = { dx: 0, dy: 0, interactHeld: false, interactPressed: false };
        photoSeconds += STEP;
        if (state.alarm.value >= PHOTO_ALARM || photoSeconds >= PHOTO_MAX_SECONDS) break;
      }
      stepGame(state, STEP, input);
    }
    state.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }

  // End: let the autopilot run the whole job to the getaway door.
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    if (state.screen === SCREEN_WIN || state.screen === 'fail') break;
    state.screen = SCREEN_PLAY;
    stepGame(state, STEP, autopilotInput(state));
  }
  return { screen: state.screen === SCREEN_WIN ? SCREEN_WIN : SCREEN_PLAY };
}
