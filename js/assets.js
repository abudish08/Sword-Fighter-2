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

/**
 * Hybrid audio: Kenney / artisticdude CC0 samples when loaded,
 * plus a richer Web Audio chiptune fallback (and always for BGM).
 * Toggle flags `bgmEnabled` / `sfxEnabled` stay authoritative.
 */
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.bgmEnabled = true;
        this.sfxEnabled = true;
        this.theme = 'overworld';
        this.step = 0;
        this.bgmInterval = null;
        this.buffers = new Map();
        this._slashIdx = 0;
        this.samplesReady = false;
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

    async preloadSamples() {
        const catalog = [
            // Kenney Interface Sounds (CC0)
            ['ui_click', '/public/assets/kenney/sfx/click_001.ogg'],
            ['ui_click2', '/public/assets/kenney/sfx/click_002.ogg'],
            ['ui_confirm', '/public/assets/kenney/sfx/confirmation_001.ogg'],
            ['ui_confirm2', '/public/assets/kenney/sfx/confirmation_002.ogg'],
            ['ui_error', '/public/assets/kenney/sfx/error_001.ogg'],
            ['ui_switch', '/public/assets/kenney/sfx/switch_001.ogg'],
            ['ui_select', '/public/assets/kenney/sfx/select_001.ogg'],
            ['ui_open', '/public/assets/kenney/sfx/open_001.ogg'],
            ['ui_close', '/public/assets/kenney/sfx/close_001.ogg'],
            ['ui_pluck', '/public/assets/kenney/sfx/pluck_001.ogg'],
            ['ui_drop', '/public/assets/kenney/sfx/drop_001.ogg'],
            ['ui_glass', '/public/assets/kenney/sfx/glass_001.ogg'],
            // artisticdude RPG Sound Pack (CC0) — curated oggs
            ['slash', '/public/assets/sfx/rpg/slash.ogg'],
            ['slash2', '/public/assets/sfx/rpg/slash2.ogg'],
            ['slash3', '/public/assets/sfx/rpg/slash3.ogg'],
            ['unsheathe', '/public/assets/sfx/rpg/unsheathe.ogg'],
            ['hit', '/public/assets/sfx/rpg/hit.ogg'],
            ['hurt', '/public/assets/sfx/rpg/hurt.ogg'],
            ['coin', '/public/assets/sfx/rpg/coin.ogg'],
            ['coin2', '/public/assets/sfx/rpg/coin2.ogg'],
            ['heal', '/public/assets/sfx/rpg/heal.ogg'],
            ['bubble', '/public/assets/sfx/rpg/bubble.ogg'],
            ['magic', '/public/assets/sfx/rpg/magic.ogg'],
            ['door', '/public/assets/sfx/rpg/door.ogg'],
            ['armor', '/public/assets/sfx/rpg/armor.ogg'],
            ['ui1', '/public/assets/sfx/rpg/ui1.ogg'],
        ];
        this.init();
        if (!this.ctx) return;
        await Promise.all(catalog.map(async ([key, url]) => {
            try {
                const res = await fetch(url);
                if (!res.ok) return;
                const arr = await res.arrayBuffer();
                const buf = await this.ctx.decodeAudioData(arr.slice(0));
                this.buffers.set(key, buf);
            } catch (e) {
                console.warn(`[sfx] sample failed: ${key}`, e);
            }
        }));
        this.samplesReady = this.buffers.size > 0;
    }

    playBuffer(key, vol = 0.35, rate = 1) {
        if (!this.sfxEnabled) return false;
        this.init();
        const buf = this.buffers.get(key);
        if (!this.ctx || !buf) return false;
        try {
            const src = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            src.buffer = buf;
            src.playbackRate.value = rate;
            gain.gain.value = vol;
            src.connect(gain);
            gain.connect(this.ctx.destination);
            src.start();
            return true;
        } catch (e) {
            return false;
        }
    }

    playTone(freq, duration = 0.12, type = 'square', vol = 0.08, slideTo = null) {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t0 = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, t0);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            if (slideTo != null) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
            }
            gain.gain.setValueAtTime(vol, t0);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t0);
            osc.stop(t0 + duration + 0.02);
        } catch (e) {}
    }

    /** Layered noise burst for hits / splash (chiptune percussion). */
    playNoise(duration = 0.1, vol = 0.06, color = 1800) {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t0 = this.ctx.currentTime;
            const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
            const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = this.ctx.createBufferSource();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            src.buffer = buffer;
            filter.type = 'bandpass';
            filter.frequency.value = color;
            filter.Q.value = 0.8;
            gain.gain.setValueAtTime(vol, t0);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            src.start(t0);
            src.stop(t0 + duration + 0.02);
        } catch (e) {}
    }

    slash() {
        const keys = ['slash', 'slash2', 'slash3'];
        const key = keys[this._slashIdx++ % keys.length];
        if (this.playBuffer(key, 0.32, 0.95 + Math.random() * 0.1)) return;
        this.playTone(240, 0.07, 'sawtooth', 0.1, 90);
        this.playNoise(0.06, 0.05, 1400);
    }
    arrow() {
        if (this.playBuffer('ui_pluck', 0.28, 1.35)) {
            this.playTone(720, 0.06, 'triangle', 0.05, 280);
            return;
        }
        this.playTone(680, 0.05, 'triangle', 0.08, 220);
        this.playTone(920, 0.04, 'square', 0.04);
    }
    hit() {
        if (this.playBuffer('hit', 0.3)) return;
        this.playTone(160, 0.1, 'square', 0.11, 70);
        this.playNoise(0.08, 0.07, 900);
    }
    hurt() {
        if (this.playBuffer('hurt', 0.34)) return;
        this.playTone(110, 0.16, 'sawtooth', 0.12, 55);
        this.playTone(70, 0.2, 'square', 0.07);
    }
    heal() {
        if (this.playBuffer('heal', 0.28) || this.playBuffer('bubble', 0.26)) return;
        this.playTone(523.25, 0.1, 'triangle', 0.09);
        setTimeout(() => this.playTone(659.25, 0.12, 'triangle', 0.09), 80);
        setTimeout(() => this.playTone(783.99, 0.14, 'sine', 0.07), 160);
    }
    unlock() {
        if (this.playBuffer('ui_confirm', 0.28) || this.playBuffer('unsheathe', 0.26)) return;
        this.playTone(440, 0.08, 'square', 0.09);
        setTimeout(() => this.playTone(554.37, 0.08, 'square', 0.09), 80);
        setTimeout(() => this.playTone(659.25, 0.16, 'square', 0.1), 160);
    }
    coin() {
        if (this.playBuffer('coin', 0.28) || this.playBuffer('coin2', 0.24)) return;
        this.playTone(784, 0.07, 'square', 0.08);
        setTimeout(() => this.playTone(1046.5, 0.12, 'square', 0.08), 60);
    }
    splash() {
        if (this.playBuffer('bubble', 0.3) || this.playBuffer('ui_glass', 0.25)) {
            this.playNoise(0.12, 0.04, 600);
            return;
        }
        this.playTone(200, 0.14, 'triangle', 0.08, 90);
        this.playNoise(0.14, 0.06, 500);
    }
    laser() {
        if (this.playBuffer('magic', 0.3)) return;
        this.playTone(180, 0.28, 'sawtooth', 0.11, 40);
        this.playTone(360, 0.22, 'square', 0.05, 80);
    }
    bossDrop() {
        if (this.playBuffer('door', 0.35) || this.playBuffer('armor', 0.3)) return;
        this.playTone(90, 0.3, 'sawtooth', 0.14, 40);
        this.playNoise(0.25, 0.08, 300);
    }

    startBGM() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        // Melody + simple bass/harmony for a denser chiptune bed.
        const overworld = {
            lead: [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23],
            bass: [130.81, 130.81, 196.00, 196.00, 146.83, 146.83, 174.61, 174.61],
        };
        const village = {
            lead: [329.63, 392.00, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63],
            bass: [164.81, 164.81, 196.00, 196.00, 174.61, 174.61, 146.83, 130.81],
        };
        const boss = {
            lead: [110.00, 116.54, 110.00, 98.00, 110.00, 130.81, 123.47, 98.00],
            bass: [55.00, 58.27, 55.00, 49.00, 55.00, 65.41, 61.74, 49.00],
        };
        this.bgmInterval = setInterval(() => {
            if (!this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
            const pack = this.theme === 'boss' ? boss : (this.theme === 'village' ? village : overworld);
            const i = this.step % pack.lead.length;
            this.step++;
            const playVoice = (freq, type, vol, dur) => {
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + dur + 0.02);
                } catch (e) {}
            };
            const leadType = this.theme === 'boss' ? 'sawtooth' : 'triangle';
            const leadVol = this.theme === 'boss' ? 0.04 : 0.028;
            playVoice(pack.lead[i], leadType, leadVol, 0.24);
            playVoice(pack.bass[i], 'square', this.theme === 'boss' ? 0.028 : 0.016, 0.22);
            if (i % 2 === 0 && this.theme !== 'boss') {
                playVoice(pack.lead[i] * 1.5, 'sine', 0.012, 0.18);
            }
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
    { key: 'tree_deco_b', url: `${ASSET_ROOT}/Elements/Plants/spr_deco_tree_02_strip4.png`, frames: 4 },
    { key: 'mushroom_red', url: `${ASSET_ROOT}/Elements/Plants/spr_deco_mushroom_red_01_strip4.png`, frames: 4 },
    { key: 'mushroom_blue', url: `${ASSET_ROOT}/Elements/Plants/spr_deco_mushroom_blue_01_strip4.png`, frames: 4 },
    { key: 'fire_deco', url: `${ASSET_ROOT}/Elements/VFX/Fire/spr_deco_fire_01_strip4.png`, frames: 4 },
    { key: 'fire_deco_b', url: `${ASSET_ROOT}/Elements/VFX/Fire/spr_deco_fire_02_strip4.png`, frames: 4 },
    { key: 'glint_a', url: `${ASSET_ROOT}/Elements/VFX/Glint/spr_deco_glint_01_strip6.png`, frames: 6 },
    { key: 'glint_b', url: `${ASSET_ROOT}/Elements/VFX/Glint/spr_deco_glint_02_strip4.png`, frames: 4 },
    { key: 'coracle', url: `${ASSET_ROOT}/Elements/Other/spr_deco_coracle_land.png` },
    { key: 'coracle_water', url: `${ASSET_ROOT}/Elements/Other/spr_deco_coracle_strip4.png`, frames: 4 },
    { key: 'rock_deco', url: `${ASSET_ROOT}/Elements/Crops/rock.png` },

    // Crops (stage 00 sprout → 05 mature) + soil / crate props
    ...['wheat', 'carrot', 'pumpkin', 'sunflower'].flatMap((crop) =>
        [0, 1, 2, 3, 4, 5].map((stage) => ({
            key: `crop_${crop}_${stage}`,
            url: `${ASSET_ROOT}/Elements/Crops/${crop}_0${stage}.png`,
        }))
    ),
    { key: 'soil_00', url: `${ASSET_ROOT}/Elements/Crops/soil_00.png` },
    { key: 'soil_01', url: `${ASSET_ROOT}/Elements/Crops/soil_01.png` },
    { key: 'crate_base', url: `${ASSET_ROOT}/Elements/Crops/crate_base.png` },
    { key: 'crate_top', url: `${ASSET_ROOT}/Elements/Crops/crate_top.png` },
    { key: 'item_fish', url: `${ASSET_ROOT}/Elements/Crops/fish.png` },
    { key: 'item_egg', url: `${ASSET_ROOT}/Elements/Crops/egg.png` },
    { key: 'item_milk', url: `${ASSET_ROOT}/Elements/Crops/milk.png` },
    { key: 'item_wood', url: `${ASSET_ROOT}/Elements/Crops/wood.png` },
    { key: 'item_rock', url: `${ASSET_ROOT}/Elements/Crops/rock.png` },
    { key: 'item_seeds', url: `${ASSET_ROOT}/Elements/Crops/seeds_generic.png` },

    // Village / port props (pack has windmill + boat; house shells stay procedural)
    { key: 'prop_windmill', url: `${ASSET_ROOT}/Elements/Other/spr_deco_windmill_strip9.png`, frames: 9 },
    { key: 'prop_coracle', url: `${ASSET_ROOT}/Elements/Other/spr_deco_coracle_strip4.png`, frames: 4 },
    { key: 'prop_coracle_land', url: `${ASSET_ROOT}/Elements/Other/spr_deco_coracle_land.png` },
    { key: 'vfx_chimney', url: `${ASSET_ROOT}/Elements/VFX/Chimney Smoke/chimneysmoke_01_strip30.png`, frames: 30 },
    { key: 'vfx_glint', url: `${ASSET_ROOT}/Elements/VFX/Glint/spr_deco_glint_01_strip6.png`, frames: 6 },
    { key: 'vfx_glint_b', url: `${ASSET_ROOT}/Elements/VFX/Glint/spr_deco_glint_02_strip4.png`, frames: 4 },

    // UI icons — Sunnyside first
    { key: 'ui_sword', url: `${ASSET_ROOT}/UI/sword.png` },
    { key: 'ui_confirm', url: `${ASSET_ROOT}/UI/confirm.png` },
    { key: 'ui_cancel', url: `${ASSET_ROOT}/UI/cancel.png` },
    { key: 'ui_axe', url: `${ASSET_ROOT}/UI/axe.png` },
    { key: 'ui_hammer', url: `${ASSET_ROOT}/UI/hammer.png` },
    { key: 'ui_pickaxe', url: `${ASSET_ROOT}/UI/pickaxe.png` },
    { key: 'ui_shovel', url: `${ASSET_ROOT}/UI/shovel.png` },
    { key: 'ui_rod', url: `${ASSET_ROOT}/UI/rod.png` },
    { key: 'ui_rod_alt', url: `${ASSET_ROOT}/UI/rod alt.png` },
    { key: 'ui_plant', url: `${ASSET_ROOT}/UI/plant.png` },
    { key: 'ui_water', url: `${ASSET_ROOT}/UI/water.png` },
    { key: 'ui_basket', url: `${ASSET_ROOT}/UI/basket.png` },
    { key: 'ui_search', url: `${ASSET_ROOT}/UI/search.png` },
    { key: 'ui_alert', url: `${ASSET_ROOT}/UI/expression_alerted.png` },
    { key: 'ui_love', url: `${ASSET_ROOT}/UI/expression_love.png` },
    { key: 'ui_chat', url: `${ASSET_ROOT}/UI/expression_chat.png` },
    { key: 'ui_attack', url: `${ASSET_ROOT}/UI/expression_attack.png` },
    { key: 'ui_playercount', url: `${ASSET_ROOT}/UI/playercount.png` },
    { key: 'ui_itemdisc', url: `${ASSET_ROOT}/UI/itemdisc_01.png` },
    { key: 'ui_sandtimer', url: `${ASSET_ROOT}/UI/sandtimer.png` },
    { key: 'ui_redbar_full', url: `${ASSET_ROOT}/UI/redbar_06.png` },
    { key: 'ui_redbar_empty', url: `${ASSET_ROOT}/UI/redbar_00.png` },
    { key: 'ui_happiness_full', url: `${ASSET_ROOT}/UI/happiness_01.png` },
    { key: 'ui_happiness_empty', url: `${ASSET_ROOT}/UI/happiness_04.png` },

    // Kenney Game Icons (CC0) — chrome / mute glyphs when Sunnyside has no match
    // Absolute /public paths so icons still resolve if opened from a subpath.
    { key: 'kenney_gear', url: '/public/assets/kenney/icons/gear.png' },
    { key: 'kenney_music_on', url: '/public/assets/kenney/icons/musicOn.png' },
    { key: 'kenney_music_off', url: '/public/assets/kenney/icons/musicOff.png' },
    { key: 'kenney_audio_on', url: '/public/assets/kenney/icons/audioOn.png' },
    { key: 'kenney_audio_off', url: '/public/assets/kenney/icons/audioOff.png' },
    { key: 'kenney_star', url: '/public/assets/kenney/icons/star.png' },
    { key: 'kenney_door', url: '/public/assets/kenney/icons/door.png' },
    { key: 'kenney_exit', url: '/public/assets/kenney/icons/exitRight.png' },
    { key: 'kenney_multi', url: '/public/assets/kenney/icons/multiplayer.png' },
    { key: 'kenney_single', url: '/public/assets/kenney/icons/singleplayer.png' },
    { key: 'kenney_save', url: '/public/assets/kenney/icons/save.png' },
    { key: 'kenney_home', url: '/public/assets/kenney/icons/home.png' },
    { key: 'kenney_trophy', url: '/public/assets/kenney/icons/trophy.png' },
    { key: 'kenney_locked', url: '/public/assets/kenney/icons/locked.png' },
    { key: 'kenney_unlocked', url: '/public/assets/kenney/icons/unlocked.png' },

    // CC0 hearts strip (firehawk) — 4×16px frames in a 64×16 sheet
    { key: 'cc0_hearts', url: '/public/assets/cc0/hearts.png', frames: 4 },
];

