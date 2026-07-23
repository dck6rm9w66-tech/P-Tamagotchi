/* Pausentamagotchi - Belohnungs-Animationen, Toene, Pfleger-Level, Freischaltungen */
const CONFETTI_SETS = {
    medal:    ['🏅', '✨', '🎉', '⭐'],
    level:    ['🎓', '⭐', '✨', '🌟'],
    unlock:   ['🔓', '✨', '💫'],
    ticket:   ['🎫', '✨', '🎉'],
    discover: ['📖', '✨', '💫'],
    building: ['🏗️', '✨', '🎉'],
    ergo:     ['🌿', '💪', '✨'],
    generic:  ['🎉', '✨', '⭐']
};
const BANNER_SOUNDS = { medal: 'achievement', level: 'achievement', building: 'achievement', ticket: 'ticket', unlock: 'sparkle', discover: 'sparkle', ergo: 'ergo', generic: 'achievement' };
const BANNER_HEADERS = {
    medal: 'Medaille freigeschaltet!', level: 'Level-Aufstieg!', building: 'Wolkendorf-Ausbau!',
    ticket: 'Quest erledigt!', unlock: 'Freigeschaltet!', discover: 'Neuentdeckung!',
    ergo: 'Gut für dich!', generic: 'Geschafft!'
};

// Lässt ein paar Emoji-Konfetti-Partikel vom oberen Bildschirmrand fallen — als visuelle Belohnung
function spawnConfetti(type) {
    try {
        let emojis = CONFETTI_SETS[type] || CONFETTI_SETS.generic;
        let count = 12;
        for (let i = 0; i < count; i++) {
            let el = document.createElement('div');
            el.className = 'confetti-particle';
            el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            let leftVw = 25 + Math.random() * 50; // mittig gestreut, nahe der Banner-Position
            el.style.left = leftVw + 'vw';
            let duration = 1.5 + Math.random() * 1.1;
            el.style.fontSize = (14 + Math.random() * 14) + 'px';
            el.style.animationDuration = duration + 's';
            el.style.animationDelay = (Math.random() * 0.25) + 's';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), (duration + 0.5) * 1000);
        }
    } catch (e) {}
}

// Lässt einen kurzen "+X" Belohnungstext über einem UI-Element aufsteigen (Tickets, T-Coins, XP, ...)
function spawnFloatText(targetElId, text, color) {
    try {
        let target = document.getElementById(targetElId);
        if (!target) return;
        let rect = target.getBoundingClientRect();
        let el = document.createElement('div');
        el.className = 'float-reward-text';
        el.innerText = text;
        el.style.left = (rect.left + rect.width / 2) + 'px';
        el.style.top = rect.top + 'px';
        el.style.color = color || '#ffffff';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
        bumpElement(targetElId);
    } catch (e) {}
}

// Lässt ein UI-Element (z.B. Badge) kurz "pulsieren", um Veränderungen spürbar zu machen
function bumpElement(targetElId) {
    try {
        let target = document.getElementById(targetElId);
        if (!target) return;
        target.classList.remove('pulse-bump');
        void target.offsetWidth; // Reflow erzwingen, damit die Animation neu startet
        target.classList.add('pulse-bump');
    } catch (e) {}
}

let achBannerTimeout = null;
function showAchievementBanner(icon, title, type) {
    type = type || 'generic';
    playSound(BANNER_SOUNDS[type] || 'achievement');
    let banner = document.getElementById('achBanner');
    document.getElementById('achHeader').innerText = BANNER_HEADERS[type] || BANNER_HEADERS.generic;
    document.getElementById('achIcon').innerText = icon;
    document.getElementById('achTitle').innerText = title;
    banner.classList.add('show');
    spawnConfetti(type);
    clearTimeout(achBannerTimeout);
    achBannerTimeout = setTimeout(() => closeAchievementBanner(), 4000);
}

function closeAchievementBanner() {
    document.getElementById('achBanner').classList.remove('show');
}

function openMedalModal() {
    playSound('select');
    let counts = [0,0,0,0];
    ACHIEVEMENTS.forEach(a => { let t = getMedalTier(a.id); if (t > 0) counts[t-1]++; });
    document.getElementById('medalProgressText').innerHTML =
        `${getUnlockedMedalCount()} / ${ACHIEVEMENTS.length} ${t('freigeschaltet')} &nbsp;·&nbsp; 🥉${counts[0]} 🥈${counts[1]} 🥇${counts[2]} 💎${counts[3]}`;

    let grid = document.getElementById('medalGrid'); grid.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
        let tier = getMedalTier(ach.id);
        let isUnlocked = tier > 0;
        let meta = isUnlocked ? MEDAL_TIERS[tier - 1] : null;
        let ring = isUnlocked ? `box-shadow: 0 0 0 2px ${meta.color}; ` : '';
        grid.innerHTML += `
            <div class="medal-item ${isUnlocked ? 'unlocked' : ''}" style="${ring}" onclick="showMedalDetail(${ach.id})">
                <div class="medal-icon">${isUnlocked ? ach.icon : '🔒'}</div>
                <div class="medal-title-min">${isUnlocked ? t(ach.title) : '???'}</div>
                <div style="font-size:10px; line-height:1; margin-top:2px;">${isUnlocked ? meta.badge : '<span style="opacity:0.25;">🥉</span>'}</div>
            </div>`;
    });
    document.getElementById('medalDetail').style.display = 'none';
    document.getElementById('medalModal').style.display = 'flex';
}

