# Dead Zone

A browser-based zombie survival game built with Three.js and Vite. Collect five antidote ingredients, defeat the boss, and continue into endless Free Mode waves. Includes a selectable Fogbound horror theme.

A Silent Hill–inspired horror theme for the miniature open-world game based on **Blocky Street.html**. The top-down camera, movement, combat, collision boundaries, driving, and mission rules are retained. The city now has dense fog, falling ash, weathered colors, a moving light, and low-poly Nurses, Pyramid Head, and Lying Figures. The atmosphere setting switches between fog and a rust-colored Otherworld. This is a fan-inspired visual treatment; creatures pursue the player around buildings and abandoned cars. Nurses and Lying Figures move at 2.6–3.3 units/second; Pyramid Head moves at 2.1. Monsters strike on contact and can still be knocked down. All street cars are stationary until the player drives one, and moving police patrols are disabled. Built with Three.js and Vite, with a procedural low-poly / voxel city and no downloaded model assets.

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
- **1 / 2 / 3 / 4 / 5 / 6:** fists / pistol / SMG / Gatling gun / grenades / shotgun; **Q** cycles weapons.
- **Mouse:** aim; hold left click or **F** to attack. **J** punches. **R** reloads.
- **X:** recover to a nearby road.
- **Esc:** pause. Right-drag to orbit the camera; scroll to zoom.

Touch controls appear on devices with a coarse pointer. Sound starts after clicking Enter the fog. The music button mutes/unmutes all audio, and the pause menu includes an effects-volume slider. Sounds stop on pause or when the window loses focus. The pause menu offers day/night lighting and graphics quality.

Accept a job from the map and drive through the gold marker. Special Delivery has a pickup and drop-off; Coast to Coast has four ordered checkpoints; Lose the Tail draws the attention of nearby creatures that ends when all wanted stars clear. Jobs have timers. Vehicle collisions cause damage and raise heat. Keep away from monsters to clear heat. Gold packages add cash. Cash and completed job counts persist in localStorage when the browser allows it; the current run and vehicle position reset on reload.

## Project structure

- `src/world.js`: deterministic city generation, voxel models, monster models and abandoned car placement.
- `src/physics.js`: collision resolution, street routing and mission rules.
- `src/main.js`: rendering, input, game loop, monster pursuit, audio, UI and maps.
- `src/style.css`: HUD, menus and responsive touch layout.
- `tests/game.test.js`: logic and scene-graph checks; these do not substitute for visual browser QA.

This is a single-player arcade prototype. Characters, vehicles, buildings, trees, benches, lamps, bins, hydrants and park planters have solid collision boundaries. Monsters navigate around obstacles, the city is bounded, and there is no multiplayer. Hits knock monsters backward with a brief stagger. Punches have the strongest shove; Pyramid Head resists knockback. Knockback decays smoothly and respects buildings, vehicles, and other characters. Combat is arcade style: characters are knocked out temporarily, vehicles can be disabled, and monsters continue pursuing. Gunfire raises heat; walls and vehicles block shots. Use the HUD to reload or buy reserve ammo for $50. Fonts load from Google Fonts with local system fallbacks; game code and geometry are bundled locally.


## Sound effects

All audio used by the game lives in `sounds/`: sound effects mapped in `src/audio.js` and the two MP3 music tracks. Vite bundles these files. Unused source libraries remain local and are excluded by `.gitignore`. The Web Audio mixer provides a master limiter, bounded simultaneous voices, camera-relative stereo panning, and distance attenuation. Missing audio fails gracefully.

- Pistol / SMG: `pistol_fire.wav` / `smg_fire_1.wav`; melee swings use `miss_hit.wav`.
- Creature attacks, hit reactions, and knockdowns use the matching `monster*_attack`, `monster_hit*`, and `monster*_death` clips. Nearby creatures occasionally vocalize with `growl1.wav`.
- Walking / sprinting uses `footsteps.wav`, with pace matching movement and no playback when standing or airborne.
- `generator.wav` provides quiet electrical hum near street lamps and the car engine.
- Reload handling, weapon selection, impacts, vehicle doors, purchases, pickups, player defeat, and UI actions use matching clips.
- Switching world atmosphere uses `energy_on.wav` / `energy_off.wav`.

