/**
 * Player / hero state, combat actions, fishing cast, and hero rendering.
 */

import { sfx, assets } from './assets.js';
import { TILE, T_WATER, T_BRIDGE_TRAP, T_CHASM, T_LAVA } from './world.js';

export const playerMethods = {
  createHeroState(id, x, y, gender, hatColor, tunicColor, legsColor) {
      return {
          id,
          x,
          y,
          dir: 'down',
          speed: 205,
          gender,
          hatColor,
          tunicColor,
          legsColor,
          sleeveStyle: 'long',
          pantsStyle: 'pants',
          outfit: 'tunic', // 'tunic' or 'diver' (bandana + goggles, smooth black/white chestpiece, leggings + flippers)
          hasDivingGear: false,
          level: 0,
          armorLevel: 1,
          hp: 3.0,
          maxHp: 3.0,
          yellowHp: 0.0,
          coins: 25,
          pork: 10,
          goldenApples: 1,
          weapon: 'wooden_sword', // 'wooden_sword' or 'iron_sword' (Regular sword slot)
          hasFireClaymore: false, // Separate slot!
          activeMeleeSlot: 'sword', // 'sword' or 'fire_claymore'
          swordDamage: 5,
          hasShield: true,
          shielding: false,
          hasBow: false,
          hasIceTripleBow: false, // Shoots 3 ice arrows at a time!
          hasWaveLauncher: false, // Summons waves after beating Water Boss!
          arrows: 0,
          attackTimer: 0,
          attackDuration: 0.28,
          bowAnimTimer: 0,
          bowAnimDuration: 0.28,
          attackCooldown: 0,
          invulnTimer: 0,
          hurtAnimTimer: 0,
          hurtAnimDuration: 0.42,
          onWater: false,
          inBush: false,
          stealthHidden: false,
          stealthTimer: 3.0,
          stealthExhausted: false,
          fishingState: null,
          fish: { salmon: 0, silver_fish: 0, trout: 0, bull_eye: 0 },
          flowers: { Red: 2, Blue: 2, Yellow: 2, White: 2, Black: 1 },
          dyes: [
              { name: 'Red', hex: '#ef4444' },
              { name: 'Blue', hex: '#3b82f6' },
              { name: 'Yellow', hex: '#eab308' },
              { name: 'Green', hex: '#16a34a' },
              { name: 'White', hex: '#f8fafc' },
              { name: 'Black', hex: '#1e293b' }
          ],
          shades: [
              { name: 'Orange', hex: '#f97316' },
              { name: 'Purple', hex: '#a855f7' },
              { name: 'Light Blue', hex: '#38bdf8' },
              { name: 'Pink', hex: '#f472b6' }
          ]
      };
  },

  syncPlayer2Equipment() {
      this.player2.level = this.player.level;
      this.player2.armorLevel = this.player.armorLevel;
      this.player2.maxHp = this.player.maxHp;
      this.player2.weapon = this.player.weapon;
      this.player2.swordDamage = this.player.swordDamage;
      this.player2.hasFireClaymore = this.player.hasFireClaymore;
      this.player2.hasBow = this.player.hasBow;
      this.player2.hasIceTripleBow = this.player.hasIceTripleBow;
      this.player2.hasWaveLauncher = this.player.hasWaveLauncher;
      this.player2.hasDivingGear = this.player.hasDivingGear;
      this.player2.hasShield = true;
  },

  grantDivingGear() {
      this.dungeonProgress.divingGearClaimed = true;
      this.player.hasDivingGear = true;
      this.player.outfit = 'diver';
      this.player2.hasDivingGear = true;
      this.player2.outfit = 'diver';
      sfx.unlock();
      this.showToast("🤿 Equipped Black & White Diving Gear (Bandana + Goggles, Smooth Black/White Chestpiece, Leggings + Flippers)! You can now swim fast in the Ocean and switch outfits in [I]!");
      this.updateHUD();
  },

  switchPlayerOutfit(who = 'P1') {
      const target = who === 'P2' ? this.player2 : this.player;
      if (!this.player.hasDivingGear) {
          this.showToast("🤿 Find the Submarine in the Western Ocean to unlock the Diving Gear first!");
          return;
      }
      target.outfit = target.outfit === 'diver' ? 'tunic' : 'diver';
      sfx.heal();
      this.showToast(`🤿 Switched ${target.id} to ${target.outfit === 'diver' ? 'Diving Gear (Fast Water Flippers)' : 'Hero Tunic'}!`);
      this.toggleInventoryModal();
      this.toggleInventoryModal();
  },

  equipRegularSword() {
      this.player.activeMeleeSlot = 'sword';
      this.player2.activeMeleeSlot = 'sword';
      sfx.heal();
      this.updateHUD();
      this.showToast(`🗡️ Equipped ${this.player.weapon === 'iron_sword' ? 'Iron Sword (10 DMG)' : 'Wooden Sword (5 DMG)'}!`);
  },

  equipAndSwingMainSword(actor = this.player) {
      actor.activeMeleeSlot = 'sword';
      this.updateHUD();
      this.swingSword(actor);
  },

  toggleEquipFireClaymore(actor = this.player) {
      if (!this.player.hasFireClaymore) {
          this.showToast("🔥 Defeat the Giant Fireball Boss in the East Volcano to unlock the Fire Claymore slot!");
          return;
      }
      const nextSlot = actor.activeMeleeSlot === 'fire_claymore' ? 'sword' : 'fire_claymore';
      this.player.activeMeleeSlot = nextSlot;
      this.player2.activeMeleeSlot = nextSlot;
      sfx.unlock();
      this.updateHUD();
      this.showToast(nextSlot === 'fire_claymore'
          ? "🔥 Equipped Giant Fire Claymore (12 DMG, Huge Reach, Slower Speed — Damages the Water Boss)!"
          : "🗡️ Switched back to your Regular Sword slot!");
  },

  fireWaveLauncher(actor = this.player) {
      if (!this.player.hasWaveLauncher) {
          this.showToast("🌊 Defeat the Abyssal Water Temple Boss to unlock the Wave Launcher [V]!");
          return;
      }
      if (actor.attackCooldown > 0) return;
      actor.attackCooldown = 0.55;
      sfx.splash();
      let ang = 0;
      if (actor.dir === 'right') ang = 0;
      else if (actor.dir === 'down') ang = Math.PI / 2;
      else if (actor.dir === 'left') ang = Math.PI;
      else if (actor.dir === 'up') ang = -Math.PI / 2;

      for (let offset = -1; offset <= 1; offset++) {
          const spread = ang + offset * 0.18;
          this.projectiles.push({
              x: actor.x + Math.cos(spread) * 24,
              y: actor.y + Math.sin(spread) * 24,
              vx: Math.cos(spread) * 380,
              vy: Math.sin(spread) * 380,
              angle: spread,
              dmg: 12,
              fromPlayer: true,
              projType: 'player_wave',
              life: 1.4
          });
      }
      this.addFloatingText(actor.x, actor.y - 20, "🌊 TIDAL WAVE!", "#38bdf8");
  },

  /**
   * REALISTIC FISHING SYSTEM (BOBBER WAIT TIMER + RARE SILVER FISH & BULL EYE)
   */
  castFishingRod(actor = this.player) {
      if (actor.fishingState) {
          if (actor.fishingState.state === 'bite') {
              this.reelInFish(actor);
          } else {
              this.showToast("🎣 Patience! Wait for a fish to bite the bobber before reeling in...");
          }
          return;
      }

      // Check if actor is near water tiles (supports Infinite World lakes too)
      const ptx = Math.floor(actor.x / TILE);
      const pty = Math.floor(actor.y / TILE);
      let waterX = null, waterY = null;
      for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
              if (this.getTileAt(ptx + dx, pty + dy) === T_WATER) {
                  waterX = (ptx + dx + 0.5) * TILE;
                  waterY = (pty + dy + 0.5) * TILE;
                  break;
              }
          }
          if (waterX !== null) break;
      }
      if (waterX === null) {
          this.showToast("🎣 Walk to Crystal Lake or any water shore to cast your Fishing Rod!");
          return;
      }

      sfx.splash();
      const waitDuration = 3.6 + Math.random() * 3.0; // Wait 3.6 to 6.6 seconds for a bite
      // Casting pose first, then waiting — drives Sunnyside fishing strips.
      actor.fishingState = {
          state: 'casting',
          timer: 0.55,
          animDuration: 0.55,
          waitDuration,
          bobberX: waterX,
          bobberY: waterY
      };
      this.showToast(`🎣 ${actor.id} cast a line! Waiting for a fish to bite...`);
  },

  /**
   * Finish the catch after reeling/caught poses (or immediately if anims skipped).
   */
  finishFishCatch(actor, caught) {
      actor.fishingState = null;
      this.pendingCaughtFish = caught;
      document.getElementById('fish-modal-name').textContent = `${caught.name} ($${caught.price} / ${caught.price} Coins)`;
      document.getElementById('fish-modal-desc').textContent = caught.desc;
      document.getElementById('fish-modal').classList.remove('hidden');
      this.renderCaughtFishPreview(caught);
  },

  rollCaughtFish() {
      // Weighted Rarity: Salmon (38%), Trout (38%), Silver Fish (12% RARE), Bull Eye (12% RARE)
      const roll = Math.random();
      if (roll < 0.38) {
          return { key: 'salmon', name: 'Salmon', price: 15, desc: 'A little red fish with an eye and a vibrant green splash on its side! Sells for $15.' };
      }
      if (roll < 0.76) {
          return { key: 'trout', name: 'Trout', price: 15, variant: Math.random() < 0.5 ? 'brown' : 'green', desc: 'A fresh freshwater trout with one little eye! Sells for $15.' };
      }
      if (roll < 0.88) {
          return { key: 'silver_fish', name: '🌟 Rare Silver Fish', price: 20, desc: 'RARE CATCH! A sleek little fish with a bright eye, covered in shimmering silver scales! Sells for $20.' };
      }
      return { key: 'bull_eye', name: '🌟 Rare Bull Eye', price: 20, desc: 'RARE CATCH! A brown fish with a little horn on its forehead and a giant bullseye eye! Sells for $20.' };
  },

  reelInFish(actor) {
      sfx.splash();
      const caught = this.rollCaughtFish();
      // Play reeling → caught strips briefly before the keep/sell modal.
      actor.fishingState = {
          state: 'reeling',
          timer: 0.5,
          animDuration: 0.5,
          bobberX: actor.fishingState?.bobberX ?? actor.x,
          bobberY: actor.fishingState?.bobberY ?? actor.y,
          pendingCatch: caught
      };
  },

  swingSword(actor = this.player) {
      if (this.activePuzzle || actor.attackCooldown > 0) return;
      if (actor.fishingState && actor.fishingState.state === 'bite') {
          this.reelInFish(actor);
          return;
      }
      sfx.slash();
      const usingClaymore = actor.activeMeleeSlot === 'fire_claymore' && this.player.hasFireClaymore;
      // Fire Claymore deals 12 attack damage, has bigger range, and attacks slower!
      actor.attackDuration = usingClaymore ? 0.44 : 0.26;
      actor.attackTimer = actor.attackDuration;
      actor.attackCooldown = usingClaymore ? 0.52 : 0.28;

      if (actor.stealthHidden) {
          actor.stealthHidden = false;
          actor.stealthExhausted = true;
      }

      const dmg = usingClaymore ? 12 : (actor.weapon === 'iron_sword' ? 10 : 5);
      actor.swordDamage = dmg;
      const reach = usingClaymore ? 72 : (actor.weapon === 'iron_sword' ? 50 : 40);
      const hitRadius = usingClaymore ? 58 : 42;
      let hx = actor.x;
      let hy = actor.y;
      if (actor.dir === 'up') hy -= reach;
      if (actor.dir === 'down') hy += reach;
      if (actor.dir === 'left') hx -= reach;
      if (actor.dir === 'right') hx += reach;

      this.damageTargetsInRadius(hx, hy, hitRadius, dmg, false, actor, usingClaymore ? 'fire_claymore' : 'sword');
  },

  shootArrow(actor = this.player) {
      if (this.activePuzzle) return;
      if (!this.player.hasBow) {
          this.showToast("🏹 Unlock the Bow from the Temple 1 Boss or the Triple-Shot Ice Bow in the Volcano!");
          return;
      }
      if (this.player.arrows <= 0) {
          this.showToast("🏹 Out of Arrows!");
          return;
      }
      if (actor.attackCooldown > 0) return;

      const isIceTriple = this.player.hasIceTripleBow;
      this.player.arrows = Math.max(0, this.player.arrows - (isIceTriple ? 3 : 1));
      actor.bowAnimDuration = 0.28;
      actor.bowAnimTimer = actor.bowAnimDuration;
      actor.attackCooldown = 0.26;
      sfx.arrow();
      this.updateHUD();

      let ang = 0;
      if (actor.id === 'P2' && this.isMultiplayer) {
          if (actor.dir === 'right') ang = 0;
          else if (actor.dir === 'down') ang = Math.PI / 2;
          else if (actor.dir === 'left') ang = Math.PI;
          else if (actor.dir === 'up') ang = -Math.PI / 2;
      } else {
          const cw = this.canvas.width;
          const ch = this.canvas.height;
          const vpX = this.isMultiplayer ? cw / 2 : 0;
          const vpW = this.isMultiplayer ? cw / 2 : cw;
          const localMouseX = this.mouseX - vpX;
          if (localMouseX >= 0 && localMouseX <= vpW) {
              const worldTargetX = (actor.x - vpW / 2) + localMouseX;
              const worldTargetY = (actor.y - ch / 2) + this.mouseY;
              ang = Math.atan2(worldTargetY - actor.y, worldTargetX - actor.x);
          } else {
              if (actor.dir === 'right') ang = 0;
              else if (actor.dir === 'down') ang = Math.PI / 2;
              else if (actor.dir === 'left') ang = Math.PI;
              else if (actor.dir === 'up') ang = -Math.PI / 2;
          }
      }

      const speed = 490;
      const angles = isIceTriple ? [ang - 0.16, ang, ang + 0.16] : [ang];
      for (const a of angles) {
          this.projectiles.push({
              x: actor.x + Math.cos(a) * 18,
              y: actor.y + Math.sin(a) * 18,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              angle: a,
              dmg: isIceTriple ? 1 : 5,
              fromPlayer: true,
              projType: isIceTriple ? 'ice_arrow' : 'arrow',
              life: 1.5
          });
      }
  },

  /**
   * PLAYER DAMAGE, SHIELD BLOCKING, PORK & GOLDEN APPLE HEALING, PUZZLES & INTERACTION
   */
  damagePlayer(amount, sourceName = "Enemy", actor = this.player) {
      if (actor.invulnTimer > 0) return;
      if (actor.shielding) {
          actor.invulnTimer = 0.45;
          sfx.hit();
          this.addFloatingText(actor.x, actor.y - 20, "🛡️ BLOCKED!", "#38bdf8");
          return;
      }
      actor.invulnTimer = 0.85;
      actor.hurtAnimDuration = 0.42;
      actor.hurtAnimTimer = actor.hurtAnimDuration;
      sfx.hurt();

      // Yellow temporary hearts absorb damage first and cannot be healed back up like normal red hearts
      let remaining = amount;
      if (actor.yellowHp > 0) {
          const usedYellow = Math.min(actor.yellowHp, remaining);
          actor.yellowHp = Math.max(0, actor.yellowHp - usedYellow);
          remaining -= usedYellow;
      }
      if (remaining > 0) {
          actor.hp = Math.max(0, actor.hp - remaining);
      }

      this.addFloatingText(actor.x, actor.y - 18, `-${amount}❤️ (${sourceName})`, "#ef4444");
      this.updateHUD();

      if (actor.hp <= 0) {
          actor.hp = actor.maxHp;
          actor.x = 92 * TILE;
          actor.y = 66 * TILE;
          this.showToast(`💫 ${actor.id} fainted against ${sourceName}! Respawned at Starting Meadow with full Red Hearts.`);
          this.updateHUD();
      }
  },

  eatPork(actor = this.player) {
      if (this.player.pork <= 0) {
          this.showToast("🥩 Out of Pork! Hunt cows, pigs, sheep, or rabbits in the world for more food.");
          return;
      }
      if (actor.hp >= actor.maxHp) {
          this.showToast(`❤️ ${actor.id}'s Red Hearts are already full!`);
          return;
      }
      this.player.pork--;
      actor.hp = Math.min(actor.maxHp, actor.hp + 1.0);
      sfx.heal();
      this.addFloatingText(actor.x, actor.y - 20, "+1 ❤️ PORK", "#fb7185");
      this.updateHUD();
  },

  eatGoldenApple(actor = this.player) {
      if (this.player.goldenApples <= 0) {
          this.showToast("🍎 No Golden Apples left! Complete quests or open golden chests to find more.");
          return;
      }
      this.player.goldenApples--;
      actor.yellowHp += 1.0;
      sfx.heal();
      this.addFloatingText(actor.x, actor.y - 20, "+1 💛 TEMP HEART!", "#facc15");
      this.showToast(`🍎 ${actor.id} ate a Golden Apple and gained +1 Temporary Yellow Heart!`);
      this.updateHUD();
  },

  /**
   * MAIN GAME UPDATE LOOP (SUPPORTS P1 & P2, DIVING FLIPPERS, FIRE CLAYMORE SPEED, VOLCANO & WATER BOSSES)
   */
  updateHero(actor, dx, dy, isShieldHeld, dt) {
      actor.shielding = isShieldHeld && actor.hasShield;
      const tx = Math.floor(actor.x / TILE);
      const ty = Math.floor(actor.y / TILE);
      const currentTile = this.getTileAt(tx, ty);

      // Calculate movement speed:
      // - Fire Claymore makes you move slower (0.72x)
      // - Diving Suit Flippers make you move quicker in water (1.42x)
      let moveSpeed = actor.speed;
      if (actor.activeMeleeSlot === 'fire_claymore' && this.player.hasFireClaymore) {
          moveSpeed *= 0.72;
      }
      actor.onWater = currentTile === T_WATER;
      if (actor.onWater) {
          moveSpeed *= (actor.outfit === 'diver') ? 1.38 : 0.78;
      }
      if (actor.shielding) moveSpeed *= 0.55;

      actor.moving = false;
      if (dx !== 0 || dy !== 0) {
          // Cancel fishing if the player walks away mid-cast / wait.
          if (actor.fishingState) actor.fishingState = null;
          if (Math.abs(dx) >= Math.abs(dy)) actor.dir = dx > 0 ? 'right' : 'left';
          else actor.dir = dy > 0 ? 'down' : 'up';
          const len = Math.hypot(dx, dy);
          dx = (dx / len) * moveSpeed * dt;
          dy = (dy / len) * moveSpeed * dt;
          if (this.canWalk(actor.x + dx, actor.y, actor)) actor.x += dx;
          if (this.canWalk(actor.x, actor.y + dy, actor)) actor.y += dy;
          actor.moving = true;
      }

      if (actor.attackTimer > 0) actor.attackTimer = Math.max(0, actor.attackTimer - dt);
      if (actor.bowAnimTimer > 0) actor.bowAnimTimer = Math.max(0, actor.bowAnimTimer - dt);
      if (actor.attackCooldown > 0) actor.attackCooldown = Math.max(0, actor.attackCooldown - dt);
      if (actor.invulnTimer > 0) actor.invulnTimer = Math.max(0, actor.invulnTimer - dt);
      if (actor.hurtAnimTimer > 0) actor.hurtAnimTimer = Math.max(0, actor.hurtAnimTimer - dt);

      if (actor.fishingState) {
          actor.fishingState.timer -= dt;
          const fs = actor.fishingState;
          if (fs.state === 'casting' && fs.timer <= 0) {
              fs.state = 'waiting';
              fs.timer = fs.waitDuration || 4.0;
              fs.animDuration = undefined;
          } else if (fs.state === 'waiting' && fs.timer <= 0) {
              sfx.splash();
              this.addFloatingText(fs.bobberX, fs.bobberY - 12, "❗ BITE! REELING IN!", "#facc15");
              this.reelInFish(actor);
          } else if (fs.state === 'reeling' && fs.timer <= 0) {
              fs.state = 'caught';
              fs.timer = 0.45;
              fs.animDuration = 0.45;
          } else if (fs.state === 'caught' && fs.timer <= 0) {
              const caught = fs.pendingCatch || this.rollCaughtFish();
              this.finishFishCatch(actor, caught);
          }
      }

      this.ensureChunkPopulated(tx, ty);

      if (currentTile === T_BRIDGE_TRAP || currentTile === T_CHASM) {
          actor.x = 92.5 * TILE;
          actor.y = 34.5 * TILE;
          this.damagePlayer(0.5, "Trap Bridge", actor);
          this.showToast("⚠️ Unsafe Bridge Plank! Read the stone tablet to see which plank lane is safe!");
      }
      if (currentTile === T_LAVA) {
          this.damagePlayer(0.5, "Volcano Lava", actor);
      }

      // Trigger Temple 1 Boss (x: 84..100, y: 4..16)
      if (ty >= 4 && ty <= 16 && tx >= 84 && tx <= 100 && !this.dungeonProgress.bossTriggered) {
          this.dungeonProgress.bossTriggered = true;
          this.boss.active = true;
          this.boss.dropping = true;
          this.boss.dropZ = 320;
          this.player.hp = this.player.maxHp;
          this.player2.hp = this.player2.maxHp;
          sfx.bossDrop();
          sfx.heal();
          document.getElementById('boss-hud').classList.remove('hidden');
          this.showToast("👹 The Giant Roof Monster drops down and heals your Red Hearts to full! Land 15 hits!");
          this.updateHUD();
          this.updateBossHUD('⚔️ GIANT ROOF MONSTER', this.boss.hp, this.boss.maxHp);
      }

      // Bush Stealth (3.0s)
      let touchingBush = false;
      for (const b of this.bushes) {
          if (Math.hypot(actor.x - (b.x + TILE / 2), actor.y - (b.y + TILE / 2)) < b.r) {
              touchingBush = true;
              break;
          }
      }
      if (touchingBush) {
          actor.inBush = true;
          if (!actor.stealthExhausted) {
              actor.stealthHidden = true;
              actor.stealthTimer = Math.max(0, actor.stealthTimer - dt);
              if (actor.stealthTimer <= 0) {
                  actor.stealthHidden = false;
                  actor.stealthExhausted = true;
              }
          }
      } else {
          actor.inBush = false;
          actor.stealthHidden = false;
          actor.stealthExhausted = false;
          actor.stealthTimer = 3.0;
      }
  },

  /**
   * 1980s CUBIC PIXEL HERO RENDERER (ZERO curves!)
   * Supports:
   * - Tunic Outfit (Male/Female, Long/Short Sleeves, Pants/Shorts, Shoulder-to-Waist Strap, Fixed Waist Belt)
   * - Black & White Diving Gear Outfit:
   *   1) Headpiece: Black & White Bandana + Little Goggles
   *   2) Chestpiece: Smooth black & white rope-like chestpiece with NO wrinkles, NO belt, and NO strap
   *   3) Leggings & Flippers: Black & white leggings connected to wide swimming flippers
   */
  drawSmoothCharacter(ctx, x, y, scale, p) {
      ctx.save();
      ctx.translate(Math.floor(x), Math.floor(y));
      ctx.scale(scale, scale);

      // Blocky shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-11, 13, 22, 5);

      // Prefer Sunnyside Human layers when loaded (diver stays procedural).
      if (assets.drawHeroSprite(ctx, p, !!p.moving)) {
          if (p.stealthHidden) {
              ctx.fillStyle = '#4ade80';
              ctx.font = 'bold 13px VT323';
              ctx.fillText(`HIDDEN ${p.stealthTimer.toFixed(1)}s`, -22, -28);
          }
          ctx.restore();
          return;
      }

      if (p.outfit === 'diver') {
          // === BLACK & WHITE DIVING GEAR ===
          // 1. Black & White Leggings + Connected Flippers
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-7, 6, 5, 8);
          ctx.fillRect(2, 6, 5, 8);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-7, 9, 5, 2);
          ctx.fillRect(2, 9, 5, 2);
          // Flippers connected to the leggings
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-11, 13, 9, 4);
          ctx.fillRect(2, 13, 9, 4);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-10, 14, 4, 2);
          ctx.fillRect(5, 14, 4, 2);

          // 2. Smooth Black & White Rope-Like Chestpiece (NO wrinkles, NO belt, NO strap!)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-13, -5, 26, 9); // Arms
          ctx.fillRect(-9, -6, 18, 13); // Smooth torso
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-7, -4, 14, 2);
          ctx.fillRect(-7, 0, 14, 2);
          ctx.fillRect(-7, 4, 14, 2);

          // 3. Head, Black & White Bandana, and Little Goggles
          if (p.gender === 'female') {
              ctx.fillStyle = '#facc15';
              ctx.fillRect(-10, -14, 3, 12);
              ctx.fillRect(7, -14, 3, 12);
          }
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(-7, -18, 14, 12);
          // Black & White Bandana on head
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-8, -21, 16, 5);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-8, -19, 16, 2);
          // Little Black & White Goggles over eyes
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-7, -15, 6, 5);
          ctx.fillRect(1, -15, 6, 5);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-5, -14, 3, 3);
          ctx.fillRect(3, -14, 3, 3);
      } else {
          // === CLASSIC CUSTOMIZABLE HERO TUNIC ===
          const isShorts = p.pantsStyle === 'shorts';
          if (isShorts) {
              ctx.fillStyle = '#fde68a';
              ctx.fillRect(-6, 10, 5, 5);
              ctx.fillRect(1, 10, 5, 5);
          }
          ctx.fillStyle = p.legsColor || '#334155';
          const legLen = isShorts ? 5 : 9;
          ctx.fillRect(-7, 6, 5, legLen);
          ctx.fillRect(2, 6, 5, legLen);

          const isShortSleeve = p.sleeveStyle === 'short';
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(-13, -4, 4, 10);
          ctx.fillRect(9, -4, 4, 10);

          ctx.fillStyle = p.tunicColor || '#16a34a';
          const sleeveLen = isShortSleeve ? 5 : 9;
          ctx.fillRect(-13, -5, 4, sleeveLen);
          ctx.fillRect(9, -5, 4, sleeveLen);

          // Tunic Torso (Female has flared stepped dress-cut tunic)
          ctx.fillStyle = p.tunicColor || '#16a34a';
          if (p.gender === 'female') {
              ctx.fillRect(-9, -6, 18, 10);
              ctx.fillRect(-12, 4, 24, 5);
          } else {
              ctx.fillRect(-9, -6, 18, 13);
          }

          // Stepped Pixel Shoulder-to-Waist Diagonal Strap
          ctx.fillStyle = p.tunicColor || '#16a34a';
          ctx.fillRect(-7, -5, 4, 3);
          ctx.fillRect(-3, -2, 4, 3);
          ctx.fillRect(1, 0, 5, 3);

          // Fixed Classic Brown Leather Waist Belt
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-10, 2, 20, 3);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-2, 1, 4, 5);

          // Female Long Hair Locks
          if (p.gender === 'female') {
              ctx.fillStyle = '#facc15';
              ctx.fillRect(-10, -14, 3, 12);
              ctx.fillRect(7, -14, 3, 12);
          }

          // Cubic Head & Eyes
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(-7, -18, 14, 12);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-4, -14, 2, 3);
          ctx.fillRect(2, -14, 2, 3);

          // Stepped Blocky Hero Hat
          ctx.fillStyle = p.hatColor || '#15803d';
          ctx.fillRect(-8, -21, 16, 4);
          ctx.fillRect(-5, -25, 14, 4);
      }

      if (p.stealthHidden) {
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 13px VT323';
          ctx.fillText(`HIDDEN ${p.stealthTimer.toFixed(1)}s`, -22, -28);
      }

      ctx.restore();
  },

  /**
   * BLOCKY PLAYER RENDERER WITH SWORD / FIRE CLAYMORE SWING, BOW DRAW & SHIELD GUARD ANIMATIONS
   */
  drawPlayerInWorld(ctx, p = this.player) {
      ctx.save();
      ctx.translate(Math.floor(p.x), Math.floor(p.y));
      if (p.invulnTimer > 0 && Math.floor(performance.now() / 60) % 2 === 0) ctx.globalAlpha = 0.45;

      let baseRot = 0;
      if (p.dir === 'right') baseRot = 0;
      else if (p.dir === 'down') baseRot = Math.PI / 2;
      else if (p.dir === 'left') baseRot = Math.PI;
      else if (p.dir === 'up') baseRot = -Math.PI / 2;

      // 1. BLOCKY SWORD / GIANT FIRE CLAYMORE SWING ANIMATION
      if (p.attackTimer > 0) {
          const progress = 1 - (p.attackTimer / (p.attackDuration || 0.26));
          const startAng = baseRot - 1.15;
          const curAng = startAng + progress * 2.3;
          const usingClaymore = p.activeMeleeSlot === 'fire_claymore' && this.player.hasFireClaymore;
          const isIron = p.weapon === 'iron_sword';
          const bladeLen = usingClaymore ? 56 : (isIron ? 38 : 30);

          ctx.save();
          ctx.rotate(curAng);
          // Extended hero arm
          ctx.fillStyle = p.tunicColor || '#16a34a';
          ctx.fillRect(6, -3, 9, 6);
          // Pommel & Crossguard
          ctx.fillStyle = '#78350f';
          ctx.fillRect(12, -2, 6, 4);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(17, -9, 4, 18);
          // Cubic Blade
          ctx.fillStyle = usingClaymore ? '#f97316' : (isIron ? '#e2e8f0' : '#b45309');
          ctx.fillRect(21, usingClaymore ? -6 : -4, bladeLen, usingClaymore ? 12 : 8);
          if (usingClaymore) {
              ctx.fillStyle = '#facc15';
              ctx.fillRect(24, -3, bladeLen - 6, 6);
          }
          ctx.restore();
      }

      // 2. BLOCKY BOW & ARROW SHOOTING ANIMATION
      if (p.bowAnimTimer > 0) {
          const progress = 1 - (p.bowAnimTimer / (p.bowAnimDuration || 0.28));
          const pullBack = Math.floor(progress < 0.7 ? (progress / 0.7) * 10 : (1 - progress) * 4);

          ctx.save();
          ctx.rotate(baseRot);
          // Stepped Blocky Bow Limbs
          ctx.fillStyle = this.player.hasIceTripleBow ? '#38bdf8' : '#92400e';
          ctx.fillRect(14, -14, 4, 6);
          ctx.fillRect(17, -8, 4, 16);
          ctx.fillRect(14, 8, 4, 6);
          // Bowstring
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(13 - pullBack, -12, 2, 24);
          if (progress < 0.75) {
              ctx.fillStyle = this.player.hasIceTripleBow ? '#38bdf8' : '#d97706';
              ctx.fillRect(13 - pullBack, -2, 18, 4);
          }
          ctx.restore();
      }

      this.drawSmoothCharacter(ctx, 0, 0, 1.0, p);

      // 3. BLOCKY SHIELD GUARD STANCE (When holding Shift)
      if (p.shielding) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(-20, -22, 40, 40);
          ctx.rotate(baseRot);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(12, -11, 8, 22);
          ctx.strokeRect(12, -11, 8, 22);
          ctx.restore();
      }

      // Blocky Fishing Bobber
      if (p.fishingState) {
          const bx = Math.floor(p.fishingState.bobberX - p.x);
          const by = Math.floor(p.fishingState.bobberY - p.y);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(8, -6);
          ctx.lineTo(bx, by);
          ctx.stroke();

          const bobOffset = Math.floor(Math.sin(performance.now() / 140) * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(bx - 5, by - 5 + bobOffset, 10, 10);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx - 3, by - 5 + bobOffset, 6, 4);
      }

      if (this.isMultiplayer) {
          ctx.fillStyle = p.id === 'P1' ? '#f59e0b' : '#38bdf8';
          ctx.font = 'bold 14px VT323';
          ctx.textAlign = 'center';
          ctx.fillText(p.id, 0, -28);
          ctx.textAlign = 'left';
      }
      ctx.restore();
  },

  /**
   * BLOCKY BOW CROSSBAR AIMING RETICLE (ZERO curves)
   */
  drawBowCrossbar(ctx, originX = this.canvas.width / 2, originY = this.canvas.height / 2) {
      const mx = Math.floor(this.mouseX);
      const my = Math.floor(this.mouseY);
      ctx.save();
      ctx.strokeStyle = this.player.hasBow ? '#22c55e' : 'rgba(251, 191, 36, 0.65)';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx - 10, my - 10, 20, 20);
      ctx.fillStyle = this.player.hasBow ? '#22c55e' : '#fbbf24';
      ctx.fillRect(mx - 18, my - 1, 10, 2);
      ctx.fillRect(mx + 8, my - 1, 10, 2);
      ctx.fillRect(mx - 1, my - 18, 2, 10);
      ctx.fillRect(mx - 1, my + 8, 2, 10);
      ctx.restore();
  }
};
