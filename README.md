# Slither N' Slash

Slither N' Slash is a standalone arcade snake game by Postak Creations. It features smooth trail-following movement, moving prey, solid centipede combat, rechargeable boost, body-loop traps, power-ups, and responsive desktop and mobile controls.

## Play

Open `index.html` in a browser and select **Play Now** or **Start Game**.

- Steer with Left/Right or A/D. Mobile players use the movement pad.
- Boost with Up/W, Shift, or Space. Release to recharge; longer snakes have more boost capacity.
- Pause or exit immersive play mode without losing the current run. While paused in mobile landscape, drag the control handles to reposition them.
- Grubs add one segment and regular mice add three.
- Poison beetles are dangerous after their blue two-second arrival protection expires.
- Centipedes and the player have solid body collisions. Either side can bite body segments unless the centipede is trapped.

## Trapping and orange food

Any non-adjacent sections of the player's body can close into a trap. A creature must be fully enclosed. While the loop remains closed, trapped grubs, mice, poison beetles, and centipedes progressively slow and turn orange over three seconds. Opening the loop early resets the transformation and allows the creature to escape.

Completed transformations create stationary orange food. A trapped bug creates one ball, while a centipede creates one ball per body segment. The player and centipedes can both pursue and eat these rewards.

## Power-ups

- The Golden Mouse starts ten seconds of Berserker mode. Berserker mode lets the player consume threats, then ends with a two-second recovery period during which food and enemies are pushed away.
- The fireball burns poison beetles only. Burned beetles become safe orange balls; centipedes are unaffected.

## Current release

Version 0.5.0 — Trap & Transform, released July 4, 2026.

## Files

- `index.html` - app shell
- `src/main.js` - game state, controls, drawing, scoring
- `src/styles.css` - responsive layout and game styling
- `assets/dark-rock-background.png` - generated dark rock background texture
- `audio/` - copied sound effects from the portfolio

