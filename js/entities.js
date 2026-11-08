/**
 * Enemies, animals, NPCs, bosses, and related spawn / update / draw helpers.
 */

import { sfx, assets } from './assets.js';
import { TILE } from './world.js';

export const entityMethods = {
  spawnFlower(x, y, colorName, hex, isPatch) {
      const flowerObj = {
          id: `flower_${Math.random()}`, x, y, type: 'flower',
          colorName, hex, isPatch, picked: false,
          label: `Pick ${colorName} Flower (Dye Ingredient)`,
          onInteract: (obj) => {
              if (obj.picked) return;
              obj.picked = true;
              this.player.flowers[colorName] = (this.player.flowers[colorName] || 0) + 1;
              if (this.quests.church.status === 'active') this.quests.church.current++;
              sfx.heal();
              this.addFloatingText(obj.x, obj.y, `+1 🌸 ${colorName} Flower`, hex);
              this.showToast(`🌸 Picked a ${colorName} Flower! Take it to the Oakvale Art Shop to make ${colorName} Dye!`);
              this.updateQuestTracker();
          }
      };
      this.flowers.push(flowerObj);
      this.interactables.push(flowerObj);
  },

  spawnEnemy(type, x, y, isFirstBlob = false) {
      this.enemies.push({
          type, x, y, homeX: x, homeY: y,
          hp: type === 'blob' ? 15 : 10,
          maxHp: type === 'blob' ? 15 : 10,
          // Snakes are now noticeably slower (75 instead of 165) as requested!
          speed: type === 'blob' ? 66 : 75,
          isFirstBlob,
          dirAngle: Math.random() * Math.PI * 2,
          wanderTimer: 1.5,
          hurtTimer: 0,
          attackCooldown: 0,
          animPhase: Math.random() * 10
      });
  },

  spawnAnimal(kind, x, y) {
      this.animals.push({
          kind, x, y,
          hp: kind === 'rabbit' ? 10 : 15,
          baseSpeed: kind === 'rabbit' ? 68 : 42,
          dirAngle: Math.random() * Math.PI * 2,
          wanderTimer: 2.0,
          hurtTimer: 0,
          fleeTimer: 0, // Runs away rapidly when attacked!
          fleeFromX: 0,
          fleeFromY: 0
      });
  },

  damageTargetsInRadius(hx, hy, radius, dmg, isArrow, attacker = this.player, attackKind = 'sword') {
      // 1. Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (Math.hypot(e.x - hx, e.y - hy) <= radius) {
              const actualDmg = attackKind === 'ice_arrow' ? 8 : dmg;
              e.hp -= actualDmg;
              e.hurtTimer = 0.2;
              sfx.hit();
              this.addFloatingText(e.x, e.y - 14, `-${actualDmg} HP`, "#f87171");
              if (e.hp <= 0) {
                  this.player.coins += 4;
                  if (e.isFirstBlob) {
                      this.dungeonProgress.firstBlobDefeated = true;
                      this.showToast("✨ First Pink Blob defeated! Enter Temple 1 just North of you!");
                  }
                  if (this.quests.monster.status === 'active') this.quests.monster.current++;
                  if (Math.random() < 0.5) this.lootDrops.push({ x: e.x, y: e.y, type: 'pork' });
                  this.enemies.splice(i, 1);
                  this.updateHUD();
                  this.updateQuestTracker();
              }
              if (isArrow) return true;
          }
      }

      // 2. Animals (When attacked, they RUN AWAY rapidly from the attacker!)
      for (let i = this.animals.length - 1; i >= 0; i--) {
          const a = this.animals[i];
          if (Math.hypot(a.x - hx, a.y - hy) <= radius) {
              a.hp -= dmg;
              a.hurtTimer = 0.25;
              a.fleeTimer = 4.2;
              a.fleeFromX = attacker.x;
              a.fleeFromY = attacker.y;
              sfx.hit();
              this.addFloatingText(a.x, a.y - 16, `Startled! -${dmg}`, "#fda4af");
              if (a.hp <= 0) {
                  this.lootDrops.push({ x: a.x, y: a.y, type: 'pork' });
                  this.animals.splice(i, 1);
              }
              if (isArrow) return true;
          }
      }

      // 3. Temple 1 Boss (15 Hits)
      if (this.boss.active && !this.boss.dropping && this.boss.invuln <= 0) {
          if (Math.hypot(this.boss.x - hx, this.boss.y - hy) <= radius + 30) {
              this.boss.hp -= 1;
              this.boss.invuln = 0.35;
              sfx.hit();
              this.addFloatingText(this.boss.x, this.boss.y - 30, `HIT! (${this.boss.hp}/15)`, "#facc15");
              this.updateBossHUD('⚔️ GIANT ROOF MONSTER', this.boss.hp, this.boss.maxHp);
              if (this.boss.hp <= 0) this.handleBossVictory();
              if (isArrow) return true;
          }
      }

      // 4. Temple 2 Sanctum Guardian Boss
      if (this.temple2Boss.active && !this.dungeonProgress.temple2BossDefeated && this.temple2Boss.invuln <= 0) {
          if (Math.hypot(this.temple2Boss.x - hx, this.temple2Boss.y - hy) <= radius + 28) {
              this.temple2Boss.hp -= 1;
              this.temple2Boss.invuln = 0.3;
              sfx.hit();
              const mult = this.isMultiplayer ? 2 : 1;
              this.addFloatingText(this.temple2Boss.x, this.temple2Boss.y - 26, `SANCTUM HIT (${this.temple2Boss.hp}/12)`, "#38bdf8");
              if (this.temple2Boss.hp <= 0) {
                  this.temple2Boss.active = false;
                  this.dungeonProgress.temple2BossDefeated = true;
                  this.quests.temple2.current = 1;
                  this.player.maxHp += 1.0 * mult;
                  this.player.hp = this.player.maxHp;
                  this.player.coins += 60 * mult;
                  this.syncPlayer2Equipment();
                  this.player2.hp = this.player2.maxHp;
                  sfx.unlock();
                  this.showToast(`🏆 SECOND TEMPLE GUARDIAN DEFEATED! Drops x${mult}: +${60 * mult} Coins & +${1 * mult} Max Heart!`);
                  this.saveCurrentWorld();
                  this.updateHUD();
                  this.updateQuestTracker();
              }
              if (isArrow) return true;
          }
      }

      // 5. Volcano Giant Fireball Boss (25 Hearts! Attacking with a sword burns the player! Use Ice Arrows!)
      if (this.fireBoss.active && !this.dungeonProgress.fireBossDefeated) {
          if (Math.hypot(this.fireBoss.x - hx, this.fireBoss.y - hy) <= radius + 36) {
              if (!isArrow) {
                  // Trying to attack the Giant Fireball Boss with your sword damages you!
                  this.damagePlayer(0.5, "Attacked Fire Boss With Sword!", attacker);
                  this.showToast("🔥 OUCH! Attacking the Giant Fireball Boss with a sword burns you! Use the Triple-Shot Ice Bow [P / E]!");
                  return false;
              }
              if (this.fireBoss.invuln <= 0) {
                  this.fireBoss.hp -= 1;
                  this.fireBoss.invuln = 0.12;
                  sfx.hit();
                  this.addFloatingText(this.fireBoss.x, this.fireBoss.y - 34, `❄️ ICE HIT! (${this.fireBoss.hp}/25❤️)`, "#38bdf8");
                  this.updateBossHUD('🔥 GIANT FIREBALL BOSS', this.fireBoss.hp, this.fireBoss.maxHp);
                  if (this.fireBoss.hp <= 0) {
                      this.handleFireBossVictory();
                  }
              }
              return true;
          }
      }

      // 6. Abyssal Water Temple Boss (25 Hearts! Must use the Fire Claymore to defeat him!)
      if (this.waterBoss.active && !this.dungeonProgress.waterBossDefeated) {
          if (Math.hypot(this.waterBoss.x - hx, this.waterBoss.y - hy) <= radius + 38) {
              if (attackKind !== 'fire_claymore') {
                  this.addFloatingText(this.waterBoss.x, this.waterBoss.y - 30, "IMMUNE! USE FIRE CLAYMORE [2]!", "#94a3b8");
                  this.showToast("🌊 Only the Giant Fire Claymore [2] can evaporate the Abyssal Water Boss's armor!");
                  return isArrow;
              }
              if (this.waterBoss.invuln <= 0) {
                  this.waterBoss.hp -= 2; // Fire Claymore sears through the 25 hearts
                  if (this.waterBoss.hp < 0) this.waterBoss.hp = 0;
                  this.waterBoss.invuln = 0.25;
                  sfx.hit();
                  this.addFloatingText(this.waterBoss.x, this.waterBoss.y - 34, `🔥 CLAYMORE HIT! (${this.waterBoss.hp}/25❤️)`, "#f97316");
                  this.updateBossHUD('🌊 ABYSSAL WATER GUARDIAN', this.waterBoss.hp, this.waterBoss.maxHp);
                  if (this.waterBoss.hp <= 0) {
                      this.handleWaterBossVictory();
                  }
              }
              return false;
          }
      }
      return false;
  },

  handleBossVictory() {
      this.boss.active = false;
      this.dungeonProgress.bossDefeated = true;
      document.getElementById('boss-hud').classList.add('hidden');

      const mult = this.isMultiplayer ? 2 : 1;
      this.player.level = 10;
      this.player.maxHp += 1.0 * mult;
      this.player.hp = this.player.maxHp;
      this.player.weapon = 'iron_sword';
      this.player.swordDamage = 10;
      this.player.hasShield = true;
      this.player.hasBow = true;
      this.player.arrows += 100 * mult;
      this.player.coins += 40 * mult;
      this.syncPlayer2Equipment();
      this.player2.hp = this.player2.maxHp;

      sfx.unlock();
      this.showToast(`🏆 TEMPLE 1 BOSS DEFEATED! (Rewards x${mult}): Level 10, +${1 * mult} Red Heart, Iron Sword (10 DMG), Shield & +${100 * mult} Arrows!`);
      this.saveCurrentWorld();
      this.updateHUD();
      this.updateQuestTracker();
  },

  handleFireBossVictory() {
      this.fireBoss.active = false;
      this.dungeonProgress.fireBossDefeated = true;
      this.quests.volcano.current = 1;
      document.getElementById('boss-hud').classList.add('hidden');

      const mult = this.isMultiplayer ? 2 : 1;
      this.player.maxHp += 1.0 * mult;
      this.player.hp = this.player.maxHp;
      this.player.goldenApples += 5 * mult;
      this.player.hasFireClaymore = true;
      this.player.activeMeleeSlot = 'fire_claymore';
      this.syncPlayer2Equipment();
      this.player2.activeMeleeSlot = 'fire_claymore';
      this.player2.hp = this.player2.maxHp;

      sfx.unlock();
      this.showToast(`🔥 VOLCANO FIRE BOSS DEFEATED! (Rewards x${mult}): +${1 * mult} Red Heart, +${5 * mult} Golden Apples & Giant Fire Claymore (12 DMG) in Slot [2]!`);
      this.saveCurrentWorld();
      this.updateHUD();
      this.updateQuestTracker();
  },

  handleWaterBossVictory() {
      this.waterBoss.active = false;
      this.dungeonProgress.waterBossDefeated = true;
      this.quests.ocean.current = 1;
      document.getElementById('boss-hud').classList.add('hidden');

      const mult = this.isMultiplayer ? 2 : 1;
      this.player.hasWaveLauncher = true;
      this.player.maxHp += 1.0 * mult;
      this.player.hp = this.player.maxHp;
      this.player.coins += 100 * mult;
      this.syncPlayer2Equipment();
      this.player2.hp = this.player2.maxHp;

      sfx.unlock();
      this.showToast(`🌊 ABYSSAL WATER BOSS DEFEATED! (Rewards x${mult}): Unlocked WAVE LAUNCHER [V], +${1 * mult} Red Heart & +${100 * mult} Coins!`);
      this.saveCurrentWorld();
      this.updateHUD();
      this.updateQuestTracker();
  },

  updateBoss(dt, activeHeroes = [this.player]) {
      if (this.boss.invuln > 0) this.boss.invuln -= dt;
      if (this.boss.dropping) {
          this.boss.dropZ -= 380 * dt;
          if (this.boss.dropZ <= 0) { this.boss.dropZ = 0; this.boss.dropping = false; sfx.hit(); }
          return;
      }
      // Target closest hero
      let target = activeHeroes[0];
      let minD = Infinity;
      for (const h of activeHeroes) {
          const d = Math.hypot(h.x - this.boss.x, h.y - this.boss.y);
          if (d < minD) { minD = d; target = h; }
      }

      const ang = Math.atan2(target.y - this.boss.y, target.x - this.boss.x);
      if (this.boss.state === 'idle') {
          this.boss.x += Math.cos(ang) * 35 * dt;
          this.boss.y += Math.sin(ang) * 35 * dt;
      }
      this.boss.timer -= dt;
      if (this.boss.timer <= 0) {
          if (this.boss.state === 'idle') {
              if (minD < 130 || Math.random() < 0.5) {
                  this.boss.state = 'claymore_windup'; this.boss.timer = 0.85; this.boss.claymoreAngle = ang - 1.3;
              } else {
                  this.boss.state = 'laser_windup'; this.boss.timer = 0.95;
                  this.boss.laserTargetX = target.x; this.boss.laserTargetY = target.y;
              }
          } else if (this.boss.state === 'claymore_windup') {
              this.boss.state = 'claymore_swing'; this.boss.timer = 0.45; sfx.slash();
          } else if (this.boss.state === 'claymore_swing') {
              this.boss.state = 'idle'; this.boss.timer = 1.4;
          } else if (this.boss.state === 'laser_windup') {
              this.boss.state = 'laser_fire'; this.boss.timer = 0.55; sfx.laser();
          } else if (this.boss.state === 'laser_fire') {
              this.boss.state = 'idle'; this.boss.timer = 1.5;
          }
      }
      if (this.boss.state === 'claymore_swing') {
          this.boss.claymoreAngle += 6.2 * dt;
          for (const h of activeHeroes) {
              if (Math.hypot(h.x - this.boss.x, h.y - this.boss.y) < 105) {
                  this.damagePlayer(0.5, "Boss Claymore", h);
              }
          }
      } else if (this.boss.state === 'laser_fire') {
          for (const h of activeHeroes) {
              const d = this.pointToSegmentDist(h.x, h.y, this.boss.x, this.boss.y, this.boss.laserTargetX, this.boss.laserTargetY);
              if (d < 22) this.damagePlayer(0.5, "Boss Laser", h);
          }
      }
  },

  /**
   * VOLCANO GIANT FIREBALL BOSS AI (25 Hearts):
   * - Attack 1: Launches fireballs at players (0.5 heart damage)
   * - Attack 2: Swings his Fire Claymore — a deadly flame goes all around him; touching even a small part deals damage!
   */
  updateFireBoss(dt, activeHeroes) {
      const fb = this.fireBoss;
      if (fb.invuln > 0) fb.invuln -= dt;

      let target = activeHeroes[0];
      let minD = Infinity;
      for (const h of activeHeroes) {
          const d = Math.hypot(h.x - fb.x, h.y - fb.y);
          if (d < minD) { minD = d; target = h; }
      }
      if (minD > 420) return;

      const ang = Math.atan2(target.y - fb.y, target.x - fb.x);
      if (fb.state === 'idle') {
          fb.x += Math.cos(ang) * 38 * dt;
          fb.y += Math.sin(ang) * 38 * dt;
      }

      fb.timer -= dt;
      if (fb.timer <= 0) {
          if (fb.state === 'idle') {
              if (Math.random() < 0.52) {
                  fb.state = 'claymore_windup';
                  fb.timer = 0.85;
                  fb.claymoreAngle = 0;
              } else {
                  fb.state = 'fireball_volley';
                  fb.timer = 0.7;
                  sfx.laser();
                  for (let s = -1; s <= 1; s++) {
                      const a = ang + s * 0.25;
                      this.projectiles.push({
                          x: fb.x, y: fb.y,
                          vx: Math.cos(a) * 255, vy: Math.sin(a) * 255,
                          angle: a, dmg: 0.5, fromPlayer: false,
                          projType: 'small_fireball', life: 3.0
                      });
                  }
              }
          } else if (fb.state === 'claymore_windup') {
              fb.state = 'claymore_flame_spin';
              fb.timer = 1.1;
              sfx.slash();
          } else {
              fb.state = 'idle';
              fb.timer = 1.5;
          }
      }

      if (fb.state === 'claymore_flame_spin') {
          fb.claymoreAngle += 7.5 * dt;
          // Any player touching even a small part of the surrounding flame perimeter takes damage!
          for (const h of activeHeroes) {
              if (Math.hypot(h.x - fb.x, h.y - fb.y) <= fb.flameRadius + 14) {
                  this.damagePlayer(0.5, "Fire Claymore Flame Ring", h);
              }
          }
      }
  },

  /**
   * ABYSSAL WATER BOSS AI (25 Hearts, Stationary on North side of room while players are on South side):
   * - Attack 1: Telegraphs warning lines showing the lanes where he will shoot waves (Waves deal 1.0 FULL HEART of damage!)
   * - Attack 2: Telegraphs a warning line showing where his Laser Beam will fire
   */
  updateWaterBoss(dt, activeHeroes) {
      const wb = this.waterBoss;
      if (wb.invuln > 0) wb.invuln -= dt;

      let target = activeHeroes[0];
      let minD = Infinity;
      for (const h of activeHeroes) {
          const d = Math.hypot(h.x - wb.x, h.y - wb.y);
          if (d < minD) { minD = d; target = h; }
      }
      if (minD > 460) return;

      wb.timer -= dt;
      if (wb.timer <= 0) {
          if (wb.state === 'idle') {
              if (Math.random() < 0.55) {
                  wb.state = 'wave_telegraph';
                  wb.timer = 1.15;
                  // Choose 3 vertical wave lanes aimed at the players' side of the room
                  wb.waveLanes = [
                      target.x - TILE * 2,
                      target.x,
                      target.x + TILE * 2
                  ];
              } else {
                  wb.state = 'laser_telegraph';
                  wb.timer = 1.1;
                  wb.laserTargetX = target.x;
                  wb.laserTargetY = target.y;
              }
          } else if (wb.state === 'wave_telegraph') {
              wb.state = 'wave_fire';
              wb.timer = 0.65;
              sfx.splash();
              for (const lx of wb.waveLanes) {
                  this.projectiles.push({
                      x: lx, y: wb.y + 24,
                      vx: 0, vy: 285,
                      angle: Math.PI / 2, dmg: 1.0, // Deals 1 full heart of damage!
                      fromPlayer: false,
                      projType: 'boss_wave', life: 2.4
                  });
              }
          } else if (wb.state === 'laser_telegraph') {
              wb.state = 'laser_fire';
              wb.timer = 0.65;
              sfx.laser();
          } else {
              wb.state = 'idle';
              wb.timer = 1.6;
          }
      }

      if (wb.state === 'laser_fire') {
          for (const h of activeHeroes) {
              const d = this.pointToSegmentDist(h.x, h.y, wb.x, wb.y, wb.laserTargetX, wb.laserTargetY);
              if (d < 24) this.damagePlayer(1.0, "Water Boss Laser", h);
          }
      }
  },

  /**
   * 1980s CUBIC PIXEL ANIMALS (Cow, Pig, Rabbit, Sheep — ZERO curves!)
   */
  drawUpgradedAnimal(ctx, a) {
      ctx.save();
      ctx.translate(Math.floor(a.x), Math.floor(a.y));
      const legSwing = Math.floor(a.fleeTimer > 0 ? Math.sin(performance.now() / 42) * 4 : Math.sin(performance.now() / 180) * 1.5);

      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(-14, 13, 28, 5);

      if (a.kind === 'cow') {
          // Two little legs + hooves
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-9, 8, 5, 7 + legSwing);
          ctx.fillRect(4, 8, 5, 7 - legSwing);
          // White blocky body
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-16, -8, 32, 18);
          // Brown patch and Black patch
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-12, -6, 10, 8);
          ctx.fillStyle = '#111827';
          ctx.fillRect(0, -1, 10, 8);
          // Two little square eyes
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(9, -5, 3, 3);
          ctx.fillRect(13, -5, 3, 3);
      } else if (a.kind === 'pig') {
          // Two little pink legs
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(-8, 8, 5, 6 + legSwing);
          ctx.fillRect(4, 8, 5, 6 - legSwing);
          // Stepped Pixel Swirly Tail on its back
          ctx.fillStyle = '#db2777';
          ctx.fillRect(-19, -4, 5, 3);
          ctx.fillRect(-21, -9, 3, 6);
          ctx.fillRect(-18, -11, 5, 3);
          // Pink blocky body
          ctx.fillStyle = '#f9a8d4';
          ctx.fillRect(-14, -8, 28, 17);
          // Two little square eyes
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(7, -4, 3, 3);
          ctx.fillRect(11, -4, 3, 3);
      } else if (a.kind === 'rabbit') {
          // Cubic fluff ball body + head + two tall ears on top
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-12, -2, 18, 13);
          ctx.fillRect(0, -9, 13, 12);
          // Two tall ears on top of head
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(2, -20, 4, 11);
          ctx.fillRect(8, -20, 4, 11);
          ctx.fillStyle = '#fda4af';
          ctx.fillRect(3, -18, 2, 8);
          ctx.fillRect(9, -18, 2, 8);
          // Eye
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(8, -6, 3, 3);
      } else if (a.kind === 'sheep') {
          // Two legs with upper white wool cuff and bare un-wooled lower feet across from the white wool
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-9, 7, 6, 4);
          ctx.fillRect(3, 7, 6, 4);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-8, 11, 4, 5 + legSwing);
          ctx.fillRect(4, 11, 4, 5 - legSwing);
          // Wool tail + wool body
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-19, -2, 6, 7);
          ctx.fillRect(-14, -9, 26, 18);
          // Head surrounded by white wool
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(6, -10, 14, 14);
          ctx.fillStyle = '#334155';
          ctx.fillRect(9, -7, 8, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(13, -5, 2, 2);
      }
      ctx.restore();
  },

  /**
   * 1980s CUBIC PIXEL ENEMIES (Pink Blobs with Arms & Legs, Slower Scaled Green Snakes — ZERO curves!)
   */
  drawUpgradedEnemy(ctx, e) {
      ctx.save();
      ctx.translate(Math.floor(e.x), Math.floor(e.y));
      const swing = Math.floor(Math.sin(e.animPhase) * 4);

      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(-12, 13, 24, 5);

      // Goblin → blob, Skeleton → snake when sheets are loaded.
      if (assets.drawEnemySprite(ctx, e)) {
          if (e.hp < e.maxHp) {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(-14, -20, 28, 4);
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(-14, -20, Math.floor(28 * (e.hp / e.maxHp)), 4);
          }
          ctx.restore();
          return;
      }

      if (e.type === 'blob') {
          // Little Pink Blocky Legs & Arms
          ctx.fillStyle = '#be185d';
          ctx.fillRect(-8, 9, 4, 7 + Math.floor(swing * 0.5));
          ctx.fillRect(4, 9, 4, 7 - Math.floor(swing * 0.5));
          ctx.fillRect(-19, -2 + swing, 7, 4);
          ctx.fillRect(12, -2 - swing, 7, 4);

          // Cubic Pink Blob Body
          ctx.fillStyle = e.hurtTimer > 0 ? '#ffffff' : '#f472b6';
          ctx.fillRect(-12, -10, 24, 20);
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(-9, -7, 6, 4);
          // Square Eyes
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-6, -3, 3, 4);
          ctx.fillRect(3, -3, 3, 4);
      } else {
          // Segmented Cubic Green Snake
          ctx.fillStyle = e.hurtTimer > 0 ? '#ffffff' : '#15803d';
          ctx.fillRect(-16, -3 + Math.floor(swing * 0.5), 10, 7);
          ctx.fillRect(-6, -3 - Math.floor(swing * 0.5), 10, 7);
          ctx.fillRect(4, -4, 12, 8);
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(-13, -1 + Math.floor(swing * 0.5), 5, 3);
          ctx.fillRect(-3, -1 - Math.floor(swing * 0.5), 5, 3);
          // Forked red tongue & yellow square eye
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(16, -1, 5, 2);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(11, -3, 3, 3);
      }

      if (e.hp < e.maxHp) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-14, -20, 28, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-14, -20, Math.floor(28 * (e.hp / e.maxHp)), 4);
      }
      ctx.restore();
  },

  drawSmoothNPC(ctx, npc) {
      ctx.save();
      ctx.translate(Math.floor(npc.x), Math.floor(npc.y));
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6, 7, 5, 8);
      ctx.fillRect(1, 7, 5, 8);
      ctx.fillStyle = npc.coatColor;
      ctx.fillRect(-10, -6, 20, 14);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-7, -19, 14, 13);
      ctx.fillStyle = npc.hairColor;
      ctx.fillRect(-8, -22, 16, 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-4, -14, 2, 3);
      ctx.fillRect(2, -14, 2, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-38, -36, 76, 14);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px VT323';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, 0, -25);
      ctx.textAlign = 'left';
      ctx.restore();
  },

  drawBoss(ctx) {
      const b = this.boss;
      ctx.save();
      ctx.translate(Math.floor(b.x), Math.floor(b.y));
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-32, 14, 64, 16);
      ctx.translate(0, -Math.floor(b.dropZ));

      if (b.state === 'laser_windup') {
          ctx.strokeStyle = 'rgba(239,68,68,0.7)'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(b.laserTargetX - b.x, b.laserTargetY - b.y); ctx.stroke();
      } else if (b.state === 'laser_fire') {
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 20;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((b.laserTargetX - b.x) * 1.3, (b.laserTargetY - b.y) * 1.3); ctx.stroke();
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 8; ctx.stroke();
      }

      if (b.state === 'claymore_windup' || b.state === 'claymore_swing') {
          ctx.save();
          ctx.rotate(b.claymoreAngle);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(24, -8, 76, 16);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(18, -18, 10, 36);
          ctx.restore();
      }

      ctx.fillStyle = b.invuln > 0 ? '#ffffff' : '#581c87';
      ctx.fillRect(-34, -34, 68, 62);
      ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3;
      ctx.strokeRect(-34, -34, 68, 62);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-18, -16, 12, 12);
      ctx.fillRect(6, -16, 12, 12);
      ctx.restore();
  },

  drawTemple2Boss(ctx) {
      const b = this.temple2Boss;
      ctx.save();
      ctx.translate(Math.floor(b.x), Math.floor(b.y));
      ctx.fillStyle = b.invuln > 0 ? '#ffffff' : '#0284c7';
      ctx.fillRect(-28, -28, 56, 56);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4;
      ctx.strokeRect(-28, -28, 56, 56);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-8, -10, 16, 16);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-20, -40, 40, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-20, -40, Math.floor(40 * (b.hp / b.maxHp)), 5);
      ctx.restore();
  },

  drawFireBoss(ctx) {
      const fb = this.fireBoss;
      ctx.save();
      ctx.translate(Math.floor(fb.x), Math.floor(fb.y));

      // Surrounding Flame Perimeter when swinging his Fire Claymore
      if (fb.state === 'claymore_windup' || fb.state === 'claymore_flame_spin') {
          const r = fb.flameRadius;
          ctx.strokeStyle = fb.state === 'claymore_flame_spin' ? '#f97316' : 'rgba(249, 115, 22, 0.45)';
          ctx.lineWidth = fb.state === 'claymore_flame_spin' ? 14 : 4;
          ctx.strokeRect(-r, -r, r * 2, r * 2);

          if (fb.state === 'claymore_flame_spin') {
              // Blocky fire blocks all around the perimeter
              ctx.fillStyle = '#facc15';
              for (let s = -r; s <= r; s += 24) {
                  ctx.fillRect(s - 6, -r - 6, 12, 12);
                  ctx.fillRect(s - 6, r - 6, 12, 12);
                  ctx.fillRect(-r - 6, s - 6, 12, 12);
                  ctx.fillRect(r - 6, s - 6, 12, 12);
              }
          }

          ctx.save();
          ctx.rotate(fb.claymoreAngle);
          ctx.fillStyle = '#f97316';
          ctx.fillRect(28, -10, 74, 20);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(32, -5, 64, 10);
          ctx.restore();
      }

      // Huge Blocky Fireball Boss Body
      ctx.fillStyle = fb.invuln > 0 ? '#38bdf8' : '#dc2626';
      ctx.fillRect(-36, -36, 72, 72);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-28, -28, 56, 56);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-18, -18, 36, 36);
      // Angry Square Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-16, -10, 10, 10);
      ctx.fillRect(6, -10, 10, 10);
      ctx.restore();
  },

  drawWaterBoss(ctx) {
      const wb = this.waterBoss;
      ctx.save();
      ctx.translate(Math.floor(wb.x), Math.floor(wb.y));

      // 1. Wave Telegraph Warning Lines showing the areas he will shoot waves
      if (wb.state === 'wave_telegraph') {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          for (const lx of wb.waveLanes) {
              const relX = lx - wb.x;
              ctx.beginPath();
              ctx.moveTo(relX, 20);
              ctx.lineTo(relX, 440);
              ctx.stroke();
              ctx.strokeRect(relX - 22, 24, 44, 410);
          }
      }

      // 2. Laser Telegraph & Laser Beam Lines
      if (wb.state === 'laser_telegraph') {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(wb.laserTargetX - wb.x, wb.laserTargetY - wb.y);
          ctx.stroke();
      } else if (wb.state === 'laser_fire') {
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 24;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo((wb.laserTargetX - wb.x) * 1.35, (wb.laserTargetY - wb.y) * 1.35);
          ctx.stroke();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 10;
          ctx.stroke();
      }

      // Stationary Abyssal Water Boss Body
      ctx.fillStyle = wb.invuln > 0 ? '#f97316' : '#0369a1';
      ctx.fillRect(-40, -34, 80, 68);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-30, -24, 60, 48);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(-40, -34, 80, 68);
      // Glowing Eyes
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-18, -10, 12, 12);
      ctx.fillRect(6, -10, 12, 12);
      ctx.restore();
  }
};
