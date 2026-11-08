/**
 * Asset helpers + audio.
 *
 * Sunnyside World PNGs live under public/assets/sunnyside/.
 * AssetLoader loads a curated first-slice map; missing files fall back to
 * procedural Canvas fillRect drawing in player / entities / world / UI.
 *
 * How to add more mappings
 * ------------------------
 * 1. Add an entry to CURATED_ASSETS below: { key, url, frames? }.
 *    - `frames` = horizontal strip frame count (from the filename stripN).
 *    - For the 16px tileset sheet, use key `tileset_16` (already loaded).
 * 2. Add a TILE_SPRITE or ENTITY/HERO key alias in the maps near the bottom
 *    (TILE_ATLAS, HERO_LAYERS, ENEMY_SPRITES, UI_ICONS).
 * 3. In the draw path, call assets.drawStrip / assets.drawTile / assets.drawImage
 *    first; if it returns false, keep the existing fillRect fallback.
 * 4. Re-test with: python3 -m http.server 8000  →  http://localhost:8000
 *
 * Served from the repo root (no Vite yet), so URLs start with `public/assets/...`.
 */

class SoundSystem {
            constructor() {
                this.ctx = null;
                this.bgmEnabled = true;
                this.sfxEnabled = true;
                this.theme = 'overworld';
                this.step = 0;
                this.bgmInterval = null;
            }
            init() {
                if (!this.ctx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) this.ctx = new AudioCtx();
                }
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            }
            setTheme(newTheme) {
                if (this.theme !== newTheme) {
                    this.theme = newTheme;
                    this.step = 0;
                }
            }
            playTone(freq, duration = 0.12, type = 'square', vol = 0.08) {
                if (!this.sfxEnabled) return;
                this.init();
                if (!this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + duration);
                } catch (e) {}
            }
            slash() { this.playTone(210, 0.09, 'sawtooth', 0.09); }
            arrow() { this.playTone(540, 0.08, 'triangle', 0.08); }
            hit() { this.playTone(130, 0.12, 'square', 0.11); }
            hurt() { this.playTone(95, 0.2, 'sawtooth', 0.12); }
            heal() { this.playTone(523.25, 0.12, 'triangle', 0.09); setTimeout(() => this.playTone(659.25, 0.15, 'triangle', 0.09), 90); }
            unlock() { this.playTone(440, 0.1, 'square', 0.09); setTimeout(() => this.playTone(554.37, 0.1, 'square', 0.09), 90); setTimeout(() => this.playTone(659.25, 0.18, 'square', 0.1), 180); }
            coin() { this.playTone(784, 0.08, 'square', 0.08); setTimeout(() => this.playTone(1046.5, 0.14, 'square', 0.08), 70); }
            splash() { this.playTone(180, 0.16, 'triangle', 0.09); }
            laser() { this.playTone(150, 0.28, 'sawtooth', 0.12); }
            bossDrop() { this.playTone(75, 0.35, 'sawtooth', 0.14); }

            startBGM() {
                if (this.bgmInterval) clearInterval(this.bgmInterval);
                const overworldNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23];
                const villageNotes = [329.63, 392.00, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63];
                const bossNotes = [110.00, 116.54, 110.00, 98.00, 110.00, 130.81, 123.47, 98.00];
                this.bgmInterval = setInterval(() => {
                    if (!this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
                    const seq = this.theme === 'boss' ? bossNotes : (this.theme === 'village' ? villageNotes : overworldNotes);
                    const freq = seq[this.step % seq.length];
                    this.step++;
                    try {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = this.theme === 'boss' ? 'sawtooth' : 'triangle';
                        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                        gain.gain.setValueAtTime(this.theme === 'boss' ? 0.045 : 0.03, this.ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.24);
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        osc.start();
                        osc.stop(this.ctx.currentTime + 0.25);
                    } catch (e) {}
                }, 280);
            }
        }

export const sfx = new SoundSystem();

/** Root URL when serving the repo with a static server (no Vite yet). */
export const ASSET_ROOT = 'public/assets/sunnyside';

/**
 * First-slice curated key → file map.
 * Add rows here to pull in more Sunnyside sheets without touching draw code first.
 */
