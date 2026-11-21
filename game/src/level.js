// The Moonpetal Garden at night: one walled courtyard, drawn as rectangles.
// Walls and crates block both feet and sight; moonferns block sight only, so a
// courier crouched inside one cannot be seen, but walks slowly through it.
// Tiles are 32 px; every rectangle here is given in tile units and converted.
import { TILE } from './config.js';

function rect(tx, ty, tw, th) {
  return { x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE };
}

/** The courtyard for `night`: more wardens join as the nights wear on. */
export function buildLevel(night, random) {
  const walls = [
    rect(0, 0, 30, 1),
    rect(0, 19, 30, 1),
    rect(0, 0, 1, 20),
    rect(29, 0, 1, 20),
    // A ruined colonnade down the left-middle, with a gap to slip through.
    rect(8, 2, 1, 4),
    rect(3, 6, 5, 1),
    // The old storehouse wall on the right.
    rect(20, 4, 1, 5),
    // The low wall that splits the lower garden.
    rect(16, 11, 8, 1),
    // The potting shed wall near the start.
    rect(13, 14, 1, 4),
  ];

  const crates = [
    rect(11, 3, 2, 1),
    rect(11, 4, 1, 1),
    rect(5, 9, 1, 2),
    rect(17, 9, 2, 1),
    rect(24, 12, 1, 2),
    rect(9, 15, 1, 1),
    rect(22, 5, 1, 1),
    rect(14, 7, 1, 1),
    rect(6, 13, 1, 1),
  ];

  const ferns = [
    rect(3, 3, 2, 2),
    rect(10, 9, 2, 2),
    rect(19, 14, 2, 2),
    rect(3, 14, 1, 2),
    rect(26, 6, 1, 2),
    rect(15, 16, 2, 1),
  ];

  // The gate out: a glowing arch in the top-right corner of the garden,
  // one row down from the top so the HUD bar never covers its sign.
  const exit = rect(27, 2, 2, 1);

  // Moonpetals grow where the wardens walk: each one is a small risk.
  const petals = [
    { x: 26.5 * TILE, y: 2.5 * TILE, taken: false },
    { x: 4.5 * TILE, y: 8.5 * TILE, taken: false },
    { x: 25.5 * TILE, y: 16.5 * TILE, taken: false },
  ];

  // Patrol routes, in tile centres. A warden walks its route and back again.
  const routes = [
    [
      { x: 10, y: 5 },
      { x: 18, y: 5 },
    ],
    [
      { x: 24, y: 3 },
      { x: 24, y: 10 },
    ],
    [
      { x: 12, y: 8 },
      { x: 12, y: 13 },
      { x: 15, y: 13 },
      { x: 15, y: 8 },
    ],
    [
      { x: 4, y: 12 },
      { x: 9, y: 12 },
      { x: 9, y: 16 },
      { x: 4, y: 16 },
    ],
    [
      { x: 22, y: 15 },
      { x: 27, y: 15 },
      { x: 27, y: 10 },
    ],
  ];

  const guardCount = Math.min(3 + (night - 1), 5);
  const guards = routes.slice(0, guardCount).map((route, index) => {
    const start = route[Math.floor(random.next() * route.length)];
    return {
      route: route.map((point) => ({ x: (point.x + 0.5) * TILE, y: (point.y + 0.5) * TILE })),
      x: (start.x + 0.5) * TILE,
      y: (start.y + 0.5) * TILE,
      waypoint: 0,
      forward: true,
      angle: random.next() * Math.PI * 2,
      state: 'patrol',
      alarm: 0,
      pause: 0,
    };
  });

  return {
    walls,
    crates,
    ferns,
    exit,
    petals,
    guards,
    playerStart: { x: 2.5 * TILE, y: 17.5 * TILE },
  };
}

/** Every rectangle that stops a walking body: walls plus crates. */
export function solidRects(level) {
  return level.walls.concat(level.crates);
}

/** Every rectangle that stops a gaze: walls, crates and moonferns. */
export function sightRects(level) {
  return level.walls.concat(level.crates, level.ferns);
}