Additional clips remain available in the SFX folder for future effects. Browser audio playback still needs a listening check.


## Hit effects and performance

Bullet hits on monsters emit red voxel particles from a reusable 256-particle pool (one instanced draw call); particles fall, shrink, and expire. Reload times are 0.9 seconds for the pistol and 1.25 seconds for the SMG. Balanced graphics are the default (pixel ratio capped at 1.25 and 1024px shadows), with High and Low still available in the pause menu. Fog-distance creature culling, cached route choices, continuous geometric navigation sweeps, and local collision broad-phase filtering reduce frame work.


## Grenades and Gatling gun

Press **4** to equip the handheld Gatling: hold click/F for a 0.35-second spin-up, then sustained fire from a 120-round belt. Reload with R (1.6 seconds). Press **G** to throw a grenade while holding any weapon, or equip **5** and attack. Grenades have a 1.7-second fuse, bounce off obstacles, and cause damage/knockback within 9 world units, with distance falloff and wall cover. Your own blast can hurt you. Start with 5 grenades; the ammo purchase also supplies 2 grenades and 180 Gatling rounds. Touch controls include a grenade button. At most 8 grenades can be airborne at once; flight meshes are reused. Explosions use short-lived low-poly effects and the supplied explosion audio.


## Shotgun and scavenging

Press **6** for the shotgun: eight pellets per shell, a short spread, damage falloff, strong knockback, 8-shell capacity and a 1.1-second reload. Each pellet obeys wall and vehicle collision; nearby groups can be hit by one shot. The shotgun uses the supplied shotgun and shell SFX.

25 supply boxes spawn at random clear sidewalk locations each session: white/red cross = +35 health (up to 100), green = reserve ammunition for all guns, olive = +2 grenades (up to 20), orange = +16 shotgun shells, gold = $75. Walk over a box on foot to collect it. Unneeded health kits stay on the ground. Collected boxes respawn at random locations after 30–50 seconds, away from the player, walls, cars, and other active boxes. Supply types are also colored on the map.


## Destructible cars

Gunfire and grenade blasts damage cars. At zero health a car explodes once, damages and knocks back nearby monsters, and can ignite other already-damaged cars. Walls block blast damage. Destroyed cars stay as charred, solid wrecks and cannot be driven; an occupied car ejects its driver when destroyed. Explosions can injure the player. Chain reactions process at most four car blasts per frame, and use `explode3.wav`.


## Four-legged hounds

Eight of the 36 roaming creatures are small, low-poly four-legged hounds. They chase at 4.6–5.3 units/second (faster than normal walking, slower than sprinting), have 60 health, and bite for 6 damage every 0.9 seconds. Their diagonal leg pairs alternate in a fast running gait. They share collision avoidance, blood particles, knockback, monster SFX, knockdowns and respawning with the other creatures.

### Five seals and the Park Warden
Walk over five red symbols hidden across the city. Symbols show on the map within
28 metres. Each new symbol summons a wave (6, 10, 14, 18, then 22 monsters).
The fifth awakens the original Park Warden boss north of the central fountain;
its location and health appear on the map and objective card. Defeat it to complete
the objective. Wave enemies and the boss stay defeated. Objective progress lasts
for the current page session; refreshing starts a new hunt.

Every supply has a pulsing, colour-matched ground ring that follows its respawn.
White nurses and lying figures spit dodgeable green acid fireballs, blocked by
buildings and parked cars. The Warden fires three-shot volleys. Pyramid heads are
about 50% larger and move at 1.35 m/s, with larger collision bodies and navigation
clearance. Acid is limited to 48 active projectiles and uses shared geometry.

### Visibility and controls update
The speed panel is hidden. Number keys and numeric keypad 1–9 select weapon slots:
1 fists, 2 pistol, 3 SMG, 4 Gatling, 5 grenades, 6 shotgun; 7–9 are empty and
leave the current weapon equipped. Nearby buildings fade to 16% opacity within
3 metres of their footprint and return to opaque by 8 metres; roofs and signs
fade with them while physical collisions remain active.

