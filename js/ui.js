/**
 * Menus, save slots, HUD, modals, art shop, fish market, quests, i18n.
 */

import { sfx, assets } from './assets.js';
import { TILE } from './world.js';

export const I18N = {
    en: {
        play: "▶ PLAY (1P)",
        multi: "⚔️ MULTIPLAYER (2P)",
        settings: "⚙️ SETTINGS",
        leave: "🚪 LEAVE GAME",
        selectMode: "SELECT ADVENTURE",
        continueBtn: "CONTINUE",
        newGameBtn: "NEW GAME",
        chooseHero: "CHOOSE HERO STYLE",
        life: "P1 LIFE",
        bow: "Bow",
        fishRod: "Fish Rod",
        pork: "Pork",
        invBtn: "INV [I]",
        questsBtn: "QUESTS [J]",
        mapBtn: "MAP [M]",
        trackerTitle: "📜 ACTIVE NOTES",
        settingsTitle: "⚙️ SETTINGS",
        bgm: "🎵 Background Music",
        sfx: "🔊 Sound Effects",
        lang: "🌐 Language",
        invTitle: "🎒 HERO INVENTORY & OUTFIT SWITCHER",
        questLogTitle: "📖 ADVENTURER'S QUEST LOG"
    },
    fr: {
        play: "▶ JOUER (1J)",
        multi: "⚔️ MULTIJOUEUR (2J)",
        settings: "⚙️ PARAMÈTRES",
        leave: "🚪 QUITTER",
        selectMode: "CHOISIR L'AVENTURE",
        continueBtn: "CONTINUER",
        newGameBtn: "NOUVEAU JEU",
        chooseHero: "CHOISIR LE HÉROS",
        life: "VIE J1",
        bow: "Arc",
        fishRod: "Canne",
        pork: "Porc",
        invBtn: "INV [I]",
        questsBtn: "QUÊTES [J]",
        mapBtn: "CARTE [M]",
        trackerTitle: "📜 NOTES ACTIVES",
        settingsTitle: "⚙️ PARAMÈTRES",
        bgm: "🎵 Musique de Fond",
        sfx: "🔊 Effets Sonores",
        lang: "🌐 Langue",
        invTitle: "🎒 INVENTAIRE DU HÉROS",
        questLogTitle: "📖 JOURNAL DES QUÊTES"
    },
    es: {
        play: "▶ JUGAR (1J)",
        multi: "⚔️ MULTIJUGADOR (2J)",
        settings: "⚙️ AJUSTES",
        leave: "🚪 SALIR",
        selectMode: "SELECCIONAR AVENTURA",
        continueBtn: "CONTINUAR",
        newGameBtn: "NUEVO JUEGO",
        chooseHero: "ELEGIR HÉROE",
        life: "VIDA J1",
        bow: "Arco",
        fishRod: "Caña",
        pork: "Cerdo",
        invBtn: "INV [I]",
        questsBtn: "MISIONES [J]",
        mapBtn: "MAPA [M]",
        trackerTitle: "📜 NOTAS ACTIVAS",
        settingsTitle: "⚙️ AJUSTES",
        bgm: "🎵 Música de Fondo",
        sfx: "🔊 Efectos de Sonido",
        lang: "🌐 Idioma",
        invTitle: "🎒 INVENTARIO DEL HÉROE",
        questLogTitle: "📖 REGISTRO DE MISIONES"
    }
};

/**
 * RETRO CHIPTUNE SOUND & DYNAMIC MUSIC SYNTHESIZER (Overworld, Village, Intimidating Boss)
 */

