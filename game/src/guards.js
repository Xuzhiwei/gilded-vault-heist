// Gilded Vault Heist: the patrol guards and their vision cones.
// One job: walk a waypoint loop, and tell the game when the thief is seen.
// A guard that sees the thief stops, turns to face them, and the alarm climbs;
// break line of sight and the guard goes back to walking its route.
import {
  CONE_HALF_ANGLE, CONE_RANGE, GUARD_PAUSE_SECONDS, GUARD_RADIUS, GUARD_SPEED,
  GUARD_TURN_SPEED, STARE_LIMIT, angleDifference, clamp, distance,
} from './config.js';
import { hasLineOfSight, moveCircle } from './world.js';

export function createGuards() {
  return [
    {
      name: 'Hall Guard',
      x: 300, y: 360, r: GUARD_RADIUS,
      // Walks the west wing north-south, so its cone never covers the vault door:
      // the thief picks the lock in the clear, and the danger is crossing the hall.
      waypoints: [{ x: 300, y: 360 }, { x: 300, y: 620 }],
      waypointIndex: 1, pause: 0, facing: Math.PI / 2, alert: false, stare: 0,
    },
    {
      name: 'Gallery Guard',
      x: 1080, y: 545, r: GUARD_RADIUS,
      waypoints: [{ x: 200, y: 545 }, { x: 1080, y: 545 }],
      waypointIndex: 0, pause: 0, facing: Math.PI, alert: false, stare: 0,
    },
    {
      name: 'Vault Guard',
      x: 380, y: 240, r: GUARD_RADIUS,
      waypoints: [{ x: 380, y: 240 }, { x: 900, y: 240 }],
      waypointIndex: 1, pause: 0, facing: 0, alert: false, stare: 0,
    },
  ];
}

/** True when this guard can see the player right now. */
export function guardSeesPlayer(guard, player, blockers) {
  const dist = distance(guard.x, guard.y, player.x, player.y);
  if (dist > CONE_RANGE) return false;
  const angleToPlayer = Math.atan2(player.y - guard.y, player.x - guard.x);
  if (Math.abs(angleDifference(guard.facing, angleToPlayer)) > CONE_HALF_ANGLE) return false;
  return hasLineOfSight(guard.x, guard.y, player.x, player.y, blockers);
}

/** One step: patrol, or stand and stare while the thief is in the cone. */
export function updateGuards(guards, dt, player, level, doorOpen) {
  const blockers = level.walls.concat(level.cases);
  if (!doorOpen) blockers.push({ x: 560, y: 288, w: 160, h: 24 });
  const solids = blockers;
  for (let i = 0; i < guards.length; i += 1) {
    const guard = guards[i];
    const sees = guardSeesPlayer(guard, player, blockers);
    guard.alert = sees;
    if (sees) guard.stare += dt;
    else guard.stare = 0;
    if (sees && guard.stare <= STARE_LIMIT) {
      // A guard that has eyes on the thief holds position — but its head turns
      // only so fast, so a thief who breaks sideways slips out of the cone.
      // After a short stare the guard gives up and walks on: no stare lasts
      // long enough to fill the alarm meter on its own.
      const wanted = Math.atan2(player.y - guard.y, player.x - guard.x);
      const diff = angleDifference(guard.facing, wanted);
      const turn = clamp(diff, -GUARD_TURN_SPEED * dt, GUARD_TURN_SPEED * dt);
      guard.facing += turn;
      continue;
    }
    if (guard.pause > 0) {
      guard.pause -= dt;
      continue;
    }
    const target = guard.waypoints[guard.waypointIndex];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pause = GUARD_PAUSE_SECONDS;
      continue;
    }
    const step = Math.min(dist, GUARD_SPEED * dt);
    const moveX = (dx / dist) * step;
    const moveY = (dy / dist) * step;
    guard.facing = Math.atan2(moveY, moveX);
    moveCircle(guard, moveX, moveY, solids);
  }
}