function showMedalDetail(id) {
    playSound('beep');
    let ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    let tier = getMedalTier(ach.id);
    let isUnlocked = tier > 0;
    let value = ach.metric(pet);

    document.getElementById('mdTitle').innerHTML = isUnlocked
        ? `${ach.icon} ${t(ach.title)} <span style="color:${MEDAL_TIERS[tier-1].text};">${MEDAL_TIERS[tier-1].badge} ${t(MEDAL_TIERS[tier-1].name)}</span>`
        : `🔒 ${t('Geheim')}`;

    if (!isUnlocked) {
        document.getElementById('mdDesc').innerHTML = t('Bedingung noch nicht erfüllt.');
        document.getElementById('medalDetail').style.display = 'block';
        return;
    }

    // Stufen-Übersicht mit Fortschritt zur nächsten Stufe
    let rows = MEDAL_TIERS.map((m, i) => {
        let need = ach.tiers[i];
        let done = tier >= m.n;
        return `<div style="display:flex; align-items:center; gap:6px; padding:1px 0; ${done ? '' : 'opacity:0.45;'}">
                <span>${done ? m.badge : '🔒'}</span>
                <span style="flex:1; text-align:left; color:${done ? m.text : '#576574'}; font-weight:${done ? 'bold' : 'normal'};">${m.name}</span>
                <span style="color:#576574;">${fmtMedalValue(ach, need)}</span>
            </div>`;
    }).join('');

    let progress = '';
    if (tier < 4) {
        let need = ach.tiers[tier];
        let pct = ach.lower
            ? Math.min(100, Math.max(0, (need / Math.max(value, 0.0001)) * 100))
            : Math.min(100, (value / need) * 100);
        progress = `
            <div style="margin-top:6px;">
                <div class="quest-bar-bg" style="height:6px;"><div class="quest-bar-fill" style="width:${pct}%; background:${MEDAL_TIERS[tier].color};"></div></div>
                <div style="font-size:9px; color:#576574; margin-top:2px;">Aktuell: ${fmtMedalValue(ach, value)} → ${MEDAL_TIERS[tier].name} bei ${fmtMedalValue(ach, need)}</div>
            </div>`;
    } else {
        progress = `<div style="font-size:10px; color:#0b6b7d; font-weight:bold; margin-top:6px;">💎 Höchste Stufe erreicht!</div>`;
    }

    document.getElementById('mdDesc').innerHTML =
        `<div style="margin-bottom:6px;">${t(ach.desc)}</div>
         <div style="font-size:10px;">${rows}</div>${progress}`;
    document.getElementById('medalDetail').style.display = 'block';
}

// ================================================================
// === FEATURE: PFLEGER-LEVEL (ACCOUNT-XP) ========================
// ================================================================
let accountLevel = parseInt(safeGetItem('tama_acc_level') || '1');
let accountXP = parseInt(safeGetItem('tama_acc_xp') || '0');

// Kategorien & Inhalte, die erst ab einem bestimmten Pfleger-Level sichtbar werden
const SHOP_CATEGORY_MIN_LEVEL = {
    '🍔 Essen & Trinken':     1,   // Grundversorgung - sofort
    '💊 Apotheke & Heilung':  2,   // Heilung & Rettung
    '🎩 Hüte & Accessoires':  4,   // Erste Kosmetik
    '🎨 Lacke & Skins':       4,   // Tiefergehende Individualisierung
    '🧪 Buffs & Substanzen': 19,   // Starke Buffs & riskante Substanzen - spaetes Spiel
    '🎟️ Events & Dating':   14,
    '🕹️ Arcade-Automaten':    5,
    '🏕️ Hobbys & Abenteuer':  8,
    '✖️ Multiplikatoren':    17,
    '👿 Debuffs & Trolle':   21,
    '💳 Abos & Mikros':      25,
    '🌟 Pfleger-Elite':      30
};

