// Gilded Vault Heist: the security cameras and their sweeping sectors.
// One job: sweep a sector back and forth, and tell the game when the thief
// crosses it. A camera never moves from its mount; its sector is the threat.
import {
  CAMERA_HALF_ANGLE, CAMERA_RANGE, CAMERA_SWEEP_SPEED,
  angleDifference, distance,
} from './config.js';
import { hasLineOfSight } from './world.js';

export function createCameras() {
  return [
    {
      name: 'Camera West',
      x: 180, y: 330,
      baseAngle: 0.7, // pointing down-right into the hall
      sweep: 0.9, // radians each side of the base angle
      phase: 0,
      angle: 0.7,
    },
    {
      name: 'Camera East',
      x: 1100, y: 330,
      baseAngle: Math.PI - 0.7, // pointing down-left into the hall
      sweep: 0.9,
      phase: 1.6,
      angle: Math.PI - 0.7,
    },
  ];
}

/** One step: the sector swings like a sine wave around its base angle. */
export function updateCameras(cameras, dt, time) {
  for (let i = 0; i < cameras.length; i += 1) {
    const camera = cameras[i];
    camera.angle = camera.baseAngle + Math.sin(time * CAMERA_SWEEP_SPEED + camera.phase) * camera.sweep;
  }
}

/** True when this camera's sector covers the player right now. */
export function cameraSeesPlayer(camera, player, blockers) {
  const dist = distance(camera.x, camera.y, player.x, player.y);
  if (dist > CAMERA_RANGE) return false;
  const angleToPlayer = Math.atan2(player.y - camera.y, player.x - camera.x);
  if (Math.abs(angleDifference(camera.angle, angleToPlayer)) > CAMERA_HALF_ANGLE) return false;
  return hasLineOfSight(camera.x, camera.y, player.x, player.y, blockers);
}
