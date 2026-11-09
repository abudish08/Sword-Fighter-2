/**
 * Asset helpers + audio.
 *
 * Sunnyside World PNGs live under public/assets/sunnyside/.
 * AssetLoader loads a curated map; missing files fall back to
 * procedural Canvas fillRect drawing in player / entities / world / UI.
 *
 * How to add more mappings
 * ------------------------
 * 1. Add an entry to CURATED_ASSETS below: { key, url, frames? }.
 *    - `frames` = horizontal strip frame count (from the filename stripN).
 *    - For the 16px tileset sheet, use key `tileset_16` (already loaded).
 * 2. Add a TILE_SPRITE or ENTITY/HERO key alias in the maps near the bottom
 *    (TILE_ATLAS, HERO_LAYERS, ENEMY_SPRITES, ANIMAL_SPRITES, UI_ICONS).
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

/** Root URL when serving the repo with a static server (no Vite yet).
 * Leading slash so strips resolve from any page path (e.g. /tools/anim-demo.html).
 */
export const ASSET_ROOT = '/public/assets/sunnyside';

/**
 * Curated key → file map (expanded coverage: animals, fire VFX, more UI).
 * Add rows here to pull in more Sunnyside sheets without touching draw code first.
 */
/** Human action folders → strip name + frame count (filename stripN). */
export const HERO_ACTION_DEFS = {
    idle: { folder: 'IDLE', name: 'idle', frames: 9 },
    walk: { folder: 'WALKING', name: 'walk', frames: 8 },
    run: { folder: 'RUN', name: 'run', frames: 8 },
    attack: { folder: 'ATTACK', name: 'attack', frames: 10 },
    hurt: { folder: 'HURT', name: 'hurt', frames: 8 },
    casting: { folder: 'CASTING', name: 'casting', frames: 15 },
    waiting: { folder: 'WAITING', name: 'waiting', frames: 9 },
    reeling: { folder: 'REELING', name: 'reeling', frames: 13 },
    caught: { folder: 'CAUGHT', name: 'caught', frames: 10 },
    swimming: { folder: 'SWIMMING', name: 'swimming', frames: 12 },
    death: { folder: 'DEATH', name: 'death', frames: 13 },
};

function heroStripEntries() {
    const hairStyles = [
        { suffix: 'm', file: 'spikeyhair' },
        { suffix: 'f', file: 'longhair' },
    ];
    const entries = [];
    for (const [action, def] of Object.entries(HERO_ACTION_DEFS)) {
        const base = `${ASSET_ROOT}/Characters/Human/${def.folder}`;
        entries.push({
            key: `hero_${action}_base`,
            url: `${base}/base_${def.name}_strip${def.frames}.png`,
            frames: def.frames,
        });
        for (const h of hairStyles) {
            entries.push({
                key: `hero_${action}_hair_${h.suffix}`,
                url: `${base}/${h.file}_${def.name}_strip${def.frames}.png`,
                frames: def.frames,
            });
        }
        // Rod / tools layer for fishing poses (and available for other actions).
        entries.push({
            key: `hero_${action}_tools`,
            url: `${base}/tools_${def.name}_strip${def.frames}.png`,
            frames: def.frames,
        });
    }
    return entries;
}

