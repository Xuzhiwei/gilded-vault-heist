// Gilded Vault Heist: drawing only — the state in, pixels out.
// One job: paint the vault at night in deep navy and gilt gold, so safe cover,
// danger and loot are obvious at a glance: amber guard cones, red camera sectors,
// gold treasure, and a red alarm bar across the top. No images, no emoji, every
// shape drawn on the canvas. The playfield is a fixed 1280x720; the page scales it.
import {
  CAMERA_HALF_ANGLE, CAMERA_RANGE, CONE_HALF_ANGLE, CONE_RANGE,
  LOCKPICK_GREEN_HIGH, LOCKPICK_GREEN_LOW, PALETTE, VIEW,
} from './config.js';
import { DOOR, EXIT, WALL } from './world.js';
import { currentObjective } from './game.js';
import { lootTakenCount } from './loot.js';
import { LOOT_DEFS } from './config.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight || 400} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWedge(ctx, x, y, angle, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.stroke();
}

function drawFloor(ctx, state) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Stone tile seams.
  ctx.strokeStyle = PALETTE.floorTile;
  ctx.lineWidth = 1;
  for (let x = 24; x < VIEW.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, VIEW.height - 24); ctx.stroke();
  }
  for (let y = 24; y < VIEW.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(VIEW.width - 24, y); ctx.stroke();
  }
  // The vault's carpet and the hall's runner: two rooms, two moods.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(48, 48, VIEW.width - 96, 216);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, VIEW.width - 96, 216);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
  ctx.fillRect(560, 336, 160, 336);
  text(ctx, 'VAULT', 64, 72, 20, PALETTE.gold, 'left', 600);
  text(ctx, 'GALLERY', 640, 392, 16, PALETTE.dim, 'center', 600);
}

function drawWallsAndCases(ctx, state) {
  const rects = state.level.walls.concat(state.level.cases);
  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i];
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }
  // Glass display cases get a pale glint so they read as cover, not floor.
  for (let i = 0; i < state.level.cases.length; i += 1) {
    const rect = state.level.cases[i];
    ctx.fillStyle = 'rgba(180, 210, 255, 0.10)';
    ctx.fillRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12);
    ctx.strokeStyle = 'rgba(220, 235, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + 8, rect.y + rect.h - 8);
    ctx.lineTo(rect.x + rect.w - 8, rect.y + 8);
    ctx.stroke();
  }
}

function drawDoor(ctx, state) {
  if (state.doorOpen) {
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(DOOR.x, DOOR.y - 4, DOOR.w, DOOR.h + 8);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(DOOR.x, DOOR.y - 4, DOOR.w, DOOR.h + 8);
    text(ctx, 'OPEN', 640, DOOR.y + DOOR.h + 16, 12, PALETTE.safe, 'center', 700);
    return;
  }
  // Locked: three gold bars across the gap, with a keyhole boss in the middle.
  ctx.fillStyle = '#3a2f12';
  ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  ctx.fillStyle = PALETTE.gold;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(DOOR.x + 14 + i * 30, DOOR.y + 2, 8, DOOR.h - 4);
  }
  ctx.beginPath();
  ctx.arc(640, DOOR.y + DOOR.h / 2, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1405';
  ctx.fill();
  ctx.strokeStyle = PALETTE.goldBright;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'LOCKED', 640, DOOR.y + DOOR.h + 16, 12, PALETTE.gold, 'center', 700);
}