/**
 * DOM HUD slot → preferred asset key (Sunnyside first, then Kenney/CC0).
 * Roles omitted here keep emoji (no good free glyph in the packs we staged).
 * Gaps: true bow, true shield, pork chop, golden apple, dedicated fire claymore.
 */
export const UI_ICONS = {
    sword: 'ui_sword',
    claymore: 'ui_axe',          // closest Sunnyside tool glyph
    wave: 'ui_water',
    rod: 'ui_rod',
    pork: 'item_egg',            // food stand-in
    gapple: 'crop_pumpkin_5',    // golden fruit stand-in
    coin: 'ui_itemdisc',
    inv: 'ui_basket',
    quests: 'ui_chat',
    map: 'ui_search',
    save: 'kenney_save',
    settings: 'kenney_gear',
    home: 'kenney_home',
    multi: 'ui_playercount',
    leave: 'kenney_door',
    heart: 'ui_love',
    heartEmpty: 'ui_happiness_empty',
    yellowHeart: 'kenney_star',
    bgm: 'kenney_music_on',
    sfx: 'kenney_audio_on',
};

/** Crop kind → stage key prefix. Stages 0..5 match pack *_0N.png. */
export const CROP_SPRITES = {
    wheat: 'crop_wheat',
    carrot: 'crop_carrot',
    pumpkin: 'crop_pumpkin',
    sunflower: 'crop_sunflower',
};

