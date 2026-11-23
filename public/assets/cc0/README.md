# Misc CC0 HUD / companion art

## `hearts.png`

- **Source:** [Hearts](https://opengameart.org/content/hearts) by firehawk on OpenGameArt
- **License:** CC0 1.0
- Heart strip used for HUD life pips when Sunnyside `expression_love` is not preferred as a single glyph.

## `bow.png` / `shield.png`

- **Source:** Original 16×16 pixel glyphs authored for Sword Fighter 2 HUD slots
- **License:** CC0 1.0
- Palette matched to Sunnyside World UI tools (`sword.png` / `axe.png` / `rod.png`).
- Used because neither the staged Sunnyside UI pack nor Kenney Game Icons includes a true bow or shield glyph.

## `rabbit_strip4.png`

- **Source:** Original 4-frame (32×32) side-view hop strip authored for Sword Fighter 2
- **License:** CC0 1.0
- Sunnyside World V2.1 `Elements/Animals/` has cow/pig/sheep/chicken/duck/bird only — no rabbit sheet.
- Drawn at the same frame size as the farm-animal strips so `AssetLoader.drawAnimalSprite` can treat it like the others.

## Boss idle strips (`boss_*_idle_strip4.png`)

- **Source:** Original 4-frame (48×48) idle strips authored for Sword Fighter 2
- **License:** CC0 1.0
- Sunnyside World V2.1 ships Goblin + Skeleton + Human only — no dedicated boss sheets.
- Files:
  - `boss_temple_idle_strip4.png` — purple horned roof golem (Temple 1)
  - `boss_temple2_idle_strip4.png` — cyan crystal sanctum guardian (Temple 2)
  - `boss_fire_idle_strip4.png` — living fireball elemental (Volcano)
  - `boss_water_idle_strip4.png` — abyssal water guardian (Water Temple)
- Wired via `BOSS_SPRITES` / `drawBossSprite` with thematic aura layers; missing sheets fall back to tinted goblin/skeleton stand-ins.
