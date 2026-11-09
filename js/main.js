/**
 * Sword Fighter 2 — entry point: init, input, update/draw loop.
 * Phase 1: ES modules + procedural Canvas fallback (no sprite downloads yet).
 */

import { sfx, assets, CURATED_ASSETS } from './assets.js';
import { TILE, MAP_W, MAP_H, WORLD_LIMIT, worldMethods } from './world.js';
import { playerMethods } from './player.js';
import { entityMethods } from './entities.js';
import { uiMethods, I18N } from './ui.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.miniCanvas = document.getElementById('minimapCanvas');
        this.miniCtx = this.miniCanvas.getContext('2d');
        this.miniCtx.imageSmoothingEnabled = false;

        this.lang = 'en';
        this.storageKey = 'sword_fighter_2_saves_v2';
        this.saves = this.loadSavesFromStorage();
        this.activeSlotIndex = 0;
        this.pendingNewSlotIndex = 0;
        this.pendingGender = 'male';
        this.pendingP2Gender = 'female';
        this.isMultiplayer = false;

        this.keys = {};
        this.touchDirs = { up: false, down: false, left: false, right: false };
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;

        // Art Shop state
        this.artMode = 'full';
        this.workbenchTarget = 'all';
        this.showShadesPalette = false;
        this.tempColors = { hat: '#15803d', tunic: '#16a34a', legs: '#475569' };
        this.pendingCaughtFish = null;
        this.selectedQuestKey = 'farming';
        this.visitedChunks = new Set();

        this.initDefaultState();
        this.initWorld();
        this.bindEvents();
        this.resize();
        this.renderHeroPreviewCanvas();
        sfx.startBGM();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    initDefaultState() {
        // Spawn at center (92, 66) so West Ocean & Villages (x: 2..52) and East Volcano & Temples (x: 115..210) fit cleanly
        this.player = this.createHeroState('P1', 92 * TILE, 66 * TILE, 'male', '#15803d', '#16a34a', '#334155');
        this.player2 = this.createHeroState('P2', 90 * TILE, 66 * TILE, 'female', '#0284c7', '#38bdf8', '#1e293b');

        // Randomized Temple 1, Temple 2, Fire Temple (Harder 4-digit math/cipher) & Water Temple (Harder 4-digit depth cipher) Codes
        const fA = Math.floor(Math.random() * 4) + 3; // 3..6
        const fB = Math.floor(Math.random() * 3) + 2; // 2..4
        const fC = Math.floor(Math.random() * 5) + 4; // 4..8
        const fD = Math.floor(Math.random() * 4) + 1; // 1..4
        // Fire Temple 4-digit code: [fA * fB (2 digits or mod)] -> let's ensure exact single digits:
        const fd1 = (fA + fB) % 10;
        const fd2 = (fC - fD);
        const fd3 = (fB * 2) % 10;
        const fd4 = (fd1 + fd2) % 10;

        const w1 = Math.floor(Math.random() * 4) + 2; // 2..5
        const w2 = Math.floor(Math.random() * 4) + 3; // 3..6
        const wd1 = (w1 * 2) % 10;
        const wd2 = (w2 + 3) % 10;
        const wd3 = Math.abs(w2 - w1);
        const wd4 = (wd1 + wd3) % 10;

        this.codes = {
            chest1: [
                Math.floor(Math.random() * 8) + 1,
                Math.floor(Math.random() * 8) + 1,
                Math.floor(Math.random() * 8) + 1
            ],
            safeBridgeCol: 91 + Math.floor(Math.random() * 3), // Cols 91, 92, 93
            westA: Math.floor(Math.random() * 4) + 1,
            westB: Math.floor(Math.random() * 4) + 1,
            eastA: Math.floor(Math.random() * 4) + 1,
            eastB: Math.floor(Math.random() * 4) + 1,
            centerNum: Math.floor(Math.random() * 8) + 1,
            temple2Code: "248",
            fireClues: { fA, fB, fC, fD },
            fireTempleCode: `${fd1}${fd2}${fd3}${fd4}`,
            waterClues: { w1, w2 },
            waterTempleCode: `${wd1}${wd2}${wd3}${wd4}`
        };
        this.codes.westSum = this.codes.westA + this.codes.westB;
        this.codes.eastSum = this.codes.eastA + this.codes.eastB;
        this.codes.bossCode = `${this.codes.westSum}${this.codes.eastSum}${this.codes.centerNum}`;

        this.dungeonProgress = {
            firstBlobDefeated: false,
            chest1Opened: false,
            westAFound: false,
            westBFound: false,
            eastAFound: false,
            eastBFound: false,
            centerFound: false,
            bossDoorOpened: false,
            bossTriggered: false,
            bossDefeated: false,
            temple2DoorOpened: false,
            temple2BossDefeated: false,
            iceBowChestOpened: false,
            fireDoorOpened: false,
            fireBossDefeated: false,
            divingGearClaimed: false,
            waterDoorOpened: false,
            waterBossDefeated: false
        };

        this.quests = {
            farming: {
                status: 'active', current: 0, target: 6,
                title: 'Harvest 6 Golden Wheat',
                giver: 'Farmer Marta (Village Farm)',
                desc: 'Walk to the wheat fields south of Oakvale Farm and harvest 6 golden wheat bundles using [Q].',
                rewardText: '5 Pork, 1 Golden Apple & 20 Coins'
            },
            repair: {
                status: 'active', current: 0, target: 4,
                title: 'Repair 4 Village Fences',
                giver: 'Builder Bram (Oakvale Homes)',
                desc: 'Pink blobs damaged 4 wooden fence posts around Oakvale Village. Approach broken posts and press [Q] to repair them.',
                rewardText: '5 Pork, 1 Golden Apple & 20 Coins'
            },
            monster: {
                status: 'active', current: 0, target: 5,
                title: 'Slay 5 Blobs or Snakes',
                giver: 'Captain Rowan (Town Guard)',
                desc: 'Defeat 5 Pink Blobs or Green Snakes roaming the 500,000x500,000 block world.',
                rewardText: '6 Pork, 2 Golden Apples & 30 Coins'
            },
            fishing: {
                status: 'active', current: 0, target: 3,
                title: 'Catch 3 Fresh Fish',
                giver: 'Fisher Marina (Market Stall)',
                desc: 'Stand near any Lake or Ocean Dock, press [C] to cast your rod, wait for a bite, and keep 3 fish.',
                rewardText: '25 Coins & 1 Golden Apple'
            },
            church: {
                status: 'active', current: 0, target: 4,
                title: 'Gather 4 Wild Flowers',
                giver: 'Priestess Elena (Oakvale Church)',
                desc: 'Pick 4 wild flowers from flower patches across the map so the Church and Art Studio can craft dyes.',
                rewardText: '20 Coins & +1 Temporary Yellow Heart'
            },
            temple2: {
                status: 'active', current: 0, target: 1,
                title: 'Conquer the Second Temple',
                giver: 'Blacksmith Korin (Oakvale Forge)',
                desc: 'Journey East to the Second Temple, decipher the Crystal Pillar, unlock the gate, and defeat the Sanctum Guardian!',
                rewardText: '50 Coins & +1 Max Heart'
            },
            volcano: {
                status: 'active', current: 0, target: 1,
                title: 'Conquer the Volcano Fire Temple',
                giver: 'Fire Sage Ignis (East Volcano)',
                desc: 'Climb Mount Ignis Volcano in the far East, solve the 4 Obsidian Trial Pillars, claim the Triple-Shot Ice Bow, and defeat the 25-Heart Giant Fireball Boss!',
                rewardText: '+1 Red Heart, 5 Golden Apples & Fire Claymore (x2 in 2P!)'
            },
            ocean: {
                status: 'active', current: 0, target: 1,
                title: 'Submarine & Abyssal Water Temple',
                giver: 'Captain Nautilus (West Ocean Dock)',
                desc: 'Visit Port Coral on the West Ocean Dock, board the Submarine for Black & White Diving Gear, swim to the Abyssal Water Temple, and defeat the 25-Heart Water Boss with your Fire Claymore!',
                rewardText: 'Wave Launcher [V] & 100 Coins (x2 in 2P!)'
            }
        };
    }

    /**
     * INPUT & COMBAT (MULTIPLAYER P1/P2 CONTROLS, SWORD/BOW/SHIELD ANIMATIONS)
     */
    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        window.addEventListener('keydown', (e) => {
            const code = e.code;
            this.keys[code] = true;

            if (this.activePuzzle) {
                if (e.key >= '0' && e.key <= '9') this.pressKeypad(e.key);
                else if (code === 'Backspace') this.pressKeypad('CLR');
                else if (code === 'Enter') this.pressKeypad('OK');
                else if (code === 'Escape') this.closePuzzleModal();
                return;
            }

            // PLAYER 1 CONTROLS (Right Screen in Multiplayer, or Singleplayer)
            // Move: Arrow Keys | Sword: Return/Enter | Bow: P | Golden Apple: 0 | Pork: 9 or L
            if (code === 'Enter' || code === 'NumpadEnter' || (!this.isMultiplayer && code === 'Space')) {
                e.preventDefault();
                this.swingSword(this.player);
            } else if (code === 'KeyP') {
                e.preventDefault();
                this.shootArrow(this.player);
            } else if (code === 'Digit0' || code === 'Numpad0') {
                e.preventDefault();
                this.eatGoldenApple(this.player);
            } else if (code === 'Digit9' || code === 'KeyL') {
                e.preventDefault();
                this.eatPork(this.player);
            }

            // PLAYER 2 CONTROLS (Left Screen in Multiplayer)
            // Move: W,A,S,D | Sword: CapsLock | Bow: E | Pork: 2 | Golden Apple: 3
            if (this.isMultiplayer) {
                if (code === 'CapsLock') {
                    e.preventDefault();
                    this.swingSword(this.player2);
                } else if (code === 'KeyE') {
                    e.preventDefault();
                    this.shootArrow(this.player2);
                } else if (code === 'Digit2' || code === 'Numpad2') {
                    e.preventDefault();
                    this.eatPork(this.player2);
                } else if (code === 'Digit3' || code === 'Numpad3') {
                    e.preventDefault();
                    this.eatGoldenApple(this.player2);
                } else if (code === 'KeyF') {
                    e.preventDefault();
                    this.interact(this.player2);
                }
            } else {
                // Singleplayer extra convenience shortcuts
                if (code === 'KeyE') { e.preventDefault(); this.eatPork(this.player); }
                else if (code === 'KeyF') { e.preventDefault(); this.shootArrow(this.player); }
                else if (code === 'KeyG') { e.preventDefault(); this.eatGoldenApple(this.player); }
            }

            // SHARED / UTILITY SHORTCUTS
            if (code === 'Digit1') { e.preventDefault(); this.equipRegularSword(); }
            else if (code === 'Digit2' && !this.isMultiplayer) { e.preventDefault(); this.toggleEquipFireClaymore(this.player); }
            else if (code === 'KeyB') { e.preventDefault(); this.toggleEquipFireClaymore(this.player); }
            else if (code === 'KeyV') { e.preventDefault(); this.fireWaveLauncher(this.player); }
            else if (code === 'KeyC') { e.preventDefault(); this.castFishingRod(this.player); }
            else if (code === 'KeyI') { e.preventDefault(); this.toggleInventoryModal(); }
            else if (code === 'KeyJ') { e.preventDefault(); this.toggleQuestModal(); }
            else if (code === 'KeyM') { e.preventDefault(); this.toggleWorldMapModal(); }
            else if (code === 'KeyQ' || code === 'Slash' || code === 'KeyO') {
                e.preventDefault();
                this.interact(this.player);
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code;
            this.keys[code] = false;
            // On macOS/browsers where CapsLock toggles keyup on second press, also trigger P2 sword swing on keyup!
            if (this.isMultiplayer && code === 'CapsLock' && !this.activePuzzle) {
                this.swingSword(this.player2);
            }
        });
    }

    setTouchDir(dir, state) { this.touchDirs[dir] = state; }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    update(dt) {
        if (!document.getElementById('title-screen').classList.contains('hidden')) return;
        if (this.activePuzzle) return;

        const shiftHeld = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);

        // Player 1 Movement
        let p1dx = 0, p1dy = 0;
        if (this.keys['ArrowUp'] || (!this.isMultiplayer && this.keys['KeyW']) || this.touchDirs.up) p1dy -= 1;
        if (this.keys['ArrowDown'] || (!this.isMultiplayer && this.keys['KeyS']) || this.touchDirs.down) p1dy += 1;
        if (this.keys['ArrowLeft'] || (!this.isMultiplayer && this.keys['KeyA']) || this.touchDirs.left) p1dx -= 1;
        if (this.keys['ArrowRight'] || (!this.isMultiplayer && this.keys['KeyD']) || this.touchDirs.right) p1dx += 1;
        this.updateHero(this.player, p1dx, p1dy, shiftHeld, dt);

        // Player 2 Movement in Multiplayer: W, A, S, D
        if (this.isMultiplayer) {
            let p2dx = 0, p2dy = 0;
            if (this.keys['KeyW']) p2dy -= 1;
            if (this.keys['KeyS']) p2dy += 1;
            if (this.keys['KeyA']) p2dx -= 1;
            if (this.keys['KeyD']) p2dx += 1;
            this.updateHero(this.player2, p2dx, p2dy, shiftHeld, dt);
        }

        const activeHeroes = this.isMultiplayer ? [this.player, this.player2] : [this.player];

        // Farm crop growth stages (wheat / carrot / pumpkin / sunflower)
        if (typeof this.updateCrops === 'function') this.updateCrops(dt);

        // Dynamic BGM Theme switching
        const tx1 = Math.floor(this.player.x / TILE);
        const ty1 = Math.floor(this.player.y / TILE);
        const inFireBossRoom = tx1 >= 170 && tx1 <= 202 && ty1 >= 6 && ty1 <= 24 && !this.dungeonProgress.fireBossDefeated;
        const inWaterBossRoom = tx1 >= 4 && tx1 <= 22 && ty1 >= 6 && ty1 <= 22 && !this.dungeonProgress.waterBossDefeated;
        const inBossFight = (this.boss.active && !this.dungeonProgress.bossDefeated) || inFireBossRoom || inWaterBossRoom;

        if (inFireBossRoom) {
            document.getElementById('boss-hud').classList.remove('hidden');
            this.updateBossHUD('🔥 GIANT FIREBALL BOSS (25 HEARTS)', this.fireBoss.hp, this.fireBoss.maxHp);
        } else if (inWaterBossRoom) {
            document.getElementById('boss-hud').classList.remove('hidden');
            this.updateBossHUD('🌊 ABYSSAL WATER BOSS (25 HEARTS)', this.waterBoss.hp, this.waterBoss.maxHp);
        } else if (!this.boss.active) {
            document.getElementById('boss-hud').classList.add('hidden');
        }

        if (inBossFight) sfx.setTheme('boss');
        else if ((tx1 >= 52 && tx1 <= 81 && ty1 >= 47 && ty1 <= 75) || (tx1 >= 26 && tx1 <= 48 && ty1 >= 45 && ty1 <= 72)) sfx.setTheme('village');
        else sfx.setTheme('overworld');

        // Fire Temple Small Fireball Turrets (deal 0.5 heart damage just like snakes & blobs!)
        for (const ft of this.fireTurrets) {
            ft.timer -= dt;
            if (ft.timer <= 0) {
                ft.timer = 1.9;
                this.projectiles.push({
                    x: ft.x, y: ft.y,
                    vx: ft.dirX * 230, vy: ft.dirY * 230,
                    angle: 0, dmg: 0.5, fromPlayer: false,
                    projType: 'small_fireball', life: 3.4
                });
            }
        }

        // Loot Drops
        for (let i = this.lootDrops.length - 1; i >= 0; i--) {
            const drop = this.lootDrops[i];
            for (const h of activeHeroes) {
                if (Math.hypot(drop.x - h.x, drop.y - h.y) < 30) {
                    this.player.pork++;
                    sfx.heal();
                    this.addFloatingText(drop.x, drop.y, "+1 🥩 Pork", "#f472b6");
                    this.lootDrops.splice(i, 1);
                    this.updateHUD();
                    break;
                }
            }
        }

        // Projectiles (Player Arrows, Ice Arrows, Player Waves, Enemy Small Fireballs, Enemy Water Waves)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }
            if (p.fromPlayer) {
                const hitRadius = p.projType === 'player_wave' ? 42 : 26;
                const kind = p.projType === 'ice_arrow' ? 'ice_arrow' : 'arrow';
                if (this.damageTargetsInRadius(p.x, p.y, hitRadius, p.dmg, true, this.player, kind)) {
                    if (p.projType !== 'player_wave') {
                        this.projectiles.splice(i, 1);
                    }
                }
            } else {
                // Enemy projectiles (Small Fireballs = 0.5 heart; Water Boss Waves = 1.0 full heart!)
                for (const h of activeHeroes) {
                    const hitDist = p.projType === 'boss_wave' ? 32 : 20;
                    if (Math.hypot(p.x - h.x, p.y - h.y) < hitDist) {
                        this.damagePlayer(p.dmg, p.projType === 'boss_wave' ? "Water Boss Wave" : "Fireball", h);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // Enemies
        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
            const e = this.enemies[ei];
            e.animPhase += dt * 8;
            if (e.hurtTimer > 0) e.hurtTimer -= dt;
            if (e.attackCooldown > 0) e.attackCooldown -= dt;
            if (e.attackAnimTimer > 0) e.attackAnimTimer -= dt;

            // Play death strip, then remove (loot/coins already awarded on fatal hit).
            if (e.dying) {
                e._spriteMoving = false;
                e._spriteChasing = false;
                e.deathTimer -= dt;
                if (e.deathTimer <= 0) this.enemies.splice(ei, 1);
                continue;
            }

            let targetHero = null;
            let bestDist = 170;
            for (const h of activeHeroes) {
                if (h.stealthHidden) continue;
                const d = Math.hypot(h.x - e.x, h.y - e.y);
                if (d < bestDist) {
                    bestDist = d;
                    targetHero = h;
                }
            }

            if (targetHero) {
                const ang = Math.atan2(targetHero.y - e.y, targetHero.x - e.x);
                e.dirAngle = ang;
                e._spriteMoving = true;
                e._spriteChasing = true;
                const mx = Math.cos(ang) * e.speed * dt;
                const my = Math.sin(ang) * e.speed * dt;
                if (this.canWalk(e.x + mx, e.y)) e.x += mx;
                if (this.canWalk(e.x, e.y + my)) e.y += my;
                if (bestDist < 28 && e.attackCooldown <= 0) {
                    e.attackCooldown = 1.1;
                    e.attackAnimDuration = 0.4;
                    e.attackAnimTimer = e.attackAnimDuration;
                    this.damagePlayer(0.5, e.type === 'blob' ? "Pink Blob" : "Green Snake", targetHero);
                }
            } else {
                e._spriteMoving = true;
                e._spriteChasing = false;
                e.wanderTimer -= dt;
                if (e.wanderTimer <= 0) {
                    e.wanderTimer = 1.5 + Math.random() * 1.5;
                    e.dirAngle = Math.atan2(e.homeY - e.y, e.homeX - e.x) + (Math.random() - 0.5) * 2;
                }
                const wx = Math.cos(e.dirAngle) * (e.speed * 0.4) * dt;
                const wy = Math.sin(e.dirAngle) * (e.speed * 0.4) * dt;
                if (this.canWalk(e.x + wx, e.y)) e.x += wx;
                if (this.canWalk(e.x, e.y + wy)) e.y += wy;
            }
        }

        // Animals
        for (const a of this.animals) {
            if (a.hurtTimer > 0) a.hurtTimer -= dt;
            if (a.fleeTimer > 0) {
                a.fleeTimer -= dt;
                const awayAngle = Math.atan2(a.y - a.fleeFromY, a.x - a.fleeFromX);
                const fleeSpeed = a.baseSpeed * 3.1;
                const fx = Math.cos(awayAngle) * fleeSpeed * dt;
                const fy = Math.sin(awayAngle) * fleeSpeed * dt;
                if (this.canWalk(a.x + fx, a.y)) a.x += fx;
                if (this.canWalk(a.x, a.y + fy)) a.y += fy;
            } else {
                a.wanderTimer -= dt;
                if (a.wanderTimer <= 0) {
                    a.wanderTimer = 1.8 + Math.random() * 2.2;
                    a.dirAngle = Math.random() * Math.PI * 2;
                }
                const wx = Math.cos(a.dirAngle) * a.baseSpeed * dt;
                const wy = Math.sin(a.dirAngle) * a.baseSpeed * dt;
                if (this.canWalk(a.x + wx, a.y)) a.x += wx;
                if (this.canWalk(a.x, a.y + wy)) a.y += wy;
            }
        }

        // Boss Updates
        if (this.boss.active) this.updateBoss(dt, activeHeroes);
        if (this.temple2Boss.active && !this.dungeonProgress.temple2BossDefeated) {
            if (this.temple2Boss.invuln > 0) this.temple2Boss.invuln -= dt;
            for (const h of activeHeroes) {
                const dist2 = Math.hypot(h.x - this.temple2Boss.x, h.y - this.temple2Boss.y);
                if (dist2 < 260) {
                    const ang = Math.atan2(h.y - this.temple2Boss.y, h.x - this.temple2Boss.x);
                    this.temple2Boss.x += Math.cos(ang) * 48 * dt;
                    this.temple2Boss.y += Math.sin(ang) * 48 * dt;
                    if (dist2 < 42) this.damagePlayer(0.5, "Sanctum Guardian", h);
                    break;
                }
            }
        }
        if (this.fireBoss.active && !this.dungeonProgress.fireBossDefeated) {
            this.updateFireBoss(dt, activeHeroes);
        }
        if (this.waterBoss.active && !this.dungeonProgress.waterBossDefeated) {
            this.updateWaterBoss(dt, activeHeroes);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 28 * dt;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        const near = this.getNearestInteractable(this.player) || (this.isMultiplayer ? this.getNearestInteractable(this.player2) : null);
        const promptEl = document.getElementById('interact-prompt');
        if (near) {
            promptEl.classList.remove('hidden');
            document.getElementById('interact-text').textContent = near.label;
        } else {
            promptEl.classList.add('hidden');
        }

        document.getElementById('hud-coords').textContent = `(${tx1}, ${ty1})`;
        document.getElementById('hud-zone').textContent = this.getZoneName(tx1, ty1);
    }

    loop(now) {
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;
        this.update(dt);
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }
}

Object.assign(Game.prototype, worldMethods, playerMethods, entityMethods, uiMethods);

let game;

function setBootProgress(frac, label) {
    const bar = document.getElementById('boot-progress-bar');
    const text = document.getElementById('boot-progress-text');
    const overlay = document.getElementById('boot-overlay');
    if (bar) bar.style.width = `${Math.floor(frac * 100)}%`;
    if (text) text.textContent = label || `Loading art… ${Math.floor(frac * 100)}%`;
    if (overlay && frac >= 1) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.classList.add('hidden'), 400);
    }
}

async function boot() {
    setBootProgress(0, 'Loading Sunnyside art…');
    const result = await assets.loadAll(CURATED_ASSETS, (frac, done, total, key) => {
        setBootProgress(frac, `Loading ${key || 'assets'} (${done}/${total})`);
    });
    setBootProgress(0.92, 'Loading CC0 sound samples…');
    await sfx.preloadSamples();
    setBootProgress(1, result.failed
        ? `Ready — ${result.ok} sprites, ${sfx.buffers.size} sounds (${result.failed} art missing)`
        : `Ready — ${result.ok} sprites, ${sfx.buffers.size} sounds`);
    game = new Game();
    window.game = game; // inline HTML onclick handlers (title menu, etc.)
    if (typeof game.refreshSpriteUI === 'function') game.refreshSpriteUI();
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { boot(); });
} else {
    boot();
}

export { game, Game, sfx, I18N, TILE };
