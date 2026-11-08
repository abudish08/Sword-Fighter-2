/**
 * Asset helpers + audio (Phase 1).
 * Image loading is ready for future sprite packs; procedural Canvas drawing remains the fallback.
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

/**
 * Simple image / asset loader for upcoming downloadable sprites.
 * Not required for current procedural rendering.
 */
export class AssetLoader {
    constructor() {
        this.images = new Map();
        this.loaded = false;
    }

    async loadImage(key, url) {
        if (this.images.has(key)) return this.images.get(key);
        const img = new Image();
        img.decoding = 'async';
        const done = new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        });
        img.src = url;
        await done;
        this.images.set(key, img);
        return img;
    }

    getImage(key) {
        return this.images.get(key) || null;
    }

    /**
     * Load a list of { key, url } entries. Resolves even if the list is empty
     * so the game can boot with zero binary assets (current Phase 1 state).
     */
    async loadAll(entries = [], onProgress = null) {
        const total = entries.length;
        if (total === 0) {
            this.loaded = true;
            if (onProgress) onProgress(1, 0, 0);
            return;
        }
        let completed = 0;
        for (const { key, url } of entries) {
            await this.loadImage(key, url);
            completed += 1;
            if (onProgress) onProgress(completed / total, completed, total);
        }
        this.loaded = true;
    }
}

export const assets = new AssetLoader();
