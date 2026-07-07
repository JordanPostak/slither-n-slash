# Slither N' Slash

Slither N' Slash is a standalone arcade snake game by Postak Creations. It features smooth trail-following movement, moving prey, solid centipede combat, rechargeable boost, body-loop traps, power-ups, and responsive desktop and mobile controls.

## Play

Open `index.html` in a browser and select **Play Now** or **Start Game**.

- Steer with Left/Right or A/D. Mobile players use the movement pad.
- Before the first run, choose from five complete player snake skins. The selection is remembered in local browser storage.
- Boost with Up/W, Shift, or Space. Release to recharge; higher progression has more boost capacity.
- The visible player snake caps at 50 body pieces, but score/progression keeps climbing. Progression still scales arena size, snake thickness, boost capacity, unlocks, and enemy pressure while the snake keeps the same speed and turning radius. The arena expands with a stronger centered zoom-out, making bugs and animals appear smaller and move more slowly as the snake advances. Centipedes can spawn with longer bodies.
- Large regular and Golden Mice unlock at 100 progression. Either mouse adds six points; the Golden Mouse also activates Berserker mode.
- Pause or exit immersive play mode without losing the current run. While paused in mobile landscape, drag the control handles to reposition them.
- Grubs add one point and regular mice add six.
- Poison beetles remove 25% of the snake's current progression after their blue two-second arrival protection expires, but cannot reduce it below its starting length.
- Centipedes and the player have solid body collisions unless the centipede is trapped. A centipede bite steals three player progression points. Player bites remove three enemy segments, increasing to six at 100 progression.
- At 100 progression, the player becomes dominant over centipedes: they can no longer damage or deflect the snake, and are pushed aside while the player consumes up to six of their segments per bite.
- At 100 progression, one larger Green Tree Snake predator unlocks with 50 body segments. It uses an original procedural design, follows the same food-hunting and rivalry behavior as centipedes, retains a fixed adult thickness, and grows only by gaining body segments. Defeated tree snakes respawn after a delay.
- Centipedes use one species design and enter from randomized positions along the arena edges.
- Centipedes only target the player within a nearby aggro range. Farther away they pursue food or wander, and competing centipedes can bite and steal segments from each other when they collide.

## Trapping and orange food

Any non-adjacent sections of the player's body can close into a trap. A creature must be fully enclosed. While the loop remains closed, trapped grubs, mice, poison beetles, centipedes, and larger predators progressively slow and their bodies turn orange. There is no separate trap-circle animation. Transformation time scales with the trapped creature's length and physical size compared with the player. Opening the loop early resets the transformation and allows the creature to escape.

Completed transformations create stationary orange food. A trapped bug creates one ball, while a centipede creates one ball per body segment. The player and centipedes can both pursue and eat these rewards.

## Power-ups

- The Golden Mouse starts ten seconds of Berserker mode. Berserker mode lets the player consume threats, then ends with a two-second recovery period during which food and enemies are pushed away.
- The fireball burns poison beetles only. Burned beetles become safe orange balls; centipedes are unaffected.

## Current release

Version 0.5.1 — Progression & Polish, released July 6, 2026.

- Visible player body caps at 50 pieces while progression continues to scale arena size, thickness, boost capacity, unlocks, and enemy pressure.
- Player speed and turn radius stay responsive as the world zooms outward.
- Player snake tongues now flick sporadically, with occasional quick double flicks.
- Website gameplay notes, FAQ, and documentation now describe progression, trapping, power-ups, poison beetles, and orange rewards.

## Files

- `index.html` - app shell
- `src/main.js` - startup wiring only
- `src/game-state.js` - shared configuration and runtime state
- `src/site-ui.js`, `src/hero-preview.js` - landing page, navigation, play mode, and hero art
- `src/input.js`, `src/player.js`, `src/snake.js` - controls, player movement, boost, body trail, and rendering
- `src/food.js`, `src/food-render.js`, `src/powerups.js` - prey, poison beetles, orange rewards, and power-ups
- `src/centipedes.js`, `src/centipede-combat.js`, `src/centipede-render.js` - centipede AI, combat, and visuals
- `src/traps.js`, `src/collisions.js`, `src/world.js` - trapping, collision response, arena movement, and bounds
- `src/game-loop.js`, `src/audio-score.js` - frame orchestration, sound, score, and local high score
- `src/styles.css` - responsive layout and game styling
- `assets/dark-rock-background.png` - generated dark rock background texture
- `audio/` - copied sound effects from the portfolio

