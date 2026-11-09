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

The game loads a **curated expanded slice** via `js/assets.js` (`CURATED_ASSETS`): full Human action layers (idle/walk/run/attack/hurt/cast/wait/reel/caught/swim/death), goblin/skeleton enemy clips, farm animals, fire/glint VFX, plant/coracle/rock deco, tileset cells (grass/path/sand/water/wall/wood/dungeon/bridge/temple/volcano + foam/bush), crop growth stages (wheat/carrot/pumpkin/sunflower), village props (windmill, crates, chimney smoke), catch/item icons, and UI tools (rod/plant/water/basket). Lava stays procedural (no magma cell in the pack) with fire overlays. House shells stay procedural (pack has no full building sheets). Animation is driven from player/enemy state with frame timing; missing clips or tiles fall back to procedural `fillRect` drawing. Content is auto-cropped and outfit dye recolors hero/NPC clothing + hair.

Serve the **repo root** with a static server so URLs like `/public/assets/sunnyside/...` resolve. Biome smoke: `tools/env-demo.html`. Content smoke: `tools/content-demo.html`.

To map more art: add a key in `CURATED_ASSETS`, then wire `assets.drawStrip` / `assets.drawTile` / `assets.drawEnvDeco` / `assets.drawImage` in the relevant draw path, keeping the procedural fallback when the image is missing.
