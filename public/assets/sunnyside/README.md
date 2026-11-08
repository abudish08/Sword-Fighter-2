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

The game loads a **curated first slice** of these files via `js/assets.js` (`CURATED_ASSETS`). Serve the **repo root** with a static server so URLs like `public/assets/sunnyside/...` resolve.

To map more art: add a key in `CURATED_ASSETS`, then wire `assets.drawStrip` / `assets.drawTile` / `assets.drawImage` in the relevant draw helper, keeping the procedural `fillRect` path when the image is missing.
