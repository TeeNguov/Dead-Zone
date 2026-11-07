# Dead Zone

Dead Zone is a single-player zombie survival game that runs in your browser. Scavenge a ruined city, fight infected creatures, collect five antidote ingredients, and defeat the Alpha Infected. Keep your equipment and upgrades as you continue into endless Free Mode waves.

Built with Three.js and Vite, the game features a procedural low-poly city, articulated characters, destructible scenery, and real-time combat.

## Survive the outbreak

- **Find the antidote:** Search for five red ingredient vials. Each ingredient triggers a larger enemy wave: 50, 100, 200, 400, then 800 infected. The fifth reveals the final boss in the central park.
- **Scavenge supplies:** Collect health kits, armor, weapon-specific ammunition, launcher rounds, lightning charges, speed upgrades, and magnets. Supplies you cannot use stay on the ground. City supplies respawn elsewhere; enemy drops disappear after five gameplay seconds.
- **Upgrade your survivor:** Speed and magnet pickups each have five levels. Speed upgrades increase movement from 4.4 to 8.2 units per second. Magnets extend supply collection to 3, 4.5, 6, 7.5, and 9 units. Collected supplies fly toward the player.
- **Stay alive:** Armor absorbs damage before health. You have five lives per run. Losing a life preserves equipment and upgrades and grants a brief protective shield after respawning.
- **Use your surroundings:** Buildings and cars provide cover. Destroy trees, benches, bins, lamps, hydrants, and planters to open routes. Vehicles can be driven, damaged, and destroyed; their explosions can trigger chain reactions.

## Weapons and abilities

Fight with fists, a pistol, a shotgun, an SMG, a Gatling gun, and a grenade launcher. Shots respect cover and target height, and attacks can knock enemies back.

The Gatling gun needs a short spin-up and continuously feeds from its belt and reserve without reloading. The grenade launcher fires in a high upward arc before its rounds fall and explode. Blasts damage nearby targets with distance falloff, and cover blocks damage. Your own explosions can still hurt you, especially when firing into nearby walls.

**Lightning Orbit** stores up to three uses. Activate it to summon orbiting lightning orbs that strike nearby enemies. Charges regenerate while the ability is inactive, and lightning pickups restore one use.

## Infected and monsters

- **Roaming infected** pursue the survivor through streets and around obstacles, attacking at close range.
- **Spitters** launch green acid projectiles. Dodge the shots and avoid the short-lived acid puddles they leave behind.
- **Infected hounds** are small, fast, four-legged enemies that close the distance and bite.
- **Heavy infected** are larger, slower, tougher enemies that resist knockback and can summon hounds.
- **Flying bats** swoop toward the player, bite at close range, and fly over cars and street props.
- **Alpha Infected** is the final boss. It fires volleys of fireballs that leave burning ground and alternates between summoning bats and heavy infected.

Defeated enemies burst into particles and have a 20% chance to drop supplies. Enemy health bars help you track damaged targets.

## Endless Free Mode

After completing the antidote objective and defeating the boss, choose Free Mode to continue the run with your supplies, weapons, and upgrades. The first wave contains 1,600 regular enemies and two bosses. Later waves double both totals. Reinforcements arrive in batches, and the next wave begins only after all enemies and bosses are defeated.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move on foot or drive |
| Mouse | Aim |
| Left click / F | Attack |
| J | Punch |
| 1 / 2 / 3 / 4 / 5 / 6 | Fists / pistol / shotgun / SMG / Gatling / grenade launcher |
| Q / mouse wheel | Cycle weapons |
| R | Reload supported weapons |
| G | Equip / fire the grenade launcher |
| V | Activate Lightning Orbit |
| Space | Jump / vehicle handbrake |
| E | Enter or exit a nearby vehicle |
| Shift | Vehicle boost |
| M | Open the city map and ingredient view |
| X | Recover to a nearby road |
| Esc | Pause / resume |
| Right-drag | Orbit the camera |
| Shift + mouse wheel | Zoom the camera |

Touch controls appear on supported devices. The pause menu includes lighting, graphics, and audio settings. Browser audio starts after user interaction.

## Run locally

Requires Node.js and npm, plus a browser with WebGL and hardware acceleration.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

```sh
npm test        # Run automated gameplay and scene checks
npm run build  # Generate production files in dist/
npm run preview # Preview the production build locally
```

## Project structure

- `src/main.js`: Input, game loop, rendering, HUD, and gameplay integration.
- `src/world.js`: Procedural city, character models, scenery, and supply placement.
- `src/combat.js`, `src/grenades.js`, and `src/lightning.js`: Weapons and abilities.
- `src/physics.js` and `src/pursuit.js`: Collisions and enemy navigation.
- `src/objectives.js`, `src/waves.js`, and `src/encounters.js`: Antidote objectives, waves, and summons.
- `src/pickups.js`, `src/magnet.js`, and `src/pickup-flight.js`: Supply rewards, collection range, and collection animation.
- `src/audio.js`, `src/music.js`, and `sounds/`: Sound effects and background music.
- `src/style.css`: Menus, HUD, and responsive layouts.
- `tests/`: Automated logic, physics, combat, and scene-graph checks.

Game geometry is generated locally without downloaded character models. Audio assets are bundled by Vite. Automated tests cover gameplay logic and scene structure; visual and listening checks are still useful when changing presentation.