const LEVEL_UNLOCKS = [
    { level: 2,  name: '💊 Shop-Kategorie: Apotheke & Heilung' },
    { level: 4,  name: '🎩 Shop-Kategorie: Hüte & Accessoires' },
    { level: 4,  name: '🎨 Shop-Kategorie: Lacke & Skins' },
    { level: 5,  name: '🕹️ Shop-Kategorie: Arcade-Automaten' },
    { level: 5,  name: '🥚 Seltene Ei-Farbe: Sonnenuntergang' },
    { level: 8,  name: '🏕️ Shop-Kategorie: Hobbys & Abenteuer' },
    { level: 9,  name: '🏆 Büro-Highscores' },
    { level: 10, name: '🥚 Seltene Ei-Farbe: Galaxie' },
    { level: 11, name: '🧪 Shop-Kategorie: Buffs & Substanzen' },
    { level: 12, name: '🔭 Endgame: Wolkendorf-Fernrohr & Vermächtnis' },
    { level: 14, name: '🎟️ Shop-Kategorie: Events & Dating' },
    { level: 16, name: '🥚 Seltene Ei-Farbe: Tiefsee' },
    { level: 17, name: '✖️ Shop-Kategorie: Multiplikatoren' },
    { level: 21, name: '👿 Shop-Kategorie: Debuffs & Trolle' },
    { level: 23, name: '🥚 Seltene Ei-Farbe: Mitternacht' },
    { level: 25, name: '💳 Shop-Kategorie: Abos & Mikros' },
    { level: 30, name: '🌟 Shop-Kategorie: Pfleger-Elite' },
    { level: 32, name: '🥚 Seltene Ei-Farbe: Diamant' }
];

// Sanftere XP-Kurve, damit auch die hohen Freischalt-Level (bis 32) über
// längeres Spielen erreichbar bleiben.
function xpNeededForLevel(lvl) { return 60 + (lvl - 1) * 22; }

// ================================================================
// === FEATURE: PROGRESSIVE FEATURE-UNLOCKING BY PFLEGER-LEVEL ====
// ================================================================
// Alle Buttons außer Shop, Sound, Münzen, Info und dem Level-Badge
// sind anfangs gesperrt und schalten sich mit steigendem Pfleger-Level frei.
// Gesperrte Buttons zeigen eine graue Silhouette + 🔒-Badge.
// Bei der Freischaltung erscheint ein Popup-Modal mit kurzer Feature-Erklärung.

const FEATURE_LOCK_CONFIG = [
    { btnId: 'btn-pomodoro',    minLevel: 1, icon: '🍅', name: 'Pomodoro-Fokus',
      desc: 'Arbeite 25 Minuten fokussiert, während dein Tamagotchi schläft. Der Timer läuft sogar weiter, wenn du das Fenster schliesst. Nach erfolgreicher Session gibt\'s Coins, Tickets & Pfleger-XP.',
      onclick: "openPomodoroModal()", title: "Pomodoro-Fokus" },
    { btnId: 'btn-quests',      minLevel: 1, icon: '📋', name: 'Tages-Quests',
      desc: 'Erfülle täglich 3 Aufgaben: den Wassercheck, eine Ergonomie-Quest und eine sonstige Tagesquest. Dein Lohn: 🎫 Tickets für den Wolkendorf-Ausbau.',
      onclick: "openQuestModal()", title: "Tages-Quests" },
    { btnId: 'btn-pokedex',     minLevel: 2, icon: '📖', name: 'Wolkendorf-Tagebuch',
      desc: 'Entdecke alle 16 Tier-Spezies des Wolkendorfs. Jede Spezies bekommt einen eigenen Eintrag, sobald dein Tamagotchi zum Erwachsenen herangewachsen ist.',
      onclick: "openPokedexModal()", title: "Wolkendorf-Tagebuch" },
    { btnId: 'btn-graveyard',   minLevel: 3, icon: '💀', name: 'Ahnengalerie',
      desc: 'Alle deine vergangenen Tamagotchis ruhen hier. Ihre Leistungen, ihr Alter und ihre Geschichten bleiben für immer festgehalten.',
      onclick: "openGraveyardModal()", title: "Ahnengalerie / Friedhof" },
    { btnId: 'btn-leaderboard', minLevel: 9, icon: '🏆', name: 'Büro-Highscores',
      desc: 'Vier Bestenlisten in einem: längstes Überleben, PvP-Siege, Mini-Boss-Siege und Arcade-Punkte. Tauscht eure Steckbrief-JSONs aus und vergleicht euch im Büro!',
      onclick: "openLeaderboardModal()", title: "Highscores" },
    { btnId: 'btn-village',     minLevel: 6, icon: '🏘️', name: 'Wolkendorf-Ausbau',
      desc: 'Baue und verbessere 10 Gebäude mit je 12 Stufen! Jedes Gebäude bringt dauerhafte Boni für alle zukünftigen Tamagotchis – bezahlt mit 🎫 Tickets.',
      onclick: "openVillageModal()", title: "Wolkendorf-Ausbau" },
    { btnId: 'btn-arena',       minLevel: 8, icon: '⚔️', name: 'Wolkendorf-Arena',
      desc: 'Die härteste Herausforderung! Kämpfe gegen 5 Minibosse oder importiere die JSON eines Mitspielers für ein episches Tamagotchi-Duell. Seltene Boss-Trophäen warten!',
      onclick: "openArenaModal()", title: "Wolkendorf-Arena" },
    { btnId: 'btn-endgame',     minLevel: 12, icon: '🔭', name: 'Wolkendorf-Fernrohr',
      desc: 'Das Endgame! Beobachte dein Tamagotchi im Wolkendorf und schicke ihm täglich bis zu 3 Geschenke. Jedes Geschenk hebt einen zufälligen Stat DAUERHAFT um 0,5% – für alle zukünftigen Tamagotchis.',
      onclick: "openEndgameModal()", title: "Wolkendorf-Fernrohr" },
    { btnId: 'btn-arcade',      minLevel: 5, icon: '🕹️', name: 'Arcade-Automaten',
      desc: 'Kaufe im Shop drei herausgezoomte 80er-Retro-Spiele (Space Invaders, Pong, Defender) und spiele sie mit deinem ganzen Ei als Spielfigur!',
      onclick: "openArcadeMenu()", title: "Arcade-Automaten" },
];