function drawExit(ctx, state) {
  const active = lootTakenCount(state.loot) === LOOT_DEFS.length;
  ctx.fillStyle = active ? '#12351f' : '#241f14';
  ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  ctx.strokeStyle = active ? PALETTE.safe : PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  text(ctx, 'EXIT', 640, EXIT.y + 15, 14, active ? PALETTE.safe : PALETTE.gold, 'center', 700);
  text(ctx, active ? 'GETAWAY' : 'LOCKED', 640, EXIT.y + 32, 10, PALETTE.dim, 'center', 600);
  if (active) {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
    ctx.strokeStyle = `rgba(87, 199, 133, ${0.25 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(EXIT.x - 4, EXIT.y - 4, EXIT.w + 8, EXIT.h + 8);
  }
}

function drawLoot(ctx, state) {
  for (let i = 0; i < state.loot.length; i += 1) {
    const piece = state.loot[i];
    if (piece.taken) continue;
    // Pedestal.
    ctx.fillStyle = '#2a3350';
    ctx.fillRect(piece.x - 26, piece.y + 8, 52, 10);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(piece.x - 26, piece.y + 8, 52, 10);
    // A soft gold glow so the target is obvious from across the hall.
    const glow = ctx.createRadialGradient(piece.x, piece.y, 4, piece.x, piece.y, 46);
    glow.addColorStop(0, 'rgba(242, 208, 107, 0.35)');
    glow.addColorStop(1, 'rgba(242, 208, 107, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(piece.x, piece.y, 46, 0, Math.PI * 2);
    ctx.fill();
    if (piece.id === 'crown') {
      ctx.fillStyle = PALETTE.goldBright;
      ctx.beginPath();
      ctx.moveTo(piece.x - 18, piece.y + 6);
      ctx.lineTo(piece.x - 18, piece.y - 10);
      ctx.lineTo(piece.x - 9, piece.y - 2);
      ctx.lineTo(piece.x, piece.y - 14);
      ctx.lineTo(piece.x + 9, piece.y - 2);
      ctx.lineTo(piece.x + 18, piece.y - 10);
      ctx.lineTo(piece.x + 18, piece.y + 6);
      ctx.closePath();
      ctx.fill();
    } else if (piece.id === 'gold') {
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(piece.x - 18, piece.y + 2, 16, 8);
      ctx.fillRect(piece.x + 2, piece.y + 2, 16, 8);
      ctx.fillStyle = PALETTE.goldBright;
      ctx.fillRect(piece.x - 8, piece.y - 8, 16, 8);
    } else {
      // The portrait: a gilt frame with a tiny painted scene inside.
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(piece.x - 20, piece.y - 16, 40, 32);
      ctx.fillStyle = '#1d2f57';
      ctx.fillRect(piece.x - 16, piece.y - 12, 32, 24);
      ctx.fillStyle = PALETTE.goldBright;
      ctx.beginPath();
      ctx.arc(piece.x + 6, piece.y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0e1a30';
      ctx.fillRect(piece.x - 16, piece.y + 4, 32, 8);
    }
    text(ctx, piece.name, piece.x, piece.y + 32, 11, PALETTE.gold, 'center', 600);
  }
}

function drawGuards(ctx, state) {
  for (let i = 0; i < state.guards.length; i += 1) {
    const guard = state.guards[i];
    drawWedge(ctx, guard.x, guard.y, guard.facing, CONE_HALF_ANGLE, CONE_RANGE,
      PALETTE.coneGuard, PALETTE.coneGuardEdge);
  }
  // Cameras after the guards so the red sectors sit on top where they overlap.
  for (let i = 0; i < state.cameras.length; i += 1) {
    const camera = state.cameras[i];
    drawWedge(ctx, camera.x, camera.y, camera.angle, CAMERA_HALF_ANGLE, CAMERA_RANGE,
      PALETTE.coneCamera, PALETTE.coneCameraEdge);
  }
}

function drawPeople(ctx, state) {
  // Cameras: a mount and a lens that points down the sector.
  for (let i = 0; i < state.cameras.length; i += 1) {
    const camera = state.cameras[i];
    ctx.fillStyle = '#39415a';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e05252';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e05252';
    ctx.beginPath();
    ctx.arc(
      camera.x + Math.cos(camera.angle) * 6,
      camera.y + Math.sin(camera.angle) * 6, 3.5, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  // Guards: navy uniform, peaked cap, facing tick, and a shout mark when alerted.
  for (let i = 0; i < state.guards.length; i += 1) {
    const guard = state.guards[i];
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x + 3, guard.y + 5, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#31406b';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8fa3d9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1c2745';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 4, 9, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(
      guard.x + Math.cos(guard.facing) * (guard.r + 6),
      guard.y + Math.sin(guard.facing) * (guard.r + 6),
    );
    ctx.stroke();
    if (guard.alert) {
      text(ctx, '!', guard.x, guard.y - 26, 22, '#ff5a5a', 'center', 800);
    }
  }
  // The thief: a hooded figure in dark cloth with a gold-trimmed mask.
  const player = state.player;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x + 3, player.y + 6, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#3a4152';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 2, 8, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PALETTE.goldBright;
  ctx.beginPath();
  ctx.arc(player.x - 4, player.y - 1, 1.8, 0, Math.PI * 2);
  ctx.arc(player.x + 4, player.y - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (state.flash > 0) {
    ctx.strokeStyle = `rgba(242, 208, 107, ${state.flash})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Click-to-move marker.
  if (state.clickTarget) {
    ctx.strokeStyle = 'rgba(232, 236, 244, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.clickTarget.x, state.clickTarget.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(state.clickTarget.x - 12, state.clickTarget.y);
    ctx.lineTo(state.clickTarget.x + 12, state.clickTarget.y);
    ctx.moveTo(state.clickTarget.x, state.clickTarget.y - 12);
    ctx.lineTo(state.clickTarget.x, state.clickTarget.y + 12);
    ctx.stroke();
  }
}

function drawLockpick(ctx, state) {
  if (state.doorOpen) return;
  const player = state.player;
  const near = Math.hypot(player.x - 640, player.y - 300) <= 90;
  if (!near && state.lockpick.progress <= 0) return;
  const x = 440;
  const y = 596;
  const w = 400;
  const h = 14;
  ctx.fillStyle = 'rgba(6, 10, 20, 0.85)';
  roundRect(ctx, x - 16, y - 30, w + 32, 66, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, 'LOCKPICK — hold E, keep the needle in the gold band', 640, y - 16, 13, PALETTE.ink, 'center', 600);
  ctx.fillStyle = '#2a3350';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(
    x + w * LOCKPICK_GREEN_LOW, y,
    w * (LOCKPICK_GREEN_HIGH - LOCKPICK_GREEN_LOW), h,
  );
  const needleX = x + w * state.lockpick.needle;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(needleX - 2, y - 4, 4, h + 8);
  ctx.fillStyle = PALETTE.goldBright;
  ctx.fillRect(x, y + h + 6, w * state.lockpick.progress, 5);
}

function drawPrompts(ctx, state) {
  const player = state.player;
  let line = '';
  if (!state.doorOpen && Math.hypot(player.x - 640, player.y - 300) <= 90) {
    line = 'Hold E — pick the vault lock';
  } else {
    for (let i = 0; i < state.loot.length; i += 1) {
      const piece = state.loot[i];
      if (!piece.taken && Math.hypot(player.x - piece.x, player.y - piece.y) <= 40) {
        line = `Press E — lift the ${piece.name}`;
        break;
      }
    }
  }
  if (line === '' && lootTakenCount(state.loot) < LOOT_DEFS.length
    && Math.hypot(player.x - 640, player.y - 674) <= 60) {
    line = 'The getaway door stays shut until all three treasures are lifted';
  }
  if (line !== '') text(ctx, line, 640, 676, 15, PALETTE.ink, 'center', 600);
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(6, 10, 20, 0.88)';
  ctx.fillRect(0, 0, VIEW.width, 52);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, 52, VIEW.width, 2);
  text(ctx, 'GILDED VAULT HEIST', 24, 27, 17, PALETTE.gold, 'left', 700);

  // Alarm meter.
  const alarm = state.alarm;
  const barX = 470;
  const barY = 18;
  const barW = 300;
  const barH = 16;
  const label = alarm.spotted ? 'ALARM — SEEN!' : 'ALARM';
  text(ctx, label, barX - 10, 27, 14, alarm.spotted ? '#ff6b6b' : PALETTE.ink, 'right', 700);
  ctx.fillStyle = '#2a3350';
  ctx.fillRect(barX, barY, barW, barH);
  const ratio = alarm.value / 100;
  ctx.fillStyle = ratio > 0.66 ? '#e05252' : ratio > 0.33 ? '#e0a13c' : PALETTE.safe;
  ctx.fillRect(barX, barY, barW * ratio, barH);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  text(ctx, `${Math.round(alarm.value)}%`, barX + barW + 10, 27, 14, PALETTE.ink, 'left', 600);

  // Loot pips and the clock.
  const taken = lootTakenCount(state.loot);
  text(ctx, `LOOT ${taken}/3`, 830, 27, 14, PALETTE.gold, 'left', 700);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < taken ? PALETTE.goldBright : '#2a3350';
    ctx.beginPath();
    ctx.arc(920 + i * 26, 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60);
  text(ctx, `${minutes}:${String(seconds).padStart(2, '0')}`, 1010, 27, 14, PALETTE.ink, 'left', 600);
  text(ctx, currentObjective(state), 640, 74, 14, PALETTE.dim, 'center', 500);
  // The alarm label already turns red and reads SEEN while the thief is watched;
  // no extra banner is drawn, so it never collides with the room labels.
}

