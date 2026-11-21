// Shared numbers for Moonpetal Courier: the field, the speeds, the senses.
// One place holds every tuned value so a level change never hides a magic number.
export const STEP = 1 / 60;
export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

export const PLAYER = {
  radius: 11,
  speed: 155,
  fernSpeed: 92,
  start: { x: 2.5 * TILE, y: 17.5 * TILE },
};

export const GUARD = {
  radius: 12,
  patrolSpeed: 72,
  chaseSpeed: 138,
  viewRange: 175,
  viewHalfAngle: (34 * Math.PI) / 180,
  closeRange: 42,
  turnSpeed: 2.6,
};

export const DETECTION = {
  risePerSecond: 1.5,
  fallPerSecond: 0.55,
  alarmSeconds: 5,
  catchDistance: 24,
};

export const NIGHTS = {
  // Night n adds a guard and speeds the patrol up a little.
  baseGuards: 3,
  maxGuards: 5,
  patrolBonusPerNight: 9,
};

export const SCORE = { petal: 100, nightClear: 500, timeBonusPerSecond: 5 };
export const LIVES = 3;
export const BEST_KEY = 'moonpetal-courier-best-night';
