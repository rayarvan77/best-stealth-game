// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, night clear and game over.
//
// ?seed=N fixes the night's layout. ?shot=start|play|gate|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_OVER,
  EVENT_PETAL,
  EVENT_STEP,
  EVENT_WIN,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clickTarget = null;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    clickTarget = null;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.click();
    announce('Playing. Slip past the wardens and reach the exit.');
  }

  function nextNight() {
    world.loadNight(world.state.night + 1);
    accumulator = 0;
    clickTarget = null;
    screen = SCREEN_PLAY;
    announce(`Night ${world.state.night}. More wardens walk the garden.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.night > best) {
      best = world.state.night;
      saveBest(best);
    }
    announce(`Caught. The garden keeps its petals. Score ${world.state.score}.`);
  }

  function clearNight() {
    screen = SCREEN_WIN;
    if (world.state.night >= best) {
      best = world.state.night;
      saveBest(best);
    }
    announce(`Night ${world.state.night} clear. Score ${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) nextNight();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, 0);
      return;
    }
    const keys = input.direction();
    let dx = keys.x;
    let dy = keys.y;
    const target = input.takeClickTarget();
    if (target) clickTarget = target;
    if (dx === 0 && dy === 0 && clickTarget) {
      const toX = clickTarget.x - world.state.player.x;
      const toY = clickTarget.y - world.state.player.y;
      if (Math.hypot(toX, toY) < 12) clickTarget = null;
      else {
        dx = toX;
        dy = toY;
      }
    } else if (dx !== 0 || dy !== 0) {
      clickTarget = null;
    }
    const events = world.step(STEP, dx, dy);
    if (events & EVENT_STEP) audio.footstep();
    if (events & EVENT_PETAL) {
      audio.petal();
      announce(`Moonpetal pocketed. ${world.state.petalsTaken} of 3.`);
    }
    if (events & EVENT_ALARM) {
      audio.alarm();
      announce('Spotted! The wardens are coming. Hide in the ferns!');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      clickTarget = null;
      announce(world.state.lives === 1 ? 'Caught! One life left.' : `Caught! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_WIN) {
      audio.win();
      clearNight();
    } else if (events & EVENT_OVER) {
      audio.caught();
      endGame();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wardens walk unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Moonpetal Courier. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
