# Blocky City: Fogbound

A Silent Hill–inspired horror theme for the miniature open-world game based on **Blocky Street.html**. The top-down camera, movement, combat, collision boundaries, driving, and mission rules are retained. The city now has dense fog, falling ash, weathered colors, a moving light, and low-poly Nurses, Pyramid Head, and Lying Figures. The atmosphere setting switches between fog and a rust-colored Otherworld. This is a fan-inspired visual treatment; creature behavior uses the existing pedestrian system. Built with Three.js and Vite, with a procedural low-poly / voxel city and no downloaded model assets.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. WebGL and hardware acceleration are required.

```sh
npm test       # Physics, mission progression, world geometry and reachability
npm run build # Production files in dist/
npm run preview
```

## Play

- **WASD / arrow keys:** move on foot; accelerate, brake, reverse and steer in a car.
- **E:** enter a nearby car or exit when moving slowly.
- **Shift:** sprint / vehicle boost.
- **Space:** jump / handbrake.
- **M:** map and job board.
- **1 / 2 / 3:** fists / pistol / SMG; **Q** cycles weapons.
- **Mouse:** aim; hold left click or **F** to attack. **J** punches. **R** reloads.
- **X:** recover to a nearby road.
- **Esc:** pause. Right-drag to orbit the camera; scroll to zoom.

Touch controls appear on devices with a coarse pointer. Sound starts muted and can be enabled with the music button. The pause menu offers day/night lighting and graphics quality.

Accept a job from the map and drive through the gold marker. Special Delivery has a pickup and drop-off; Coast to Coast has four ordered checkpoints; Lose the Tail starts a police pursuit that ends when all wanted stars clear. Jobs have timers. Vehicle collisions cause damage and raise heat. Keep away from patrols to clear heat. Gold packages add cash. Cash and completed job counts persist in localStorage when the browser allows it; the current run and vehicle position reset on reload.

## Project structure

- `src/world.js`: deterministic city generation, voxel models, pedestrians and traffic setup.
- `src/physics.js`: collision resolution, street routing and mission rules.
- `src/main.js`: rendering, input, game loop, police, audio, UI and maps.
- `src/style.css`: HUD, menus and responsive touch layout.
- `tests/game.test.js`: logic and scene-graph checks; these do not substitute for visual browser QA.

This is a single-player arcade prototype. Characters, vehicles, buildings, trees, benches, lamps, bins, hydrants and park planters have solid collision boundaries. Pedestrians stop or turn when blocked, the city is bounded, and there is no multiplayer. Combat is arcade style: characters are knocked out temporarily, vehicles can be disabled, and witnesses flee. Gunfire raises heat; walls and vehicles block shots. Use the HUD to reload or buy reserve ammo for $50. Fonts load from Google Fonts with local system fallbacks; game code and geometry are bundled locally.