Acid launches ahead of the monster at head height, follows a gravity-driven arc,
and rotates its trailing flame with its current velocity. Swept height-aware
collisions stop it at buildings, vehicles, the player, or the ground; shots above
the player no longer cause a hit. Automated checks cover arcs across frame rates,
cover heights, building fading/restoration, and all nine keyboard slots.

### Acid splashes, cutaway buildings, and destructible props
Acid impacts scatter bright green droplets that flatten on the floor and fade
within 6–6.5 seconds. The effect reuses a fixed 384-particle pool.
Nearby buildings now hide their upper half and leave the lower half at 3.5%
opacity. Buildings crossing the camera's view of the player also fade, regardless
of proximity; walking away or rotating the camera restores them.

Guns, melee attacks, grenades, and car explosions damage trees, benches, lamps,
bins, hydrants, planters, and the park sign. Destroyed props scatter debris,
disappear permanently for the session, and lose their collision footprints.
Monster navigation rebuilds after destruction so cleared paths become usable.
Destroyed lamps stop emitting light. Buildings and the park fountain remain solid.

### Summons, pursuit, acid hazards, and weapon bar
Triangle heads summon two hounds every 12 seconds while nearby; the Park Warden
summons two triangle heads every 18 seconds. Living summons are capped per parent
(six hounds or four triangle heads) and globally (24, reserving six slots for
triangle heads). Defeated summoned models are reused, and dead parents cannot summon.

When the player sprints or drives faster than 6 m/s, living non-boss monsters more
than 75 metres away can reposition into clear locations 32–46 metres away, at most
two every 0.6 seconds. The boss stays in the world rather than teleporting.

Acid puddles and particles last two seconds. Puddles are walkable hazards, not solid obstacles. Contact burns for 8 health
per second, including after leaving and re-entering the same puddle. Jumping
avoids contact while airborne. Puddles use a bounded 48-slot visual pool.

The visible weapon bar shows numbered SVG icons and highlights the current weapon.
Click an icon, press 1–6, or scroll to equip. Slots 7–9 remain visibly empty.
Shift+scroll zooms the camera; Q still cycles weapons. Held guns and grenades now
sit on the original rig's right side, with the right arm as the firing/throwing arm.

### Taller character proportions
Humanoids now use longer leg segments, longer torsos/arms, slimmer silhouettes,
and smaller heads. The player is approximately 30% taller than the earlier model;
triangle heads and the boss retain their larger size hierarchy. Hounds have
slightly longer bodies and legs but remain small. Weapons follow an articulated
right-hand socket, and grenade launch, acid mouths, player hit height, aiming,
and tracers have been adjusted for the new proportions.

### Gun flashes and player-centred fog
Every successful gunshot produces a short orange-white barrel flash and a warm
light burst on nearby surfaces. Shotgun flashes are larger; rapid-fire weapons
reuse the same flash meshes and shadow-free light.

Fog now follows world-space distance from the player, with an almost-clear
11-metre radius and full fog at about 43 metres. A subtle drifting transition
covers the surrounding city. Camera zoom/orbit no longer controls the clear
zone. The same fog applies to instanced scenery, newly spawned monsters,
particles, and replacement wreck materials. Both fog worlds retain their colours.

### Combined survival HUD
Lives, health and armor bars, current ammo, reload controls, cash, and numbered
weapon icons now share one panel along the bottom. Objectives stay at the upper
left and the minimap moves clear of the panel. Star ratings are hidden for later.

Each run starts with three lives, 100 health, and 50 armor. Armor absorbs damage
before health; blue pickups restore 40 armor up to 100. Losing a life recovers
health and spends $100; armor must be found again. The final death ends the run
with a restart button. Lives and armor reset on a new run rather than being saved.

### Supplied weapon audio
Weapon firing, reload starts/completions, equip actions, grenade launch/explosion,
car blasts, ricochets, and minigun wind-up/down now use matching WAVs from
`weapons/`. The four-second minigun firing clip runs as a controlled loop while
shooting, stopping on release, reload, empty ammo, weapon switch or pause. Rapid
SMG shots replace the oldest sound tail when needed so new shots remain audible.

