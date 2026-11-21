// The screenshot scenes behind ?shot=start|play|gate|win. Each one plays the
// real rules forward from a fresh world, steered by a small autopilot that
// weighs every step: toward the next moonpetal or the gate, away from any
// lantern cone it would be seen in. The same seed always gives the same frame.
import { FIELD, GUARD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, segmentBlocked } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 7;
const WIN_LIMIT_SECONDS = 420;
const GATE_LIMIT_SECONDS = 420;

const DIRECTIONS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Would a courier standing at (x, y) be seen by any warden right now? */
function seenAt(state, x, y) {  const level = state.level;
  const inFern = level.ferns.some((fern) => x >= fern.x && x < fern.x + fern.w && y >= fern.y && y < fern.y + fern.h);
  const sight = level.walls.concat(level.crates, level.ferns);
  for (const guard of state.guards) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > GUARD.viewRange) continue;
    if (inFern && distance > GUARD.closeRange) continue;
    let diff = Math.atan2(dy, dx) - guard.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > GUARD.viewHalfAngle) continue;
    if (segmentBlocked(guard.x, guard.y, x, y, sight)) continue;
    return true;
  }
  return false;
}

/** The courier's next step: toward the goal, out of the light, away from chase. */
function autopilot(state, cautious) {
  const player = state.player;
  const level = state.level;
  let target = { x: level.exit.x + level.exit.w / 2, y: level.exit.y + level.exit.h / 2 };
  let bestPetal = null;
  let bestDistance = Infinity;
  for (const petal of level.petals) {
    if (petal.taken) continue;
    const distance = Math.hypot(petal.x - player.x, petal.y - player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPetal = petal;
    }
  }
  if (bestPetal) target = bestPetal;

  // A chase turns the courier's mind to the nearest fern to vanish into.
  if (state.alarmed > 0) {
    let bestFern = null;
    let fernDistance = Infinity;
    for (const fern of level.ferns) {
      const centre = { x: fern.x + fern.w / 2, y: fern.y + fern.h / 2 };
      const distance = Math.hypot(centre.x - player.x, centre.y - player.y);
      if (distance < fernDistance) {
        fernDistance = distance;
        bestFern = centre;
      }
    }
    if (bestFern) target = bestFern;
  }

  let best = [0, 0];
  let bestScore = -Infinity;
  const solids = state.level.walls.concat(state.level.crates);
  for (const [dx, dy] of DIRECTIONS) {
    const length = Math.hypot(dx, dy) || 1;
    const nx = player.x + (dx / length) * 26;
    const ny = player.y + (dy / length) * 26;
    if (nx < 16 || nx > FIELD.width - 16 || ny < 16 || ny > FIELD.height - 16) continue;
    // A step into a wall or a crate is no step at all: skip it outright.
    const blocked = solids.some(
      (rect) => nx + 11 > rect.x && nx - 11 < rect.x + rect.w && ny + 11 > rect.y && ny - 11 < rect.y + rect.h,
    );
    if (blocked) continue;
    const toTarget = Math.hypot(target.x - player.x, target.y - player.y);
    const afterTarget = Math.hypot(target.x - nx, target.y - ny);
    let score = (toTarget - afterTarget) * 2;
    if (cautious && seenAt(state, nx, ny)) score -= 120;
    if (!cautious && seenAt(state, nx, ny)) score -= 5;
    for (const guard of state.guards) {
      const near = Math.hypot(guard.x - nx, guard.y - ny);
      if (near < 70) score -= (70 - near) * 0.6;
    }
    // Standing still is only good when the light is sweeping past.
    if (dx === 0 && dy === 0) score -= 1;
    if (score > bestScore) {
      bestScore = score;
      best = [dx, dy];
    }
  }
  return best;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Unknown names stage the title, as the start scene does.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name !== 'play' && name !== 'gate' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      const [dx, dy] = autopilot(state, true);
      const events = world.step(STEP, dx, dy);
      if (events & (EVENT_WIN | EVENT_OVER)) break;
    }
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  const limit = name === 'gate' ? GATE_LIMIT_SECONDS : WIN_LIMIT_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const [dx, dy] = autopilot(state, true);
    const events = world.step(STEP, dx, dy);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: state.score };
    if (events & EVENT_OVER) break;
    if (name === 'gate') {
      const exit = state.level.exit;
      const centreX = exit.x + exit.w / 2;
      const centreY = exit.y + exit.h / 2;
      if (Math.hypot(centreX - state.player.x, centreY - state.player.y) < 130) {
        return { screen: SCREEN_PLAY, best: state.score };
      }
    }
  }
  return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
