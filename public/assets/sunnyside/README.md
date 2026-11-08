# Sunnyside World assets (staged)

**Pack:** Sunnyside World Asset Pack **V2.1**  
**Source copied:** `Sunnyside_World_Assets/` only (loose PNG/GIF/Aseprite tree)  
**Not included:** `Sunnyside_World_Gamemaker/` (GameMaker project files)

## Layout

```
Characters/   Human (player layers), Goblin, Skeleton + Aseprite sources
Elements/     Animals, Crops, Plants, VFX, Other props
Tileset/      16px world + 32px forest sheets
UI/           HUD bars, cursors, tools, expressions
```

The game loads a **curated expanded slice** via `js/assets.js` (`CURATED_ASSETS`): full Human action layers (idle/walk/run/attack/hurt/cast/wait/reel/caught/swim/death), goblin/skeleton enemy clips (idle/walk/run/attack/hurt/death), farm animals, fire VFX, tileset cells, and UI icons. Animation is driven from player/enemy state with frame timing; missing clips fall back to another strip or procedural `fillRect` drawing. Content is auto-cropped and outfit dye recolors hero/NPC clothing + hair.

Serve the **repo root** with a static server so URLs like `public/assets/sunnyside/...` resolve.

To map more art: add a key in `CURATED_ASSETS`, then wire `assets.drawStrip` / `assets.drawTile` / `assets.drawImage` (or the animal/NPC/boss helpers) in the relevant draw path, keeping the procedural fallback when the image is missing.