### Weapon grips and grenade launcher
Pistols use the right hand. SMG, shotgun, Gatling, and grenade launcher use both
hands, with articulated elbows reaching the trigger and front grip. Heavy weapons
are held lower. Slot 5 now equips a visible grenade launcher; click/F fires and
G equips/fires it directly. Launcher rounds arc from the muzzle at 24 m/s and
detonate on contact with an obstacle or the ground, with a fuse fallback. Olive
pickups supply launcher rounds. The launcher uses its supplied firing sound,
muzzle flash, explosive splash damage, and recoil pose.

### Lightning Orbit skill
Press V or click the lightning button in the survival HUD with a full energy meter.
Three luminous orbs orbit the player for eight seconds, striking up to four distinct
nearby enemies each second for 45 damage each. Nearest targets within 18 metres
are preferred; buildings and cars block strikes. The meter shows remaining active
time, then recharges over 20 seconds. The skill starts ready, works on foot, pauses
with the game, and resets empty on death. Entering a vehicle ends the active skill.
Orb and bolt meshes are reused, with four bounded lightning bolts and one light.

### Ambient and infected sounds
Lightning Orbit activation now uses `sounds/lightning_strike_2.wav`, with short
`sounds/zap1.wav` and `zap3.wav` sounds for strike pulses. Quiet grass wind and
occasional distant thunder cover the city. Infected growls, hurts, attacks and deaths
are wired into creature events. Player footsteps now play at a distance-based
walking/sprinting cadence, stop while idle, airborne or driving, and alternate
pitch slightly. The existing SFX footsteps clip remains the walking source; physics
weapon/wood impact clips are not substituted for footsteps on paved streets.

### Compact HUD
Health, armor, and Lightning Orbit meters now stack vertically in a small
bottom-right panel. Beside them is only the current weapon's icon, slot number,
ammo, and reload control. Lives remain above the bars. The full weapon strip is
removed; number keys, Q, scrolling, and clicking the current weapon still switch.
Cash and the ammo purchase button now live in the pause menu.

### Corner widget layout
The compact health/armor/skill and weapon panel sits at the upper right. The
minimap sits at the upper left. A small, translucent objective card sits below
the status panel along the right edge, with title/progress and a map link instead
of the long objective description. Mobile and short-window layouts use smaller
corner panels to preserve the centre and lower play area.

### Theme selector
Choose **1 · Zombies** or **2 · Fogbound horror** on the welcome screen or in
the Escape pause menu. The existing horror theme remains the default. Zombie mode
uses infected walker/spitter/brute models and an Alpha Infected boss, with green
outbreak atmosphere and Dead Zone branding. Theme switching rebuilds enemy visuals
while preserving roots, positions, health, summons, and objective progress. Future
spawns follow the selected theme; weapons, skills and encounter rules are shared.

### Antidote objective
The five collectibles are now antidote ingredients: serum sample, stabilizer,
catalyst, cell culture, and binding agent. Mint-green vial models, ground rings,
and nearby map markers identify them. HUD, pickup messages, boss trigger, victory
text, and help describe the ingredient hunt. Each ingredient still triggers a
larger wave; collecting all five reveals the final boss in the central park.

### Zombie dogs and heavy infected
Zombie-mode hounds are now infected black dogs with dark coats, upright ears,
longer muzzles, tails, amber eyes, and red infection patches. The heavy infected
use a brown Tank-inspired silhouette with broad shoulders, a smaller head,
oversized muscular arms and fists, and torn dark trousers. Existing speed,
summoning, collision, and combat behavior is preserved.

### Optional antidote auto-guide
The title screen includes an Auto-guide to antidote checkbox, enabled by default.
It selects the nearest uncollected ingredient, draws a short mint route on the
street and the full route on the map, and shows distance in the objective card.
Routes avoid buildings and cars and update after pickups or movement. Turning
it off leaves the normal nearby ingredient discovery markers. This is navigation
guidance; the player retains movement control.