export const CURATED_ASSETS = [
    // Hero (Human layered strips — full action set that maps to game states)
    ...heroStripEntries(),

    // Enemies (Goblin → blob, Skeleton → snake)
    { key: 'goblin_idle', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_idle_strip9.png`, frames: 9 },
    { key: 'goblin_walk', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_walk_strip8.png`, frames: 8 },
    { key: 'goblin_run', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_run_strip8.png`, frames: 8 },
    { key: 'goblin_attack', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_attack_strip10.png`, frames: 10 },
    { key: 'goblin_hurt', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_hurt_strip8.png`, frames: 8 },
    { key: 'goblin_death', url: `${ASSET_ROOT}/Characters/Goblin/PNG/spr_death_strip13.png`, frames: 13 },
    { key: 'skeleton_idle', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_idle_strip6.png`, frames: 6 },
    { key: 'skeleton_walk', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_walk_strip8.png`, frames: 8 },
    { key: 'skeleton_attack', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_attack_strip7.png`, frames: 7 },
    { key: 'skeleton_hurt', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_hurt_strip7.png`, frames: 7 },
    { key: 'skeleton_death', url: `${ASSET_ROOT}/Characters/Skeleton/PNG/skeleton_death_strip10.png`, frames: 10 },

    // Animals (pack has cow/pig/sheep/chicken/duck/bird — no rabbit sheet)
    { key: 'animal_cow', url: `${ASSET_ROOT}/Elements/Animals/spr_deco_cow_strip4.png`, frames: 4 },
    { key: 'animal_pig', url: `${ASSET_ROOT}/Elements/Animals/spr_deco_pig_01_strip4.png`, frames: 4 },
    { key: 'animal_sheep', url: `${ASSET_ROOT}/Elements/Animals/spr_deco_sheep_01_strip4.png`, frames: 4 },
    { key: 'animal_chicken', url: `${ASSET_ROOT}/Elements/Animals/spr_deco_chicken_01_strip4.png`, frames: 4 },
    { key: 'animal_duck', url: `${ASSET_ROOT}/Elements/Animals/spr_deco_duck_01_strip4.png`, frames: 4 },
    { key: 'animal_bird', url: `${ASSET_ROOT}/Elements/Animals/spr_deco_bird_01_strip4.png`, frames: 4 },

    // World
    { key: 'tileset_16', url: `${ASSET_ROOT}/Tileset/spr_tileset_sunnysideworld_16px.png` },
    { key: 'tree_deco', url: `${ASSET_ROOT}/Elements/Plants/spr_deco_tree_01_strip4.png`, frames: 4 },
    { key: 'fire_deco', url: `${ASSET_ROOT}/Elements/VFX/Fire/spr_deco_fire_01_strip4.png`, frames: 4 },
    { key: 'fire_deco_b', url: `${ASSET_ROOT}/Elements/VFX/Fire/spr_deco_fire_02_strip4.png`, frames: 4 },

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
 * Hand-picked from spr_tileset_sunnysideworld_16px.png (64×64 cells).
 */
export const TILE_ATLAS = {
    grassA: { col: 1, row: 1 },
    grassB: { col: 2, row: 1 },
    path: { col: 3, row: 1 },
    water: { col: 4, row: 1 },
    wall: { col: 8, row: 2 },          // solid slate block (old 7,2 was sparse)
    wood: { col: 14, row: 2 },
    dirt: { col: 12, row: 7 },
    dungeon: { col: 6, row: 1 },       // dark packed earth / stone
    lava: { col: 12, row: 11 },        // bright magma
    lavaB: { col: 12, row: 12 },
    bridge: { col: 14, row: 2 },       // wood plank over chasm
    chasm: { col: 12, row: 0 },        // pure black void cell
    temple: { col: 44, row: 1 },       // cool blue stone
    templeB: { col: 45, row: 1 },
    fireFloor: { col: 11, row: 4 },    // scorched brown rock
    volcano: { col: 11, row: 4 },
    subFloor: { col: 8, row: 2 },
};

/** Enemy type → Sunnyside character sheet keys. */
export const ENEMY_SPRITES = {
    blob: {
        idle: 'goblin_idle',
        walk: 'goblin_walk',
        run: 'goblin_run',
        attack: 'goblin_attack',
        hurt: 'goblin_hurt',
        death: 'goblin_death',
    },
    snake: {
        idle: 'skeleton_idle',
        walk: 'skeleton_walk',
        attack: 'skeleton_attack',
        hurt: 'skeleton_hurt',
        death: 'skeleton_death',
    },
};

/** Frame timing (ms per frame) for looping clips. One-shots use progress instead. */
export const ANIM_FRAME_MS = {
    idle: 140,
    walk: 90,
    run: 70,
    swimming: 85,
    waiting: 150,
    casting: 70,
    reeling: 65,
    caught: 80,
    hurt: 70,
    attack: 55,
    death: 70,
};

/** Animal kind → strip key. Rabbit has no pack sheet → procedural fallback. */
export const ANIMAL_SPRITES = {
    cow: 'animal_cow',
    pig: 'animal_pig',
    sheep: 'animal_sheep',
    chicken: 'animal_chicken',
    duck: 'animal_duck',
    bird: 'animal_bird',
    // rabbit intentionally omitted — keep fillRect bunny
};

/** Boss id → sheet + optional tint + scale. Pack has no unique boss art. */
export const BOSS_SPRITES = {
    temple: { idle: 'goblin_idle', walk: 'goblin_walk', tint: '#7e22ce', scale: 1.55 },
    temple2: { idle: 'skeleton_idle', walk: 'skeleton_walk', tint: '#0284c7', scale: 1.45 },
    fire: { idle: 'goblin_idle', walk: 'goblin_attack', tint: '#dc2626', scale: 1.7, fire: true },
    water: { idle: 'skeleton_idle', walk: 'skeleton_walk', tint: '#0369a1', scale: 1.65 },
};

function parseHexColor(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let h = hex.trim();
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function isSkinPixel(r, g, b) {
    // Peach / warm skin range used by Sunnyside Human base.
    return r > 180 && g > 110 && g < 210 && b > 70 && b < 170 && r > g && g >= b - 10;
}

function isOutlinePixel(r, g, b) {
    return r + g + b < 55;
}

export class AssetLoader {
    constructor() {
        this.images = new Map();
        this.meta = new Map();
        this.failed = new Set();
        this.loaded = false;
        this.progress = 0;
        this._contentCrop = new Map();   // key → { x, y, w, h }
        this._recolorCache = new Map();  // cacheKey → canvas
        this._scratch = null;
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
        } else if (img.width % frames !== 0) {
            // Prefer the largest divisor near the declared frame count.
            for (let f = frames; f >= 1; f--) {
                if (img.width % f === 0) {
                    frames = f;
                    frameW = img.width / f;
                    break;
                }
            }
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

    _ensureScratch(w, h) {
        if (!this._scratch) {
            this._scratch = document.createElement('canvas');
        }
        if (this._scratch.width < w) this._scratch.width = w;
        if (this._scratch.height < h) this._scratch.height = h;
        return this._scratch;
    }

    /**
     * Tight content crop inside one frame (trims Sunnyside padding). Cached per key.
     * Optional pad expands the bbox so outlines aren't clipped.
     */
    getContentCrop(key, pad = 2) {
        const cached = this._contentCrop.get(key);
        if (cached) return cached;
        const img = this.getImage(key);
        const meta = this.getMeta(key);
        if (!img || !meta) return null;

        const scratch = this._ensureScratch(meta.frameW, meta.frameH);
        const sctx = scratch.getContext('2d', { willReadFrequently: true });
        sctx.clearRect(0, 0, meta.frameW, meta.frameH);
        sctx.drawImage(img, 0, 0, meta.frameW, meta.frameH, 0, 0, meta.frameW, meta.frameH);
        let data;
        try {
            data = sctx.getImageData(0, 0, meta.frameW, meta.frameH).data;
        } catch (e) {
            // Tainted / unavailable — fall back to a conservative center crop.
            const fallback = {
                x: Math.floor(meta.frameW * 0.35),
                y: Math.floor(meta.frameH * 0.25),
                w: Math.floor(meta.frameW * 0.3),
                h: Math.floor(meta.frameH * 0.5),
            };
            this._contentCrop.set(key, fallback);
            return fallback;
        }

        let minX = meta.frameW, minY = meta.frameH, maxX = 0, maxY = 0;
        let found = false;
        for (let y = 0; y < meta.frameH; y++) {
            for (let x = 0; x < meta.frameW; x++) {
                const a = data[(y * meta.frameW + x) * 4 + 3];
                if (a > 24) {
                    found = true;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (!found) {
            const fallback = { x: 0, y: 0, w: meta.frameW, h: meta.frameH };
            this._contentCrop.set(key, fallback);
            return fallback;
        }
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(meta.frameW - 1, maxX + pad);
        maxY = Math.min(meta.frameH - 1, maxY + pad);
        const crop = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
        this._contentCrop.set(key, crop);
        return crop;
    }

    /**
     * Destination size that upscales the tiny padded character to match procedural heroes
     * (~26×40 fillRect footprint) without looking like a chibi speck in empty padding.
     */
    sizedDest(crop, targetH = 40, maxW = 36) {
        if (!crop || crop.h <= 0) return { dw: 32, dh: targetH };
        const scale = targetH / crop.h;
        let dw = Math.round(crop.w * scale);
        let dh = targetH;
        if (dw > maxW) {
            const s = maxW / dw;
            dw = maxW;
            dh = Math.round(dh * s);
        }
        return { dw, dh };
    }

    /**
     * Recolor a strip frame:
     *  - mode 'hair': non-skin pixels → hairColor (hat dye on hair layer)
     *  - mode 'body': upper clothing → bodyColor (tunic), lower → legsColor if set
     * Skin and near-black outlines are preserved. Returns a canvas (cached).
     */
    getRecoloredFrame(key, frameIndex, bodyColor = null, hairColor = null, mode = 'body', legsColor = null) {
        const img = this.getImage(key);
        const meta = this.getMeta(key);
        if (!img || !meta) return null;
        const body = parseHexColor(bodyColor);
        const hair = parseHexColor(hairColor);
        const legs = parseHexColor(legsColor);
        if (!body && !hair && !legs) return null;

        const frames = meta.frames;
        const fi = ((frameIndex % frames) + frames) % frames;
        const cacheKey = `${key}|${fi}|${bodyColor || ''}|${hairColor || ''}|${legsColor || ''}|${mode}`;
        if (this._recolorCache.has(cacheKey)) return this._recolorCache.get(cacheKey);

        const crop = this.getContentCrop(key) || { x: 0, y: 0, w: meta.frameW, h: meta.frameH };
        const canvas = document.createElement('canvas');
        canvas.width = crop.w;
        canvas.height = crop.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            img,
            fi * meta.frameW + crop.x, crop.y, crop.w, crop.h,
            0, 0, crop.w, crop.h
        );
        const imageData = ctx.getImageData(0, 0, crop.w, crop.h);
        const d = imageData.data;
        // Lower ~35% of the cropped frame ≈ legs / boots on Human sheets.
        const legsY = Math.floor(crop.h * 0.65);
        for (let i = 0; i < d.length; i += 4) {
            const a = d[i + 3];
            if (a < 20) continue;
            const r = d[i], g = d[i + 1], b = d[i + 2];
            if (isOutlinePixel(r, g, b)) continue;
            if (isSkinPixel(r, g, b)) continue;

            const lum = (r * 0.35 + g * 0.45 + b * 0.2) / 255;
            const shade = 0.45 + lum * 0.7;
            const y = Math.floor((i / 4) / crop.w);

            let target = null;
            if (mode === 'hair' && hair) {
                target = hair;
            } else if (mode !== 'hair') {
                if (legs && y >= legsY) target = legs;
                else if (body) target = body;
            }
            if (!target) continue;
            d[i] = Math.min(255, Math.round(target.r * shade));
            d[i + 1] = Math.min(255, Math.round(target.g * shade));
            d[i + 2] = Math.min(255, Math.round(target.b * shade));
        }
        ctx.putImageData(imageData, 0, 0);
        this._recolorCache.set(cacheKey, canvas);
        // Soft cap so dye shopping can't balloon memory forever.
        if (this._recolorCache.size > 256) {
            const first = this._recolorCache.keys().next().value;
            this._recolorCache.delete(first);
        }
        return canvas;
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
     * Draw a content-cropped (and optionally recolored) strip frame.
     */
    drawCroppedStrip(ctx, key, frameIndex, dx, dy, flipX = false, opts = {}) {
        if (!this.has(key)) return false;
        const {
            bodyColor = null,
            hairColor = null,
            legsColor = null,
            mode = 'body',
            targetH = 40,
            maxW = 36,
            footPad = 16,
        } = opts;

        const crop = this.getContentCrop(key);
        const { dw, dh } = this.sizedDest(crop, targetH, maxW);
        const drawY = dy - dh + footPad;
        const drawX = dx - dw / 2;

        const recolored = (bodyColor || hairColor || legsColor)
            ? this.getRecoloredFrame(key, frameIndex, bodyColor, hairColor, mode, legsColor)
            : null;

        if (recolored) {
            ctx.save();
            if (flipX) {
                ctx.translate(drawX + dw, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(recolored, 0, 0, dw, dh);
            } else {
                ctx.drawImage(recolored, drawX, drawY, dw, dh);
            }
            ctx.restore();
            return true;
        }
        return this.drawStrip(ctx, key, frameIndex, drawX, drawY, dw, dh, flipX, crop);
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
        } else if (atlasKey === 'lava') {
            cell = variant % 2 === 0 ? TILE_ATLAS.lava : (TILE_ATLAS.lavaB || TILE_ATLAS.lava);
        } else if (atlasKey === 'temple') {
            cell = variant % 2 === 0 ? TILE_ATLAS.temple : (TILE_ATLAS.templeB || TILE_ATLAS.temple);
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
     * Pick hero action from entity state. Missing clips fall through to a safer action.
     * Priority: hurt → attack/bow → fishing → swim → run/walk → idle.
     */
    resolveHeroAction(p, moving = false) {
        const fish = p.fishingState;
        if (p.hurtAnimTimer > 0) return 'hurt';
        if (p.attackTimer > 0 || p.bowAnimTimer > 0) return 'attack';
        if (fish) {
            if (fish.state === 'casting') return 'casting';
            if (fish.state === 'reeling') return 'reeling';
            if (fish.state === 'caught') return 'caught';
            if (fish.state === 'waiting' || fish.state === 'bite') return 'waiting';
        }
        if (p.onWater) return 'swimming';
        if (moving) {
            // Run when not slowed by shield / heavy claymore; otherwise walk.
            if (p.shielding) return 'walk';
            if (p.activeMeleeSlot === 'fire_claymore') return 'walk';
            return 'run';
        }
        return 'idle';
    }

    heroFrameForAction(p, action, frames) {
        const fish = p.fishingState;
        if (action === 'hurt') {
            const dur = p.hurtAnimDuration || 0.42;
            const progress = 1 - Math.max(0, p.hurtAnimTimer) / dur;
            return Math.min(frames - 1, Math.floor(progress * frames));
        }
        if (action === 'attack') {
            const timer = p.attackTimer > 0 ? p.attackTimer : p.bowAnimTimer;
            const dur = p.attackTimer > 0
                ? (p.attackDuration || 0.26)
                : (p.bowAnimDuration || 0.28);
            const progress = 1 - Math.max(0, timer) / dur;
            return Math.min(frames - 1, Math.floor(progress * frames));
        }
        if (fish && (action === 'casting' || action === 'reeling' || action === 'caught')) {
            const dur = fish.animDuration || 0.55;
            const progress = 1 - Math.max(0, fish.timer) / dur;
            return Math.min(frames - 1, Math.max(0, Math.floor(progress * frames)));
        }
        const ms = ANIM_FRAME_MS[action] || 100;
        return Math.floor(performance.now() / ms) % frames;
    }

    /**
     * Composite Human base + hair (+ tools for fishing) for the hero.
     * Sprites face right; flipX for left. Up/down reuse the side view (pack has no cardinal sheets).
     * Applies tunicColor to body clothing and hatColor to hair (outfit dye support).
     * Diver outfit stays procedural (no dedicated dive sheets).
     */
    drawHeroSprite(ctx, p, moving = false) {
        if (p.outfit === 'diver') return false;

        let action = this.resolveHeroAction(p, moving);
        const hairSuffix = p.gender === 'female' ? 'f' : 'm';
        const pickKeys = (act) => ({
            baseKey: `hero_${act}_base`,
            hairKey: `hero_${act}_hair_${hairSuffix}`,
            toolsKey: `hero_${act}_tools`,
        });

        let keys = pickKeys(action);
        // Fallback chain if a clip failed to load.
        const fallbacks = ['idle', 'walk', 'run', 'attack'];
        if (!this.has(keys.baseKey)) {
            let found = null;
            for (const fb of fallbacks) {
                if (this.has(`hero_${fb}_base`)) {
                    found = fb;
                    break;
                }
            }
            if (!found) return false;
            action = found;
            keys = pickKeys(action);
        }

        const frames = this.getMeta(keys.baseKey)?.frames || 8;
        const frame = this.heroFrameForAction(p, action, frames);
        const flipX = p.dir === 'left';
        const tunic = p.tunicColor || '#16a34a';
        const hat = p.hatColor || '#15803d';
        const legs = p.legsColor || '#334155';
        const drawOpts = { targetH: 48, maxW: 38, footPad: 16 };

        this.drawCroppedStrip(ctx, keys.baseKey, frame, 0, 0, flipX, {
            bodyColor: tunic,
            legsColor: legs,
            ...drawOpts,
        });
        this.drawCroppedStrip(ctx, keys.hairKey, frame, 0, 0, flipX, {
            hairColor: hat,
            mode: 'hair',
            ...drawOpts,
        });
        // Fishing poses include the rod on the tools layer when present.
        if ((action === 'casting' || action === 'waiting' || action === 'reeling' || action === 'caught')
            && this.has(keys.toolsKey)) {
            this.drawCroppedStrip(ctx, keys.toolsKey, frame, 0, 0, flipX, drawOpts);
        }
        return true;
    }

    /**
     * Goblin / Skeleton stand-in for blob / snake. Returns false → procedural fallback.
     * Priority: death → hurt → attack → run/walk → idle.
     */
    drawEnemySprite(ctx, e) {
        const map = ENEMY_SPRITES[e.type];
        if (!map) return false;

        let key = map.idle;
        let frameMode = 'loop';
        if (e.dying && map.death && this.has(map.death)) {
            key = map.death;
            frameMode = 'death';
        } else if (e.hurtTimer > 0 && map.hurt && this.has(map.hurt)) {
            key = map.hurt;
            frameMode = 'hurt';
        } else if (e.attackAnimTimer > 0 && map.attack && this.has(map.attack)) {
            key = map.attack;
            frameMode = 'attack';
        } else if (e._spriteChasing && map.run && this.has(map.run)) {
            key = map.run;
        } else if (e._spriteMoving && map.walk && this.has(map.walk)) {
            key = map.walk;
        } else if (map.idle && this.has(map.idle)) {
            key = map.idle;
        }

        if (!this.has(key)) return false;
        const frames = this.getMeta(key)?.frames || 1;
        let frame;
        if (frameMode === 'death') {
            const dur = e.deathDuration || 0.55;
            const progress = 1 - Math.max(0, e.deathTimer || 0) / dur;
            frame = Math.min(frames - 1, Math.floor(progress * frames));
        } else if (frameMode === 'hurt') {
            const dur = e.hurtDuration || 0.4;
            const progress = 1 - Math.max(0, e.hurtTimer) / dur;
            frame = Math.min(frames - 1, Math.floor(progress * frames));
        } else if (frameMode === 'attack') {
            const dur = e.attackAnimDuration || 0.4;
            const progress = 1 - Math.max(0, e.attackAnimTimer) / dur;
            frame = Math.min(frames - 1, Math.floor(progress * frames));
        } else {
            frame = Math.floor(e.animPhase || 0) % frames;
        }
        const flipX = Math.cos(e.dirAngle || 0) < 0;
        return this.drawCroppedStrip(ctx, key, frame, 0, 0, flipX, {
            targetH: e.type === 'snake' ? 36 : 40,
            maxW: 40,
            footPad: 16,
        });
    }

    /**
     * Farm animals from Elements/Animals. Rabbit (no sheet) returns false.
     */
    drawAnimalSprite(ctx, a) {
        const key = ANIMAL_SPRITES[a.kind];
        if (!key || !this.has(key)) return false;
        const frames = this.getMeta(key)?.frames || 1;
        const speed = a.fleeTimer > 0 ? 70 : 160;
        const frame = Math.floor(performance.now() / speed) % frames;
        const flipX = Math.cos(a.dirAngle || 0) < 0;
        const tall = a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'pig';
        return this.drawCroppedStrip(ctx, key, frame, 0, 0, flipX, {
            targetH: tall ? 36 : 28,
            maxW: tall ? 48 : 32,
            footPad: 14,
        });
    }

    /**
     * Village NPCs: Human idle base + hair, coat/hair dyed from npc colors.
     */
    drawNpcSprite(ctx, npc) {
        const baseKey = 'hero_idle_base';
        const hairKey = 'hero_idle_hair_m';
        if (!this.has(baseKey)) return false;
        const frames = this.getMeta(baseKey)?.frames || 9;
        const frame = Math.floor(performance.now() / 160) % frames;
        this.drawCroppedStrip(ctx, baseKey, frame, 0, 0, false, {
            bodyColor: npc.coatColor || '#2563eb',
            legsColor: '#334155',
            targetH: 46,
            maxW: 36,
            footPad: 16,
        });
        this.drawCroppedStrip(ctx, hairKey, frame, 0, 0, false, {
            hairColor: npc.hairColor || '#78350f',
            mode: 'hair',
            targetH: 46,
            maxW: 36,
            footPad: 16,
        });
        return true;
    }

    /**
     * Boss stand-ins: tinted/scaled Goblin or Skeleton (+ fire VFX for fire boss).
     * Attack FX (lasers, claymore arcs) stay procedural in entities.js.
     */
    drawBossSprite(ctx, bossId, boss) {
        const map = BOSS_SPRITES[bossId];
        if (!map) return false;
        const moving = boss.state && /swing|spin|laser_fire|wave/.test(boss.state);
        const key = moving && this.has(map.walk) ? map.walk : map.idle;
        if (!this.has(key)) return false;
        const frames = this.getMeta(key)?.frames || 1;
        const frame = Math.floor(performance.now() / 110) % frames;
        const flipX = false;
        const scale = map.scale || 1.5;
        const crop = this.getContentCrop(key);
        const base = this.sizedDest(crop, Math.round(42 * scale), Math.round(48 * scale));
        const recolored = this.getRecoloredFrame(key, frame, map.tint, null, 'body');
        const dw = base.dw;
        const dh = base.dh;
        const dx = -dw / 2;
        const dy = -dh + 18;

        if (map.fire && this.has('fire_deco')) {
            const ff = Math.floor(performance.now() / 90) % (this.getMeta('fire_deco')?.frames || 4);
            const fireCrop = this.getContentCrop('fire_deco');
            this.drawStrip(ctx, 'fire_deco', ff, -dw * 0.7, -dh * 0.85, dw * 0.55, dh * 0.55, false, fireCrop);
            this.drawStrip(ctx, 'fire_deco_b', ff, dw * 0.15, -dh * 0.9, dw * 0.55, dh * 0.55, false, this.getContentCrop('fire_deco_b'));
        }

        if (recolored) {
            ctx.drawImage(recolored, dx, dy, dw, dh);
        } else {
            this.drawStrip(ctx, key, frame, dx, dy, dw, dh, flipX, crop);
        }
        return true;
    }
}

export const assets = new AssetLoader();
