// The rules of the night: walking, being seen, being chased, being caught.
// The world advances in fixed steps and reports what happened as event bits,
// so the renderer, the sounds and the screenshot autopilot all read one truth.
import {
  DETECTION,
  FIELD,
  GUARD,
  LIVES,
  NIGHTS,
  PLAYER,
  SCORE,
  STEP,
} from './config.js';
import { buildLevel, sightRects, solidRects } from './level.js';

export const EVENT_NONE = 0;
export const EVENT_PETAL = 1;
export const EVENT_ALARM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_OVER = 16;
export const EVENT_STEP = 32;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the segment from (x1,y1) to (x2,y2) touches any rectangle. */
export function segmentBlocked(x1, y1, x2, y2, rects) {
  for (const rect of rects) {
    // Slab test: walk the segment through the rectangle's x and y spans.
    const dx = x2 - x1;
    const dy = y2 - y1;
    let tMin = 0;
    let tMax = 1;
    let hit = true;
    for (const [p, d, lo, hi] of [
      [x1, dx, rect.x, rect.x + rect.w],
      [y1, dy, rect.y, rect.y + rect.h],
    ]) {
      if (Math.abs(d) < 1e-9) {
        if (p < lo || p > hi) {
          hit = false;
          break;
        }
      } else {
        let t1 = (lo - p) / d;
        let t2 = (hi - p) / d;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
          hit = false;
          break;
        }
      }
    }
    if (hit) return true;
  }
  return false;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function overlapsCircle(x, y, radius, rects) {
  for (const rect of rects) {
    if (x + radius > rect.x && x - radius < rect.x + rect.w && y + radius > rect.y && y - radius < rect.y + rect.h) {
      return true;
    }
  }
  return false;
}

/**
 * Move a circle against the solid rectangles, one axis at a time, so it slides
 * along a wall instead of ever ending up inside one.
 */
function moveCircle(body, dx, dy, solids) {
  const nextX = body.x + dx;
  if (!overlapsCircle(nextX, body.y, body.radius, solids)) body.x = nextX;
  const nextY = body.y + dy;
  if (!overlapsCircle(body.x, nextY, body.radius, solids)) body.y = nextY;
  body.x = clamp(body.x, body.radius, FIELD.width - body.radius);
  body.y = clamp(body.y, body.radius, FIELD.height - body.radius);
}