### Red ingredient navigation and clearer doors
The minimap retains the full route. In the world, a single small red pointer sits
around the player and points directly toward the selected ingredient; the street
route is removed. Ingredient vials, ground rings and map markers are red. Building
doors now have light frames, handles and thresholds with subtle self-illumination;
their frames remain partially visible when nearby buildings fade.

### Background music
The supplied `sounds/menu.mp3` plays on the title screen and
`sounds/action-background.mp3` plays during gameplay and continues in the pause menu. Tracks loop, stream without
full-file decoding, and fade between screens. Music starts after a click or key
press to satisfy browser autoplay rules. The pause menu has a separate music
volume slider, defaulting to 25%; hidden tabs pause playback.

### Speed upgrades
On-foot sprinting and the touch run button are removed. Purple speed pickups
increase speed one level at a time, capped at level 5. Movement starts at 4.4 m/s
and reaches 8.2 m/s at maximum. The compact HUD shows SPD 0/5 through SPD MAX.
Upgrades last for the current run, including after losing a life. At maximum,
unused speed pickups stay on the ground. Shift still boosts vehicles and supports
Shift+scroll camera zoom.

### Enemy loot drops
Enemy deaths from any attack can drop glowing supply pickups near the corpse:
ammo, health, armor, shells, launcher rounds, speed, or cash. Normal enemies have
a 45% chance, heavy infected 80%, and bosses 100%. At speed level 5, speed rolls
become ammo. Drops spawn clear of buildings/cars, expire after 60 seconds, and do
not respawn elsewhere. A bounded 35-item drop pool reuses collected/expired models.

### UI and balance update
Buttons use title case. Zombie menus and loading text use outbreak terminology.
Lightning Orbit now banks up to three uses (100 energy each, 300 maximum), starting
with one ready use. The segmented meter and count show stored energy. Death ends
an active orbit but preserves all banked energy and partial recharge progress.
Each use recharges over 20 inactive seconds. Every enemy, including heavy infected
and bosses, now has a flat 20% chance to drop a supply item.

### Vehicle impacts
Driving into enemies deals speed-based damage capped at 45 per impact and applies
knockback, rather than guaranteeing a kill. Heavy infected resist damage and slow
cars more. A per-target cooldown prevents contact from dealing damage every frame.
Trees and street props take impact damage; destroyed objects clear the road and
reduce momentum according to their weight (bins less, trees/planters more).
Low-speed bumps, surviving props, buildings and parked cars remain solid. Driving
uses short collision steps so fast vehicles cannot tunnel through targets.

### Enemy health and faster lightning
Living enemies now have camera-facing health bars above their models, with a
larger gold bar for the boss. Bars update after damage and disappear on defeat;
a single instanced draw call covers normal, summoned, and wave enemies.
When the boss spawns, the objective pointer changes to gold and points toward it,
even if ingredient auto-guide is disabled. It disappears after boss defeat.
Lightning Orbit now strikes up to four enemies every 0.5 seconds.

### Night/high defaults and height-aware aiming
New runs open at night with High graphics (up to 1.75 device pixel ratio and
2048-pixel shadows). The pause settings still allow changes.
Mouse aiming now targets the visible enemy body beneath the crosshair, including
the dogs' low, elongated silhouettes. Empty-ground aiming angles downward nearby
and approaches level fire farther away. Guns, hand grips, muzzle flashes and
tracers follow elevation. Gunshot collision now uses 3D body/cover heights and
stops downward shots at the floor; melee retains its existing close-range logic.

### Completion choices
After collecting all five antidote ingredients and defeating the boss, gameplay
pauses for a completion dialog. Free Mode resumes the current run with supplies,
weapons, upgrades and surviving enemies intact. Return to Demo saves cash/job
progress and reloads the title screen. The dialog appears once and requires one
of these choices; Escape cannot dismiss it accidentally.

### Single-line objectives and gun damage
Centre objective announcements now show one headline, using a wider container and
shrinking the font as needed to remain on one line. Additional objective details
remain in the objective card/help. Damage is now pistol 20, SMG 28, Gatling 36,
and shotgun 24 per pellet (eight pellets, with spread and distance falloff).

