# Sword Fighter 2

Cole's retro 1980s-style blocky pixel RPG — a top-down adventure inspired by classic Zelda games.

A fully playable browser game with an infinite procedural world, multiple temples/dungeons, bosses, quests, fishing, an art/dye shop, inventory, multiplayer split-screen, and more.

## How to Play

### Online (Recommended)
Once the repo is public and GitHub Pages is enabled, open:

**https://abudish08.github.io/Sword-Fighter-2/**

### Locally (browser)
ES modules need a tiny local web server (opening `index.html` as a `file://` page will not load `js/*.js`).

```bash
# From the repo folder:
python3 -m http.server 8000
# Then open http://localhost:8000
```

Or any other static server (VS Code Live Server, `npx serve`, etc.).

### Desktop app (optional, double-click install)

The browser / GitHub Pages game stays the main way to play. Optionally you can wrap the **same** static site in a lightweight **Tauri** desktop window so it runs like a normal installed app.

**What you need on your computer (one-time):**
1. [Node.js](https://nodejs.org/) (LTS is fine)
2. [Rust](https://www.rust-lang.org/tools/install) (`rustup` → **stable 1.90+**; run `rustup update`)
3. OS webview libraries (Tauri’s docs list them):
   - **macOS**: Xcode Command Line Tools
   - **Windows**: WebView2 (usually already present on Win10/11)
   - **Linux**: `webkit2gtk` + GTK (e.g. Ubuntu: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`, `patchelf`)

**Run in a desktop window (dev):**
```bash
npm install
npm run desktop:dev
```
That starts the usual local web server and opens Sword Fighter 2 in an app window. Game files are still the ones in this repo — no separate game copy.

**Build an installable app:**
```bash
npm install
npm run desktop:build
```
Installers / binaries land under `src-tauri/target/release/bundle/` (exact folder names depend on your OS: `.dmg` / `.app` on Mac, `.msi` / `.exe` on Windows, `.deb` / `.AppImage` on Linux). Double-click / install from there.

**Notes for Andy:**
- You do **not** need the desktop build to play online — Pages keeps working unchanged.
- First desktop build downloads Rust crates and can take several minutes; later builds are faster.
- The game still loads Tailwind + Google Fonts from the internet (same as the browser version). Offline-only packaging can come later when those are self-hosted.
- Optional nicer app icons: drop a square PNG over `src-tauri/icons/icon.png`, then run `npm run desktop:icons`.

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
| Action         | Key                    |
|----------------|------------------------|
| Move           | W A S D                |
| Sword / Attack | Space (or Caps Lock)   |
| Bow            | E                      |
| Shield (hold)  | Ctrl                   |
| Interact       | F                      |
| Fish           | R                      |
| Eat Pork       | 2                      |
| Golden Apple   | 3                      |

In 2P, Fire Claymore is **[B]** (not `2`, which is P2 pork). Inventory / quests / map / save stay shared.

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
- Hybrid audio: Kenney / artisticdude **CC0** samples + richer Web Audio chiptune BGM (Settings mute toggles still work)
- Sunnyside World sprites where mapped (hero, enemies, animals/NPCs, biomes, UI), with procedural `fillRect` fallback

## Art assets (Sunnyside + free UI/SFX)

Pack files live in `public/assets/sunnyside/`. On boot, `js/assets.js` loads a **curated slice** (see `CURATED_ASSETS`) with a progress bar. Missing images do not block play — draws fall back to the original blocky Canvas path.

**Currently sprite-backed:** Human hero action set, Goblin→blob & Skeleton→snake, animals/NPCs/boss stand-ins, Oakvale/temple/ocean/volcano tiles + plant/foam/fire/glint/coracle deco, HUD tools (sword/rod/water/basket/…), Kenney CC0 chrome icons (gear/music/audio/save/home).

**Still procedural / emoji gaps:** lava magma fill (no lava cell — fire VFX overlays it), diving outfit, most building roofs, true bow/shield glyphs (emoji kept), pork chop / golden apple (crop/egg stand-ins).

**Free CC0 UI/SFX (attribution READMEs in-folder):**
- `public/assets/kenney/` — Kenney Game Icons + Interface Sounds (+ UI RPG bars)
- `public/assets/sfx/rpg/` — curated artisticdude RPG Sound Pack samples
- `public/assets/cc0/hearts.png` — firehawk hearts strip

**Adding more:** append a `{ key, url, frames? }` row to `CURATED_ASSETS` in `js/assets.js`, map it in `TILE_ATLAS` / `ENEMY_SPRITES` / `UI_ICONS` (or call `assets.drawStrip` / `assets.drawTile` / `assets.drawEnvDeco` from the draw path), and keep the `fillRect` / emoji branch as fallback. Biome smoke: `tools/env-demo.html`.

## Tips
- Explore West for the ocean and submarine, East for the volcano.
- Talk to villagers in Oakvale for quests.
- Defeat bosses to unlock stronger weapons and gear.
- Use the map (M) after conquering flags to fast travel.
- Progress is saved automatically to your browser.

Enjoy the adventure!