function drawPanel(ctx, lines, prompt) {
  ctx.fillStyle = 'rgba(6, 10, 20, 0.86)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  let y = 150;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    text(ctx, line.text, 640, y, line.size, line.color, 'center', line.weight || 400);
    y += line.gap;
  }
  if (prompt) {
    const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 300);
    text(ctx, prompt, 640, y + 30, 18, `rgba(242, 208, 107, ${pulse})`, 'center', 700);
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Paint one frame of the game, whatever screen it is on. */
export function drawGame(ctx, state) {
  drawFloor(ctx, state);
  drawGuards(ctx, state);
  drawWallsAndCases(ctx, state);
  drawDoor(ctx, state);
  drawExit(ctx, state);
  drawLoot(ctx, state);
  drawPeople(ctx, state);
  drawLockpick(ctx, state);
  if (state.screen === 'play') {
    drawPrompts(ctx, state);
    drawHud(ctx, state);
    return;
  }
  if (state.screen === 'title') {
    drawHud(ctx, state);
    drawPanel(ctx, [
      { text: 'GILDED VAULT HEIST', size: 58, color: PALETTE.goldBright, gap: 76, weight: 800 },
      { text: 'One thief. One vault. Three treasures. No second chances.', size: 19, color: PALETTE.ink, gap: 44 },
      { text: 'WASD / arrows — move      Click — walk there      E — lift loot, hold E — pick the lock', size: 16, color: PALETTE.dim, gap: 34 },
      { text: 'Guards and cameras watch with cones of sight — walls and cases hide you.', size: 16, color: PALETTE.dim, gap: 34 },
      { text: 'Seen? The alarm climbs. Hidden? It falls. At 100% the job is over.', size: 16, color: PALETTE.dim, gap: 34 },
      { text: 'Lift all three treasures, then slip out the getaway door.', size: 16, color: PALETTE.dim, gap: 40 },
    ], 'PRESS ENTER OR CLICK TO START');
    return;
  }
  if (state.screen === 'win') {
    drawHud(ctx, state);
    const result = state.result || { time: 0, value: 0, pieces: 0 };
    drawPanel(ctx, [
      { text: 'CLEAN GETAWAY!', size: 52, color: PALETTE.goldBright, gap: 70, weight: 800 },
      { text: `All three treasures lifted in ${formatTime(result.time)} — $${result.value.toLocaleString('en-US')} in the bag.`, size: 19, color: PALETTE.ink, gap: 44 },
      { text: `Times spotted: ${state.stats.timesSpotted} — the quieter the thief, the cleaner the job.`, size: 16, color: PALETTE.dim, gap: 40 },
    ], 'PRESS R TO RUN IT AGAIN');
    return;
  }
  // Fail.
  drawHud(ctx, state);
  const result = state.result || { reason: 'Caught.', time: 0, value: 0, pieces: 0 };
  drawPanel(ctx, [
    { text: 'CAUGHT!', size: 52, color: '#ff5a5a', gap: 70, weight: 800 },
    { text: result.reason, size: 19, color: PALETTE.ink, gap: 44 },
    { text: `Loot lifted: ${result.pieces}/3 — $${result.value.toLocaleString('en-US')} — in ${formatTime(result.time)}.`, size: 16, color: PALETTE.dim, gap: 40 },
  ], 'PRESS R TO TRY AGAIN');
}