export function createWorld(random) {
  const state = {
    night: 1,
    score: 0,
    lives: LIVES,
    time: 0,
    suspicion: 0,
    alarmed: 0,
    player: { x: 0, y: 0, angle: 0, moving: false, inFern: false, hidden: false },
    guards: [],
    level: null,
    petalsTaken: 0,
    won: false,
    over: false,
    stepAccumulator: 0,
  };

  function loadNight(night) {
    state.night = night;
    state.time = 0;
    state.suspicion = 0;
    state.alarmed = 0;
    state.level = buildLevel(night, random);
    state.player.x = state.level.playerStart.x;
    state.player.y = state.level.playerStart.y;
    state.player.angle = -Math.PI / 2;
    state.player.moving = false;
    state.player.radius = PLAYER.radius;
    state.guards = state.level.guards;
    for (const guard of state.guards) guard.radius = GUARD.radius;
    state.petalsTaken = 0;
    state.won = false;
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    state.over = false;
    loadNight(1);
  }

  function guardSeesPlayer(guard) {
    const dx = state.player.x - guard.x;
    const dy = state.player.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > GUARD.viewRange) return false;
    // A courier crouched in the ferns is invisible unless the warden is on top of them.
    if (state.player.inFern && distance > GUARD.closeRange) return false;
    const angleToPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(angleToPlayer, guard.angle)) > GUARD.viewHalfAngle) return false;
    return !segmentBlocked(guard.x, guard.y, state.player.x, state.player.y, sightRects(state.level));
  }

  function stepGuard(guard, dt, patrolSpeed) {
    if (guard.state === 'chase') {
      const dx = state.player.x - guard.x;
      const dy = state.player.y - guard.y;
      const distance = Math.hypot(dx, dy) || 1;
      guard.angle = Math.atan2(dy, dx);
      moveCircle(guard, (dx / distance) * GUARD.chaseSpeed * dt, (dy / distance) * GUARD.chaseSpeed * dt, solidRects(state.level));
      return;
    }
    if (guard.pause > 0) {
      guard.pause -= dt;
      return;
    }
    const target = guard.route[guard.waypoint];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) {
      guard.pause = 0.7;
      if (guard.forward) {
        guard.waypoint += 1;
        if (guard.waypoint >= guard.route.length) {
          guard.waypoint = guard.route.length - 2;
          guard.forward = false;
        }
      } else {
        guard.waypoint -= 1;
        if (guard.waypoint < 0) {
          guard.waypoint = 1;
          guard.forward = true;
        }
      }
      return;
    }
    const wanted = Math.atan2(dy, dx);
    const turn = clamp(angleDifference(wanted, guard.angle), -GUARD.turnSpeed * dt, GUARD.turnSpeed * dt);
    guard.angle += turn;
    moveCircle(guard, Math.cos(guard.angle) * patrolSpeed * dt, Math.sin(guard.angle) * patrolSpeed * dt, solidRects(state.level));
  }

  /**
   * Advance one fixed step. `dx` and `dy` are a unit-ish direction for the
   * courier (0, 0 to stand still). Returns the events that happened.
   */
  function step(dt, dx, dy) {
    if (state.won || state.over) return EVENT_NONE;
    let events = EVENT_NONE;
    state.time += dt;

    const player = state.player;
    const inFern = state.level.ferns.some((fern) => pointInRect(player.x, player.y, fern));
    player.inFern = inFern;
    const speed = inFern ? PLAYER.fernSpeed : PLAYER.speed;
    const length = Math.hypot(dx, dy);
    player.moving = length > 0.01;
    if (player.moving) {
      const nx = (dx / length) * speed * dt;
      const ny = (dy / length) * speed * dt;
      moveCircle(player, nx, ny, solidRects(state.level));
      player.angle = Math.atan2(dy, dx);
      state.stepAccumulator += speed * dt;
      if (state.stepAccumulator >= 30) {
        state.stepAccumulator = 0;
        events |= EVENT_STEP;
      }
    }

    // Moonpetals: walk over one to pocket it.
    for (const petal of state.level.petals) {
      if (!petal.taken && Math.hypot(petal.x - player.x, petal.y - player.y) < 24) {
        petal.taken = true;
        state.petalsTaken += 1;
        state.score += SCORE.petal;
        events |= EVENT_PETAL;
      }
    }

    // Being seen fills the suspicion meter; hiding lets it drain again.
    const seen = state.guards.some((guard) => guardSeesPlayer(guard));
    player.hidden = inFern;
    if (seen && state.alarmed <= 0) {
      state.suspicion = clamp(state.suspicion + DETECTION.risePerSecond * dt, 0, 1);
    } else if (state.alarmed <= 0) {
      state.suspicion = clamp(state.suspicion - DETECTION.fallPerSecond * dt, 0, 1);
    }
    if (state.suspicion >= 1 && state.alarmed <= 0) {
      state.alarmed = DETECTION.alarmSeconds;
      for (const guard of state.guards) guard.state = 'chase';
      events |= EVENT_ALARM;
    }
    if (state.alarmed > 0) {
      state.alarmed -= dt;
      if (state.alarmed <= 0) {
        state.suspicion = 0.35;
        for (const guard of state.guards) guard.state = 'patrol';
      }
    }

    const patrolSpeed = GUARD.patrolSpeed + (state.night - 1) * NIGHTS.patrolBonusPerNight;
    for (const guard of state.guards) stepGuard(guard, dt, patrolSpeed);

    // Caught: a warden reaches the courier.
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - player.x, guard.y - player.y) < DETECTION.catchDistance) {
        state.lives -= 1;
        state.suspicion = 0;
        state.alarmed = 0;
        for (const other of state.guards) other.state = 'patrol';
        if (state.lives <= 0) {
          state.over = true;
          events |= EVENT_OVER;
        } else {
          player.x = state.level.playerStart.x;
          player.y = state.level.playerStart.y;
          events |= EVENT_CAUGHT;
        }
        break;
      }
    }

    // The gate: reach it unseen enough and the night is yours.
    const exit = state.level.exit;
    if (pointInRect(player.x, player.y, exit)) {
      state.won = true;
      const timeBonus = Math.max(0, Math.round(120 - state.time)) * SCORE.timeBonusPerSecond;
      state.score += SCORE.nightClear + timeBonus;
      events |= EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, step, reset, loadNight };
}