export const CURATED_ASSETS = [
    // Hero (Human layered strips)
    { key: 'hero_idle_base', url: `${ASSET_ROOT}/Characters/Human/IDLE/base_idle_strip9.png`, frames: 9 },
    { key: 'hero_idle_hair_m', url: `${ASSET_ROOT}/Characters/Human/IDLE/spikeyhair_idle_strip9.png`, frames: 9 },
    { key: 'hero_idle_hair_f', url: `${ASSET_ROOT}/Characters/Human/IDLE/longhair_idle_strip9.png`, frames: 9 },
    { key: 'hero_walk_base', url: `${ASSET_ROOT}/Characters/Human/WALKING/base_walk_strip8.png`, frames: 8 },
    { key: 'hero_walk_hair_m', url: `${ASSET_ROOT}/Characters/Human/WALKING/spikeyhair_walk_strip8.png`, frames: 8 },
    { key: 'hero_walk_hair_f', url: `${ASSET_ROOT}/Characters/Human/WALKING/longhair_walk_strip8.png`, frames: 8 },
    { key: 'hero_attack_base', url: `${ASSET_ROOT}/Characters/Human/ATTACK/base_attack_strip10.png`, frames: 10 },
    { key: 'hero_attack_hair_m', url: `${ASSET_ROOT}/Characters/Human/ATTACK/spikeyhair_attack_strip10.png`, frames: 10 },
    { key: 'hero_attack_hair_f', url: `${ASSET_ROOT}/Characters/Human/ATTACK/longhair_attack_strip10.png`, frames: 10 },
    { key: 'hero_attack_tools', url: `${ASSET_ROOT}/Characters/Human/ATTACK/tools_attack_strip10.png`, frames: 10 },

    // Enemies
    { key: 'goblin_idle', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_idle_strip9.png`, frames: 9 },
    { key: 'goblin_walk', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_walk_strip8.png`, frames: 8 },
    { key: 'goblin_attack', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_attack_strip10.png`, frames: 10 },
    { key: 'skeleton_idle', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_idle_strip6.png`, frames: 6 },
    { key: 'skeleton_walk', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_walk_strip8.png`, frames: 8 },
    { key: 'skeleton_attack', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_attack_strip7.png`, frames: 7 },

    // World
    { key: 'tileset_16', url: `${ASSET_ROOT}/Tileset/spr_tileset_sunnysideworld_16px.png` },
    { key: 'tree_deco', url: `${ASSET_ROOT}/Elements/Plants/spr_deco_tree_01_strip4.png`, frames: 4 },

    // UI icons
    { key: 'ui_sword', url: `${ASSET_ROOT}/UI/sword.png` },
    { key: 'ui_confirm', url: `${ASSET_ROOT}/UI/confirm.png` },
    { key: 'ui_cancel', url: `${ASSET_ROOT}/UI/cancel.png` },
    { key: 'ui_axe', url: `${ASSET_ROOT}/UI/axe.png` },
    { key: 'ui_hammer', url: `${ASSET_ROOT}/UI/hammer.png` },
    { key: 'ui_redbar_full', url: `${ASSET_ROOT}/UI/redbar_06.png` },
    { key: 'ui_redbar_empty', url: `${ASSET_ROOT}/UI/redbar_00.png` },
];

/**
 * 16px tileset atlas cells (col, row) for key terrain.
 * Inspect / extend by sampling spr_tileset_sunnysideworld_16px.png (64×64 cells).
 */
export const TILE_ATLAS = {
    grassA: { col: 1, row: 1 },
    grassB: { col: 2, row: 1 },
    path: { col: 3, row: 1 },
    water: { col: 4, row: 1 },
    wall: { col: 7, row: 2 },
    wood: { col: 14, row: 2 },
    dirt: { col: 15, row: 2 },
};

/** Enemy type → Sunnyside character sheet keys. */
export const ENEMY_SPRITES = {
    blob: { idle: 'goblin_idle', walk: 'goblin_walk', attack: 'goblin_attack' },
    snake: { idle: 'skeleton_idle', walk: 'skeleton_walk', attack: 'skeleton_attack' },
};

export class AssetLoader {
    constructor() {
        this.images = new Map();
        this.meta = new Map();
        this.failed = new Set();
        this.loaded = false;
        this.progress = 0;
    }