// Setzt alle Buttons auf den aktuellen Sperr-/Freischalt-Status
function updateFeatureLocks() {
    FEATURE_LOCK_CONFIG.forEach(f => {
        let el = document.getElementById(f.btnId);
        if (!el) return;
        let isUnlocked = accountLevel >= f.minLevel;
        if (isUnlocked) {
            el.classList.remove('feat-locked');
            el.style.cursor = '';
            el.onclick = null;
            el.setAttribute('onclick', f.onclick);
            el.title = f.title;
            let badge = el.querySelector('.feat-lock-badge');
            if (badge) badge.remove();
        } else {
            el.classList.add('feat-locked');
            el.removeAttribute('onclick');
            el.title = `🔒 Verfügbar ab Pfleger-Level ${f.minLevel}`;
            // Mobile: kurzen Hinweis per Tap
            el.onclick = () => showLockHint(f.minLevel, f.name);
            if (!el.querySelector('.feat-lock-badge')) {
                let badge = document.createElement('span');
                badge.className = 'feat-lock-badge';
                badge.innerText = '🔒';
                el.style.position = 'relative';
                el.appendChild(badge);
            }
        }
    });
}

// Kurzer Toast bei Tap auf gesperrten Button (Mobile-Freundlichkeit)
let lockHintTimeout = null;
function showLockHint(minLvl, name) {
    playSound('cancel');
    let el = document.getElementById('lockHintToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'lockHintToast';
        el.style.cssText = 'position:fixed; bottom:calc(80px + env(safe-area-inset-bottom)); left:50%; transform:translateX(-50%); background:rgba(30,30,30,0.92); color:white; padding:8px 18px; border-radius:20px; font-size:12px; z-index:1000; white-space:nowrap; pointer-events:none; transition:opacity 0.3s;';
        document.body.appendChild(el);
    }
    el.innerText = `🔒 ${name} – ab Pfleger-Level ${minLvl}`;
    el.style.opacity = '1';
    clearTimeout(lockHintTimeout);
    lockHintTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2400);
}

// Zeigt das Feature-Freigeschaltet-Popup
let featureUnlockQueue = [];
let featureUnlockShowing = false;

function queueFeatureUnlockModal(feature) {
    featureUnlockQueue.push(feature);
    if (!featureUnlockShowing) drainFeatureUnlockQueue();
}

function drainFeatureUnlockQueue() {
    if (featureUnlockQueue.length === 0) { featureUnlockShowing = false; return; }
    featureUnlockShowing = true;
    let f = featureUnlockQueue.shift();
    document.getElementById('fuIcon').innerText = f.icon;
    document.getElementById('fuLevelBadge').innerText = `✨ Pfleger-Level ${f.minLevel} erreicht!`;
    document.getElementById('fuName').innerText = f.name + ' freigeschaltet!';
    document.getElementById('fuDesc').innerText = f.desc;
    document.getElementById('featureUnlockOverlay').style.display = 'flex';
    playSound('sparkle');
    spawnConfetti('unlock');
}

function closeFeatureUnlockModal() {
    document.getElementById('featureUnlockOverlay').style.display = 'none';
    setTimeout(drainFeatureUnlockQueue, 400);
}

// ================================================================
// === FEATURE: WOLKENDORF-ARENA (PvP + Mini-Boss) ================
// ================================================================
