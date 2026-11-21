# Moonpetal Courier

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rayarvan77/best-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rayarvan77/best-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An entry for the [make.fun bounty "Make the best stealth game"](https://make.fun/bounty/best-stealth-game-20261121-1759).

## The game

You are Wren, a night courier crossing the walled Moonpetal Garden after
dark. Lantern wardens patrol the paths, their yellow vision cones sweeping
the flagstones. Slip between the cones, crouch in the tall moonferns where
no warden can see you, pocket the three glowing moonpetals, and reach the
green EXIT gate unseen. Get spotted and the suspicion meter fills — fill it
and the wardens give chase. Get caught and you lose a life and start the
night over from the gatehouse door. Clear a night and the next one begins
with more wardens walking faster.

## How to play

- **WASD or arrow keys** — walk. **Click** anywhere and Wren walks there.
- **P or Esc** — pause. **M** — mute the night sounds. **Space / click** — start.
- Hide in the **moonferns** (dark green bushes): wardens cannot see you
  inside them unless they are right on top of you. Crates and walls block
  both feet and sight.
- The **SUSPICION** meter in the top bar shows how close you are to being
  spotted. Break line of sight and it drains again.
- Petals are worth 100 points each; clearing a night is worth 500 plus a
  speed bonus.

## Stealth, as the game sees it

- Each warden walks a patrol route, pauses at each waypoint, and turns its
  lantern cone toward where it walks.
- A warden sees you only inside its cone, within range, with a clear line
  of sight — walls, crates and ferns all block its gaze.
- Being seen fills suspicion; a full meter raises the alarm and every
  warden chases for five seconds. Survive the alarm and suspicion drops
  back down — a near miss costs you, it does not end you.
- Footsteps patter softly as you walk, the alarm is a low two-note sting,
  and a petal chimes when you pocket it.

## Running it

No build step, no network, no assets to download — plain static files:

```
node serve.ts
```

then open <http://localhost:8080>. The game is `game/index.html` with ES
modules under `game/src/`. `main.ts` (Node 22, standard library only) hands
the entry in: it copies `game/` and `screenshots/` to the output directory
and writes `dossier.json` with the vendored make.fun library.

## Layout

- `game/index.html` — the page, one canvas and a status line.
- `game/src/config.js` — every tuned number in one place.
- `game/src/level.js` — the garden: walls, crates, ferns, petals, the gate,
  and the wardens' patrol routes.
- `game/src/world.js` — the rules: walking, vision, suspicion, chase, catch.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — night sounds, synthesised live with WebAudio.
- `game/src/render.js` — the top-down night scene, cones and lantern light.
- `game/src/shots.js` — the staged screenshot scenes; an autopilot plays
  the real rules forward so every screenshot is a real render of the game.
- `game/src/main.js` — boot and the one loop.
- `main.ts` — the entry program. `vendor/makefun-game.ts` — the kit's
  library, unchanged. `serve.ts` — a tiny local static server.

## License

MIT — see [LICENSE](LICENSE).
