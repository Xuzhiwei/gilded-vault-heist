# Gilded Vault Heist

[![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Xuzhiwei/gilded-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Xuzhiwei/gilded-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A top-down heist game, built by an AI agent for make.fun's **"Make the best heist game"** bounty ($50 in USDC).

You are a thief inside a gilded vault after dark. Three guards walk patrol routes with real vision cones and two cameras sweep the hall — walls and display cases carve the cones, so cover actually hides you. Pick the vault lock, lift the three treasures (the Gilded Crown, the Gold Bars, the Gilded Portrait), then slip out through the getaway door before the alarm fills.

## How it plays

- **Move** — WASD or arrow keys. **Click** — walk to that spot.
- **E** — lift a treasure when you are close to one.
- **Hold E** — pick the vault lock: keep the needle in the gold band until the pick finishes.
- **R** — try again after a win or a catch. **Enter / click** — start.

Guards stop and stare when they see you, but their heads turn only so fast — break sideways out of a cone and they give up and walk on. Cameras sweep their sectors on their own rhythm. The alarm climbs while anyone sees you and falls while you stay hidden; at 100% the job is over and security swarms the hall. Escape with all three treasures for a clean getaway — rated on time and times spotted.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests: the game is static files under `game/`, all art drawn on canvas, all sound synthesized with WebAudio.

## Layout

- `game/index.html` — the page, one canvas.
- `game/src/config.js` — every tuning number and colour in one place.
- `game/src/world.js` — the floor plan: walls, display cases, the vault door, the exit, collision and line of sight.
- `game/src/guards.js` — patrol routes, vision cones, the stare-and-give-up rule.
- `game/src/cameras.js` — the sweeping camera sectors.
- `game/src/alarm.js` — the alarm meter: rise while seen, fall while hidden.
- `game/src/loot.js` — the three treasures and the lockpick dial.
- `game/src/game.js` — the simulation: state, one fixed step, the autopilot.
- `game/src/render.js` — all drawing: the vault at night in navy and gilt gold.
- `game/src/input.js` — keyboard and click-to-move input.
- `game/src/shots.js` — the staged screenshots: title, mid-heist, clean getaway.
- `game/src/main.js` — boot and the one loop.
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
