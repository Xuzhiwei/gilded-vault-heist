// Gilded Vault Heist: the loot and the vault-door lockpick.
// One job: three treasures to lift, and the timed lockpick that opens the vault.
// The lockpick needle sweeps on its own; progress only grows while the needle
// sits in the gold band, so the thief must hold E and watch the dial, not mash it.
import {
  DOOR_INTERACT_RADIUS, LOCKPICK_DRAIN_RATE, LOCKPICK_FILL_RATE,
  LOCKPICK_GREEN_HIGH, LOCKPICK_GREEN_LOW, LOOT_DEFS, PICKUP_RADIUS, clamp, distance,
} from './config.js';

export function createLoot() {
  return LOOT_DEFS.map((def) => ({ ...def, taken: false }));
}

export function lootTakenCount(loot) {
  let count = 0;
  for (let i = 0; i < loot.length; i += 1) if (loot[i].taken) count += 1;
  return count;
}

export function lootTotalValue(loot) {
  let total = 0;
  for (let i = 0; i < loot.length; i += 1) if (loot[i].taken) total += loot[i].value;
  return total;
}

/** The nearest loot the thief can reach right now, or null. */
export function nearestLoot(loot, player) {
  let best = null;
  let bestDist = PICKUP_RADIUS;
  for (let i = 0; i < loot.length; i += 1) {
    if (loot[i].taken) continue;
    const dist = distance(player.x, player.y, loot[i].x, loot[i].y);
    if (dist <= bestDist) {
      bestDist = dist;
      best = loot[i];
    }
  }
  return best;
}

/** Take a piece of loot the thief stands next to; returns the piece or null. */
export function tryPickup(loot, player) {
  const piece = nearestLoot(loot, player);
  if (piece === null) return null;
  piece.taken = true;
  return piece;
}

export function createLockpick() {
  return { needle: 0, direction: 1, progress: 0 };
}

/**
 * One step of the lockpick. `holding` is true while the thief holds E by the door.
 * The needle always sweeps; progress grows only in the gold band. Returns true
 * the moment the pick finishes and the door should open.
 */
export function updateLockpick(lockpick, dt, holding) {
  if (!holding) return false;
  lockpick.needle += lockpick.direction * dt * 1.7;
  if (lockpick.needle >= 1) {
    lockpick.needle = 1;
    lockpick.direction = -1;
  } else if (lockpick.needle <= 0) {
    lockpick.needle = 0;
    lockpick.direction = 1;
  }
  if (lockpick.needle >= LOCKPICK_GREEN_LOW && lockpick.needle <= LOCKPICK_GREEN_HIGH) {
    lockpick.progress += LOCKPICK_FILL_RATE * dt;
  } else {
    lockpick.progress -= LOCKPICK_DRAIN_RATE * dt;
  }
  lockpick.progress = clamp(lockpick.progress, 0, 1);
  return lockpick.progress >= 1;
}

/** True when the thief stands close enough to work the vault door. */
export function nearDoor(player) {
  return distance(player.x, player.y, 640, 300) <= DOOR_INTERACT_RADIUS;
}