/** Seconds per growth stage for farm plots (visual loop; harvest only at stage 5). */
export const CROP_STAGE_SECONDS = 2.4;

/** World prop aliases for village / dock scenery. */
export const PROP_SPRITES = {
    windmill: 'prop_windmill',
    coracle: 'prop_coracle',
    coracleLand: 'prop_coracle_land',
    chimney: 'vfx_chimney',
    glint: 'vfx_glint',
    crate: 'crate_base',
    crateTop: 'crate_top',
};

/** Inventory / loot / catch icon keys. */
export const ITEM_ICONS = {
    fish: 'item_fish',
    egg: 'item_egg',
    milk: 'item_milk',
    wood: 'item_wood',
    rock: 'item_rock',
    seeds: 'item_seeds',
    pork: 'item_egg', // pack has no pork chop — egg stands in for food loot
    rod: 'ui_rod',
    plant: 'ui_plant',
    water: 'ui_water',
    basket: 'ui_basket',
};

/**
 * 16px tileset atlas cells (col, row) for key terrain + deco.
 * Hand-picked from spr_tileset_sunnysideworld_16px.png (64×64 cells).
 * Lava is intentionally unmapped — pack has no magma cell; world uses
 * procedural lava + fire VFX overlays.
 */
export const TILE_ATLAS = {
    grassA: { col: 1, row: 1 },
    grassB: { col: 2, row: 1 },
    path: { col: 3, row: 1 },
    pathB: { col: 7, row: 1 },         // speckled dirt path
    sand: { col: 5, row: 1 },
    water: { col: 4, row: 1 },
    wall: { col: 8, row: 2 },          // solid slate block
    wallB: { col: 1, row: 16 },        // blue-gray masonry
    wood: { col: 14, row: 2 },
    dirt: { col: 12, row: 7 },
    dungeon: { col: 6, row: 1 },       // dark packed earth / stone
    bridge: { col: 14, row: 2 },       // wood plank over chasm
    chasm: { col: 12, row: 0 },        // pure black void cell
    temple: { col: 1, row: 16 },       // cool blue-gray stone floor
    templeB: { col: 5, row: 15 },
    templeC: { col: 10, row: 16 },
    fireFloor: { col: 11, row: 4 },    // scorched brown rock
    volcano: { col: 11, row: 4 },
    volcanoB: { col: 12, row: 7 },     // warm dirt / ash
    subFloor: { col: 8, row: 2 },
    // Soft deco cells (may include transparent pixels) — draw smaller via drawEnvDeco
    foamA: { col: 3, row: 18 },
    foamB: { col: 4, row: 18 },
    bushA: { col: 51, row: 1 },
    bushB: { col: 52, row: 1 },
    bushC: { col: 51, row: 2 },
    bushD: { col: 52, row: 2 },
};

