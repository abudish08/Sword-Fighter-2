# Sword Fighter 2

Cole's retro 1980s-style blocky pixel RPG — a top-down adventure inspired by classic Zelda games.

A fully playable browser game with an infinite procedural world, multiple temples/dungeons, bosses, quests, fishing, an art/dye shop, inventory, multiplayer split-screen, and more.

## How to Play

### Online (Recommended)
Once the repo is public and GitHub Pages is enabled, open:

**https://abudish08.github.io/Sword-Fighter-2/**

### Locally
ES modules need a tiny local web server (opening `index.html` as a `file://` page will not load `js/*.js`).

```bash
# From the repo folder:
python3 -m http.server 8000
# Then open http://localhost:8000
```

Or any other static server (VS Code Live Server, `npx serve`, etc.).

## Controls

### Player 1 (Right side in multiplayer)
| Action              | Key          |
|---------------------|--------------|
| Move                | Arrow Keys   |
| Sword / Attack      | Enter        |
| Bow                 | P            |
| Interact            | Q            |
| Fish                | C            |
| Eat Pork            | 9 or L       |
| Golden Apple        | 0            |
| Equip Regular Sword | 1            |
| Fire Claymore       | 2 or B       |
| Wave Launcher       | V            |
| Shield (hold)       | Shift        |
| Inventory           | I            |
| Quests              | J            |
| Map / Fast Travel   | M            |

### Player 2 (Left side in multiplayer)
| Action         | Key       |
|----------------|-----------|
| Move           | W A S D   |
| Sword / Attack | Caps Lock |
| Bow            | E         |
| Interact       | F         |
| Eat Pork       | 2         |
| Golden Apple   | 3         |

### Shared
- **Settings**: Gear icon or title screen
- **Language**: English / Français / Español

## Features
- 500,000 × 500,000 tile procedural world with hand-crafted core areas
- Oakvale Village, West Ocean + Submarine, East Volcano Fire Temple, Abyssal Water Temple
- Multiple bosses with unique attack patterns
- Quest system, fishing, art/dye shop with color mixing, inventory, and outfit switching
- Fast-travel flags
- 4 save slots (stored in browser localStorage)
- Split-screen multiplayer
- Retro chiptune music and sound effects
- Sunnyside World sprites where mapped (hero, enemies, animals/NPCs, biomes, UI), with procedural `fillRect` fallback

## Art assets (Sunnyside)

Pack files live in `public/assets/sunnyside/`. On boot, `js/assets.js` loads a **curated slice** (see `CURATED_ASSETS`) with a progress bar. Missing images do not block play — draws fall back to the original blocky Canvas path.

**Currently sprite-backed:** Human hero action set, Goblin→blob & Skeleton→snake, animals/NPCs/boss stand-ins, Oakvale/temple/ocean/volcano tiles + plant/foam/fire/glint/coracle deco, title/HUD icons.

**Still procedural:** lava magma fill (pack has no lava cell — fire VFX overlays it), diving outfit, most building roofs / interactable props, HUD emoji, weapons/FX overlays.

**Adding more:** append a `{ key, url, frames? }` row to `CURATED_ASSETS` in `js/assets.js`, map it in `TILE_ATLAS` / `ENEMY_SPRITES` (or call `assets.drawStrip` / `assets.drawTile` / `assets.drawEnvDeco` from the draw path), and keep the `fillRect` branch as fallback. Biome smoke: `tools/env-demo.html`.

## Tips
- Explore West for the ocean and submarine, East for the volcano.
- Talk to villagers in Oakvale for quests.
- Defeat bosses to unlock stronger weapons and gear.
- Use the map (M) after conquering flags to fast travel.
- Progress is saved automatically to your browser.

Enjoy the adventure!