    async loadImage(key, url, extra = {}) {
        if (this.images.has(key)) return this.images.get(key);
        if (this.failed.has(key)) return null;
        const img = new Image();
        img.decoding = 'async';
        const done = new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
        });
        img.src = url;
        const ok = await done;
        if (!ok) {
            this.failed.add(key);
            console.warn(`[assets] missing/failed: ${key} → ${url}`);
            return null;
        }
        this.images.set(key, img);
        let frames = extra.frames || 1;
        let frameW = Math.max(1, Math.floor(img.width / frames));
        // Some Sunnyside names say stripN but width divides cleanly by 96px frames.
        if (img.width % frames !== 0 && img.width % 96 === 0) {
            frameW = 96;
            frames = img.width / 96;
        }
        this.meta.set(key, {
            frames,
            frameW,
            frameH: img.height,
            url,
        });
        return img;
    }

    getImage(key) {
        return this.images.get(key) || null;
    }

    has(key) {
        return this.images.has(key);
    }

    getMeta(key) {
        return this.meta.get(key) || null;
    }

    /**
     * Load a list of { key, url, frames? }. Soft-fails per file so the game still boots.
     */
    async loadAll(entries = CURATED_ASSETS, onProgress = null) {
        const total = entries.length;
        if (total === 0) {
            this.loaded = true;
            this.progress = 1;
            if (onProgress) onProgress(1, 0, 0);
            return { ok: 0, failed: 0, total: 0 };
        }
        let completed = 0;
        let ok = 0;
        let failed = 0;
        for (const entry of entries) {
            const img = await this.loadImage(entry.key, entry.url, entry);
            if (img) ok += 1;
            else failed += 1;
            completed += 1;
            this.progress = completed / total;
            if (onProgress) onProgress(this.progress, completed, total, entry.key);
        }
        this.loaded = true;
        return { ok, failed, total };
    }

    /**
     * Draw one frame from a horizontal strip. Returns false if the image is missing.
     * Optional `crop` is { x, y, w, h } inside a single frame (trims Sunnyside padding).
     */
    drawStrip(ctx, key, frameIndex, dx, dy, dw, dh, flipX = false, crop = null) {
        const img = this.getImage(key);
        const meta = this.getMeta(key);
        if (!img || !meta) return false;
        const frames = meta.frames;
        const fi = ((frameIndex % frames) + frames) % frames;
        const frameX = fi * meta.frameW;
        let sx = frameX;
        let sy = 0;
        let sw = meta.frameW;
        let sh = meta.frameH;
        if (crop) {
            sx = frameX + crop.x;
            sy = crop.y;
            sw = crop.w;
            sh = crop.h;
        }
        ctx.save();
        if (flipX) {
            ctx.translate(dx + dw, dy);
            ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
        } else {
            ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        }
        ctx.restore();
        return true;
    }

    /**
     * Draw a 16px tileset cell scaled to dest size.
     */
    drawTile(ctx, atlasKey, dx, dy, size, variant = 0) {
        const img = this.getImage('tileset_16');
        if (!img) return false;
        let cell = TILE_ATLAS[atlasKey];
        if (!cell) return false;
        if (atlasKey === 'grassA' || atlasKey === 'grassB') {
            cell = variant % 2 === 0 ? TILE_ATLAS.grassA : TILE_ATLAS.grassB;
        }
        const ts = 16;
        ctx.drawImage(img, cell.col * ts, cell.row * ts, ts, ts, dx, dy, size, size);
        return true;
    }

    drawImage(ctx, key, dx, dy, dw, dh) {
        const img = this.getImage(key);
        if (!img) return false;
        ctx.drawImage(img, dx, dy, dw, dh);
        return true;
    }

    /**
     * Composite Human base + hair (+ optional tools) for the hero.
     * Sprites face right; flipX for left. Up/down reuse the side view (pack has no cardinal sheets).
     */
    drawHeroSprite(ctx, p, moving = false) {
        if (p.outfit === 'diver') return false;
        const attacking = p.attackTimer > 0;
        let baseKey;
        let hairKey;
        let frames;
        let frame;

        const hairSuffix = p.gender === 'female' ? 'f' : 'm';

        if (attacking) {
            // Body attack pose only — game weapons stay procedural (sword/bow/claymore).
            baseKey = 'hero_attack_base';
            hairKey = `hero_attack_hair_${hairSuffix}`;
            frames = this.getMeta(baseKey)?.frames || 10;
            const progress = 1 - (p.attackTimer / (p.attackDuration || 0.26));
            frame = Math.min(frames - 1, Math.floor(progress * frames));
        } else if (moving) {
            baseKey = 'hero_walk_base';
            hairKey = `hero_walk_hair_${hairSuffix}`;
            frames = this.getMeta(baseKey)?.frames || 8;
            frame = Math.floor(performance.now() / 90) % frames;
        } else {
            baseKey = 'hero_idle_base';
            hairKey = `hero_idle_hair_${hairSuffix}`;
            frames = this.getMeta(baseKey)?.frames || 9;
            frame = Math.floor(performance.now() / 140) % frames;
        }

        if (!this.has(baseKey)) return false;

        const flipX = p.dir === 'left';
        // Frames are 96×64 with a tiny ~11×16 character — crop padding then upscale.
        const crop = { x: 34, y: 16, w: 28, h: 28 };
        const dw = 44;
        const dh = 44;
        const dx = -dw / 2;
        const dy = -dh + 16;

        this.drawStrip(ctx, baseKey, frame, dx, dy, dw, dh, flipX, crop);
        this.drawStrip(ctx, hairKey, frame, dx, dy, dw, dh, flipX, crop);
        return true;
    }

    /**
     * Goblin / Skeleton stand-in for blob / snake. Returns false → procedural fallback.
     */
    drawEnemySprite(ctx, e) {
        const map = ENEMY_SPRITES[e.type];
        if (!map) return false;
        const moving = !!e._spriteMoving;
        const key = moving && this.has(map.walk) ? map.walk : map.idle;
        if (!this.has(key)) return false;
        const frames = this.getMeta(key)?.frames || 1;
        const frame = Math.floor(e.animPhase || 0) % frames;
        const flipX = Math.cos(e.dirAngle || 0) < 0;
        const crop = { x: 32, y: 16, w: 32, h: 28 };
        const dw = 46;
        const dh = 40;
        return this.drawStrip(ctx, key, frame, -dw / 2, -dh + 16, dw, dh, flipX, crop);
    }
}

export const assets = new AssetLoader();