/** Variant lists for drawTile cycling (floor/wall fills only — no sparse deco cells). */
export const TILE_VARIANTS = {
    grassA: ['grassA', 'grassB'],
    path: ['path', 'path', 'path', 'pathB'], // mostly packed dirt; occasional speckled
    wall: ['wall', 'wallB'],
    dungeon: ['dungeon'],
    temple: ['temple', 'templeB', 'templeC'],
    fireFloor: ['fireFloor', 'volcano', 'volcanoB'],
    volcano: ['volcano', 'volcanoB'],
    foamA: ['foamA', 'foamB'],
    bushA: ['bushA', 'bushB', 'bushC', 'bushD'],
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
     * Resolve atlas key through TILE_VARIANTS (stable pick from variant index).
     */
    resolveAtlasKey(atlasKey, variant = 0) {
        const list = TILE_VARIANTS[atlasKey];
        if (list && list.length) {
            const idx = ((variant % list.length) + list.length) % list.length;
            return list[idx];
        }
        return atlasKey;
    }

    /**
     * Draw a 16px tileset cell scaled to dest size.
     * Returns false when the key is unmapped or the sheet failed to load
     * (caller should keep procedural fillRect fallback).
     */
    drawTile(ctx, atlasKey, dx, dy, size, variant = 0) {
        const img = this.getImage('tileset_16');
        if (!img) return false;
        const key = this.resolveAtlasKey(atlasKey, variant);
        const cell = TILE_ATLAS[key];
        if (!cell) return false;
        const ts = 16;
        ctx.drawImage(img, cell.col * ts, cell.row * ts, ts, ts, dx, dy, size, size);
        return true;
    }

    /**
     * Draw a raw atlas cell by col/row (for one-off deco not in TILE_ATLAS).
     */
    drawAtlasCell(ctx, col, row, dx, dy, size) {
        const img = this.getImage('tileset_16');
        if (!img) return false;
        const ts = 16;
        ctx.drawImage(img, col * ts, row * ts, ts, ts, dx, dy, size, size);
        return true;
    }

    drawImage(ctx, key, dx, dy, dw, dh) {
        const img = this.getImage(key);
        if (!img) return false;
        ctx.drawImage(img, dx, dy, dw, dh);
        return true;
    }

    /**
     * Lightweight biome deco overlays (visual only — no collision change).
     * kind: 'bush' | 'mushroom' | 'rock' | 'foam' | 'fire' | 'glint' | 'coracle' | 'tree'
     */
    drawEnvDeco(ctx, kind, dx, dy, size, variant = 0) {
        const s = size || 44;
        if (kind === 'bush') {
            // Foliage cells are sparse — inset so they sit on grass, not replace it.
            const inset = Math.floor(s * 0.12);
            return this.drawTile(ctx, 'bushA', dx + inset, dy + inset, s - inset * 2, variant);
        }
        if (kind === 'foam') {
            // Foam/cloud cells — draw as a fringe, not a full opaque tile.
            const inset = Math.floor(s * 0.05);
            return this.drawTile(ctx, 'foamA', dx + inset, dy + inset, s - inset * 2, variant);
        }
        if (kind === 'mushroom') {
            const key = variant % 2 === 0 ? 'mushroom_red' : 'mushroom_blue';
            const frame = Math.floor(performance.now() / 220 + variant) % 4;
            return this.drawStrip(ctx, key, frame, dx + s * 0.15, dy + s * 0.2, s * 0.7, s * 0.7);
        }
        if (kind === 'rock') {
            return this.drawImage(ctx, 'rock_deco', dx + s * 0.2, dy + s * 0.35, s * 0.55, s * 0.4);
        }
        if (kind === 'fire') {
            const key = variant % 2 === 0 ? 'fire_deco' : 'fire_deco_b';
            const frame = Math.floor(performance.now() / 120 + variant) % 4;
            return this.drawStrip(ctx, key, frame, dx + s * 0.1, dy + s * 0.05, s * 0.8, s * 0.9);
        }
        if (kind === 'glint') {
            const key = variant % 2 === 0 ? 'glint_a' : 'glint_b';
            const frames = this.getMeta(key)?.frames || 4;
            const frame = Math.floor(performance.now() / 140 + variant) % frames;
            return this.drawStrip(ctx, key, frame, dx + s * 0.25, dy + s * 0.25, s * 0.5, s * 0.5);
        }
        if (kind === 'coracle') {
            if (variant % 2 === 0) {
                return this.drawImage(ctx, 'coracle', dx + 2, dy + 4, s - 4, s - 8);
            }
            const frame = Math.floor(performance.now() / 180) % 4;
            return this.drawStrip(ctx, 'coracle_water', frame, dx + 2, dy + 4, s - 4, s - 8);
        }
        if (kind === 'tree') {
            const key = variant % 2 === 0 ? 'tree_deco' : 'tree_deco_b';
            const frame = Math.floor(variant) % 4;
            return this.drawStrip(ctx, key, frame, dx - 4, dy - 10, s + 8, s + 8);
        }
        return false;
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

    /**
     * Draw a crop growth stage (0..5) anchored at tile top-left.
     * Draws soil underneath when available. Returns false → caller fillRect.
     */
    drawCropStage(ctx, cropKind, stage, tileX, tileY, tileSize = 44) {
        const prefix = CROP_SPRITES[cropKind];
        if (!prefix) return false;
        const s = Math.max(0, Math.min(5, stage | 0));
        const soilKey = s <= 1 ? 'soil_00' : 'soil_01';
        if (this.has(soilKey)) {
            this.drawImage(ctx, soilKey, tileX + 4, tileY + tileSize - 18, tileSize - 8, 16);
        }
        const key = `${prefix}_${s}`;
        if (!this.has(key)) return false;
        const img = this.getImage(key);
        if (!img) return false;
        // Pack frames are tiny (6–16px); upscale modestly so a crop fits ~½–¾ of a tile.
        const targetH = Math.min(tileSize - 10, 12 + s * 4);
        const scale = targetH / Math.max(img.height, 1);
        let dw = Math.max(8, Math.round(img.width * scale));
        let dh = Math.max(8, Math.round(img.height * scale));
        dw = Math.min(dw, tileSize - 6);
        dh = Math.min(dh, tileSize - 8);
        const dx = tileX + (tileSize - dw) / 2;
        const dy = tileY + tileSize - dh - 4;
        this.drawImage(ctx, key, dx, dy, dw, dh);
        return true;
    }

    /** Animated windmill (village farm landmark). */
    drawWindmill(ctx, x, y, scale = 1) {
        if (!this.has('prop_windmill')) return false;
        const meta = this.getMeta('prop_windmill');
        const frame = Math.floor(performance.now() / 120) % (meta?.frames || 9);
        const dw = Math.round(96 * scale);
        const dh = Math.round(112 * scale);
        return this.drawStrip(ctx, 'prop_windmill', frame, x - dw / 2, y - dh + 8, dw, dh);
    }

    /** Bobbing coracle on water (dock / lake). */
    drawCoracle(ctx, x, y, onLand = false) {
        if (onLand) {
            if (!this.has('prop_coracle_land')) return false;
            return this.drawImage(ctx, 'prop_coracle_land', x - 24, y - 20, 48, 40);
        }
        if (!this.has('prop_coracle')) return false;
        const meta = this.getMeta('prop_coracle');
        const frame = Math.floor(performance.now() / 220) % (meta?.frames || 4);
        const bob = Math.sin(performance.now() / 400) * 2;
        return this.drawStrip(ctx, 'prop_coracle', frame, x - 28, y - 18 + bob, 56, 36);
    }

    /** Market / farm crate stack. */
    drawCrate(ctx, x, y, withLid = true) {
        let ok = false;
        if (this.has('crate_base')) {
            ok = this.drawImage(ctx, 'crate_base', x - 14, y - 10, 28, 28) || ok;
        }
        if (withLid && this.has('crate_top')) {
            ok = this.drawImage(ctx, 'crate_top', x - 14, y - 22, 28, 24) || ok;
        }
        return ok;
    }

    /** Chimney smoke strip above a building roof point. */
    drawChimneySmoke(ctx, x, y) {
        if (!this.has('vfx_chimney')) return false;
        const meta = this.getMeta('vfx_chimney');
        const frame = Math.floor(performance.now() / 80) % (meta?.frames || 30);
        return this.drawStrip(ctx, 'vfx_chimney', frame, x - 8, y - 28, 30, 28);
    }

    /** Bite / sparkle glint (fishing bobber, shiny loot). */
    drawGlint(ctx, x, y, variant = 0) {
        const key = variant ? 'vfx_glint_b' : 'vfx_glint';
        if (!this.has(key)) return false;
        const meta = this.getMeta(key);
        const frame = Math.floor(performance.now() / 90) % (meta?.frames || 4);
        return this.drawStrip(ctx, key, frame, x - 8, y - 8, 16, 14);
    }

    /**
     * Draw a small item / pickup icon centered at (x,y).
     * `kind` maps through ITEM_ICONS (fish, egg, pork, wood, …).
     */
    drawItemIcon(ctx, kind, x, y, size = 22) {
        const key = ITEM_ICONS[kind] || kind;
        if (!this.has(key)) return false;
        return this.drawImage(ctx, key, x - size / 2, y - size / 2, size, size);
    }

    /** UI tool icon (rod, plant, water, basket, sword…). */
    drawUiIcon(ctx, key, x, y, size = 20) {
        if (!this.has(key)) return false;
        return this.drawImage(ctx, key, x, y, size, size);
    }
}

export const assets = new AssetLoader();
