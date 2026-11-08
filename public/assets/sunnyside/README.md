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

The game loads a **curated expanded slice** via `js/assets.js` (`CURATED_ASSETS`): hero layers, goblin/skeleton enemies, farm animals, fire VFX, tileset cells (grass/path/water/wall/wood/dungeon/lava/bridge/temple/volcano), and UI icons. Content is auto-cropped (padding trimmed) and outfit dye recolors hero/NPC clothing + hair. Missing mappings still use procedural `fillRect` fallbacks.

Serve the **repo root** with a static server so URLs like `public/assets/sunnyside/...` resolve.

To map more art: add a key in `CURATED_ASSETS`, then wire `assets.drawStrip` / `assets.drawTile` / `assets.drawImage` (or the animal/NPC/boss helpers) in the relevant draw path, keeping the procedural fallback when the image is missing.