### Weapon order and continuous Gatling feed
Weapon keys now follow: 1 fists, 2 pistol, 3 shotgun, 4 SMG, 5 Gatling,
6 grenade launcher. Scroll/Q, models, icons, sounds, pickups, and ammo purchases
follow the same order. Gatling never reloads: it continuously draws ammunition
from its belt and reserve, and displays the total rounds remaining. It still
requires ammo pickups/purchases when empty; its Reload button is disabled.

### City landmarks and park clock
Three ordinary blocks are replaced by one church (northwest), one school
(northeast), and one hospital (southwest). The church has a stepped roof/steeple,
the school a courtyard/flagpole, and the hospital a red cross and helipad. Landmarks
have building collisions, nearby cutaway fading, and labels on the full map.
The central fountain is replaced by a large four-faced clock tower. Its hands
follow game time in both day and night; the central park boss spawn stays clear.

### Enemy death pops and short-lived drops
Defeated enemies burst into red particles and disappear immediately. Dead bodies
stay hidden and no longer revive after the former 12-second timer. Summoners can
still reuse defeated summon models for new enemies. Death particles use a fixed
512-particle pool. Enemy loot now expires after five gameplay seconds, hiding both
the item and its ring; collected or expired drops do not respawn elsewhere.

### Larger waves and flying bat summons
Ingredient waves now contain 12, 20, 28, 36, and 44 enemies. The boss alternates
between flying bats and heavy infected summons every ten seconds, starting with
bats. Bats have flapping wings, 40 health, swooping movement and close-range bites;
they fly over cars and street props while avoiding buildings. Gun aiming, lightning,
health bars, death particles and loot include bats. Summons reuse defeated models
and remain capped, including three bats and three summoned heavy infected.

### Doubling waves and boss fireballs
Antidote ingredients now trigger waves of 50, 100, 200, 400, and 800 enemies.
Reinforcements stream in while fewer than 160 enemies are active; queues wait for
room, and defeated non-summoned models are reused. Boss/summon encounters retain
their own limits. Boss volleys are orange fireballs with ember bursts and brief
burning floor patches (12 damage/second). Regular spitters retain green acid.
Both projectile types retain gravity, cover collisions, and dodgeable trajectories.

### Endless Free Mode waves
Free Mode starts with 1,600 enemies, counting any living enemies carried over
from the completed demo. Clearing every enemy in that wave unlocks 3,200, then
6,400, and continues doubling. The objective card tracks the wave total and
remaining enemies. Each new wave gets a centred announcement. Enemies arrive as
reinforcements under the existing 160-active limit rather than all at once.

### Doubling Free Mode bosses
Free Mode begins with 1,600 regular enemies plus two bosses. Subsequent waves
have 3,200 + four bosses, 6,400 + eight bosses, and continue doubling both totals.
Advancement waits for queued reinforcements and every wave boss to be defeated.
Bosses reuse dead models, retain fireballs and summons, appear on the map, and
the gold pointer selects the nearest living boss. Up to eight bosses are active
at once in later waves; remaining bosses arrive as earlier ones are defeated.

### Solid nearby building cutaways
Building transparency is removed. Within five metres of a building footprint,
only its lower half remains visible, fully opaque with solid cut surfaces and
clear doors. Full height returns beyond seven metres to avoid edge flicker.
Camera obstruction alone no longer changes a distant building's appearance.

### Model pickups, yellow lightning and no currency
Supplies now use recognisable models: pistol/SMG/Gatling/shotgun/launcher for their
matching ammunition, a vest for armor, a medkit for health, boots for speed, and
an extruded yellow lightning symbol. Each ammunition model supplies only its
weapon. Lightning pickups add 100 energy (one use), capped at three stored uses.
The meter, skill icon, orbiting balls, lightning strikes and light are yellow.
Cash pickups, ammo purchases, job cash rewards and death recovery fees are removed;
optional jobs grant supplies instead. The 20% loot chance and five-second expiry
remain in effect.

### Respawn equipment and protection
Losing a life preserves the selected weapon, weapon order, ammunition and launcher
rounds. Interrupted reload/firing actions are cancelled. Respawns are on foot with
a visible blue bubble shield lasting three seconds, matching damage immunity.
The shield follows movement/jumping and fades just before protection expires.
