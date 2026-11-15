/**
 * World constants, procedural generation, tile queries, and world rendering.
 */

import { sfx, assets, CROP_STAGE_SECONDS } from './assets.js';

/**
 * WORLD & TILE CONSTANTS (500,000 x 500,000 BOUNDED BLOCK WORLD — ZERO CURVES)
 */
export const TILE = 44;
export const MAP_W = 220;
export const MAP_H = 96;
export const WORLD_LIMIT = 500000; // 500,000 by 500,000 grass, path, and water blocks

export const T_GRASS = 0;
export const T_PATH = 1;
export const T_TREE = 2;
export const T_WALL = 3;
export const T_DUNGEON_FLOOR = 4;
export const T_CHASM = 5;
export const T_BRIDGE_SAFE = 6;
export const T_BRIDGE_TRAP = 7;
export const T_WOOD_FLOOR = 8;
export const T_WATER = 9;
export const T_TEMPLE2_FLOOR = 10;
export const T_VOLCANO_ROCK = 11;
export const T_LAVA = 12;
export const T_FIRE_FLOOR = 13;
export const T_SUB_FLOOR = 14;
export const T_WATER_TEMPLE_FLOOR = 15;

export const worldMethods = {
  /**
   * DETERMINISTIC COORDINATE HASHING & 500,000 x 500,000 BOUNDED BLOCK WORLD
   */
  coordHash(x, y, salt = 0) {
      let h = (x * 374761393 + y * 668265263 + salt * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },

  getTileAt(tx, ty) {
      // Hard outer world boundary: 500,000 by 500,000 blocks (-250,000 to +250,000)
      const halfLimit = WORLD_LIMIT / 2;
      if (tx < -halfLimit || tx >= halfLimit || ty < -halfLimit || ty >= halfLimit) {
          return T_WALL;
      }
      // Core region uses the handcrafted map (with open outer edges into the 500,000x500,000 world)
      if (ty >= 1 && ty < MAP_H - 1 && tx >= 1 && tx < MAP_W - 1) {
          return this.map[ty][tx];
      }
      // Grand roads across the 500,000x500,000 world
      if (Math.abs(tx - 92) <= 1 || Math.abs(ty - 61) <= 1) {
          return T_PATH;
      }
      // Far West is deep ocean water
      if (tx < 25 && ty > 10 && ty < 90) {
          return T_WATER;
      }
      const regionX = Math.floor(tx / 18);
      const regionY = Math.floor(ty / 18);
      const localX = ((tx % 18) + 18) % 18;
      const localY = ((ty % 18) + 18) % 18;
      const biomeNoise = this.coordHash(regionX, regionY, 11);

      // Procedural Water Lakes in the 500,000x500,000 world
      if (biomeNoise < 0.22) {
          if (localX >= 4 && localX <= 14 && localY >= 4 && localY <= 14) return T_WATER;
          if (localY === 9 && localX >= 2 && localX <= 5) return T_WOOD_FLOOR;
      }
      // Procedural Outpost Cottages
      if (biomeNoise > 0.84 && localX >= 6 && localX <= 12 && localY >= 6 && localY <= 11) {
          if (localY === 11 && localX === 9) return T_WOOD_FLOOR;
          if (localX === 6 || localX === 12 || localY === 6 || localY === 11) return T_WALL;
          return T_WOOD_FLOOR;
      }

      const detail = this.coordHash(tx, ty, 3);
      if (detail < 0.08) return T_TREE;
      return T_GRASS;
  },

  ensureChunkPopulated(tx, ty) {
      const cx = Math.floor(tx / 18);
      const cy = Math.floor(ty / 18);
      for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
              const rX = cx + dx;
              const rY = cy + dy;
              // Skip core handcrafted map chunks
              if (rX >= 0 && rX <= 12 && rY >= 0 && rY <= 5) continue;
              const key = `${rX},${rY}`;
              if (this.visitedChunks.has(key)) continue;
              this.visitedChunks.add(key);

              const baseX = rX * 18 + 9;
              const baseY = rY * 18 + 9;
              const h = this.coordHash(rX, rY, 77);

              // Spawn bushes & flowers in every infinite chunk
              for (let i = 0; i < 3; i++) {
                  const bx = (rX * 18 + 3 + Math.floor(this.coordHash(rX, rY, 100 + i) * 12));
                  const by = (rY * 18 + 3 + Math.floor(this.coordHash(rX, rY, 200 + i) * 12));
                  if (this.getTileAt(bx, by) === T_GRASS) {
                      this.bushes.push({ x: bx * TILE, y: by * TILE, r: 24 });
                  }
              }

              const flowerPalette = [
                  { colorName: 'Red', hex: '#ef4444' },
                  { colorName: 'Blue', hex: '#3b82f6' },
                  { colorName: 'Yellow', hex: '#eab308' },
                  { colorName: 'White', hex: '#f8fafc' },
                  { colorName: 'Black', hex: '#334155' }
              ];
              for (let i = 0; i < 4; i++) {
                  const fx = (rX * 18 + 2 + Math.floor(this.coordHash(rX, rY, 300 + i) * 14));
                  const fy = (rY * 18 + 2 + Math.floor(this.coordHash(rX, rY, 400 + i) * 14));
                  if (this.getTileAt(fx, fy) === T_GRASS) {
                      const fc = flowerPalette[(Math.abs(rX + rY + i)) % flowerPalette.length];
                      this.spawnFlower(fx * TILE, fy * TILE, fc.colorName, fc.hex, i % 2 === 0);
                  }
              }

              // Spawn animals & monsters in infinite chunks
              const animalKinds = ['cow', 'pig', 'rabbit', 'sheep'];
              for (let i = 0; i < 2; i++) {
                  const ax = (rX * 18 + 4 + i * 6);
                  const ay = (rY * 18 + 4 + i * 5);
                  if (this.getTileAt(ax, ay) === T_GRASS) {
                      this.spawnAnimal(animalKinds[Math.abs(rX + rY + i) % 4], ax * TILE, ay * TILE);
                  }
              }

              const ex = (rX * 18 + 8);
              const ey = (rY * 18 + 13);
              if (this.getTileAt(ex, ey) === T_GRASS) {
                  this.spawnEnemy(h > 0.5 ? 'blob' : 'snake', ex * TILE, ey * TILE, false);
              }

              // Spawn Conquerable Flag or Golden Apple Puzzle Chest in landmark chunks
              if (h > 0.68 && this.getTileAt(baseX, baseY) === T_GRASS) {
                  const fId = `flag_inf_${rX}_${rY}`;
                  const fObj = { id: fId, name: `Frontier Outpost (${rX}, ${rY})`, x: baseX, y: baseY, conquered: false };
                  this.flags.push(fObj);
                  this.interactables.push({
                      id: fId, x: baseX * TILE, y: baseY * TILE, type: 'flag', flagRef: fObj,
                      label: `Conquer Frontier Flag (${rX}, ${rY})`,
                      onInteract: () => {
                          if (!fObj.conquered) {
                              fObj.conquered = true;
                              this.player.coins += 10;
                              sfx.unlock();
                              this.addFloatingText(baseX * TILE, baseY * TILE - 20, "🚩 FLAG CONQUERED! +10🪙", "#facc15");
                              this.showToast(`🚩 Conquered "${fObj.name}"! Fast-travel unlocked via [M]!`);
                              this.updateHUD();
                          } else {
                              this.toggleWorldMapModal();
                          }
                      }
                  });
              }
          }
      }
  },

  /**
   * BUILD THE CORE WORLD:
   * - West Ocean (x: 2..26), Ocean Dock & Port Coral Village (x: 26..48), Submarine Interior, Abyssal Water Temple
   * - Oakvale Village (x: 54..78), Spawn Meadow (x: 92, y: 66), Temple 1 (x: 86..98), Crystal Lake (x: 104..122), Temple 2 (x: 132..150)
   * - East Mount Ignis Volcano & Fire Temple (x: 160..212)
   */
  initWorld() {
      this.map = [];
      this.bushes = [];
      this.flowers = [];
      this.flags = [];
      this.buildings = [];
      this.worldProps = []; // windmill / boats / crates (sprite-backed scenery)
      this.interactables = [];
      this.enemies = [];
      this.fireTurrets = [];
      this.animals = [];
      this.npcs = [];
      this.projectiles = [];
      this.floatingTexts = [];
      this.lootDrops = [];
      this.visitedChunks.clear();

      for (let y = 0; y < MAP_H; y++) {
          this.map[y] = [];
          for (let x = 0; x < MAP_W; x++) {
              this.map[y][x] = T_GRASS;
          }
      }

      const fillRect = (x1, y1, x2, y2, tile) => {
          for (let y = Math.max(0, y1); y <= Math.min(MAP_H - 1, y2); y++) {
              for (let x = Math.max(0, x1); x <= Math.min(MAP_W - 1, x2); x++) {
                  this.map[y][x] = tile;
              }
          }
      };
      const wallRect = (x1, y1, x2, y2, floorTile = T_DUNGEON_FLOOR) => {
          for (let y = y1; y <= y2; y++) {
              for (let x = x1; x <= x2; x++) {
                  if (y === y1 || y === y2 || x === x1 || x === x2) {
                      this.map[y][x] = T_WALL;
                  } else {
                      this.map[y][x] = floorTile;
                  }
              }
          }
      };

      // 1. GRAND HIGHWAY CONNECTING WEST OCEAN DOCK -> OAKVALE -> SPAWN (92,66) -> TEMPLE 2 -> EAST VOLCANO
      fillRect(91, 45, 93, 72, T_PATH); // Spawn North-South Road
      fillRect(26, 60, 178, 62, T_PATH); // West-to-East Highway
      fillRect(142, 42, 144, 62, T_PATH); // Road to Second Temple

      // 2. CRYSTAL FISHING LAKE (x: 105..122, y: 66..80)
      fillRect(105, 66, 122, 80, T_WATER);
      fillRect(112, 63, 114, 69, T_WOOD_FLOOR);
      this.worldProps.push(
          { kind: 'coracle', x: 110 * TILE + 8, y: 68 * TILE + 6, onLand: false },
          { kind: 'coracle', x: 118 * TILE + 4, y: 74 * TILE + 10, onLand: false },
          { kind: 'crate', x: 112 * TILE + 18, y: 64 * TILE + 8, lid: true }
      );

      // 3. OAKVALE VILLAGE (x: 53..79, y: 48..74)
      fillRect(61, 56, 71, 65, T_PATH);
      this.interactables.push({
          id: 'village_well', x: 66 * TILE, y: 60 * TILE, type: 'well',
          label: 'Oakvale Central Well & Fountain',
          onInteract: () => {
              this.player.hp = this.player.maxHp;
              this.player2.hp = this.player2.maxHp;
              sfx.splash(); sfx.heal();
              this.addFloatingText(this.player.x, this.player.y - 20, "REFRESHED AT FOUNTAIN! FULL ❤️", "#38bdf8");
              this.showToast("⛲ You drank cool water from the Central Village Fountain! Red Hearts restored!");
              this.updateHUD();
          }
      });

      const villageBuildings = [
          { name: 'CHURCH', x1: 63, y1: 48, x2: 69, y2: 53, doorX: 66, roof: '#3b82f6' },
          { name: 'ART SHOP', x1: 53, y1: 54, x2: 59, y2: 59, doorX: 56, roof: '#ec4899' },
          { name: 'BLACKSMITH', x1: 73, y1: 54, x2: 79, y2: 59, doorX: 76, roof: '#dc2626' },
          { name: 'MARKET', x1: 53, y1: 63, x2: 59, y2: 68, doorX: 56, roof: '#eab308' },
          { name: 'FARMHOUSE', x1: 73, y1: 63, x2: 79, y2: 68, doorX: 76, roof: '#16a34a' },
          { name: 'VILLAGE HOME', x1: 63, y1: 67, x2: 69, y2: 71, doorX: 66, roof: '#a855f7' }
      ];
      villageBuildings.forEach(b => {
          wallRect(b.x1, b.y1, b.x2, b.y2, T_WOOD_FLOOR);
          this.map[b.y2][b.doorX] = T_WOOD_FLOOR;
          this.buildings.push(b);
      });

      this.interactables.push(
          { id: 'art_shop_counter', x: 56 * TILE, y: 57 * TILE, type: 'art_easel', label: 'Open Art & Dye Studio', onInteract: () => this.openArtShop() },
          { id: 'fish_market_counter', x: 56 * TILE, y: 66 * TILE, type: 'market_stall', label: 'Sell Caught Fish at Market', onInteract: () => this.openFishMarket() }
      );

      // Oakvale NPCs
      this.npcs.push(
          { id: 'npc_art', x: 58 * TILE, y: 60 * TILE, name: 'Artist Chloe', role: 'Art Shop', coatColor: '#ec4899', hairColor: '#facc15', onTalk: () => this.openArtShop() },
          { id: 'npc_market', x: 58 * TILE, y: 69 * TILE, name: 'Merchant Marina', role: 'Fish Market', coatColor: '#0284c7', hairColor: '#78350f', questKey: 'fishing', onTalk: () => {
              if (this.quests.fishing.status === 'active' && this.quests.fishing.current >= this.quests.fishing.target) this.completeQuest('fishing', 25, 0, 1);
              else this.openFishMarket();
          }},
          { id: 'npc_priestess', x: 66 * TILE, y: 54 * TILE, name: 'Priestess Elena', role: 'Church', coatColor: '#f8fafc', hairColor: '#fde047', questKey: 'church', onTalk: () => this.handleNpcQuestDialog('church', 'Priestess Elena', 20, 0, 1) },
          { id: 'npc_farmer', x: 76 * TILE, y: 69 * TILE, name: 'Farmer Marta', role: 'Farm', coatColor: '#16a34a', hairColor: '#b45309', questKey: 'farming', onTalk: () => this.handleNpcQuestDialog('farming', 'Farmer Marta', 20, 5, 1) },
          { id: 'npc_carpenter', x: 66 * TILE, y: 72 * TILE, name: 'Builder Bram', role: 'Village Homes', coatColor: '#2563eb', hairColor: '#475569', questKey: 'repair', onTalk: () => this.handleNpcQuestDialog('repair', 'Builder Bram', 20, 5, 1) },
          { id: 'npc_blacksmith', x: 76 * TILE, y: 60 * TILE, name: 'Blacksmith Korin', role: 'Forge', coatColor: '#dc2626', hairColor: '#1e293b', questKey: 'temple2', onTalk: () => this.handleNpcQuestDialog('temple2', 'Blacksmith Korin', 50, 5, 2) },
          { id: 'npc_guard', x: 71 * TILE, y: 60 * TILE, name: 'Captain Rowan', role: 'Town Guard', coatColor: '#7c3aed', hairColor: '#94a3b8', questKey: 'monster', onTalk: () => this.handleNpcQuestDialog('monster', 'Captain Rowan', 30, 6, 2) }
      );

      // Wheat & Fences in Oakvale — stages 0..5 from Sunnyside crop pack; harvest only when mature.
      const wheatCoords = [[73, 72], [75, 72], [77, 72], [79, 72], [73, 74], [75, 74], [77, 74], [79, 74]];
      wheatCoords.forEach(([wx, wy], idx) => {
          this.interactables.push({
              id: `wheat_${idx}`,
              x: wx * TILE,
              y: wy * TILE,
              type: 'wheat',
              cropKind: 'wheat',
              // Stagger so the field shows mixed growth stages on first visit.
              stage: Math.min(5, 2 + (idx % 4)),
              growthTimer: CROP_STAGE_SECONDS * (0.35 + (idx % 3) * 0.2),
              harvested: false,
              label: 'Harvest Golden Wheat',
              onInteract: (obj) => {
                  if (obj.harvested || (obj.stage ?? 5) < 5) {
                      this.showToast('🌱 Wheat is still growing — wait until the heads turn golden!');
                      return;
                  }
                  obj.harvested = true;
                  obj.stage = 0;
                  obj.growthTimer = CROP_STAGE_SECONDS;
                  this.quests.farming.current++;
                  sfx.heal();
                  this.addFloatingText(obj.x, obj.y, "+1 Wheat", "#facc15");
                  this.showToast(`🌾 Harvested Wheat (${this.quests.farming.current}/${this.quests.farming.target})`);
                  this.updateQuestTracker();
              }
          });
      });

      // Extra farm plots (carrot / pumpkin / sunflower) — same harvest loop, flavor pickups.
      const extraCrops = [
          { id: 'carrot_0', kind: 'carrot', x: 71, y: 72, label: 'Harvest Carrot' },
          { id: 'carrot_1', kind: 'carrot', x: 71, y: 74, label: 'Harvest Carrot' },
          { id: 'pumpkin_0', kind: 'pumpkin', x: 81, y: 72, label: 'Harvest Pumpkin' },
          { id: 'pumpkin_1', kind: 'pumpkin', x: 81, y: 74, label: 'Harvest Pumpkin' },
          { id: 'sunflower_0', kind: 'sunflower', x: 75, y: 76, label: 'Harvest Sunflower' },
          { id: 'sunflower_1', kind: 'sunflower', x: 77, y: 76, label: 'Harvest Sunflower' },
      ];
      extraCrops.forEach((c, idx) => {
          this.interactables.push({
              id: c.id,
              x: c.x * TILE,
              y: c.y * TILE,
              type: 'crop',
              cropKind: c.kind,
              stage: Math.min(5, 3 + (idx % 3)),
              growthTimer: CROP_STAGE_SECONDS,
              harvested: false,
              label: c.label,
              onInteract: (obj) => {
                  if (obj.harvested || (obj.stage ?? 5) < 5) {
                      this.showToast('🌱 Still growing — come back when the crop is fully mature!');
                      return;
                  }
                  obj.harvested = true;
                  obj.stage = 0;
                  obj.growthTimer = CROP_STAGE_SECONDS;
                  this.player.pork += 1;
                  sfx.coin();
                  this.addFloatingText(obj.x, obj.y, `+1 ${c.kind}`, "#86efac");
                  this.showToast(`🧺 Picked a ${c.kind}! (+1 Pork snack)`);
                  this.updateHUD();
              }
          });
      });

      // Village scenery props (sprite-backed; houses stay procedural shells)
      this.worldProps.push(
          { kind: 'windmill', x: 82 * TILE + 22, y: 66 * TILE + 10, scale: 0.85 },
          { kind: 'crate', x: 55 * TILE + 22, y: 66 * TILE + 8, lid: true },
          { kind: 'crate', x: 58 * TILE + 8, y: 67 * TILE + 4, lid: false },
          { kind: 'crate', x: 74 * TILE + 10, y: 71 * TILE + 6, lid: true }
      );

      const fenceCoords = [[52, 52], [52, 70], [80, 52], [80, 70], [61, 73]];
      fenceCoords.forEach(([fx, fy], idx) => {
          this.interactables.push({
              id: `fence_${idx}`, x: fx * TILE, y: fy * TILE, type: 'fence', repaired: false, label: 'Repair Broken Village Fence',
              onInteract: (obj) => {
                  if (obj.repaired) return;
                  obj.repaired = true;
                  this.quests.repair.current++;
                  sfx.unlock();
                  this.addFloatingText(obj.x, obj.y, "Repaired!", "#38bdf8");
                  this.showToast(`🔨 Fence Repaired (${this.quests.repair.current}/${this.quests.repair.target})`);
                  this.updateQuestTracker();
              }
          });
      });

      // 4. TEMPLE 1: ANCIENT DUNGEON NEAR SPAWN (x: 86..98, y: 4..44)
      wallRect(86, 35, 98, 44, T_DUNGEON_FLOOR);
      this.map[44][91] = T_DUNGEON_FLOOR; this.map[44][92] = T_DUNGEON_FLOOR; this.map[44][93] = T_DUNGEON_FLOOR;
      this.map[35][91] = T_DUNGEON_FLOOR; this.map[35][92] = T_DUNGEON_FLOOR; this.map[35][93] = T_DUNGEON_FLOOR;

      wallRect(86, 28, 98, 34, T_CHASM);
      for (let x = 91; x <= 93; x++) {
          this.map[34][x] = T_DUNGEON_FLOOR;
          this.map[28][x] = T_DUNGEON_FLOOR;
      }
      for (let y = 29; y <= 33; y++) {
          for (let col = 91; col <= 93; col++) {
              this.map[y][col] = (col === this.codes.safeBridgeCol) ? T_BRIDGE_SAFE : T_BRIDGE_TRAP;
          }
      }

      wallRect(86, 18, 98, 28, T_DUNGEON_FLOOR);
      for (let x = 91; x <= 93; x++) this.map[28][x] = T_DUNGEON_FLOOR;

      wallRect(73, 19, 85, 27, T_DUNGEON_FLOOR);
      this.map[23][85] = T_DUNGEON_FLOOR; this.map[23][86] = T_DUNGEON_FLOOR;
      wallRect(99, 19, 111, 27, T_DUNGEON_FLOOR);
      this.map[23][98] = T_DUNGEON_FLOOR; this.map[23][99] = T_DUNGEON_FLOOR;

      wallRect(83, 4, 101, 18, T_DUNGEON_FLOOR);
      this.map[18][92] = T_WALL;

      this.interactables.push(
          { id: 't1', x: 88 * TILE, y: 38 * TILE, type: 'torch', color: '#ef4444', label: 'Red Torch Pillar (1st Digit)', onInteract: () => this.showToast(`🔥 Red Torch I shows digit [${this.codes.chest1[0]}]!`) },
          { id: 't2', x: 92 * TILE, y: 37 * TILE, type: 'torch', color: '#3b82f6', label: 'Blue Torch Pillar (2nd Digit)', onInteract: () => this.showToast(`🔥 Blue Torch II shows digit [${this.codes.chest1[1]}]!`) },
          { id: 't3', x: 96 * TILE, y: 38 * TILE, type: 'torch', color: '#10b981', label: 'Green Torch Pillar (3rd Digit)', onInteract: () => this.showToast(`🔥 Green Torch III shows digit [${this.codes.chest1[2]}]!`) }
      );
      this.interactables.push({
          id: 'chest_room1', x: 92 * TILE, y: 40 * TILE, type: 'chest', opened: this.dungeonProgress.chest1Opened,
          label: 'Temple 1 Upgrade Chest',
          onInteract: (obj) => {
              if (obj.opened) return this.showToast("Already opened!");
              this.openPuzzleModal({
                  title: "TEMPLE 1 CHEST",
                  desc: "Enter the 3-digit code from the Red, Blue, and Green Torch Pillars:",
                  hint: "Clue: Inspect the Red, Blue, and Green Torch Pillars around this room.",
                  expectedCode: this.codes.chest1.join(''),
                  onSuccess: () => {
                      obj.opened = true;
                      this.dungeonProgress.chest1Opened = true;
                      this.player.level = Math.max(this.player.level, 1);
                      this.player.armorLevel = 2;
                      this.player.coins += 15;
                      this.syncPlayer2Equipment();
                      sfx.unlock();
                      this.showToast("🎉 Upgraded from Level 0 → Level 1, Armor Level 2 & +15 Coins!");
                      this.updateHUD();
                      this.updateQuestTracker();
                  }
              });
          }
      });

      const laneName = this.codes.safeBridgeCol === 91 ? "LEFT (WEST)" : (this.codes.safeBridgeCol === 92 ? "MIDDLE (CENTER)" : "RIGHT (EAST)");
      this.interactables.push(
          { id: 'bridge_sign', x: 89 * TILE, y: 34 * TILE, type: 'sign', label: 'Bridge Safety Tablet', onInteract: () => this.showToast(`🪨 Tablet: "Only the ${laneName} plank lane is safe to cross!"`) },
          { id: 'west_a', x: 76 * TILE, y: 21 * TILE, type: 'suspicious_statue', label: 'Suspicious Gargoyle', onInteract: () => { this.dungeonProgress.westAFound = true; sfx.heal(); this.showToast(`🔍 Suspicious Gargoyle: Carved with [${this.codes.westA}].`); } },
          { id: 'west_b', x: 76 * TILE, y: 25 * TILE, type: 'suspicious_pot', label: 'Suspicious Urn', onInteract: () => { this.dungeonProgress.westBFound = true; sfx.heal(); this.showToast(`🔍 Suspicious Urn: Inscribed with [${this.codes.westB}]. Add both West room numbers!`); } },
          { id: 'east_a', x: 108 * TILE, y: 21 * TILE, type: 'suspicious_statue', label: 'Suspicious Obelisk', onInteract: () => { this.dungeonProgress.eastAFound = true; sfx.heal(); this.showToast(`🔍 Suspicious Obelisk: Carved with [${this.codes.eastA}].`); } },
          { id: 'east_b', x: 108 * TILE, y: 25 * TILE, type: 'suspicious_pot', label: 'Suspicious Pedestal', onInteract: () => { this.dungeonProgress.eastBFound = true; sfx.heal(); this.showToast(`🔍 Suspicious Pedestal: Inscribed with [${this.codes.eastB}]. Add both East room numbers!`); } },
          { id: 'center_clue', x: 92 * TILE, y: 23 * TILE, type: 'altar', label: 'Central Hub Altar', onInteract: () => { this.dungeonProgress.centerFound = true; sfx.unlock(); this.showToast(`✨ Central Altar: "The 3rd digit of the Boss Door code is [${this.codes.centerNum}]!"`); } }
      );
      this.interactables.push({
          id: 'boss_door', x: 92 * TILE, y: 18 * TILE, type: 'door', opened: this.dungeonProgress.bossDoorOpened,
          label: 'Temple 1 Boss Door',
          onInteract: (obj) => {
              if (obj.opened) return;
              this.openPuzzleModal({
                  title: "TEMPLE 1 BOSS DOOR",
                  desc: "Enter the 3-digit code: [West Sum] [East Sum] [Central Altar Digit]",
                  hint: "Clue: Add the 2 objects in the West Room, add the 2 objects in the East Room, and read the Central Altar!",
                  expectedCode: this.codes.bossCode,
                  onSuccess: () => {
                      obj.opened = true;
                      this.dungeonProgress.bossDoorOpened = true;
                      this.map[18][91] = T_DUNGEON_FLOOR; this.map[18][92] = T_DUNGEON_FLOOR; this.map[18][93] = T_DUNGEON_FLOOR;
                      sfx.unlock();
                      this.showToast("🚪 Boss Chamber Unlocked! Step North!");
                  }
              });
          }
      });

      // 5. TEMPLE 2: THE SUNKEN ELEMENTAL SANCTUM (x: 135..151, y: 14..41)
      wallRect(136, 28, 150, 41, T_TEMPLE2_FLOOR);
      this.map[41][142] = T_TEMPLE2_FLOOR; this.map[41][143] = T_TEMPLE2_FLOOR; this.map[41][144] = T_TEMPLE2_FLOOR;
      wallRect(135, 14, 151, 28, T_TEMPLE2_FLOOR);
      this.map[28][143] = T_WALL;

      this.interactables.push(
          { id: 't2_hint_pillar', x: 140 * TILE, y: 34 * TILE, type: 'altar', label: 'Sanctum Crystal Obelisk', onInteract: () => this.showToast("💎 Crystal Obelisk: 'Count the elements: Two Pillars of Water, Four Winds, Eight Stars.'") },
          { id: 't2_gold_chest', x: 146 * TILE, y: 34 * TILE, type: 'gold_chest', opened: false, label: 'Sanctum Golden Apple Chest', onInteract: (obj) => {
              if (obj.opened) return;
              obj.opened = true;
              this.player.goldenApples += 2;
              this.player.yellowHp += 1.0;
              this.player.coins += 20;
              sfx.unlock();
              this.showToast("🍎 Found 2 Golden Apples (+1💛 Temp Heart) & 20 Coins!");
              this.updateHUD();
          }},
          { id: 'temple2_door', x: 143 * TILE, y: 28 * TILE, type: 'door', opened: this.dungeonProgress.temple2DoorOpened, label: 'Second Temple Sanctum Gate', onInteract: (obj) => {
              if (obj.opened) return;
              this.openPuzzleModal({
                  title: "SECOND TEMPLE SANCTUM GATE",
                  desc: "Enter the 3-digit Elemental Crystal code:",
                  hint: "Clue: Read the Sanctum Crystal Obelisk in this hall!",
                  expectedCode: "248",
                  onSuccess: () => {
                      obj.opened = true;
                      this.dungeonProgress.temple2DoorOpened = true;
                      this.map[28][142] = T_TEMPLE2_FLOOR; this.map[28][143] = T_TEMPLE2_FLOOR; this.map[28][144] = T_TEMPLE2_FLOOR;
                      sfx.unlock();
                      this.showToast("🌊 Second Temple Sanctum Gate Opened!");
                  }
              });
          }}
      );

      // =========================================================================
      // 6. EAST DIRECTION OF SPAWN: BIG VOLCANO & HUGE FIRE TEMPLE (x: 164..212, y: 6..70)
      // =========================================================================
      // Volcano Outer Slopes & Climbable Ridges
      fillRect(166, 46, 206, 68, T_VOLCANO_ROCK);
      fillRect(168, 48, 204, 52, T_LAVA); // Lava moat around volcano crater
      fillRect(184, 46, 188, 68, T_PATH); // Climbable Volcano Stone Staircase up to Crater Entrance

      // Huge Fire Temple Inside the Volcano (x: 168..204, y: 6..45)
      wallRect(168, 24, 204, 45, T_FIRE_FLOOR);
      this.map[45][185] = T_FIRE_FLOOR; this.map[45][186] = T_FIRE_FLOOR; this.map[45][187] = T_FIRE_FLOOR;
      // Lava hazards inside the Fire Temple
      fillRect(172, 31, 178, 37, T_LAVA);
      fillRect(194, 31, 200, 37, T_LAVA);

      // Fire Boss Arena (x: 170..202, y: 6..24)
      wallRect(170, 6, 202, 24, T_FIRE_FLOOR);
      this.map[24][186] = T_WALL;

      // Small Fireball Turrets inside the Fire Temple (shoot small fireballs dealing 0.5 heart damage)
      this.fireTurrets = [
          { x: 171 * TILE, y: 40 * TILE, dirX: 1, dirY: 0, timer: 1.2 },
          { x: 201 * TILE, y: 34 * TILE, dirX: -1, dirY: 0, timer: 1.8 },
          { x: 171 * TILE, y: 28 * TILE, dirX: 1, dirY: 0, timer: 0.9 },
          { x: 201 * TILE, y: 26 * TILE, dirX: -1, dirY: 0, timer: 1.5 }
      ];

      // Harder 4-Digit Unspoiled Multi-Step Cipher Puzzles in the Fire Temple
      const fc = this.codes.fireClues;
      this.interactables.push(
          { id: 'fire_pillar_1', x: 172 * TILE, y: 42 * TILE, type: 'torch', color: '#f97316', label: 'Obsidian Trial Pillar I (West)', onInteract: () => {
              sfx.heal();
              this.showToast(`🔥 Obsidian Pillar I: "Ember Alpha = ${fc.fA}. Spark Beta = ${fc.fB}. The 1st Digit is (Alpha + Beta) mod 10."`);
          }},
          { id: 'fire_pillar_2', x: 200 * TILE, y: 42 * TILE, type: 'torch', color: '#ef4444', label: 'Obsidian Trial Pillar II (East)', onInteract: () => {
              sfx.heal();
              this.showToast(`🔥 Obsidian Pillar II: "Flame Gamma = ${fc.fC}. Ash Delta = ${fc.fD}. The 2nd Digit is (Gamma minus Delta)."`);
          }},
          { id: 'fire_pillar_3', x: 172 * TILE, y: 26 * TILE, type: 'torch', color: '#eab308', label: 'Obsidian Trial Pillar III (North-West)', onInteract: () => {
              sfx.heal();
              this.showToast(`🔥 Obsidian Pillar III: "Double the Spark Beta (${fc.fB} × 2) mod 10 to forge the 3rd Digit."`);
          }},
          { id: 'fire_pillar_4', x: 200 * TILE, y: 26 * TILE, type: 'torch', color: '#facc15', label: 'Obsidian Trial Pillar IV (North-East)', onInteract: () => {
              sfx.heal();
              this.showToast(`🔥 Obsidian Pillar IV: "Add the 1st Digit and 2nd Digit together (mod 10) to seal the 4th Digit."`);
          }}
      );

      // Chest right before the Fire Boss with the Triple-Shot Ice Bow!
      this.interactables.push({
          id: 'ice_bow_chest', x: 182 * TILE, y: 26 * TILE, type: 'gold_chest', opened: this.dungeonProgress.iceBowChestOpened,
          label: 'Volcano Frost Chest (Triple-Shot Ice Bow)',
          onInteract: (obj) => {
              if (obj.opened) return this.showToast("You already claimed the Triple-Shot Ice Bow!");
              obj.opened = true;
              this.dungeonProgress.iceBowChestOpened = true;
              this.player.hasBow = true;
              this.player.hasIceTripleBow = true;
              this.player.arrows += 150;
              this.syncPlayer2Equipment();
              sfx.unlock();
              this.showToast("❄️ Obtained the TRIPLE-SHOT ICE BOW + 150 Ice Arrows! Fires 3 Ice Arrows at once to damage the Giant Fireball Boss!");
              this.updateHUD();
          }
      });

      this.interactables.push({
          id: 'fire_boss_door', x: 186 * TILE, y: 24 * TILE, type: 'door', opened: this.dungeonProgress.fireDoorOpened,
          label: 'Volcano Fire Boss Gate (4-Digit Trial)',
          onInteract: (obj) => {
              if (obj.opened) return;
              this.openPuzzleModal({
                  title: "VOLCANO FIRE TEMPLE GATE",
                  desc: "Solve the 4 Obsidian Trial Pillars in the Fire Temple to deduce the 4-digit code:",
                  hint: "Clue: Inspect all 4 Obsidian Trial Pillars (NW, NE, SW, SE) and compute each digit from their formulas!",
                  expectedCode: this.codes.fireTempleCode,
                  onSuccess: () => {
                      obj.opened = true;
                      this.dungeonProgress.fireDoorOpened = true;
                      this.map[24][185] = T_FIRE_FLOOR; this.map[24][186] = T_FIRE_FLOOR; this.map[24][187] = T_FIRE_FLOOR;
                      sfx.unlock();
                      this.showToast("🔥 Volcano Boss Gate Unlocked! Use your Triple-Shot Ice Bow — Swords will burn you!");
                  }
              });
          }
      });

      // =========================================================================
      // 7. WEST DIRECTION OF SPAWN: BIG OCEAN, DOCK VILLAGE, SUBMARINE & WATER TEMPLE
      // =========================================================================
      // Big Western Ocean (x: 1..28, y: 4..90)
      fillRect(1, 4, 28, 90, T_WATER);
      // Long Wooden Ocean Dock Pier (x: 24..36, y: 50..74)
      fillRect(24, 52, 34, 72, T_WOOD_FLOOR);
      fillRect(18, 60, 26, 62, T_WOOD_FLOOR); // Pier extending out into the Ocean toward the Submarine

      // Port Coral Village along the Ocean Dock (x: 34..48, y: 46..78)
      const dockBuildings = [
          { name: 'DOCK CHURCH', x1: 35, y1: 46, x2: 40, y2: 50, doorX: 37, roof: '#38bdf8' },
          { name: 'DOCK BLACKSMITH', x1: 42, y1: 46, x2: 47, y2: 50, doorX: 44, roof: '#ef4444' },
          { name: 'DOCK ART SHOP', x1: 35, y1: 52, x2: 40, y2: 56, doorX: 37, roof: '#ec4899' },
          { name: 'DOCK MARKET', x1: 42, y1: 52, x2: 47, y2: 56, doorX: 44, roof: '#eab308' },
          { name: 'DOCK FARM', x1: 35, y1: 65, x2: 40, y2: 69, doorX: 37, roof: '#22c55e' },
          { name: 'DOCK HOUSE', x1: 42, y1: 65, x2: 47, y2: 69, doorX: 44, roof: '#a855f7' }
      ];
      dockBuildings.forEach(b => {
          wallRect(b.x1, b.y1, b.x2, b.y2, T_WOOD_FLOOR);
          this.map[b.y2][b.doorX] = T_WOOD_FLOOR;
          this.buildings.push(b);
      });

      this.interactables.push(
          { id: 'dock_art_counter', x: 37 * TILE, y: 54 * TILE, type: 'art_easel', label: 'Port Coral Art Studio', onInteract: () => this.openArtShop() },
          { id: 'dock_market_counter', x: 44 * TILE, y: 54 * TILE, type: 'market_stall', label: 'Port Coral Fish Market', onInteract: () => this.openFishMarket() }
      );

      // Port Coral boats + market crates (Sunnyside coracle / crate art)
      this.worldProps.push(
          { kind: 'coracle', x: 28 * TILE + 10, y: 58 * TILE + 8, onLand: false },
          { kind: 'coracle', x: 31 * TILE + 6, y: 64 * TILE + 4, onLand: false },
          { kind: 'coracleLand', x: 34 * TILE + 8, y: 60 * TILE + 6 },
          { kind: 'crate', x: 43 * TILE + 18, y: 54 * TILE + 10, lid: true },
          { kind: 'crate', x: 45 * TILE + 6, y: 55 * TILE + 4, lid: false },
          { kind: 'crate', x: 36 * TILE + 10, y: 66 * TILE + 8, lid: true }
      );

      // Small dock garden strip (carrots) near DOCK FARM
      [[36, 70], [38, 70], [36, 72]].forEach(([cx, cy], idx) => {
          this.interactables.push({
              id: `dock_carrot_${idx}`,
              x: cx * TILE,
              y: cy * TILE,
              type: 'crop',
              cropKind: 'carrot',
              stage: 4 + (idx % 2),
              growthTimer: CROP_STAGE_SECONDS,
              harvested: false,
              label: 'Harvest Dock Carrot',
              onInteract: (obj) => {
                  if (obj.harvested || (obj.stage ?? 5) < 5) {
                      this.showToast('🌱 Dock carrots are still sprouting!');
                      return;
                  }
                  obj.harvested = true;
                  obj.stage = 0;
                  obj.growthTimer = CROP_STAGE_SECONDS;
                  this.player.pork += 1;
                  sfx.coin();
                  this.addFloatingText(obj.x, obj.y, '+1 Carrot', '#fb923c');
                  this.showToast('🧺 Harvested a Port Coral carrot! (+1 Pork snack)');
                  this.updateHUD();
              }
          });
      });

      // Dock Guide Villager who tells you where to go in the Ocean
      this.npcs.push({
          id: 'npc_dock_guide', x: 27 * TILE, y: 61 * TILE, name: 'Captain Nautilus', role: 'Dock Guide',
          coatColor: '#0284c7', hairColor: '#f8fafc', questKey: 'ocean',
          onTalk: () => {
              sfx.heal();
              this.showToast("⚓ Captain Nautilus: 'Walk West onto the ocean pier and board the Yellow Submarine at (16, 61)! Inside, the 4 crew members will give you Black & White Diving Gear so you can swim North-West to the Abyssal Water Temple!'");
          }
      });

      // Submarine floating in the Western Ocean at (16, 61)
      this.interactables.push({
          id: 'ocean_submarine_ext', x: 16 * TILE, y: 61 * TILE, type: 'submarine',
          label: 'Board Ocean Submarine [Q]',
          onInteract: () => {
              this.player.x = 10 * TILE;
              this.player.y = 83 * TILE;
              if (this.isMultiplayer) {
                  this.player2.x = 12 * TILE;
                  this.player2.y = 83 * TILE;
              }
              sfx.unlock();
              this.showToast("🚢 Entered the Submarine Interior! Talk to the 4 Submarine Crew Villagers or inspect the Diving Gear Display!");
          }
      });

      // Submarine Interior Room (x: 4..18, y: 78..88)
      wallRect(4, 78, 18, 88, T_SUB_FLOOR);
      // Exit Hatch inside Submarine
      this.interactables.push({
          id: 'sub_exit_hatch', x: 11 * TILE, y: 86 * TILE, type: 'submarine',
          label: 'Exit Submarine into Deep Ocean [Q]',
          onInteract: () => {
              this.player.x = 15 * TILE;
              this.player.y = 58 * TILE;
              if (this.isMultiplayer) {
                  this.player2.x = 15 * TILE;
                  this.player2.y = 59 * TILE;
              }
              sfx.splash();
              this.showToast("🌊 Exited into the Western Ocean! Swim North to the Abyssal Water Temple (x: 12, y: 38)!");
          }
      });

      // Diving Gear Display Stand inside the Submarine
      this.interactables.push({
          id: 'sub_diving_display', x: 11 * TILE, y: 80 * TILE, type: 'diving_display',
          label: 'Claim Black & White Diving Gear [Q]',
          onInteract: () => this.grantDivingGear()
      });

      // 4 Villagers inside the Submarine who give you Diving Gear and tell you to go deeper
      const subCrew = [
          { id: 'sub_v1', x: 6 * TILE, y: 81 * TILE, name: 'Diver Jacques', msg: 'Here is your Black & White Diving Gear! Put it on to swim fast with flippers and go deeper North!' },
          { id: 'sub_v2', x: 16 * TILE, y: 81 * TILE, name: 'Engineer Marin', msg: 'Your weapons still work in the water! Press [I] anytime to switch between your Diver Suit and Tunic.' },
          { id: 'sub_v3', x: 6 * TILE, y: 85 * TILE, name: 'Sonar Officer Kai', msg: 'Go deeper North through the ocean to reach the Abyssal Water Temple! Watch out for sea snakes!' },
          { id: 'sub_v4', x: 16 * TILE, y: 85 * TILE, name: 'Navigator Pelagia', msg: 'You will need the Fire Claymore from the East Volcano to defeat the stationary Water Temple Boss!' }
      ];
      subCrew.forEach(c => {
          this.npcs.push({
              id: c.id, x: c.x, y: c.y, name: c.name, role: 'Submarine Crew',
              coatColor: '#1e293b', hairColor: '#f8fafc',
              onTalk: () => {
                  this.grantDivingGear();
                  this.showToast(`🤿 ${c.name}: "${c.msg}"`);
              }
          });
      });

      // Abyssal Water Temple in the North-West Ocean (x: 4..22, y: 6..40) — Enemies are ONLY Snakes!
      wallRect(4, 22, 22, 40, T_WATER_TEMPLE_FLOOR);
      this.map[40][12] = T_WATER_TEMPLE_FLOOR; this.map[40][13] = T_WATER_TEMPLE_FLOOR; this.map[40][14] = T_WATER_TEMPLE_FLOOR;
      // Water Boss Chamber (x: 4..22, y: 6..22) — Stationary Boss on Top Side, Players on Bottom Side
      wallRect(4, 6, 22, 22, T_WATER_TEMPLE_FLOOR);
      this.map[22][13] = T_WALL;

      // 4 Unspoiled Depth Cipher Pillars in the Water Temple (Same difficulty as Fire Temple, different math!)
      const wc = this.codes.waterClues;
      this.interactables.push(
          { id: 'water_pillar_1', x: 6 * TILE, y: 37 * TILE, type: 'altar', label: 'Abyssal Trench Tablet I (SW)', onInteract: () => {
              sfx.heal();
              this.showToast(`🌊 Trench Tablet I: "Tide Pressure X = ${wc.w1}. Double X (${wc.w1} × 2) mod 10 for the 1st Digit."`);
          }},
          { id: 'water_pillar_2', x: 20 * TILE, y: 37 * TILE, type: 'altar', label: 'Abyssal Trench Tablet II (SE)', onInteract: () => {
              sfx.heal();
              this.showToast(`🌊 Trench Tablet II: "Current Depth Y = ${wc.w2}. Add 3 to Y (${wc.w2} + 3) mod 10 for the 2nd Digit."`);
          }},
          { id: 'water_pillar_3', x: 6 * TILE, y: 25 * TILE, type: 'altar', label: 'Abyssal Trench Tablet III (NW)', onInteract: () => {
              sfx.heal();
              this.showToast(`🌊 Trench Tablet III: "Find the difference between Y (${wc.w2}) and X (${wc.w1}) for the 3rd Digit."`);
          }},
          { id: 'water_pillar_4', x: 20 * TILE, y: 25 * TILE, type: 'altar', label: 'Abyssal Trench Tablet IV (NE)', onInteract: () => {
              sfx.heal();
              this.showToast(`🌊 Trench Tablet IV: "Add the 1st Digit and 3rd Digit together (mod 10) for the 4th Digit."`);
          }},
          { id: 'water_boss_door', x: 13 * TILE, y: 22 * TILE, type: 'door', opened: this.dungeonProgress.waterDoorOpened,
              label: 'Abyssal Water Boss Gate (4-Digit Trial)',
              onInteract: (obj) => {
                  if (obj.opened) return;
                  this.openPuzzleModal({
                      title: "ABYSSAL WATER TEMPLE GATE",
                      desc: "Decipher the 4 Abyssal Trench Tablets in this temple to unlock the Water Boss Room:",
                      hint: "Clue: Read all 4 Abyssal Trench Tablets (SW, SE, NW, NE) and calculate each digit!",
                      expectedCode: this.codes.waterTempleCode,
                      onSuccess: () => {
                          obj.opened = true;
                          this.dungeonProgress.waterDoorOpened = true;
                          this.map[22][12] = T_WATER_TEMPLE_FLOOR; this.map[22][13] = T_WATER_TEMPLE_FLOOR; this.map[22][14] = T_WATER_TEMPLE_FLOOR;
                          sfx.unlock();
                          this.showToast("🌊 Abyssal Boss Chamber Unlocked! Equip your Fire Claymore [2] to damage the Water Boss!");
                      }
                  });
              }
          }
      );

      // Boss States:
      // 1) Temple 1 Boss (15 Hits)
      this.boss = {
          active: false, dropping: false, dropZ: 300,
          x: 92 * TILE, y: 9 * TILE, hp: 15, maxHp: 15,
          state: 'idle', timer: 1.5, claymoreAngle: 0, laserTargetX: 0, laserTargetY: 0, invuln: 0
      };
      // 2) Temple 2 Boss (12 Hits)
      this.temple2Boss = {
          active: true, x: 143 * TILE, y: 20 * TILE, hp: 12, maxHp: 12,
          timer: 1.4, invuln: 0
      };
      // 3) Volcano Fire Boss (25 Hearts = 25 HP, Huge Fireball, swings Fire Claymore with full flame ring, or launches fireballs; sword attacks burn player!)
      this.fireBoss = {
          active: true, x: 186 * TILE, y: 13 * TILE, hp: 25, maxHp: 25,
          state: 'idle', timer: 1.6, claymoreAngle: 0, flameRadius: 96, invuln: 0
      };
      // 4) Abyssal Water Boss (25 Hearts = 25 HP, Stationary on North side of room, telegraphs Wave lines & Laser beam lines, only damaged by Fire Claymore!)
      this.waterBoss = {
          active: true, x: 13 * TILE, y: 9 * TILE, hp: 25, maxHp: 25,
          state: 'idle', timer: 1.8, waveLanes: [], laserTargetX: 13 * TILE, laserTargetY: 18 * TILE, invuln: 0
      };

      // 8. CONQUERABLE FAST-TRAVEL FLAGS ACROSS ALL REGIONS
      const flagDefs = [
          { id: 'flag_spawn', name: 'Starting Meadow Flag', x: 95, y: 65, conquered: true },
          { id: 'flag_village', name: 'Oakvale Village Fountain Flag', x: 64, y: 60, conquered: false },
          { id: 'flag_t1_out', name: 'Temple 1 Entrance Flag', x: 95, y: 45, conquered: false },
          { id: 'flag_t1_in', name: 'Temple 1 Inner Hub Flag', x: 95, y: 24, conquered: false },
          { id: 'flag_lake', name: 'Crystal Lake Fishing Dock Flag', x: 115, y: 63, conquered: false },
          { id: 'flag_t2_out', name: 'Second Temple Entrance Flag', x: 145, y: 43, conquered: false },
          { id: 'flag_volcano_base', name: 'Mount Ignis Volcano Base Flag', x: 183, y: 63, conquered: false },
          { id: 'flag_fire_temple', name: 'Fire Temple Inner Sanctum Flag', x: 186, y: 39, conquered: false },
          { id: 'flag_ocean_dock', name: 'West Ocean Port Coral Dock Flag', x: 30, y: 60, conquered: false },
          { id: 'flag_water_temple', name: 'Abyssal Water Temple Flag', x: 13, y: 38, conquered: false }
      ];
      flagDefs.forEach(f => {
          this.flags.push(f);
          this.interactables.push({
              id: f.id, x: f.x * TILE, y: f.y * TILE, type: 'flag', flagRef: f,
              label: f.conquered ? `Fast-Travel Flag: ${f.name}` : `Conquer Flag: ${f.name}`,
              onInteract: () => {
                  if (!f.conquered) {
                      f.conquered = true;
                      this.player.coins += 10;
                      sfx.unlock();
                      this.addFloatingText(f.x * TILE, f.y * TILE - 20, "🚩 FLAG CONQUERED! +10🪙", "#facc15");
                      this.showToast(`🚩 Conquered "${f.name}"! Fast-travel unlocked via [M]!`);
                      this.saveCurrentWorld();
                      this.updateHUD();
                  } else {
                      this.toggleWorldMapModal();
                  }
              }
          });
      });

      // 9. FLOWERS, BUSHES, ENEMIES & ANIMALS
      const flowerColors = [
          { colorName: 'Red', hex: '#ef4444' },
          { colorName: 'Blue', hex: '#3b82f6' },
          { colorName: 'Yellow', hex: '#eab308' },
          { colorName: 'White', hex: '#f8fafc' },
          { colorName: 'Black', hex: '#334155' }
      ];
      const patchCenters = [[84, 58], [102, 54], [60, 44], [124, 56], [130, 36], [85, 76], [118, 46]];
      patchCenters.forEach(([cx, cy], idx) => {
          const fc = flowerColors[idx % flowerColors.length];
          for (let i = 0; i < 4; i++) {
              const fx = (cx + (i % 2) * 1.3) * TILE;
              const fy = (cy + Math.floor(i / 2) * 1.3) * TILE;
              this.spawnFlower(fx, fy, fc.colorName, fc.hex, true);
          }
      });

      const bushCoords = [
          [89, 55], [95, 55], [89, 49], [95, 49], [104, 58], [110, 54],
          [118, 56], [125, 50], [132, 54], [138, 48], [102, 42], [114, 38],
          [58, 40], [68, 42], [78, 46], [128, 68], [136, 66]
      ];
      bushCoords.forEach(([bx, by]) => this.bushes.push({ x: bx * TILE, y: by * TILE, r: 24 }));

      // First Pink Blob North of Spawn
      this.spawnEnemy('blob', 92 * TILE, 50 * TILE, true);
      const blobCoords = [
          [102, 58], [112, 52], [122, 58], [128, 46], [135, 52], [106, 38],
          [118, 34], [64, 38], [79, 23], [105, 23], [140, 36], [146, 36]
      ];
      blobCoords.forEach(([bx, by]) => this.spawnEnemy('blob', bx * TILE, by * TILE, false));

      // Snakes in Overworld AND exclusively Snakes inside the Abyssal Water Temple!
      const snakeCoords = [
          [106, 52], [116, 48], [126, 54], [132, 42], [110, 32], [124, 30],
          [60, 34], [72, 36], [130, 64],
          // Water Temple Snakes (No blobs in Water Temple!)
          [9, 34], [17, 34], [9, 29], [17, 29], [13, 32]
      ];
      snakeCoords.forEach(([sx, sy]) => this.spawnEnemy('snake', sx * TILE, sy * TILE, false));

      const animalTypes = ['cow', 'pig', 'rabbit', 'sheep'];
      const animalCoords = [
          [85, 65], [98, 66], [102, 72], [128, 72], [135, 60], [100, 48],
          [110, 44], [122, 42], [56, 44], [70, 45], [82, 54], [126, 62],
          [90, 76], [96, 78], [138, 56], [148, 54]
      ];
      animalCoords.forEach(([ax, ay], i) => {
          this.spawnAnimal(animalTypes[i % animalTypes.length], ax * TILE, ay * TILE);
      });
  },

  drawMinimap() {
      if (!this.miniCtx) return;
      const mctx = this.miniCtx;
      const mw = this.miniCanvas.width;
      const mh = this.miniCanvas.height;
      mctx.fillStyle = '#090d16';
      mctx.fillRect(0, 0, mw, mh);

      // Key regions on radar
      mctx.fillStyle = '#0284c7';
      mctx.fillRect(2, 4, 18, mh - 8); // West Ocean
      mctx.fillStyle = '#15803d';
      mctx.fillRect(20, 4, mw - 44, mh - 8); // Mainland
      mctx.fillStyle = '#7f1d1d';
      mctx.fillRect(mw - 24, 6, 20, mh - 12); // East Volcano

      // Conquered & Unconquered Flags
      for (const f of this.flags) {
          const fx = Math.max(4, Math.min(mw - 6, Math.floor((f.x / MAP_W) * mw)));
          const fy = Math.max(4, Math.min(mh - 6, Math.floor((f.y / MAP_H) * mh)));
          mctx.fillStyle = f.conquered ? '#22c55e' : '#ef4444';
          mctx.fillRect(fx - 2, fy - 2, 4, 4);
      }

      // Player 1 & Player 2 markers
      const p1x = Math.max(3, Math.min(mw - 5, Math.floor((this.player.x / (MAP_W * TILE)) * mw)));
      const p1y = Math.max(3, Math.min(mh - 5, Math.floor((this.player.y / (MAP_H * TILE)) * mh)));
      mctx.fillStyle = '#facc15';
      mctx.fillRect(p1x - 3, p1y - 3, 6, 6);

      if (this.isMultiplayer) {
          const p2x = Math.max(3, Math.min(mw - 5, Math.floor((this.player2.x / (MAP_W * TILE)) * mw)));
          const p2y = Math.max(3, Math.min(mh - 5, Math.floor((this.player2.y / (MAP_H * TILE)) * mh)));
          mctx.fillStyle = '#38bdf8';
          mctx.fillRect(p2x - 3, p2y - 3, 6, 6);
      }
  },

  pointToSegmentDist(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - x1, py - y1);
      let t = Math.max(0, Math.min(1.4, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  },

  canWalk(px, py, actor = this.player) {
      const r = 11;
      const pts = [[px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r]];
      for (const [cx, cy] of pts) {
          const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
          const t = this.getTileAt(tx, ty);
          if (t === T_TREE || t === T_WALL) return false;
          // Per-hero diving gear (P2 must not depend on P1's flag alone)
          if (t === T_WATER && !(actor && actor.hasDivingGear) && tx > 28) return false;
      }
      return true;
  },

  getZoneName(tx, ty) {
      if (tx >= 4 && tx <= 18 && ty >= 78 && ty <= 88) return "🚢 Submarine Interior";
      if (tx >= 4 && tx <= 22 && ty >= 6 && ty <= 40) return "🌊 Abyssal Water Temple";
      if (tx <= 28) return "🌊 Great Western Ocean";
      if (tx >= 28 && tx <= 48 && ty >= 45 && ty <= 72) return "⚓ Port Coral Ocean Dock";
      if (tx >= 166 && tx <= 206 && ty >= 6 && ty <= 45) return "🔥 Volcano Fire Temple";
      if (tx >= 164 && tx <= 208 && ty >= 45 && ty <= 70) return "🌋 Mount Ignis Volcano";
      if (tx >= 134 && tx <= 152 && ty <= 42) return "🌊 Second Temple: Sunken Sanctum";
      if (ty <= 18 && tx >= 83 && tx <= 101) return "👹 Temple 1 Boss Chamber";
      if (ty <= 44 && tx >= 73 && tx <= 111) return "🏛️ Temple 1: Ancient Dungeon";
      if (tx >= 52 && tx <= 81 && ty >= 47 && ty <= 75) return "🏘️ Oakvale Village";
      if (tx >= 104 && tx <= 124 && ty >= 64 && ty <= 82) return "🎣 Crystal Fishing Lake";
      return "🟦 500,000x500,000 Pixel World";
  },

  /**
   * STRICT 1980s CUBIC / BLOCKY PIXEL RENDERING PIPELINE (ABSOLUTELY ZERO CURVES!)
   * Every tile, building, bush, flower, animal, enemy, hero, and weapon is rendered purely with `fillRect` / `strokeRect` cube pixels.
   */
  draw() {
      const ctx = this.ctx;
      ctx.imageSmoothingEnabled = false;
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      if (this.isMultiplayer) {
          const halfW = Math.floor(cw / 2);
          // Left Viewport: Player 2 | Right Viewport: Player 1
          this.renderViewport(ctx, this.player2, 0, 0, halfW, ch, {
              title: 'P2  ·  LEFT',
              keys: 'WASD  ·  Space/Caps sword  ·  E bow  ·  Ctrl shield  ·  F act  ·  R fish  ·  2 pork  ·  3 apple',
              accent: '#38bdf8'
          });
          this.renderViewport(ctx, this.player, halfW, 0, cw - halfW, ch, {
              title: 'P1  ·  RIGHT',
              keys: 'Arrows  ·  Enter sword  ·  P bow  ·  Shift shield  ·  Q act  ·  C fish  ·  9 pork  ·  0 apple',
              accent: '#f59e0b'
          });

          // Blocky Vertical Split Divider Bar
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(halfW - 3, 0, 6, ch);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(halfW - 1, 0, 2, ch);
          // Tiny center hinge label so sides stay obvious
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(halfW - 14, Math.floor(ch / 2) - 18, 28, 36);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px VT323';
          ctx.textAlign = 'center';
          ctx.fillText('2P', halfW, Math.floor(ch / 2) + 4);
          ctx.textAlign = 'left';
      } else {
          this.renderViewport(ctx, this.player, 0, 0, cw, ch, null);
      }

      this.drawMinimap();
  },

  renderViewport(ctx, focusHero, vpX, vpY, vpW, vpH, bannerText) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(vpX, vpY, vpW, vpH);
      ctx.clip();

      const camX = Math.floor(focusHero.x - (vpX + vpW / 2));
      const camY = Math.floor(focusHero.y - (vpY + vpH / 2));

      ctx.save();
      ctx.translate(-camX, -camY);

      const leftWorld = focusHero.x - vpW / 2;
      const topWorld = focusHero.y - vpH / 2;
      const startCol = Math.floor(leftWorld / TILE) - 1;
      const endCol = Math.ceil((leftWorld + vpW) / TILE) + 1;
      const startRow = Math.floor(topWorld / TILE) - 1;
      const endRow = Math.ceil((topWorld + vpH) / TILE) + 1;

      // 1. Terrain: Sunnyside tileset where mapped, procedural fillRect fallback otherwise.
      for (let y = startRow; y <= endRow; y++) {
          for (let x = startCol; x <= endCol; x++) {
              const t = this.getTileAt(x, y);
              const px = x * TILE;
              const py = y * TILE;
              const h = this.coordHash(x, y, 1);
              const h2 = this.coordHash(x, y, 7);

              if (t === T_GRASS) {
                  const byWater =
                      this.getTileAt(x, y - 1) === T_WATER ||
                      this.getTileAt(x, y + 1) === T_WATER ||
                      this.getTileAt(x - 1, y) === T_WATER ||
                      this.getTileAt(x + 1, y) === T_WATER;
                  // Shore fringe on grass next to water (still collides as grass).
                  if (byWater) {
                      if (!assets.drawTile(ctx, 'sand', px, py, TILE, x + y)) {
                          ctx.fillStyle = '#e8d48b';
                          ctx.fillRect(px, py, TILE, TILE);
                      }
                  } else if (!assets.drawTile(ctx, 'grassA', px, py, TILE, x + y)) {
                      ctx.fillStyle = ((x + y) % 2 === 0) ? '#2d6a4f' : '#265c43';
                      ctx.fillRect(px, py, TILE, TILE);
                      ctx.fillStyle = '#40916c';
                      const bx = px + Math.floor(6 + h * 24);
                      const by = py + Math.floor(10 + ((h * 53) % 22));
                      ctx.fillRect(bx, by, 3, 7);
                      ctx.fillRect(bx + 4, by + 2, 3, 5);
                      if (h > 0.65) {
                          ctx.fillStyle = '#52b788';
                          ctx.fillRect(px + 28, py + 12, 4, 4);
                          ctx.fillRect(px + 33, py + 16, 4, 4);
                      }
                  }
                  // Oakvale meadow deco (visual only — does not change collision).
                  // Skip bush atlas cells: they are canopy scraps and look wrong at tile scale.
                  if (!byWater) {
                      if (h > 0.78) {
                          assets.drawEnvDeco(ctx, 'mushroom', px, py, TILE, 0); // red only
                      } else if (h > 0.70) {
                          assets.drawEnvDeco(ctx, 'rock', px, py, TILE, Math.floor(h2 * 4));
                      }
                  }
              } else if (t === T_PATH) {
                  if (!assets.drawTile(ctx, 'path', px, py, TILE, x + y)) {
                      ctx.fillStyle = ((x + y) % 2 === 0) ? '#b08968' : '#a37b59';
                      ctx.fillRect(px, py, TILE, TILE);
                      ctx.fillStyle = '#7f5539';
                      ctx.fillRect(px + Math.floor(8 + h * 14), py + 10, 8, 5);
                      ctx.fillRect(px + Math.floor(22 - h * 10), py + 28, 9, 5);
                      ctx.fillStyle = '#ddb892';
                      ctx.fillRect(px + 18, py + 20, 4, 4);
                  }
              } else if (t === T_TREE) {
                  // Grass underlay + Sunnyside tree deco when available.
                  if (!assets.drawTile(ctx, 'grassA', px, py, TILE, x + y)) {
                      ctx.fillStyle = '#1b4332';
                      ctx.fillRect(px, py, TILE, TILE);
                  }
                  if (!assets.drawEnvDeco(ctx, 'tree', px, py, TILE, Math.floor(h * 8))) {
                      ctx.fillStyle = '#091c15';
                      ctx.fillRect(px + 8, py + 34, 28, 6);
                      ctx.fillStyle = '#5c3a21';
                      ctx.fillRect(px + 16, py + 22, 12, 16);
                      ctx.fillStyle = '#3b2313';
                      ctx.fillRect(px + 20, py + 24, 3, 12);
                      ctx.fillStyle = '#14532d';
                      ctx.fillRect(px + 6, py + 6, 32, 20);
                      ctx.fillStyle = '#16a34a';
                      ctx.fillRect(px + 10, py + 4, 24, 16);
                      ctx.fillStyle = '#4ade80';
                      ctx.fillRect(px + 14, py + 6, 12, 8);
                  }
              } else if (t === T_WALL) {
                  if (!assets.drawTile(ctx, 'wall', px, py, TILE, x + y)) {
                      ctx.fillStyle = '#334155';
                      ctx.fillRect(px, py, TILE, TILE);
                      ctx.fillStyle = '#475569';
                      ctx.fillRect(px + 3, py + 3, 18, 16);
                      ctx.fillRect(px + 23, py + 3, 18, 16);
                      ctx.fillRect(px + 3, py + 22, 12, 18);
                      ctx.fillRect(px + 17, py + 22, 24, 18);
                      if (h > 0.55) {
                          ctx.fillStyle = '#15803d';
                          ctx.fillRect(px + 4, py + 34, 6, 6);
                      }
                  }
              } else if (t === T_DUNGEON_FLOOR || t === T_TEMPLE2_FLOOR || t === T_FIRE_FLOOR || t === T_WATER_TEMPLE_FLOOR || t === T_SUB_FLOOR) {
                  let tiled = false;
                  if (t === T_TEMPLE2_FLOOR || t === T_WATER_TEMPLE_FLOOR) {
                      tiled = assets.drawTile(ctx, 'temple', px, py, TILE, x + y);
                  } else if (t === T_FIRE_FLOOR) {
                      tiled = assets.drawTile(ctx, 'fireFloor', px, py, TILE, x + y);
                  } else if (t === T_SUB_FLOOR) {
                      tiled = assets.drawTile(ctx, 'subFloor', px, py, TILE);
                  } else {
                      tiled = assets.drawTile(ctx, 'dungeon', px, py, TILE, x + y);
                  }
                  if (!tiled) {
                      if (t === T_TEMPLE2_FLOOR || t === T_WATER_TEMPLE_FLOOR) {
                          ctx.fillStyle = ((x + y) % 2 === 0) ? '#0c4a6e' : '#082f49';
                      } else if (t === T_FIRE_FLOOR) {
                          ctx.fillStyle = ((x + y) % 2 === 0) ? '#450a0a' : '#2a0606';
                      } else if (t === T_SUB_FLOOR) {
                          ctx.fillStyle = ((x + y) % 2 === 0) ? '#334155' : '#1e293b';
                      } else {
                          ctx.fillStyle = ((x + y) % 2 === 0) ? '#1e293b' : '#0f172a';
                      }
                      ctx.fillRect(px, py, TILE, TILE);
                      ctx.fillStyle = 'rgba(255,255,255,0.06)';
                      ctx.fillRect(px + 2, py + 2, TILE - 4, 2);
                  }
                  // Water-temple glitter / fire-temple embers (visual only).
                  if ((t === T_WATER_TEMPLE_FLOOR || t === T_TEMPLE2_FLOOR) && h > 0.88) {
                      assets.drawEnvDeco(ctx, 'glint', px, py, TILE, Math.floor(h2 * 6));
                  }
                  if (t === T_FIRE_FLOOR && h > 0.9) {
                      assets.drawEnvDeco(ctx, 'fire', px, py, TILE, Math.floor(h2 * 4));
                  }
              } else if (t === T_VOLCANO_ROCK) {
                  if (!assets.drawTile(ctx, 'volcano', px, py, TILE, x + y)) {
                      ctx.fillStyle = ((x + y) % 2 === 0) ? '#451a03' : '#290f02';
                      ctx.fillRect(px, py, TILE, TILE);
                      ctx.fillStyle = '#78350f';
                      ctx.fillRect(px + 6, py + 8, 12, 8);
                      ctx.fillRect(px + 24, py + 24, 10, 8);
                  }
                  if (h > 0.86) {
                      assets.drawEnvDeco(ctx, 'fire', px, py, TILE, Math.floor(h2 * 4));
                  } else if (h > 0.78) {
                      assets.drawEnvDeco(ctx, 'rock', px, py, TILE, Math.floor(h2 * 4));
                  }
              } else if (t === T_LAVA) {
                  // Pack has no magma cell — procedural lava + fire VFX overlay.
                  const lavaShift = Math.floor(performance.now() / 220 + x + y);
                  ctx.fillStyle = '#dc2626';
                  ctx.fillRect(px, py, TILE, TILE);
                  const shift = lavaShift % 2;
                  ctx.fillStyle = shift === 0 ? '#f97316' : '#facc15';
                  ctx.fillRect(px + 6, py + 10, 14, 6);
                  ctx.fillRect(px + 22, py + 26, 14, 6);
                  if (h > 0.45) {
                      assets.drawEnvDeco(ctx, 'fire', px, py, TILE, lavaShift);
                  }
              } else if (t === T_CHASM) {
                  if (!assets.drawTile(ctx, 'chasm', px, py, TILE)) {
                      ctx.fillStyle = '#020617';
                      ctx.fillRect(px, py, TILE, TILE);
                  }
              } else if (t === T_BRIDGE_SAFE || t === T_BRIDGE_TRAP) {
                  // Void underlay + wood plank sprite when available.
                  if (!assets.drawTile(ctx, 'chasm', px, py, TILE)) {
                      ctx.fillStyle = '#020617';
                      ctx.fillRect(px, py, TILE, TILE);
                  }
                  if (!assets.drawTile(ctx, 'bridge', px + 2, py + 2, TILE - 4)) {
                      ctx.fillStyle = '#78350f';
                      ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
                      ctx.fillStyle = '#451a03';
                      ctx.fillRect(px + 4, py + 14, TILE - 8, 2);
                      ctx.fillRect(px + 4, py + 28, TILE - 8, 2);
                  }
              } else if (t === T_WOOD_FLOOR) {
                  if (!assets.drawTile(ctx, 'wood', px, py, TILE)) {
                      ctx.fillStyle = '#7c2d12';
                      ctx.fillRect(px, py, TILE, TILE);
                      ctx.fillStyle = '#431407';
                      ctx.fillRect(px, py + 14, TILE, 2);
                      ctx.fillRect(px, py + 29, TILE, 2);
                  }
              } else if (t === T_WATER) {
                  const nLand =
                      this.getTileAt(x, y - 1) !== T_WATER ||
                      this.getTileAt(x, y + 1) !== T_WATER ||
                      this.getTileAt(x - 1, y) !== T_WATER ||
                      this.getTileAt(x + 1, y) !== T_WATER;
                  if (!assets.drawTile(ctx, 'water', px, py, TILE)) {
                      ctx.fillStyle = nLand ? '#0ea5e9' : '#0284c7';
                      ctx.fillRect(px, py, TILE, TILE);
                      const waveShift = Math.floor(performance.now() / 300 + x + y) % 2 === 0 ? 0 : 4;
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillRect(px + 6 + waveShift, py + 12, 14, 3);
                      ctx.fillRect(px + 18 - waveShift, py + 28, 14, 3);
                  }
                  if (nLand) {
                      ctx.globalAlpha = 0.55;
                      assets.drawEnvDeco(ctx, 'foam', px, py, TILE, x + y);
                      ctx.globalAlpha = 1;
                  }
                  if (h > 0.9) {
                      assets.drawEnvDeco(ctx, 'glint', px, py, TILE, Math.floor(h2 * 6));
                  }
                  // Occasional beached / floating coracle near west ocean (visual only).
                  if (x < 28 && h > 0.965 && h2 > 0.5) {
                      assets.drawEnvDeco(ctx, 'coracle', px, py, TILE, Math.floor(h2 * 4));
                  }
              }
          }
      }

      // 2. Blocky Village Buildings (+ chimney smoke from pack when available)
      for (const b of this.buildings) {
          this.drawDetailedBuilding(ctx, b);
      }

      // 2b. Sprite props (windmill, boats, crates) — drawn under interactables
      for (const prop of this.worldProps || []) {
          if (prop.x + 80 < leftWorld || prop.x - 80 > leftWorld + vpW || prop.y + 120 < topWorld || prop.y - 40 > topWorld + vpH) continue;
          this.drawWorldProp(ctx, prop);
      }

      // 3. Blocky Interactables (Well, Flags, Flowers, Submarine, Diving Gear Display, Chests, Torches, Doors)
      for (const obj of this.interactables) {
          const ox = obj.x, oy = obj.y;
          if (ox + TILE * 3 < leftWorld || ox - TILE * 3 > leftWorld + vpW || oy + TILE * 3 < topWorld || oy - TILE * 3 > topWorld + vpH) continue;

          if (obj.type === 'well') {
              ctx.fillStyle = '#475569';
              ctx.fillRect(ox - 4, oy - 4, 52, 52);
              ctx.fillStyle = '#0284c7';
              ctx.fillRect(ox + 4, oy + 4, 36, 36);
              ctx.fillStyle = '#e0f2fe';
              const sp = (Math.floor(performance.now() / 180) % 2) * 4;
              ctx.fillRect(ox + 16 - sp / 2, oy + 16 - sp / 2, 12 + sp, 12 + sp);
              ctx.fillStyle = '#78350f';
              ctx.fillRect(ox - 2, oy + 2, 5, 36);
              ctx.fillRect(ox + 41, oy + 2, 5, 36);
              ctx.fillStyle = '#b45309';
              ctx.fillRect(ox - 6, oy - 4, 56, 8);
          } else if (obj.type === 'submarine') {
              // Blocky 8-bit Yellow Submarine with Periscope & Viewport
              ctx.fillStyle = '#eab308';
              ctx.fillRect(ox - 12, oy + 6, 68, 32);
              ctx.fillRect(ox + 8, oy - 8, 28, 16);
              ctx.fillStyle = '#ca8a04';
              ctx.fillRect(ox + 18, oy - 18, 6, 12);
              ctx.fillRect(ox + 18, oy - 18, 12, 5);
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(ox + 4, oy + 14, 12, 12);
              ctx.fillRect(ox + 26, oy + 14, 12, 12);
          } else if (obj.type === 'diving_display') {
              // Black & White Diving Gear Stand inside Submarine
              ctx.fillStyle = '#475569';
              ctx.fillRect(ox + 4, oy + 4, 36, 36);
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(ox + 12, oy + 8, 20, 24);
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(ox + 14, oy + 10, 16, 5);
              ctx.fillRect(ox + 14, oy + 20, 16, 4);
          } else if (obj.type === 'flag') {
              const f = obj.flagRef;
              ctx.fillStyle = '#64748b';
              ctx.fillRect(ox + 12, oy + 34, 16, 6);
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(ox + 18, oy + 4, 4, 32);
              ctx.fillStyle = f.conquered ? '#22c55e' : '#ef4444';
              ctx.fillRect(ox + 22, oy + 6, 20, 14);
          } else if (obj.type === 'flower' && !obj.picked) {
              this.drawDetailedFlower(ctx, ox + 22, oy + 22, obj.hex, obj.isPatch);
          } else if (obj.type === 'art_easel' || obj.type === 'market_stall') {
              const stallDrawn = assets.drawCrate(ctx, ox + 22, oy + 22, true);
              if (!stallDrawn) {
                  ctx.fillStyle = obj.type === 'art_easel' ? '#ec4899' : '#0284c7';
                  ctx.fillRect(ox + 4, oy + 6, 36, 28);
                  ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
                  ctx.strokeRect(ox + 4, oy + 6, 36, 28);
              }
              if (obj.type === 'market_stall') {
                  if (!assets.drawItemIcon(ctx, 'fish', ox + 22, oy + 6, 18)) {
                      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px VT323';
                      ctx.fillText('FISH', ox + 10, oy + 25);
                  }
              } else if (!assets.drawUiIcon(ctx, 'ui_plant', ox + 14, oy + 2, 18)) {
                  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px VT323';
                  ctx.fillText('ART', ox + 10, oy + 25);
              }
          } else if (obj.type === 'torch') {
              ctx.fillStyle = '#475569';
              ctx.fillRect(ox + 12, oy + 14, 20, 24);
              ctx.fillStyle = obj.color;
              ctx.fillRect(ox + 13, oy + 3, 18, 14);
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(ox + 17, oy + 7, 10, 7);
          } else if (obj.type === 'chest' || obj.type === 'gold_chest') {
              ctx.fillStyle = obj.opened ? '#475569' : (obj.type === 'gold_chest' ? '#eab308' : '#b45309');
              ctx.fillRect(ox + 6, oy + 10, 32, 24);
              ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
              ctx.strokeRect(ox + 6, oy + 10, 32, 24);
              ctx.fillStyle = '#facc15';
              ctx.fillRect(ox + 19, oy + 19, 6, 7);
          } else if (obj.type === 'sign') {
              ctx.fillStyle = '#78350f'; ctx.fillRect(ox + 19, oy + 24, 6, 14);
              ctx.fillStyle = '#d97706'; ctx.fillRect(ox + 6, oy + 8, 32, 18);
              ctx.fillStyle = '#fde68a';
              ctx.fillRect(ox + 10, oy + 13, 24, 2);
              ctx.fillRect(ox + 10, oy + 18, 20, 2);
          } else if (obj.type === 'suspicious_statue' || obj.type === 'suspicious_pot' || obj.type === 'altar') {
              ctx.fillStyle = obj.type === 'altar' ? '#7c3aed' : '#94a3b8';
              ctx.fillRect(ox + 8, oy + 8, 28, 28);
              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
              ctx.strokeRect(ox + 8, oy + 8, 28, 28);
              ctx.fillStyle = '#facc15';
              ctx.fillRect(ox + 16, oy + 16, 12, 12);
          } else if (obj.type === 'door' && !obj.opened) {
              ctx.fillStyle = '#7f1d1d';
              ctx.fillRect(ox - TILE, oy, TILE * 3, TILE);
              ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
              ctx.strokeRect(ox - TILE + 2, oy + 2, TILE * 3 - 4, TILE - 4);
          } else if (obj.type === 'wheat' || obj.type === 'crop') {
              const stage = obj.stage ?? (obj.harvested ? 0 : 5);
              const kind = obj.cropKind || 'wheat';
              if (!assets.drawCropStage(ctx, kind, stage, ox, oy, TILE)) {
                  // Procedural fallback — still show soil stub when harvested / young.
                  if (stage > 0) {
                      for (let s = -8; s <= 8; s += 8) {
                          ctx.fillStyle = kind === 'carrot' ? '#ea580c' : (kind === 'pumpkin' ? '#c2410c' : '#ca8a04');
                          ctx.fillRect(ox + 21 + s, oy + 14 + (5 - stage) * 2, 3, 10 + stage * 2);
                          ctx.fillStyle = kind === 'sunflower' ? '#fde047' : '#facc15';
                          ctx.fillRect(ox + 19 + s, oy + 6 + (5 - stage) * 2, 7, 6 + stage);
                      }
                  } else {
                      ctx.fillStyle = '#78350f';
                      ctx.fillRect(ox + 8, oy + 28, 28, 10);
                  }
              }
          } else if (obj.type === 'fence') {
              ctx.fillStyle = obj.repaired ? '#b45309' : '#64748b';
              ctx.fillRect(ox + 6, oy + 10, 6, 26);
              ctx.fillRect(ox + 30, oy + 10, 6, 26);
              if (obj.repaired) {
                  ctx.fillRect(ox + 4, oy + 15, 34, 5);
                  ctx.fillRect(ox + 4, oy + 25, 34, 5);
              }
          }
      }

      // 4. Loot Drops (Sunnyside food/item icons when loaded)
      for (const drop of this.lootDrops) {
          const bob = Math.sin(performance.now() / 180 + drop.x) * 2;
          const iconKind = drop.type === 'pork' ? 'pork' : (drop.type || 'egg');
          if (!assets.drawItemIcon(ctx, iconKind, drop.x, drop.y + bob, 20)) {
              ctx.fillStyle = '#fb7185';
              ctx.fillRect(drop.x - 8, drop.y - 6 + bob, 16, 12);
              ctx.fillStyle = '#ffe4e6';
              ctx.fillRect(drop.x - 4, drop.y - 3 + bob, 5, 5);
          } else {
              assets.drawGlint(ctx, drop.x + 6, drop.y - 10 + bob, 1);
          }
      }

      // 5. Blocky Animals
      for (const a of this.animals) {
          this.drawUpgradedAnimal(ctx, a);
      }

      // 6. Blocky Village NPCs
      for (const npc of this.npcs) {
          this.drawSmoothNPC(ctx, npc);
      }

      // 7. Blocky Enemies & Fire Temple Turrets
      for (const ft of this.fireTurrets) {
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(ft.x - 12, ft.y - 12, 24, 24);
          ctx.fillStyle = '#f97316';
          ctx.fillRect(ft.x - 6, ft.y - 6, 12, 12);
      }
      for (const e of this.enemies) {
          this.drawUpgradedEnemy(ctx, e);
      }

      // 8. Bosses (Temple 1, Temple 2, Volcano Fire Boss, Abyssal Water Boss)
      if (this.boss.active) this.drawBoss(ctx);
      if (this.temple2Boss.active && !this.dungeonProgress.temple2BossDefeated) {
          this.drawTemple2Boss(ctx);
      }
      if (this.fireBoss.active && !this.dungeonProgress.fireBossDefeated) {
          this.drawFireBoss(ctx);
      }
      if (this.waterBoss.active && !this.dungeonProgress.waterBossDefeated) {
          this.drawWaterBoss(ctx);
      }

      // 9. Render Both Players in World
      this.drawPlayerInWorld(ctx, this.player);
      if (this.isMultiplayer) {
          this.drawPlayerInWorld(ctx, this.player2);
      }

      // 10. Blocky Bushes
      for (const b of this.bushes) {
          const bx = b.x + TILE / 2, by = b.y + TILE / 2;
          if (bx + 40 < leftWorld || bx - 40 > leftWorld + vpW || by + 40 < topWorld || by - 40 > topWorld + vpH) continue;
          this.drawDetailedBush(ctx, bx, by, b.r);
      }

      // 11. Blocky Projectiles (Regular Arrows, Ice Arrows, Small Fireballs, Water Waves)
      for (const p of this.projectiles) {
          ctx.save();
          ctx.translate(Math.floor(p.x), Math.floor(p.y));
          if (p.projType === 'small_fireball') {
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(-8, -8, 16, 16);
              ctx.fillStyle = '#facc15';
              ctx.fillRect(-4, -4, 8, 8);
          } else if (p.projType === 'boss_wave' || p.projType === 'player_wave') {
              ctx.fillStyle = '#0284c7';
              ctx.fillRect(-24, -10, 48, 20);
              ctx.fillStyle = '#bae6fd';
              ctx.fillRect(-20, -6, 40, 6);
          } else {
              ctx.rotate(p.angle || 0);
              ctx.fillStyle = p.projType === 'ice_arrow' ? '#38bdf8' : '#d97706';
              ctx.fillRect(-12, -2, 22, 4);
              ctx.fillStyle = p.projType === 'ice_arrow' ? '#e0f2fe' : '#e2e8f0';
              ctx.fillRect(10, -4, 6, 8);
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(-14, -4, 5, 8);
          }
          ctx.restore();
      }

      // 12. Floating Texts
      for (const ft of this.floatingTexts) {
          ctx.fillStyle = ft.color;
          ctx.font = 'bold 16px VT323';
          ctx.fillText(ft.text, Math.floor(ft.x - 24), Math.floor(ft.y));
      }

      ctx.restore();

      if (bannerText) {
          const accent = (typeof bannerText === 'object' && bannerText.accent)
              ? bannerText.accent
              : (focusHero.id === 'P2' ? '#38bdf8' : '#f59e0b');
          const title = typeof bannerText === 'object' ? bannerText.title : String(bannerText);
          const keys = typeof bannerText === 'object' ? (bannerText.keys || '') : '';
          const boxW = Math.max(120, vpW - 20);
          const boxH = keys ? 44 : 26;
          const bx = vpX + 10;
          const by = vpY + 8;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(bx, by, boxW, boxH);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, boxW, boxH);
          ctx.fillStyle = accent;
          ctx.fillRect(bx, by, 6, boxH);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 15px VT323';
          ctx.textAlign = 'left';
          ctx.fillText(title, bx + 12, by + (keys ? 16 : 18));
          if (keys) {
              ctx.fillStyle = '#cbd5e1';
              ctx.font = '13px VT323';
              // Truncate gracefully so the banner stays readable on narrow halves
              let shown = keys;
              while (shown.length > 8 && ctx.measureText(shown).width > boxW - 18) {
                  shown = shown.slice(0, -4) + '…';
              }
              ctx.fillText(shown, bx + 12, by + 34);
          }

          // Compact per-viewport HP strip (readable when top HUD is crowded)
          const hpMax = Math.max(1, focusHero.maxHp);
          const hpFrac = Math.max(0, Math.min(1, focusHero.hp / hpMax));
          const barW = Math.min(110, boxW - 12);
          const barX = bx + 6;
          const barY = by + boxH + 6;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(barX, barY, barW, 8);
          ctx.fillStyle = accent;
          ctx.fillRect(barX, barY, Math.floor(barW * hpFrac), 8);
          if (focusHero.yellowHp > 0) {
              ctx.fillStyle = '#facc15';
              ctx.fillRect(barX + Math.floor(barW * hpFrac), barY, Math.min(12, Math.floor(focusHero.yellowHp * 8)), 8);
          }
      }

      if (focusHero.id === 'P1') {
          this.drawBowCrossbar(ctx, vpX + vpW / 2, vpY + vpH / 2);
      }
      ctx.restore();
  },

  drawDetailedBuilding(ctx, b) {
      const x1 = b.x1 * TILE;
      const y1 = b.y1 * TILE;
      const w = (b.x2 - b.x1 + 1) * TILE;
      const roofH = 34;

      ctx.save();
      // Blocky Shingled Roof Overhang (ZERO curves)
      ctx.fillStyle = b.roof;
      ctx.fillRect(x1 - 6, y1 - 10, w + 12, roofH);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1 - 6, y1 - 10, w + 12, roofH);

      // Square Shingle Grid Pattern
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let row = 0; row < 2; row++) {
          for (let sx = x1 + 4; sx < x1 + w - 10; sx += 18) {
              ctx.fillRect(sx, y1 - 4 + row * 12, 12, 4);
          }
      }

      // Brick Chimney + Sunnyside chimney-smoke strip (procedural puffs as fallback)
      const chimX = x1 + w - 34;
      const chimY = y1 - 22;
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(chimX, chimY, 16, 20);
      ctx.strokeStyle = '#450a0a';
      ctx.strokeRect(chimX, chimY, 16, 20);
      if (!assets.drawChimneySmoke(ctx, chimX + 8, chimY)) {
          const t = performance.now() / 600;
          for (let i = 0; i < 3; i++) {
              const phase = (t + i * 0.7) % 2.1;
              ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, 0.55 - phase * 0.25)})`;
              const sz = Math.floor(6 + phase * 4);
              ctx.fillRect(chimX + 4 + Math.floor(Math.sin(phase * 3) * 4), chimY - Math.floor(phase * 16), sz, sz);
          }
      }

      // Paned Square Windows & Flower Boxes on front wall
      const frontY = b.y2 * TILE + 6;
      const winPositions = [x1 + 26, x1 + w - 54];
      winPositions.forEach(wx => {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(wx, frontY, 22, 18);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.strokeRect(wx, frontY, 22, 18);
          ctx.fillRect(wx + 10, frontY, 2, 18);
          ctx.fillRect(wx, frontY + 8, 22, 2);
          // Flower box
          ctx.fillStyle = '#92400e';
          ctx.fillRect(wx - 2, frontY + 18, 26, 6);
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(wx + 3, frontY + 15, 5, 5);
          ctx.fillRect(wx + 14, frontY + 15, 5, 5);
      });

      // Signboard
      const cx = x1 + w / 2;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 58, y1 - 4, 116, 20);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 58, y1 - 4, 116, 20);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 14px VT323';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, cx, y1 + 11);
      ctx.textAlign = 'left';
      ctx.restore();
  },

  drawDetailedBush(ctx, bx, by, r) {
      ctx.save();
      const nearP1 = Math.hypot(this.player.x - bx, this.player.y - by) < r;
      const nearP2 = this.isMultiplayer && Math.hypot(this.player2.x - bx, this.player2.y - by) < r;
      if (nearP1 || nearP2) ctx.globalAlpha = 0.62;

      // Cubic 8-bit Bush Clusters & Square Berries (ZERO curves!)
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(bx - 20, by + 12, 40, 8);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(bx - 20, by - 12, 40, 26);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(bx - 16, by - 16, 32, 22);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx - 10, by - 12, 20, 14);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 10, by - 4, 4, 4);
      ctx.fillRect(bx + 6, by - 8, 4, 4);
      ctx.fillRect(bx + 8, by + 2, 4, 4);
      ctx.fillRect(bx - 4, by + 4, 4, 4);
      ctx.restore();
  },

  drawDetailedFlower(ctx, fx, fy, hex, isPatch) {
      ctx.save();
      const offsets = isPatch ? [[-7, -5], [7, 4], [-5, 7]] : [[0, 0]];
      for (const [ox, oy] of offsets) {
          const x = fx + ox, y = fy + oy;
          // Cubic Stem & Pixel Petals
          ctx.fillStyle = '#15803d';
          ctx.fillRect(x - 1, y, 3, 10);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x - 5, y + 4, 4, 3);
          ctx.fillRect(x + 2, y + 4, 4, 3);
          ctx.fillStyle = hex;
          ctx.fillRect(x - 6, y - 2, 4, 4);
          ctx.fillRect(x + 2, y - 2, 4, 4);
          ctx.fillRect(x - 2, y - 6, 4, 4);
          ctx.fillRect(x - 2, y + 2, 4, 4);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      ctx.restore();
  },

  /**
   * Advance crop growth stages (wheat + extra plots). Harvestable only at stage 5.
   * After harvest, plots regrow from stage 0 — quest counter only increments on interact.
   */
  updateCrops(dt) {
      if (!this.interactables) return;
      for (const obj of this.interactables) {
          if (obj.type !== 'wheat' && obj.type !== 'crop') continue;
          if ((obj.stage ?? 5) >= 5) {
              obj.harvested = false;
              obj.stage = 5;
              continue;
          }
          obj.growthTimer = (obj.growthTimer ?? CROP_STAGE_SECONDS) - dt;
          if (obj.growthTimer <= 0) {
              obj.stage = Math.min(5, (obj.stage ?? 0) + 1);
              obj.growthTimer = CROP_STAGE_SECONDS;
              if (obj.stage >= 5) obj.harvested = false;
          }
      }
  },

  drawWorldProp(ctx, prop) {
      if (!prop) return;
      if (prop.kind === 'windmill') {
          if (!assets.drawWindmill(ctx, prop.x, prop.y, prop.scale || 1)) {
              ctx.fillStyle = '#94a3b8';
              ctx.fillRect(prop.x - 18, prop.y - 70, 36, 70);
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(prop.x - 4, prop.y - 88, 8, 24);
          }
          return;
      }
      if (prop.kind === 'coracle') {
          if (!assets.drawCoracle(ctx, prop.x, prop.y, !!prop.onLand)) {
              ctx.fillStyle = '#92400e';
              ctx.fillRect(prop.x - 20, prop.y - 8, 40, 16);
          }
          return;
      }
      if (prop.kind === 'coracleLand') {
          if (!assets.drawCoracle(ctx, prop.x, prop.y, true)) {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(prop.x - 18, prop.y - 10, 36, 18);
          }
          return;
      }
      if (prop.kind === 'crate') {
          if (!assets.drawCrate(ctx, prop.x, prop.y, prop.lid !== false)) {
              ctx.fillStyle = '#b45309';
              ctx.fillRect(prop.x - 12, prop.y - 10, 24, 22);
          }
      }
  }
};
