// Painting the garden: a top-down night scene on one canvas.
// The wardens' vision cones are wide yellow wedges, lantern light pools around
// every walker, and a darkness layer leaves only lit ground readable — the
// lighting itself tells the player where it is safe to stand.
import { FIELD, GUARD, TILE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const DARK = 'rgba(5, 10, 22, 0.52)';

function conePath(context, guard) {
  context.beginPath();
  context.moveTo(guard.x, guard.y);
  context.arc(guard.x, guard.y, GUARD.viewRange, guard.angle - GUARD.viewHalfAngle, guard.angle + GUARD.viewHalfAngle);
  context.closePath();
}

function drawGround(context, state) {
  context.fillStyle = '#17251f';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  // Mossy flagstones, two tones, so the floor reads at a glance.
  for (let row = 0; row < FIELD.height / TILE; row += 1) {
    for (let col = 0; col < FIELD.width / TILE; col += 1) {
      if ((row + col) % 2 === 0) {
        context.fillStyle = '#1a2b24';
        context.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
  }
  // A worn stone path from the start to the gate.
  context.fillStyle = '#2c2a33';
  context.fillRect(TILE, 17 * TILE, 25 * TILE, TILE);
  context.fillRect(25 * TILE, 2 * TILE, TILE, 16 * TILE);
  context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  context.lineWidth = 1;
  for (let row = 0; row < FIELD.height / TILE; row += 1) {
    context.beginPath();
    context.moveTo(0, row * TILE);
    context.lineTo(FIELD.width, row * TILE);
    context.stroke();
  }
  for (let col = 0; col < FIELD.width / TILE; col += 1) {
    context.beginPath();
    context.moveTo(col * TILE, 0);
    context.lineTo(col * TILE, FIELD.height);
    context.stroke();
  }
}

function drawFerns(context, level) {
  for (const fern of level.ferns) {
    context.fillStyle = '#1e4d2e';
    context.fillRect(fern.x, fern.y, fern.w, fern.h);
    context.fillStyle = '#2c6b3f';
    for (let y = fern.y + 6; y < fern.y + fern.h; y += 12) {
      for (let x = fern.x + 6; x < fern.x + fern.w; x += 12) {
        context.beginPath();
        context.arc(x, y, 7, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.fillStyle = '#3f9155';
    for (let y = fern.y + 10; y < fern.y + fern.h; y += 16) {
      for (let x = fern.x + 10; x < fern.x + fern.w; x += 16) {
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
}

function drawCrates(context, level) {
  for (const crate of level.crates) {
    context.fillStyle = '#6b4a2a';
    context.fillRect(crate.x + 2, crate.y + 2, crate.w - 4, crate.h - 4);
    context.strokeStyle = '#8a6238';
    context.lineWidth = 2;
    context.strokeRect(crate.x + 2, crate.y + 2, crate.w - 4, crate.h - 4);
    context.beginPath();
    context.moveTo(crate.x + 2, crate.y + 2);
    context.lineTo(crate.x + crate.w - 2, crate.y + crate.h - 2);
    context.moveTo(crate.x + crate.w - 2, crate.y + 2);
    context.lineTo(crate.x + 2, crate.y + crate.h - 2);
    context.stroke();
  }
}

function drawWalls(context, level) {
  for (const wall of level.walls) {
    context.fillStyle = '#3d4454';
    context.fillRect(wall.x, wall.y, wall.w, wall.h);
    context.fillStyle = '#565e73';
    context.fillRect(wall.x, wall.y, wall.w, 4);
    context.fillStyle = 'rgba(0, 0, 0, 0.25)';
    context.fillRect(wall.x, wall.y + wall.h - 4, wall.w, 4);
  }
}

function drawExit(context, level, time) {
  const exit = level.exit;
  const pulse = 0.55 + 0.25 * Math.sin(time * 3);
  const glow = context.createRadialGradient(
    exit.x + exit.w / 2,
    exit.y + exit.h / 2,
    4,
    exit.x + exit.w / 2,
    exit.y + exit.h / 2,
    70,
  );
  glow.addColorStop(0, `rgba(64, 224, 180, ${pulse})`);
  glow.addColorStop(1, 'rgba(64, 224, 180, 0)');
  context.fillStyle = glow;
  context.fillRect(exit.x - 70, exit.y - 70, exit.w + 140, exit.h + 140);
  context.fillStyle = '#2ee6a8';
  context.fillRect(exit.x, exit.y, exit.w, exit.h);
  context.fillStyle = '#06281d';
  context.font = 'bold 13px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2);
}

function drawPetals(context, level, time) {
  for (const petal of level.petals) {
    if (petal.taken) continue;
    const bob = Math.sin(time * 2 + petal.x) * 2;
    const glow = context.createRadialGradient(petal.x, petal.y + bob, 1, petal.x, petal.y + bob, 22);
    glow.addColorStop(0, 'rgba(255, 183, 213, 0.8)');
    glow.addColorStop(1, 'rgba(255, 183, 213, 0)');
    context.fillStyle = glow;
    context.fillRect(petal.x - 22, petal.y + bob - 22, 44, 44);
    context.fillStyle = '#ffd7ea';
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 + time * 0.4;
      context.beginPath();
      context.ellipse(petal.x + Math.cos(angle) * 6, petal.y + bob + Math.sin(angle) * 6, 4, 2.5, angle, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = '#ff9ec7';
    context.beginPath();
    context.arc(petal.x, petal.y + bob, 3, 0, Math.PI * 2);
    context.fill();
  }
}

function drawGuard(context, guard, alarmed) {
  // The vision cone: warm yellow, stronger near the warden.
  const gradient = context.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, GUARD.viewRange);
  const colour = alarmed ? '255, 90, 70' : '255, 214, 110';
  gradient.addColorStop(0, `rgba(${colour}, 0.34)`);
  gradient.addColorStop(1, `rgba(${colour}, 0.05)`);
  conePath(context, guard);
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = `rgba(${colour}, 0.35)`;
  context.lineWidth = 1;
  context.stroke();

  // The warden: a maroon cloak, a brass lantern, a watchful face.
  context.fillStyle = '#7a2e2e';
  context.beginPath();
  context.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffd27a';
  context.beginPath();
  context.arc(guard.x + Math.cos(guard.angle) * 9, guard.y + Math.sin(guard.angle) * 9, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f4e6c8';
  context.beginPath();
  context.arc(guard.x + Math.cos(guard.angle) * 4, guard.y + Math.sin(guard.angle) * 4, 2.5, 0, Math.PI * 2);
  context.fill();
  if (alarmed) {
    context.fillStyle = '#ff5a46';
    context.font = 'bold 20px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText('!', guard.x, guard.y - guard.radius - 4);
  }
}

function drawPlayer(context, player, time) {
  const bob = player.moving ? Math.sin(time * 12) * 1.5 : 0;
  context.save();
  if (player.inFern) context.globalAlpha = 0.55;
  // The courier: a teal hooded cloak, pale face, quiet feet.
  context.fillStyle = '#1f8f7a';
  context.beginPath();
  context.arc(player.x, player.y + bob, player.radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#0e5c4d';
  context.beginPath();
  context.arc(player.x, player.y + bob, player.radius - 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffe9c9';
  context.beginPath();
  context.arc(
    player.x + Math.cos(player.angle) * 5,
    player.y + bob + Math.sin(player.angle) * 5,
    4,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = '#1f8f7a';
  context.beginPath();
  context.moveTo(player.x + Math.cos(player.angle) * 12, player.y + bob + Math.sin(player.angle) * 12);
  context.lineTo(
    player.x + Math.cos(player.angle + 2.6) * 8,
    player.y + bob + Math.sin(player.angle + 2.6) * 8,
  );
  context.lineTo(
    player.x + Math.cos(player.angle - 2.6) * 8,
    player.y + bob + Math.sin(player.angle - 2.6) * 8,
  );
  context.closePath();
  context.fill();
  context.restore();
}

function drawLighting(context, state, lightCanvas) {
  const light = lightCanvas.getContext('2d');
  light.clearRect(0, 0, FIELD.width, FIELD.height);
  light.globalCompositeOperation = 'source-over';
  light.fillStyle = DARK;
  light.fillRect(0, 0, FIELD.width, FIELD.height);
  light.globalCompositeOperation = 'destination-out';
  function hole(x, y, radius) {
    const gradient = light.createRadialGradient(x, y, radius * 0.2, x, y, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    light.fillStyle = gradient;
    light.beginPath();
    light.arc(x, y, radius, 0, Math.PI * 2);
    light.fill();
  }
  hole(state.player.x, state.player.y, 170);
  for (const guard of state.guards) hole(guard.x, guard.y, 130);
  const exit = state.level.exit;
  hole(exit.x + exit.w / 2, exit.y + exit.h / 2, 80);
  context.drawImage(lightCanvas, 0, 0);
}

function drawHud(context, state) {
  context.fillStyle = 'rgba(4, 8, 16, 0.82)';
  context.fillRect(0, 0, FIELD.width, 44);
  context.fillStyle = '#e8e4d8';
  context.font = 'bold 15px sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(`NIGHT ${state.night}`, 14, 23);
  context.fillText(`SCORE ${state.score}`, 120, 23);
  context.fillText(`PETALS ${state.petalsTaken}/3`, 250, 23);
  context.fillStyle = '#ff6b81';
  let hearts = '';
  for (let i = 0; i < state.lives; i += 1) hearts += '♥ ';
  context.fillText(hearts.trim(), 380, 23);
  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60);
  context.fillStyle = '#e8e4d8';
  context.fillText(`${minutes}:${String(seconds).padStart(2, '0')}`, 500, 23);

  // The suspicion meter: it fills amber, then red, as a warden's gaze holds.
  const meterX = 580;
  const meterW = 220;
  context.fillStyle = '#e8e4d8';
  context.fillText('SUSPICION', meterX, 14);
  context.fillStyle = '#20242e';
  context.fillRect(meterX, 22, meterW, 12);
  const suspicion = state.suspicion;
  context.fillStyle = state.alarmed > 0 ? '#ff3b30' : suspicion > 0.66 ? '#ff9f2e' : '#ffd66e';
  context.fillRect(meterX, 22, meterW * suspicion, 12);
  context.strokeStyle = '#e8e4d8';
  context.lineWidth = 1;
  context.strokeRect(meterX, 22, meterW, 12);
  if (state.player.inFern) {
    context.fillStyle = '#7ddc8f';
    context.textAlign = 'left';
    context.font = 'bold 14px sans-serif';
    context.fillText('HIDDEN IN THE FERNS', 14, FIELD.height - 14);
  }
  if (state.alarmed > 0) {
    context.fillStyle = '#ff3b30';
    context.font = 'bold 18px sans-serif';
    context.textAlign = 'center';
    context.fillText('SPOTTED! RUN!', FIELD.width / 2, 66);
  }
}

function panel(context, title, lines, accent) {
  const width = 560;
  const height = 120 + lines.length * 30;
  const x = (FIELD.width - width) / 2;
  const y = (FIELD.height - height) / 2;
  context.fillStyle = 'rgba(4, 8, 16, 0.88)';
  context.fillRect(x, y, width, height);
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
  context.fillStyle = accent;
  context.font = 'bold 30px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(title, FIELD.width / 2, y + 44);
  context.fillStyle = '#e8e4d8';
  context.font = '16px sans-serif';
  lines.forEach((line, index) => {
    context.fillText(line, FIELD.width / 2, y + 92 + index * 30);
  });
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const lightCanvas = document.createElement('canvas');
  lightCanvas.width = FIELD.width;
  lightCanvas.height = FIELD.height;

  function draw(state, screen, best) {
    const time = state.time;
    context.clearRect(0, 0, FIELD.width, FIELD.height);
    drawGround(context, state);
    drawFerns(context, state.level);
    drawPetals(context, state.level, time);
    drawCrates(context, state.level);
    drawWalls(context, state.level);
    drawExit(context, state.level, time);
    for (const guard of state.guards) drawGuard(context, guard, state.alarmed > 0);
    drawPlayer(context, state.player, time);
    drawLighting(context, state, lightCanvas);
    drawHud(context, state);

    if (screen === SCREEN_TITLE) {
      panel(
        context,
        'MOONPETAL COURIER',
        [
          'Slip through the Moonpetal Garden unseen.',
          'Dodge the wardens’ lantern cones. Hide in the ferns.',
          'Pocket 3 moonpetals, then reach the glowing EXIT gate.',
          'WASD / arrows to walk · click to walk there · P pauses · M mutes',
          `Best night reached: ${Math.max(best, 1)} — press Space or click to begin`,
        ],
        '#2ee6a8',
      );
    } else if (screen === SCREEN_PAUSED) {
      panel(context, 'PAUSED', ['The garden waits. Press P or Space to keep sneaking.'], '#ffd66e');
    } else if (screen === SCREEN_OVER) {
      panel(
        context,
        'CAUGHT IN THE LAMPLIGHT',
        [`The wardens found you on Night ${state.night}. Score ${state.score}.`, 'Press Space or click to try the garden again.'],
        '#ff5a46',
      );
    } else if (screen === SCREEN_WIN) {
      panel(
        context,
        `NIGHT ${state.night} CLEAR!`,
        [
          `You slipped out unseen. Score ${state.score}.`,
          `Petals pocketed: ${state.petalsTaken} of 3.`,
          'Press Space or click for the next, harder night.',
        ],
        '#2ee6a8',
      );
    }
  }

  return { draw };
}
