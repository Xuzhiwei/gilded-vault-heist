// Gilded Vault Heist: the floor plan and the geometry the rules stand on.
// One job: walls, display cases, the vault door and the exit, plus circle-vs-rect
// collision and the line-of-sight test that makes cover actually hide the thief.
// No drawing and no browser in here; the renderer only reads these rectangles.
import { VIEW } from './config.js';

export const WALL = 24; // outer wall thickness, in pixels

// The vault wall runs across the hall at y 288..312 with a 160px door gap in the middle.
export const VAULT_WALL_Y = 288;
export const DOOR = { x: 560, y: 288, w: 160, h: 24 };
export const EXIT = { x: 600, y: 652, w: 80, h: 44 };
export const SPAWN = { x: 560, y: 680 };

/** Every solid rectangle of the level, in drawing order. The vault door is added separately. */
export function buildLevel() {
  const walls = [
    { x: 0, y: 0, w: VIEW.width, h: WALL }, // north outer wall
    { x: 0, y: VIEW.height - WALL, w: VIEW.width, h: WALL }, // south outer wall
    { x: 0, y: 0, w: WALL, h: VIEW.height }, // west outer wall
    { x: VIEW.width - WALL, y: 0, w: WALL, h: VIEW.height }, // east outer wall
    { x: WALL, y: VAULT_WALL_Y, w: DOOR.x - WALL, h: WALL }, // vault wall, west of the door
    { x: DOOR.x + DOOR.w, y: VAULT_WALL_Y, w: VIEW.width - WALL - (DOOR.x + DOOR.w), h: WALL }, // vault wall, east
  ];
  // Display cases: solid cover that blocks movement and sight. The middle lane
  // x 570..710 stays open so the thief always has one clear route to the vault.
  // The cases are placed so no patrol lane runs alongside the vault door: the
  // thief picks the lock out of every cone, and the danger is getting there.
  const cases = [
    { x: 60, y: 360, w: 110, h: 70 },
    { x: 920, y: 340, w: 140, h: 70 },
    { x: 460, y: 460, w: 90, h: 60 },
    { x: 730, y: 460, w: 90, h: 60 },
    { x: 120, y: 580, w: 140, h: 70 },
    { x: 860, y: 580, w: 140, h: 70 },
    { x: 120, y: 120, w: 110, h: 60 }, // vault west case
    { x: 1050, y: 120, w: 110, h: 60 }, // vault east case
  ];
  return { walls, cases };
}

/** All rectangles that block movement right now (the door counts while locked). */
export function solidRects(level, doorOpen) {
  const rects = level.walls.concat(level.cases);
  if (!doorOpen) rects.push(DOOR);
  return rects;
}

/** All rectangles that block sight (same set as movement: cover hides you). */
export function sightBlockers(level, doorOpen) {
  return solidRects(level, doorOpen);
}

/** True when the circle at (x, y) with radius r overlaps any of `rects`. */
export function circleHitsRects(x, y, r, rects) {
  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i];
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/** Move a circle axis by axis so it slides along walls instead of sticking. */
export function moveCircle(body, dx, dy, rects) {
  const nextX = body.x + dx;
  if (!circleHitsRects(nextX, body.y, body.r, rects)) body.x = nextX;
  const nextY = body.y + dy;
  if (!circleHitsRects(body.x, nextY, body.r, rects)) body.y = nextY;
}

/** True when the segment (x1,y1)-(x2,y2) touches rectangle `rect`. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  // Slab test, one axis at a time.
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when nothing solid stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

/** True when point (x, y) lies inside rectangle `rect`. */
export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