export const uiMethods = {
  /**
   * SAVE SLOT MANAGEMENT (4 SLOTS TOTAL: CONTINUE SHOWS SAVED, NEW GAME SHOWS REMAINING)
   */
  loadSavesFromStorage() {
      try {
          const raw = localStorage.getItem(this.storageKey);
          if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length === 4) return parsed;
          }
      } catch (e) {}
      return [null, null, null, null];
  },

  saveCurrentWorld() {
      try {
          this.saves[this.activeSlotIndex] = {
              savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              player: JSON.parse(JSON.stringify(this.player)),
              player2: JSON.parse(JSON.stringify(this.player2)),
              dungeonProgress: JSON.parse(JSON.stringify(this.dungeonProgress)),
              quests: JSON.parse(JSON.stringify(this.quests)),
              conqueredFlags: this.flags ? this.flags.map(f => f.conquered) : []
          };
          localStorage.setItem(this.storageKey, JSON.stringify(this.saves));
      } catch (e) {}
  },

  manualSave() {
      this.saveCurrentWorld();
      this.showToast("💾 Game saved to this browser! Use Continue on the title screen to load it.");
  },

  openPlayMenu(multiplayer = false) {
      sfx.init();
      this.isMultiplayer = multiplayer;
      document.getElementById('p2-hud-pill').classList.toggle('hidden', !multiplayer);
      const p2Box = document.getElementById('p2-newgame-picker-box');
      if (p2Box) p2Box.classList.toggle('hidden', !multiplayer);
      document.getElementById('title-main-view').classList.add('hidden');
      document.getElementById('title-play-view').classList.remove('hidden');
      document.getElementById('ui-select-mode').textContent = multiplayer ? "MULTIPLAYER (2P — SHARED SAVED WORLDS)" : "SELECT ADVENTURE (1P)";
      const savedCount = this.saves.filter(Boolean).length;
      this.showSlotTab(savedCount > 0 ? 'continue' : 'new');
  },

  backToTitleMain() {
      document.getElementById('title-play-view').classList.add('hidden');
      document.getElementById('title-main-view').classList.remove('hidden');
  },

  showSlotTab(mode) {
      const contBtn = document.getElementById('tab-continue-btn');
      const newBtn = document.getElementById('tab-new-btn');
      const container = document.getElementById('slots-list-container');
      const creator = document.getElementById('new-game-creator');
      creator.classList.add('hidden');
      container.innerHTML = '';

      const savedCount = this.saves.filter(Boolean).length;
      const emptyCount = 4 - savedCount;
      document.getElementById('slot-summary-text').textContent =
          `Data Slots: ${savedCount} Saved World(s) | ${emptyCount} New Game Slot(s) Available (4 Total Max)`;

      if (mode === 'continue') {
          contBtn.className = 'hd-btn px-6 py-2.5 text-sm sm:text-base';
          newBtn.className = 'hd-btn-secondary px-6 py-2.5 text-sm sm:text-base';

          if (savedCount === 0) {
              container.innerHTML = `<div class="col-span-2 text-center py-6 text-slate-400">No saved worlds yet! Click <strong>NEW GAME</strong> to start in one of the 4 slots.</div>`;
              return;
          }

          this.saves.forEach((slotData, idx) => {
              if (!slotData) return;
              const card = document.createElement('div');
              card.className = 'bg-slate-900 border-2 border-amber-500/80 rounded-xl p-4 flex justify-between items-center';
              card.innerHTML = `
                  <div>
                      <div class="title-font text-amber-300 font-bold text-base">WORLD SLOT ${idx + 1}</div>
                      <div class="text-xs text-slate-300">${slotData.player.gender === 'female' ? '🧝‍♀️ Female' : '🧝‍♂️ Male'} • LVL ${slotData.player.level} • 🪙 ${slotData.player.coins}</div>
                      <div class="text-[11px] text-slate-400">Saved: ${slotData.savedAt}</div>
                  </div>
                  <div class="flex gap-2">
                      <button onclick="game.loadSavedSlot(${idx})" class="hd-btn px-4 py-2 text-xs">LOAD</button>
                      <button onclick="game.deleteSavedSlot(${idx})" class="hd-btn-secondary px-2.5 py-2 text-xs text-rose-400">🗑️</button>
                  </div>
              `;
              container.appendChild(card);
          });
      } else {
          newBtn.className = 'hd-btn px-6 py-2.5 text-sm sm:text-base';
          contBtn.className = 'hd-btn-secondary px-6 py-2.5 text-sm sm:text-base';

          if (emptyCount === 0) {
              container.innerHTML = `<div class="col-span-2 text-center py-6 text-amber-300">All 4 Data Slots have saved worlds! Use Continue or delete a slot to free up a New Game slot.</div>`;
              return;
          }

          this.saves.forEach((slotData, idx) => {
              if (slotData) return; // Only show remaining empty slots!
              const card = document.createElement('div');
              card.className = 'bg-slate-900 hover:bg-slate-800 border-2 border-emerald-500/70 rounded-xl p-4 flex justify-between items-center cursor-pointer transition';
              card.onclick = () => this.prepareNewGameSlot(idx);
              card.innerHTML = `
                  <div>
                      <div class="title-font text-emerald-300 font-bold text-base">NEW GAME - SLOT ${idx + 1}</div>
                      <div class="text-xs text-slate-400">Empty World Data Slot — Click to customize hero</div>
                  </div>
                  <span class="hd-btn px-3 py-1.5 text-xs">+ CREATE</span>
              `;
              container.appendChild(card);
          });
      }
  },

  prepareNewGameSlot(slotIdx) {
      this.pendingNewSlotIndex = slotIdx;
      document.getElementById('new-game-creator').classList.remove('hidden');
      const p2Box = document.getElementById('p2-newgame-picker-box');
      if (p2Box) p2Box.classList.toggle('hidden', !this.isMultiplayer);
      this.selectNewGameGender('male');
      this.selectNewGameP2Gender('female');
  },

  selectNewGameGender(g) {
      this.pendingGender = g;
      document.getElementById('gender-btn-male').className = g === 'male' ? 'hd-btn px-3 py-1.5 text-xs' : 'hd-btn-secondary px-3 py-1.5 text-xs';
      document.getElementById('gender-btn-female').className = g === 'female' ? 'hd-btn px-3 py-1.5 text-xs' : 'hd-btn-secondary px-3 py-1.5 text-xs';
      this.renderHeroPreviewCanvas();
  },

  selectNewGameP2Gender(g) {
      this.pendingP2Gender = g;
      const bMale = document.getElementById('p2-gender-btn-male');
      const bFem = document.getElementById('p2-gender-btn-female');
      if (bMale) bMale.className = g === 'male' ? 'hd-btn px-3 py-1.5 text-xs' : 'hd-btn-secondary px-3 py-1.5 text-xs';
      if (bFem) bFem.className = g === 'female' ? 'hd-btn px-3 py-1.5 text-xs' : 'hd-btn-secondary px-3 py-1.5 text-xs';
      this.renderHeroPreviewCanvas();
  },

  renderHeroPreviewCanvas() {
      const c = document.getElementById('heroPreviewCanvas');
      if (c) {
          const pctx = c.getContext('2d');
          pctx.imageSmoothingEnabled = false;
          pctx.clearRect(0, 0, c.width, c.height);
          this.drawSmoothCharacter(pctx, 55, 62, 1.35, {
              gender: this.pendingGender,
              hatColor: '#15803d',
              tunicColor: '#16a34a',
              legsColor: '#334155',
              sleeveStyle: 'long',
              pantsStyle: 'pants',
              outfit: 'tunic',
              hasShield: false
          });
      }
      const c2 = document.getElementById('heroPreviewCanvasP2');
      if (c2) {
          const pctx2 = c2.getContext('2d');
          pctx2.imageSmoothingEnabled = false;
          pctx2.clearRect(0, 0, c2.width, c2.height);
          this.drawSmoothCharacter(pctx2, 55, 62, 1.35, {
              gender: this.pendingP2Gender,
              hatColor: '#0284c7',
              tunicColor: '#38bdf8',
              legsColor: '#1e293b',
              sleeveStyle: 'long',
              pantsStyle: 'pants',
              outfit: 'tunic',
              hasShield: false
          });
      }
  },

  confirmStartNewGame() {
      this.activeSlotIndex = this.pendingNewSlotIndex;
      this.initDefaultState();
      this.player.gender = this.pendingGender;
      this.player2.gender = this.pendingP2Gender;
      this.initWorld();
      this.saveCurrentWorld();
      document.getElementById('title-screen').classList.add('hidden');
      document.getElementById('p2-join-modal').classList.add('hidden');
      this.updateHUD();
      this.updateQuestTracker();
      if (this.isMultiplayer) {
          this.showToast(`⚔️ 2P Split-Screen Active! P1 (${this.player.gender.toUpperCase()}) on Right | P2 (${this.player2.gender.toUpperCase()}) on Left!`);
      } else {
          this.showToast(`✨ Welcome to Sword Fighter 2! Explore West Ocean Port, Oakvale Village, or East Volcano!`);
      }
  },

  loadSavedSlot(slotIdx) {
      const data = this.saves[slotIdx];
      if (!data) return;
      this.activeSlotIndex = slotIdx;
      this.initDefaultState();
      Object.assign(this.player, data.player);
      if (data.player2) Object.assign(this.player2, data.player2);
      this.player.swordDamage = this.player.weapon === 'iron_sword' ? 10 : 5;
      this.player.hasShield = true;
      this.syncPlayer2Equipment();
      Object.assign(this.dungeonProgress, data.dungeonProgress);
      Object.assign(this.quests, data.quests);
      this.initWorld();
      if (Array.isArray(data.conqueredFlags)) {
          data.conqueredFlags.forEach((val, i) => {
              if (this.flags[i]) this.flags[i].conquered = val;
          });
      }
      document.getElementById('title-screen').classList.add('hidden');
      // When joining an existing saved world in Multiplayer, Player 1 stays their saved Male/Female and Player 2 gets to choose on their left screen!
      if (this.isMultiplayer) {
          document.getElementById('p2-join-modal').classList.remove('hidden');
      } else {
          document.getElementById('p2-join-modal').classList.add('hidden');
      }
      this.updateHUD();
      this.updateQuestTracker();
      this.showToast(`📂 Loaded World Slot ${slotIdx + 1}! Player 1 kept their saved ${this.player.gender.toUpperCase()} character!`);
  },

  confirmP2JoinGender(gender) {
      this.player2.gender = gender;
      this.player2.x = this.player.x - TILE * 1.5;
      this.player2.y = this.player.y;
      document.getElementById('p2-join-modal').classList.add('hidden');
      sfx.unlock();
      this.saveCurrentWorld();
      this.showToast(`⚔️ Player 2 joined as ${gender.toUpperCase()}! Explore the 500,000x500,000 world together!`);
  },

  deleteSavedSlot(slotIdx) {
      this.saves[slotIdx] = null;
      localStorage.setItem(this.storageKey, JSON.stringify(this.saves));
      this.showSlotTab('continue');
  },

  returnToTitleScreen() {
      this.saveCurrentWorld();
      document.getElementById('title-screen').classList.remove('hidden');
      this.backToTitleMain();
  },

  leaveGame() {
      this.saveCurrentWorld();
      document.getElementById('title-screen').classList.add('hidden');
      document.getElementById('leave-game-screen').classList.remove('hidden');
  },

  relaunchFromLeave() {
      document.getElementById('leave-game-screen').classList.add('hidden');
      document.getElementById('title-screen').classList.remove('hidden');
  },

  /**
   * SETTINGS & MULTILINGUAL UI
   */
  openSettingsModal() {
      document.getElementById('settings-modal').classList.remove('hidden');
  },

  closeSettingsModal() {
      document.getElementById('settings-modal').classList.add('hidden');
  },

  toggleBGM() {
      sfx.init();
      sfx.bgmEnabled = !sfx.bgmEnabled;
      const btn = document.getElementById('btn-setting-bgm');
      btn.textContent = sfx.bgmEnabled ? 'ON' : 'OFF';
      btn.className = sfx.bgmEnabled ? 'hd-btn px-4 py-1.5 text-xs' : 'hd-btn-secondary px-4 py-1.5 text-xs';
  },

  toggleSFX() {
      sfx.init();
      sfx.sfxEnabled = !sfx.sfxEnabled;
      const btn = document.getElementById('btn-setting-sfx');
      btn.textContent = sfx.sfxEnabled ? 'ON' : 'OFF';
      btn.className = sfx.sfxEnabled ? 'hd-btn px-4 py-1.5 text-xs' : 'hd-btn-secondary px-4 py-1.5 text-xs';
  },

  setLanguage(lang) {
      this.lang = lang;
      const t = I18N[lang] || I18N.en;
      document.getElementById('btn-title-play').textContent = t.play;
      const multiBtn = document.getElementById('btn-title-multi');
      if (multiBtn) multiBtn.textContent = t.multi;
      document.getElementById('btn-title-settings').textContent = t.settings;
      document.getElementById('btn-title-leave').textContent = t.leave;
      document.getElementById('ui-select-mode').textContent = t.selectMode;
      document.getElementById('tab-continue-btn').textContent = t.continueBtn;
      document.getElementById('tab-new-btn').textContent = t.newGameBtn;
      document.getElementById('ui-choose-hero').textContent = t.chooseHero;
      document.getElementById('ui-hud-life').textContent = t.life;
      document.getElementById('ui-hud-bow').textContent = t.bow;
      document.getElementById('ui-hud-fish').textContent = t.fishRod;
      document.getElementById('ui-hud-pork').textContent = t.pork;
      document.getElementById('ui-btn-inv').textContent = t.invBtn;
      document.getElementById('ui-btn-quests').textContent = t.questsBtn;
      document.getElementById('ui-btn-map').textContent = t.mapBtn;
      document.getElementById('ui-tracker-title').textContent = t.trackerTitle;
      document.getElementById('ui-settings-title').textContent = t.settingsTitle;
      document.getElementById('ui-lbl-bgm').textContent = t.bgm;
      document.getElementById('ui-lbl-sfx').textContent = t.sfx;
      document.getElementById('ui-lbl-lang').textContent = t.lang;
      document.getElementById('ui-inv-title').textContent = t.invTitle;
      document.getElementById('ui-questlog-title').textContent = t.questLogTitle;
  },

  renderCaughtFishPreview(fish) {
      const c = document.getElementById('fishPreviewCanvas');
      const fctx = c.getContext('2d');
      fctx.imageSmoothingEnabled = false;
      fctx.clearRect(0, 0, c.width, c.height);

      // Prefer Sunnyside fish sprite + tint; keep procedural fish drawings as fallback.
      if (assets.has('item_fish')) {
          fctx.save();
          fctx.translate(110, 62);
          const tint = {
              salmon: '#ef4444',
              trout: '#15803d',
              silver_fish: '#cbd5e1',
              bull_eye: '#78350f',
          }[fish.key] || '#38bdf8';
          // Soft disc behind catch
          if (assets.has('ui_itemdisc')) {
              assets.drawImage(fctx, 'ui_itemdisc', -36, -36, 72, 72);
          }
          fctx.save();
          // Recolor via destination-in style: draw fish, then multiply tint overlay.
          assets.drawImage(fctx, 'item_fish', -40, -36, 80, 72);
          fctx.globalCompositeOperation = 'source-atop';
          fctx.fillStyle = tint;
          fctx.globalAlpha = fish.key === 'silver_fish' ? 0.35 : 0.45;
          fctx.fillRect(-40, -36, 80, 72);
          fctx.restore();
          if (fish.key === 'bull_eye') {
              fctx.fillStyle = '#fde68a';
              fctx.fillRect(18, -40, 10, 14);
          }
          assets.drawGlint(fctx, 24, -20, 0);
          fctx.restore();
          return;
      }

      fctx.save();
      fctx.translate(110, 62);

      if (fish.key === 'salmon') {
          // Blocky 1980s Pixel Salmon: red body, green splash blocks, square eye
          fctx.fillStyle = '#ef4444';
          fctx.fillRect(-38, -14, 76, 28);
          fctx.fillRect(-52, -20, 14, 14);
          fctx.fillRect(-52, 6, 14, 14);
          fctx.fillStyle = '#22c55e';
          fctx.fillRect(-14, -6, 28, 12);
          fctx.fillRect(6, -10, 8, 6);
          fctx.fillStyle = '#ffffff';
          fctx.fillRect(22, -8, 8, 8);
          fctx.fillStyle = '#0f172a';
          fctx.fillRect(26, -6, 4, 4);
      } else if (fish.key === 'silver_fish') {
          fctx.fillStyle = '#cbd5e1';
          fctx.fillRect(-36, -12, 72, 24);
          fctx.fillStyle = '#f8fafc';
          fctx.fillRect(-24, -8, 48, 10);
          fctx.fillStyle = '#94a3b8';
          fctx.fillRect(-50, -16, 14, 32);
          fctx.fillStyle = '#0f172a';
          fctx.fillRect(22, -6, 6, 6);
      } else if (fish.key === 'trout') {
          fctx.fillStyle = fish.variant === 'brown' ? '#92400e' : '#15803d';
          fctx.fillRect(-38, -13, 76, 26);
          fctx.fillRect(-52, -16, 14, 32);
          fctx.fillStyle = '#fef08a';
          fctx.fillRect(22, -7, 8, 8);
          fctx.fillStyle = '#0f172a';
          fctx.fillRect(25, -5, 4, 4);
      } else if (fish.key === 'bull_eye') {
          fctx.fillStyle = '#78350f';
          fctx.fillRect(-40, -16, 80, 34);
          fctx.fillRect(-56, -18, 16, 36);
          // Blocky Forehead Horn
          fctx.fillStyle = '#fde68a';
          fctx.fillRect(24, -28, 10, 12);
          fctx.fillRect(30, -36, 8, 10);
          // Giant Square Bullseye Eye
          fctx.fillStyle = '#ffffff';
          fctx.fillRect(10, -10, 20, 20);
          fctx.fillStyle = '#dc2626';
          fctx.fillRect(14, -6, 12, 12);
          fctx.fillStyle = '#0f172a';
          fctx.fillRect(18, -2, 6, 6);
      }
      fctx.restore();
  },

  resolveCaughtFish(keep) {
      const fish = this.pendingCaughtFish;
      document.getElementById('fish-modal').classList.add('hidden');
      if (!fish) return;

      if (keep) {
          this.player.fish[fish.key] = (this.player.fish[fish.key] || 0) + 1;
          if (this.quests.fishing.status === 'active') this.quests.fishing.current++;
          sfx.unlock();
          this.addFloatingText(this.player.x, this.player.y - 20, `Kept ${fish.name}!`, "#38bdf8");
          this.showToast(`🐟 Kept ${fish.name}! Sell it at the Oakvale Market for $${fish.price} (${fish.price} Coins)!`);
          this.updateQuestTracker();
      } else {
          sfx.splash();
          this.addFloatingText(this.player.x, this.player.y - 20, `Threw ${fish.name} back! 🌊`, "#94a3b8");
          this.showToast(`🌊 You gently threw the ${fish.name} back into the water.`);
      }
      this.pendingCaughtFish = null;
  },

  openFishMarket() {
      document.getElementById('market-modal').classList.remove('hidden');
      this.renderFishMarket();
  },

  renderFishMarket() {
      const list = document.getElementById('market-fish-list');
      document.getElementById('market-coins-display').textContent = this.player.coins;
      const items = [
          { key: 'bull_eye', name: 'Bull Eye (Horn & Big Eye)', price: 20 },
          { key: 'silver_fish', name: 'Silver Fish (Shimmering Silver)', price: 20 },
          { key: 'salmon', name: 'Salmon (Red with Green Splash)', price: 15 },
          { key: 'trout', name: 'Trout (Brown/Green)', price: 15 }
      ];
      list.innerHTML = items.map(item => {
          const count = this.player.fish[item.key] || 0;
          return `
              <div class="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-xl">
                  <div>
                      <div class="text-sm font-bold text-white">${item.name}</div>
                      <div class="text-xs text-amber-300">Value: $${item.price} (${item.price} Coins) • In Bag: <strong>${count}</strong></div>
                  </div>
                  <button onclick="game.sellSingleFish('${item.key}', ${item.price})" ${count <= 0 ? 'disabled class="opacity-40 hd-btn-secondary px-4 py-1.5 text-xs"' : 'class="hd-btn px-4 py-1.5 text-xs"'}>
                      Sell 1 (+$${item.price})
                  </button>
              </div>
          `;
      }).join('');
  },

  sellSingleFish(key, price) {
      if ((this.player.fish[key] || 0) <= 0) return;
      this.player.fish[key]--;
      this.player.coins += price;
      sfx.coin();
      this.renderFishMarket();
      this.updateHUD();
  },

  sellAllFish() {
      const prices = { bull_eye: 20, silver_fish: 20, salmon: 15, trout: 15 };
      let earned = 0;
      Object.keys(prices).forEach(k => {
          const c = this.player.fish[k] || 0;
          earned += c * prices[k];
          this.player.fish[k] = 0;
      });
      if (earned === 0) {
          this.showToast("🐟 You have no fish in your bag to sell! Press [C] near water to fish.");
          return;
      }
      this.player.coins += earned;
      sfx.coin();
      this.showToast(`💰 Sold all caught fish for $${earned} (${earned} Coins)!`);
      this.renderFishMarket();
      this.updateHUD();
  },

  /**
   * ART SHOP: FLOWERS -> DYES, SHADE MIXING ("S"), SLEEVES/SHORTS & FULL/SINGLE COLORING
   */
  openArtShop() {
      document.getElementById('art-shop-modal').classList.remove('hidden');
      this.backFromWorkbenchToArtHome();
      this.refreshArtShopUI();
  },

  closeArtShop() {
      document.getElementById('art-shop-modal').classList.add('hidden');
  },

  refreshArtShopUI() {
      document.getElementById('art-coins-count').textContent = this.player.coins;
      // Flowers list
      const flEl = document.getElementById('art-flowers-list');
      flEl.innerHTML = Object.entries(this.player.flowers).map(([color, count]) => `
          <div class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 flex justify-between items-center text-xs">
              <span>🌸 ${color} Flower</span>
              <span class="font-bold text-amber-300">x${count}</span>
          </div>
      `).join('');

      // Populate Mixing Dropdowns
      const allColors = [...this.player.dyes, ...this.player.shades];
      const opts = allColors.map((c, idx) => `<option value="${idx}">${c.name}</option>`).join('');
      document.getElementById('mix-color-a').innerHTML = opts;
      document.getElementById('mix-color-b').innerHTML = opts;

      // Render Custom "S" Shades Preview
      const sp = document.getElementById('custom-shades-preview');
      sp.innerHTML = this.player.shades.map(s => `
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-white/40" style="background:${s.hex}; color:#0f172a;">
              ${s.name}
          </div>
      `).join('');

      // Sleeve & Pants toggle labels
      document.getElementById('btn-toggle-sleeves').textContent = `👕 Shirt: ${this.player.sleeveStyle === 'long' ? 'Long-Sleeve' : 'Short-Sleeve'}`;
      document.getElementById('btn-toggle-pants').textContent = `👖 Legs: ${this.player.pantsStyle === 'pants' ? 'Pants' : 'Shorts'}`;
  },

  convertAllFlowersToDye() {
      const mapHex = { Red: '#ef4444', Blue: '#3b82f6', Yellow: '#eab308', White: '#f8fafc', Black: '#1e293b' };
      let converted = 0;
      Object.keys(this.player.flowers).forEach(color => {
          const count = this.player.flowers[color] || 0;
          if (count > 0) {
              converted += count;
              this.player.flowers[color] = 0;
              if (!this.player.dyes.some(d => d.name === color)) {
                  this.player.dyes.push({ name: color, hex: mapHex[color] || '#10b981' });
              }
          }
      });
      sfx.unlock();
      this.showToast(converted > 0 ? `🌸 Turned ${converted} Flowers into fresh matching Dyes!` : `🌸 All your picked flowers are already turned into Dye!`);
      this.refreshArtShopUI();
  },

  mixSelectedColors() {
      const all = [...this.player.dyes, ...this.player.shades];
      const a = all[document.getElementById('mix-color-a').value] || all[0];
      const b = all[document.getElementById('mix-color-b').value] || all[1];
      if (!a || !b) return;

      // Blend RGB hex values to create custom shades (light blue, pink, orange, purple, etc.)
      const rgbA = this.hexToRgb(a.hex);
      const rgbB = this.hexToRgb(b.hex);
      const mixedHex = this.rgbToHex(
          Math.round((rgbA.r + rgbB.r) / 2),
          Math.round((rgbA.g + rgbB.g) / 2),
          Math.round((rgbA.b + rgbB.b) / 2)
      );

      // Friendly shade naming
      const pair = [a.name, b.name].sort().join('+');
      const namedCombos = {
          'Red+Yellow': 'Orange',
          'Blue+Red': 'Purple',
          'Blue+White': 'Light Blue',
          'Red+White': 'Pink',
          'Blue+Yellow': 'Emerald Teal',
          'Black+Red': 'Crimson Shade',
          'Black+Blue': 'Midnight Shade',
          'Green+White': 'Mint Shade'
      };
      const shadeName = namedCombos[pair] || `${a.name}-${b.name} Shade`;
      if (!this.player.shades.some(s => s.hex.toLowerCase() === mixedHex.toLowerCase())) {
          this.player.shades.push({ name: shadeName, hex: mixedHex });
      }
      sfx.heal();
      this.showToast(`🧪 Mixed ${a.name} + ${b.name} into "${shadeName}"! Saved under the "S" Shades button!`);
      this.refreshArtShopUI();
  },

  toggleSleeveStyle() {
      this.player.sleeveStyle = this.player.sleeveStyle === 'long' ? 'short' : 'long';
      sfx.heal();
      this.refreshArtShopUI();
  },

  togglePantsStyle() {
      this.player.pantsStyle = this.player.pantsStyle === 'pants' ? 'shorts' : 'pants';
      sfx.heal();
      this.refreshArtShopUI();
  },

  openColoringScreen(mode) {
      this.artMode = mode; // 'full', 'hat', 'tunic', 'legs'
      this.tempColors = {
          hat: this.player.hatColor,
          tunic: this.player.tunicColor,
          legs: this.player.legsColor
      };
      this.showShadesPalette = false;

      document.getElementById('art-view-home').classList.add('hidden');
      document.getElementById('art-view-confirm').classList.add('hidden');
      document.getElementById('art-view-workbench').classList.remove('hidden');

      const selectorBar = document.getElementById('workbench-piece-selector');
      if (mode === 'full') {
          this.workbenchTarget = 'all';
          selectorBar.classList.remove('hidden');
          document.getElementById('workbench-mode-title').textContent = 'FULL COLOR (HAT → TUNIC & STRAP → LEGS) — 15 COINS';
      } else {
          this.workbenchTarget = mode;
          selectorBar.classList.add('hidden');
          document.getElementById('workbench-mode-title').textContent = `SINGLE PIECE COLOR (${mode.toUpperCase()}) — 5 COINS`;
      }

      this.setWorkbenchTargetPiece(this.workbenchTarget);
      this.renderWorkbenchSwatches();
      this.renderArtWorkbenchCanvas();
  },

  setWorkbenchTargetPiece(target) {
      this.workbenchTarget = target;
      ['all', 'hat', 'tunic', 'legs'].forEach(k => {
          const btn = document.getElementById(`wb-piece-${k}`);
          if (btn) btn.className = (k === target) ? 'hd-btn px-3 py-1 text-xs' : 'hd-btn-secondary px-3 py-1 text-xs';
      });
      this.renderArtWorkbenchCanvas();
  },

  toggleArtShadesPalette() {
      this.showShadesPalette = !this.showShadesPalette;
      this.renderWorkbenchSwatches();
  },

  renderWorkbenchSwatches() {
      const grid = document.getElementById('workbench-swatches');
      const heading = document.getElementById('palette-heading');
      const list = this.showShadesPalette ? this.player.shades : this.player.dyes;

      heading.textContent = this.showShadesPalette
          ? '✨ "S" SHADES & CUSTOM MIXED COLORS'
          : '🎨 STANDARD FLOWER DYE CANVAS';

      grid.innerHTML = list.map(c => `
          <button onclick="game.applyWorkbenchColor('${c.hex}')" class="flex flex-col items-center p-2 rounded-xl border-2 border-white/70 hover:scale-105 transition shadow-md" style="background:${c.hex};">
              <span class="px-1.5 py-0.5 rounded bg-slate-950/75 text-[10px] font-bold text-white">${c.name}</span>
          </button>
      `).join('');
  },

  applyWorkbenchColor(hex) {
      sfx.heal();
      if (this.artMode === 'full') {
          if (this.workbenchTarget === 'all') {
              this.tempColors.hat = hex;
              this.tempColors.tunic = hex;
              this.tempColors.legs = hex;
          } else {
              this.tempColors[this.workbenchTarget] = hex;
          }
      } else {
          this.tempColors[this.artMode] = hex;
      }
      this.renderArtWorkbenchCanvas();
  },

  renderArtWorkbenchCanvas() {
      const c = document.getElementById('artWorkbenchCanvas');
      if (!c) return;
      const wctx = c.getContext('2d');
      wctx.imageSmoothingEnabled = false;
      wctx.clearRect(0, 0, c.width, c.height);

      // Stacked Up-to-Down 1980s Cubic Pixel Armor Display (ZERO curves!)
      // 1. HAT (Top)
      wctx.save();
      wctx.translate(120, 48);
      wctx.fillStyle = this.tempColors.hat;
      wctx.fillRect(-32, -8, 64, 20);
      wctx.fillRect(-20, -22, 48, 14);
      wctx.strokeStyle = '#fef08a'; wctx.lineWidth = 2;
      wctx.strokeRect(-32, -8, 64, 20);
      wctx.fillStyle = '#94a3b8'; wctx.font = 'bold 14px VT323';
      wctx.fillText('1. HAT', -95, 5);
      wctx.restore();

      // 2. TUNIC + SHOULDER STRAP (Middle)
      wctx.save();
      wctx.translate(120, 132);
      wctx.fillStyle = this.tempColors.tunic;
      const sleeveLen = this.player.sleeveStyle === 'long' ? 48 : 28;
      wctx.fillRect(-sleeveLen, -26, sleeveLen * 2, 18);
      if (this.player.gender === 'female') {
          wctx.fillRect(-26, -28, 52, 36);
          wctx.fillRect(-34, 8, 68, 22);
      } else {
          wctx.fillRect(-26, -28, 52, 56);
      }
      wctx.strokeStyle = '#ffffff'; wctx.lineWidth = 2;
      wctx.strokeRect(-26, -28, 52, 56);

      // Stepped Blocky Shoulder-to-Waist Strap (COLORABLE with Tunic!)
      wctx.fillStyle = this.tempColors.tunic;
      for (let s = 0; s < 5; s++) {
          wctx.fillRect(-20 + s * 8, -22 + s * 6, 10, 8);
      }

      // Fixed Leather Waist Belt (CANNOT be colored)
      wctx.fillStyle = '#78350f';
      wctx.fillRect(-28, 8, 56, 10);
      wctx.fillStyle = '#facc15';
      wctx.fillRect(-7, 7, 14, 12);

      wctx.fillStyle = '#94a3b8'; wctx.font = 'bold 14px VT323';
      wctx.fillText('2. TUNIC & STRAP', -112, -5);
      wctx.fillStyle = '#facc15'; wctx.font = '13px VT323';
      wctx.fillText('(Waist Belt Fixed)', -112, 12);
      wctx.restore();

      // 3. LEGS (Bottom - Pants vs Shorts)
      wctx.save();
      wctx.translate(120, 222);
      const legH = this.player.pantsStyle === 'pants' ? 38 : 20;
      wctx.fillStyle = this.tempColors.legs;
      wctx.fillRect(-22, -16, 18, legH);
      wctx.fillRect(4, -16, 18, legH);
      wctx.strokeStyle = '#fef08a'; wctx.lineWidth = 2;
      wctx.strokeRect(-22, -16, 18, legH);
      wctx.strokeRect(4, -16, 18, legH);
      wctx.fillStyle = '#94a3b8'; wctx.font = 'bold 14px VT323';
      wctx.fillText(`3. LEGS (${this.player.pantsStyle.toUpperCase()})`, -112, 6);
      wctx.restore();
  },

  backFromWorkbenchToArtHome() {
      document.getElementById('art-view-workbench').classList.add('hidden');
      document.getElementById('art-view-confirm').classList.add('hidden');
      document.getElementById('art-view-home').classList.remove('hidden');
  },

  proceedToArtConfirm() {
      const cost = this.artMode === 'full' ? 15 : 5;
      document.getElementById('art-view-workbench').classList.add('hidden');
      document.getElementById('art-view-confirm').classList.remove('hidden');
      document.getElementById('art-confirm-message').textContent =
          `Are you really okay with this? You are about to spend ${cost} coins.`;
  },

  backFromConfirmToWorkbench() {
      document.getElementById('art-view-confirm').classList.add('hidden');
      document.getElementById('art-view-workbench').classList.remove('hidden');
  },

  confirmArtPurchase() {
      const cost = this.artMode === 'full' ? 15 : 5;
      if (this.player.coins < cost) {
          sfx.hurt();
          this.showToast(`🪙 Not enough coins! You need ${cost} coins. Catch fish and sell them at the Village Market!`);
          this.backFromConfirmToWorkbench();
          return;
      }
      this.player.coins -= cost;
      this.player.hatColor = this.tempColors.hat;
      this.player.tunicColor = this.tempColors.tunic;
      this.player.legsColor = this.tempColors.legs;
      sfx.unlock();
      this.saveCurrentWorld();
      this.updateHUD();
      this.closeArtShop();
      this.showToast(`🎨 Spent ${cost} coins! Your customized tunic, hat, and legs look amazing!`);
  },

  hexToRgb(hex) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  },

  rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  /**
   * INVENTORY MODAL ([I]), SPLIT-PANE QUEST LOG ([J]), & WORLD MAP ([M])
   */
  toggleInventoryModal() {
      const el = document.getElementById('inventory-modal');
      el.classList.toggle('hidden');
      if (!el.classList.contains('hidden')) {
          const ic = document.getElementById('invHeroCanvas');
          const ictx = ic.getContext('2d');
          ictx.imageSmoothingEnabled = false;
          ictx.clearRect(0, 0, ic.width, ic.height);
          this.drawSmoothCharacter(ictx, 60, 72, 1.45, this.player);

          document.getElementById('inv-armor-details').innerHTML = `
              <div class="font-bold text-amber-300">Armor Level ${this.player.armorLevel}</div>
              <div>P1 Style: ${this.player.gender === 'female' ? 'Female' : 'Male'} (${this.player.outfit === 'diver' ? '🤿 Diving Suit' : '👕 Tunic'})</div>
              <div>P2 Style: ${this.player2.gender === 'female' ? 'Female' : 'Male'} (${this.player2.outfit === 'diver' ? '🤿 Diving Suit' : '👕 Tunic'})</div>
              <div>Diving Gear: ${this.player.hasDivingGear ? 'Unlocked (Flippers Active in Water)' : 'Find Submarine in West Ocean'}</div>
          `;
          document.getElementById('inv-weapons-list').innerHTML = `
              <div>🗡️ <strong>Slot [1] Sword:</strong> ${this.player.weapon === 'iron_sword' ? 'Iron Sword (10 DMG)' : 'Wooden Sword (5 DMG)'} ${this.player.activeMeleeSlot === 'sword' ? '<span class="text-emerald-400">[EQUIPPED]</span>' : ''}</div>
              <div>🔥 <strong>Slot [2] Claymore:</strong> ${this.player.hasFireClaymore ? 'Fire Claymore (12 DMG, Slow, Huge Reach)' : 'Locked (Volcano Boss)'} ${this.player.activeMeleeSlot === 'fire_claymore' ? '<span class="text-orange-400">[EQUIPPED]</span>' : ''}</div>
              <div>🏹 <strong>Bow:</strong> ${this.player.hasIceTripleBow ? '❄️ Triple-Shot Ice Bow (' + this.player.arrows + ' Arrows)' : (this.player.hasBow ? 'Bow (' + this.player.arrows + ' Arrows)' : 'Locked')}</div>
              <div>🌊 <strong>Wave Launcher [V]:</strong> ${this.player.hasWaveLauncher ? 'Unlocked (Summons Waves)' : 'Locked (Water Boss)'}</div>
              <div class="pt-1 text-amber-300 font-bold">🪙 Total Coins: ${this.player.coins}</div>
          `;
          const f = this.player.fish;
          document.getElementById('inv-food-list').innerHTML = `
              <div>🥩 <strong>Pork:</strong> ${this.player.pork} (+1❤️)</div>
              <div>🍎 <strong>Golden Apples:</strong> ${this.player.goldenApples} (+1💛)</div>
              <div class="border-t border-slate-700 pt-1 mt-1 font-bold text-sky-300">Caught Fish: 🎣</div>
              <div>• Salmon ($15): ${f.salmon || 0} | Trout ($15): ${f.trout || 0}</div>
              <div>• Silver Fish ($20): ${f.silver_fish || 0} | Bull Eye ($20): ${f.bull_eye || 0}</div>
              <div class="text-[11px] text-slate-400 mt-1">Catch preview uses Sunnyside fish art when loaded.</div>
          `;
      }
  },

  toggleQuestModal() {
      const el = document.getElementById('quest-modal');
      el.classList.toggle('hidden');
      if (!el.classList.contains('hidden')) {
          this.renderSplitQuestLog();
      }
  },

  renderSplitQuestLog() {
      const listPane = document.getElementById('quest-list-pane');
      const detailPane = document.getElementById('quest-detail-pane');

      listPane.innerHTML = Object.entries(this.quests).map(([key, q]) => {
          const isSel = key === this.selectedQuestKey;
          const badge = q.status === 'completed' ? '✅' : (q.current >= q.target ? '🌟 Ready' : `${q.current}/${q.target}`);
          return `
              <div onclick="game.selectQuestInLog('${key}')" class="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${isSel ? 'bg-amber-500/20 border-amber-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}">
                  <div>
                      <div class="text-sm font-bold text-white">${q.title}</div>
                      <div class="text-[11px] text-slate-400">${q.giver}</div>
                  </div>
                  <span class="text-xs font-bold text-amber-300">${badge}</span>
              </div>
          `;
      }).join('');

      const sq = this.quests[this.selectedQuestKey] || this.quests.farming;
      const pct = Math.min(100, Math.round((sq.current / sq.target) * 100));
      detailPane.innerHTML = `
          <div>
              <div class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">${sq.giver}</div>
              <h3 class="title-font text-lg font-bold text-white mb-2">${sq.title}</h3>
              <p class="text-xs text-slate-200 leading-relaxed mb-4">${sq.desc}</p>
              <div class="mb-2 flex justify-between text-xs font-bold">
                  <span>Objective Progress</span>
                  <span class="text-emerald-300">${sq.current} / ${sq.target} (${pct}%)</span>
              </div>
              <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700 mb-4">
                  <div class="h-full bg-gradient-to-r from-emerald-500 to-amber-400" style="width:${pct}%"></div>
              </div>
          </div>
          <div class="bg-slate-950 border border-amber-500/40 rounded-xl p-3">
              <div class="text-xs text-amber-300 font-bold">🎁 Quest Reward:</div>
              <div class="text-xs text-slate-200">${sq.rewardText}</div>
          </div>
      `;
  },

  selectQuestInLog(key) {
      this.selectedQuestKey = key;
      this.renderSplitQuestLog();
  },

  toggleWorldMapModal() {
      const el = document.getElementById('map-modal');
      el.classList.toggle('hidden');
      if (!el.classList.contains('hidden')) {
          const grid = document.getElementById('flags-grid');
          grid.innerHTML = this.flags.map(f => `
              <div class="p-3.5 rounded-xl border ${f.conquered ? 'bg-slate-900 border-emerald-400' : 'bg-slate-900/50 border-slate-700 opacity-60'} flex flex-col justify-between gap-2">
                  <div>
                      <div class="text-sm font-bold ${f.conquered ? 'text-emerald-300' : 'text-slate-400'}">
                          ${f.conquered ? '🚩' : '🏳️'} ${f.name}
                      </div>
                      <div class="text-[11px] text-slate-400">Coords: (${f.x}, ${f.y})</div>
                  </div>
                  ${f.conquered
                      ? `<button onclick="game.fastTravelToFlag('${f.id}')" class="hd-btn py-1.5 text-xs w-full">⚡ Fast Travel Here</button>`
                      : `<span class="text-[11px] text-amber-300">Walk here & press [Q] to conquer</span>`
                  }
              </div>
          `).join('');
      }
  },

  fastTravelToFlag(flagId) {
      const f = this.flags.find(fl => fl.id === flagId);
      if (!f || !f.conquered) return;
      this.player.x = f.x * TILE;
      this.player.y = (f.y + 1) * TILE;
      document.getElementById('map-modal').classList.add('hidden');
      sfx.unlock();
      this.showToast(`⚡ Fast-traveled to ${f.name}!`);
  },

  handleNpcQuestDialog(key, npcName, coinsReward, porkReward, gappleReward) {
      const q = this.quests[key];
      if (q.status === 'completed') {
          this.showToast(`💬 ${npcName}: "Thank you for helping Oakvale Village, hero!"`);
          return;
      }
      if (q.current >= q.target) {
          this.completeQuest(key, coinsReward, porkReward, gappleReward);
      } else {
          sfx.heal();
          this.showToast(`💬 ${npcName}: "${q.desc} (Progress: ${q.current}/${q.target})"`);
      }
  },

  completeQuest(key, coinsReward, porkReward, gappleReward) {
      const q = this.quests[key];
      q.status = 'completed';
      this.player.coins += coinsReward;
      this.player.pork += porkReward;
      this.player.goldenApples += gappleReward;
      this.player.yellowHp += 1.0;
      sfx.unlock();
      this.addFloatingText(this.player.x, this.player.y - 24, `QUEST COMPLETE! +${coinsReward}🪙`, "#facc15");
      this.showToast(`🎉 Completed "${q.title}"! Received ${q.rewardText}!`);
      this.saveCurrentWorld();
      this.updateHUD();
      this.updateQuestTracker();
  },

  getNearestInteractable(actor = this.player) {
      let best = null;
      let bestDist = 56;
      for (const obj of this.interactables) {
          if (obj.type === 'flower' && obj.picked) continue;
          if ((obj.type === 'wheat' || obj.type === 'crop') && ((obj.stage ?? 5) < 5 || obj.harvested)) continue;
          const d = Math.hypot((obj.x + TILE / 2) - actor.x, (obj.y + TILE / 2) - actor.y);
          if (d < bestDist) {
              bestDist = d;
              best = obj;
          }
      }
      for (const npc of this.npcs) {
          const d = Math.hypot(npc.x - actor.x, npc.y - actor.y);
          if (d < bestDist) {
              bestDist = d;
              best = {
                  label: `Talk to ${npc.name} (${npc.role})`,
                  onInteract: () => npc.onTalk()
              };
          }
      }
      return best;
  },

  interact(actor = this.player) {
      if (this.activePuzzle) return;
      const near = this.getNearestInteractable(actor);
      if (near && near.onInteract) {
          near.onInteract(near);
      } else {
          this.showToast("🔍 Nothing nearby to inspect. Walk closer to a chest, pillar, villager, flag, or flower!");
      }
  },

  openPuzzleModal(cfg) {
      this.activePuzzle = {
          expectedCode: String(cfg.expectedCode),
          currentInput: "",
          onSuccess: cfg.onSuccess
      };
      document.getElementById('puzzle-title').textContent = cfg.title || "ANCIENT LOCK";
      document.getElementById('puzzle-desc').textContent = cfg.desc || "";
      document.getElementById('puzzle-hint').textContent = cfg.hint || "";
      document.getElementById('puzzle-input-display').textContent = "-".repeat(this.activePuzzle.expectedCode.length);
      document.getElementById('puzzle-modal').classList.remove('hidden');
  },

  closePuzzleModal() {
      this.activePuzzle = null;
      document.getElementById('puzzle-modal').classList.add('hidden');
  },

  pressKeypad(key) {
      if (!this.activePuzzle) return;
      const maxLen = this.activePuzzle.expectedCode.length;
      if (key === 'CLR') {
          this.activePuzzle.currentInput = "";
      } else if (key === 'OK') {
          if (this.activePuzzle.currentInput === this.activePuzzle.expectedCode) {
              const cb = this.activePuzzle.onSuccess;
              this.closePuzzleModal();
              if (cb) cb();
              return;
          } else {
              sfx.hurt();
              this.activePuzzle.currentInput = "";
              this.showToast("❌ Incorrect code! Inspect the clue pillars/objects carefully and try again.");
          }
      } else if (this.activePuzzle.currentInput.length < maxLen) {
          sfx.heal();
          this.activePuzzle.currentInput += key;
      }
      const padded = this.activePuzzle.currentInput.padEnd(maxLen, '-');
      document.getElementById('puzzle-input-display').textContent = padded;
  },

  updateHUD() {
      const renderHearts = (el, actor) => {
          if (!el) return;
          el.innerHTML = '';
          const totalRed = Math.ceil(actor.maxHp);
          for (let i = 1; i <= totalRed; i++) {
              const span = document.createElement('span');
              span.className = 'text-base leading-none';
              span.textContent = actor.hp >= i ? '❤️' : (actor.hp >= i - 0.5 ? '💔' : '🖤');
              el.appendChild(span);
          }
          const totalYellow = Math.ceil(actor.yellowHp);
          for (let i = 1; i <= totalYellow; i++) {
              const span = document.createElement('span');
              span.className = 'text-base leading-none';
              span.textContent = actor.yellowHp >= i ? '💛' : '⭐';
              el.appendChild(span);
          }
      };

      renderHearts(document.getElementById('hearts-container'), this.player);
      renderHearts(document.getElementById('p2-hearts-container'), this.player2);

      document.getElementById('hud-level').textContent = `LVL ${this.player.level}`;
      document.getElementById('hud-armor').textContent = `ARMOR LVL ${this.player.armorLevel}`;
      document.getElementById('hud-coins').textContent = this.player.coins;
      document.getElementById('hud-pork').textContent = this.player.pork;
      document.getElementById('hud-gapples').textContent = this.player.goldenApples;
      document.getElementById('hud-arrows').textContent = this.player.arrows;

      // Regular Sword Slot
      const mainSwordSlot = document.getElementById('slot-main-sword');
      if (this.player.weapon === 'iron_sword') {
          document.getElementById('sword-name').textContent = 'Iron Sword [1]';
          document.getElementById('sword-icon').textContent = '⚔️';
          const dmgLbl = document.getElementById('sword-dmg-label');
          if (dmgLbl) dmgLbl.textContent = '10 DMG • Fast';
      }
      if (mainSwordSlot) {
          mainSwordSlot.style.borderColor = this.player.activeMeleeSlot === 'sword' ? '#facc15' : '#475569';
      }

      // Separate Fire Claymore Slot
      const claymoreSlot = document.getElementById('slot-fire-claymore');
      const claymoreLbl = document.getElementById('claymore-status-label');
      if (this.player.hasFireClaymore) {
          claymoreSlot.classList.remove('opacity-55', 'border-slate-700');
          claymoreSlot.style.borderColor = this.player.activeMeleeSlot === 'fire_claymore' ? '#f97316' : '#64748b';
          if (claymoreLbl) claymoreLbl.textContent = this.player.activeMeleeSlot === 'fire_claymore' ? 'EQUIPPED (12 DMG)' : 'Ready (12 DMG)';
      }

      // Bow / Triple-Shot Ice Bow Slot
      if (this.player.hasBow) {
          const bowSlot = document.getElementById('slot-bow');
          bowSlot.classList.remove('opacity-60', 'border-slate-600');
          bowSlot.classList.add('border-emerald-400');
          if (this.player.hasIceTripleBow) {
              document.getElementById('ui-hud-bow').textContent = 'Ice Bow (3x)';
              document.getElementById('bow-icon').textContent = '❄️';
          }
      }

      // Wave Launcher Slot
      const waveSlot = document.getElementById('slot-wave-launcher');
      const waveLbl = document.getElementById('wave-launcher-label');
      if (this.player.hasWaveLauncher && waveSlot) {
          waveSlot.classList.remove('opacity-55', 'border-slate-700');
          waveSlot.classList.add('border-sky-400');
          if (waveLbl) waveLbl.textContent = 'Ready [V]';
      }
  },

  updateBossHUD(title = '⚔️ BOSS', hp = this.boss.hp, maxHp = this.boss.maxHp) {
      const titleEl = document.getElementById('boss-hud-title');
      if (titleEl) titleEl.textContent = title;
      document.getElementById('boss-hp-text').textContent = `${hp} / ${maxHp} HEARTS`;
      document.getElementById('boss-hp-bar').style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  },

  updateQuestTracker() {
      const p = this.dungeonProgress;
      const html = `
          <div class="text-amber-300 font-bold">🏰 TEMPLES & BOSSES</div>
          <div class="${p.chest1Opened ? 'line-through text-slate-500' : 'text-slate-200'}">• T1 Chest: 3 Torch Pillars</div>
          <div class="${p.bossDefeated ? 'line-through text-emerald-400' : 'text-slate-200'}">• T1 Boss: West+East+Altar</div>
          <div class="${p.temple2BossDefeated ? 'line-through text-emerald-400' : 'text-sky-300'}">• T2 Gate: Crystal Obelisk</div>
          <div class="${p.fireBossDefeated ? 'line-through text-emerald-400' : 'text-orange-300'}">• East Volcano: 4 Obsidian Pillars & Fire Boss</div>
          <div class="${p.waterBossDefeated ? 'line-through text-emerald-400' : 'text-cyan-300'}">• West Ocean: Submarine & Water Boss</div>
          <div class="border-t border-slate-700 my-1 pt-1 text-amber-300 font-bold">🏘️ VILLAGE QUESTS [J]</div>
          ${Object.values(this.quests).map(q => `
              <div class="${q.status === 'completed' ? 'line-through text-emerald-400' : 'text-slate-200'}">• ${q.title}: ${q.current}/${q.target}</div>
          `).join('')}
      `;
      document.getElementById('quest-body').innerHTML = html;
  },

  addFloatingText(x, y, text, color = "#ffffff") {
      this.floatingTexts.push({ x, y, text, color, life: 1.1 });
  },

  /**
   * Swap a few HUD/title emoji for Sunnyside UI icons when those PNGs loaded.
   * Safe no-op if assets failed — emoji stay visible.
   */
  refreshSpriteUI() {
      const swordImg = assets.getImage('ui_sword');
      const titleImg = document.getElementById('title-sword-icon');
      const titleEmoji = document.getElementById('title-sword-emoji');
      if (swordImg && titleImg && titleEmoji) {
          titleImg.src = swordImg.src;
          titleImg.classList.remove('hidden');
          titleEmoji.classList.add('hidden');
      }
      const hudIcon = document.getElementById('sword-icon');
      if (swordImg && hudIcon) {
          hudIcon.textContent = '';
          const img = document.createElement('img');
          img.src = swordImg.src;
          img.alt = 'Sword';
          img.width = 18;
          img.height = 18;
          img.style.imageRendering = 'pixelated';
          img.className = 'inline-block align-middle';
          hudIcon.appendChild(img);
      }
  },

  showToast(msg) {
      const box = document.getElementById('toast-box');
      document.getElementById('toast-text').textContent = msg;
      box.classList.remove('hidden');
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => box.classList.add('hidden'), 5000);
  }
};
