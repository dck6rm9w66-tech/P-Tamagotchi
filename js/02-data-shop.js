/* Pausentamagotchi - Ei-Farben, Arten, Shop-Artikel, Multiplikatoren, Buff-Dauern */
const RARE_EGG_COLORS = [
    { color: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', name: 'Sonnenuntergang', minLevel: 5 },
    { color: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', name: 'Galaxie',          minLevel: 10 },
    { color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', name: 'Tiefsee',           minLevel: 16 },
    { color: '#1e1e2e',                                          name: 'Mitternacht',        minLevel: 23 },
    { color: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 50%, #fcb69f 100%)', name: 'Diamant', minLevel: 32 }
];
// Hängt die seltenen Farben hinten an shellColors an und merkt sich pro Index das Mindest-Level
const RARE_EGG_BASE_INDEX = shellColors.length;
RARE_EGG_COLORS.forEach(rc => shellColors.push(rc.color));
const patternColors = ['rgba(255,255,255,0.4)', 'rgba(0,0,0,0.15)', 'rgba(255,71,87,0.4)', 'rgba(46,134,222,0.4)', 'rgba(46,213,115,0.4)', 'rgba(255,165,2,0.45)', 'rgba(155,89,182,0.4)'];
const patternGenerators = [
    (c, s) => ({ img: 'none', size: 'auto', pos: '0 0' }), 
    (c, s) => { let x=30*s, h=x/2; return { img: `radial-gradient(${c} 15%, transparent 16%), radial-gradient(${c} 15%, transparent 16%)`, size: `${x}px ${x}px`, pos: `0 0, ${h}px ${h}px`}; },
    (c, s) => { let w1=15*s, w2=30*s; return { img: `repeating-linear-gradient(45deg, ${c}, ${c} ${w1}px, transparent ${w1}px, transparent ${w2}px)`, size: 'auto', pos: '0 0'}; },
    (c, s) => { let x=20*s; return { img: `linear-gradient(${c} 2px, transparent 2px), linear-gradient(90deg, ${c} 2px, transparent 2px)`, size: `${x}px ${x}px`, pos: '0 0'}; },
    (c, s) => { let w1=10*s, w2=20*s; return { img: `repeating-linear-gradient(-45deg, ${c}, ${c} ${w1}px, transparent ${w1}px, transparent ${w2}px)`, size: 'auto', pos: '0 0'}; },
    (c, s) => { let w1=15*s, w2=25*s; return { img: `repeating-radial-gradient(circle, ${c}, ${c} 5px, transparent 5px, transparent 15px)`, size: `${w2}px ${w2}px`, pos: '0 0'}; }
];

function getShellStyle(cIdx, pIdx, pcIdx, scale) {
    let color = pet.overrideColor || shellColors[cIdx] || shellColors[0];
    let patColor = pet.overridePatColor || patternColors[pcIdx] || patternColors[0];
    let gen = patternGenerators[pet.overridePatIdx !== undefined && pet.overridePatIdx !== null ? pet.overridePatIdx : pIdx] || patternGenerators[0];
    let pattern = gen(patColor, scale || 1.0);

    if (inventory.customSkinActive && inventory.customSkinUrl) {
        return `background-color: #f1f2f6; background-image: url('${inventory.customSkinUrl}'); background-size: cover; background-position: center;`;
    }

    // Metallischer Gold-Verlauf Lackierung Support
    let bgStyle = "";
    if (typeof color === 'string' && (color.startsWith("linear-gradient") || color.startsWith("radial-gradient"))) {
        bgStyle = `background: ${color}; background-image: ${color};`;
    } else {
        bgStyle = `background-color: ${color}; background-image: ${pattern.img}; background-size: ${pattern.size}; background-position: ${pattern.pos};`;
    }

    return bgStyle;
}

function applyColors() {
    let style = getShellStyle(pet.colorIndex, pet.patternIndex, pet.patternColorIndex, pet.patternScale);
    let div = document.createElement('div'); div.style.cssText = style;
    ['deviceFront', 'deviceBack'].forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.style.backgroundColor = div.style.backgroundColor; el.style.backgroundImage = div.style.backgroundImage;
            el.style.backgroundSize = div.style.backgroundSize; el.style.backgroundPosition = div.style.backgroundPosition;
        }
    });
}

// --- SHOP, INVENTORY & WHEEL LOGIK ---
let tCoins = parseInt(safeGetItem('tama_tcoins') || '0');
let inventory = JSON.parse(safeGetItem('tama_inventory') || '{"items":{}, "equippedHat":null, "customSkinActive":false, "customSkinUrl":"", "rainbowPoop":false, "customBgActive":false, "customBgUrl":""}');
let currentShopTab = 'shop';

// ================== BUFF TIMER SYSTEM ==================
let buffExpiries = JSON.parse(safeGetItem('tama_buff_expiries') || '{}');
let countdownInterval = null;

// Duration in seconds for each timed shop item.
// 'daily'     → effect lasts until midnight
// 'permanent' → ongoing/indefinite effect (no countdown, but shows active badge)
// number      → exact seconds of real-time duration
const ITEM_DURATIONS = {
    'mystery_meat':    300,          // 5 min (Risikofenster für Darmverstimmung)
    'jitter_drink':    600,          // 10 min (Zitter-Effekt)
    'candy_overload':  600,          // 10 min (~3 Spielrunden Zucker-Boost)
    'cookie':          28800,        // 8 Stunden Glücks-Buff
    'shot':            600,          // 10 min (Hunger-Drain)
    'doomscroll':      600,          // 10 min (Doomscrolling)
    'party':           'daily',      // Kein Schlaf bis Tagesende
    'shiny':           'daily',      // Kein Schmutz bis Tagesende
    'energy':          3600,         // 1 Stunde Energizer
    'social':          3600,         // 1 Stunde Social-Boost
    'superfood':       'daily',      // Kein Hunger bis Tagesende
    'maryjane':        900,          // 15 min Mary-Jane-Trip
    'double_happy':    600,          // 10 min Doppeltes Glück
    'love_arrow':      1800,         // 30 min Liebes-Buff
    'bad_influence':   'permanent',  // Dauerhafter Debuff
    'boredom_curse':   1800,         // 30 min Langweile-Fluch
    'sm_addiction':    'permanent',  // Dauerhafte Sucht
    'existential_void':'permanent',  // Dauerhafter Happiness-Drain
    'gaslighting':     'permanent',  // Dauerhaft höhere Shop-Preise
    'chronic_cold':    'permanent',  // Dauerhafter Energie-Drain
    'pixel_acne':      'permanent',  // Bis Clearasil angewendet wird
    'sleepwalker':     'permanent',  // Dauerhaftes Schlafwandel-Risiko
    'stomach_upset_2': 'permanent',  // Dauerhafter Ess-Risiko
    'spicy_ramen':     3600,         // 1 Stunde feuerspuckend
    'dance_mat':       600,          // 10 min Tanz-Laune
    'personal_dj':     1800,         // 30 min Ohrwurm-Schleife
};

function formatCountdown(totalSeconds) {
    if (totalSeconds <= 0) return '00:00:00';
    let days    = Math.floor(totalSeconds / 86400);
    let rem     = totalSeconds % 86400;
    let minutes = Math.floor(rem / 60);
    let seconds = rem % 60;
    // Format: DD:MM:SS (Tage : Minuten : Sekunden)
    return `${String(days).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function setBuffExpiry(id) {
    let dur = ITEM_DURATIONS[id];
    if (!dur || dur === 'permanent' || dur === 0 || dur === 'daily') return;
    buffExpiries[id] = { expiry: Date.now() + dur * 1000, duration: dur * 1000 };
    safeSetItem('tama_buff_expiries', JSON.stringify(buffExpiries));
}

// --- Eine Uhr als Wahrheit: Echtzeit ---
// Buff-Leiste und Countdown zeigen ECHTZEIT (buffExpiries), die Effekte
// liefen aber teils auf AKTIVER Spielzeit (pet.activeSeconds). Wer die App
// schloss, sah: Countdown abgelaufen, Inventar sagt "Wirkt gerade", Effekt
// wirkt heimlich weiter. Dieses Aufraeumen beendet beim Echtzeit-Ablauf
// auch das pet-seitige Feld - Anzeige und Wirkung enden gleichzeitig.
const BUFF_PET_FIELDS = {
    jitter_drink:  ['jitteryUntil'],
    candy_overload:['candyPlays'],
    cookie:        ['happy'],
    doomscroll:    ['doomscrollUntil'],
    energy:        ['energyUntil'],
    maryjane:      ['mjUntil'],
    double_happy:  ['doubleHappyUntil'],
    love_arrow:    ['loveArrowUntil'],
    boredom_curse: ['boredUntil'],
    spicy_ramen:   ['fireUntil'],
    dance_mat:     ['danceUntil'],
    personal_dj:   ['djUntil']
};

function cleanupExpiredBuffs() {
    if (!pet || !pet.buffs) return;
    let now = Date.now(), changed = false;
    Object.keys(buffExpiries).forEach(id => {
        let e = buffExpiries[id];
        if (!e || !e.expiry || e.expiry > now) return;
        // Social-Boost: sein Ende loest das "Ignorieren" aus - das darf
        // beim Echtzeit-Aufraeumen nicht verloren gehen.
        if (id === 'social' && pet.buffs.socialUntil) {
            pet.ignoreUntilTs = Date.now() + IGNORE_DURATION_MS;
            delete pet.buffs.socialUntil;
        }
        (BUFF_PET_FIELDS[id] || []).forEach(f => {
            if (f in pet.buffs) { delete pet.buffs[f]; }
        });
        delete buffExpiries[id];
        changed = true;
    });
    if (changed) safeSetItem('tama_buff_expiries', JSON.stringify(buffExpiries));
}

function isBuffCurrentlyActive(id) {
    if (!pet || !pet.buffs) return false;
    switch (id) {
        case 'mystery_meat':     return !!(buffExpiries[id] && buffExpiries[id].expiry > Date.now());
        case 'jitter_drink':     return !!(pet.buffs.jitteryUntil && pet.activeSeconds < pet.buffs.jitteryUntil);
        case 'candy_overload':   return !!(pet.buffs.candyPlays && pet.buffs.candyPlays > 0);
        case 'cookie':           return !!(pet.buffs.happy && pet.activeSeconds < pet.buffs.happy);
        case 'shot':             return !!(buffExpiries[id] && buffExpiries[id].expiry > Date.now());
        case 'doomscroll':       return !!(pet.buffs.doomscrollUntil && pet.activeSeconds < pet.buffs.doomscrollUntil);
        case 'party':            return !!(pet.buffs.noSleepToday);
        case 'shiny':            return !!(pet.buffs.noDirtToday);
        case 'energy':           return !!(pet.buffs.energyUntil && pet.activeSeconds < pet.buffs.energyUntil);
        case 'social':           return !!(pet.buffs.socialUntil && pet.activeSeconds < pet.buffs.socialUntil);
        case 'superfood':        return !!(pet.buffs.superfoodToday);
        case 'maryjane':         return !!(pet.buffs.mjUntil && pet.activeSeconds < pet.buffs.mjUntil);
        case 'double_happy':     return !!(pet.buffs.doubleHappyUntil && pet.activeSeconds < pet.buffs.doubleHappyUntil);
        case 'love_arrow':       return !!(pet.buffs.loveArrowUntil && pet.activeSeconds < pet.buffs.loveArrowUntil);
        case 'bad_influence':    return !!(pet.buffs.badInfluence);
        case 'boredom_curse':    return !!(pet.buffs.boredUntil && pet.activeSeconds < pet.buffs.boredUntil);
        case 'sm_addiction':     return !!(pet.buffs.smAddiction);
        case 'existential_void': return !!(pet.buffs.existentialVoid);
        case 'gaslighting':      return !!(pet.buffs.gaslighting);
        case 'chronic_cold':     return !!(pet.buffs.chronicCold);
        case 'pixel_acne':       return !!(pet.buffs.pixelAcne);
        case 'sleepwalker':      return !!(pet.buffs.sleepwalker);
        case 'stomach_upset_2':  return !!(pet.buffs.stomachUpset2);
        case 'spicy_ramen':      return !!(pet.buffs.fireUntil && pet.activeSeconds < pet.buffs.fireUntil);
        case 'dance_mat':        return !!(pet.buffs.danceUntil && pet.activeSeconds < pet.buffs.danceUntil);
        case 'personal_dj':      return !!(pet.buffs.djUntil && pet.activeSeconds < pet.buffs.djUntil);
        default:
            // Multiplikator-Booster: aktiv, wenn der Kategorie-Slot läuft UND exakt dieser Faktor gesetzt ist
            if (MULT_META[id]) {
                let c = MULT_META[id];
                let slot = pet.buffs[c.key];
                return !!(slot && pet.activeSeconds < slot.u && slot.f === c.f);
            }
            return false;
    }
}

function getBuffTimerHtml(id) {
    let dur = ITEM_DURATIONS[id];
    if (!dur) return '';
    if (!isBuffCurrentlyActive(id)) return '';

    // Permanent effects: orange badge, full bar
    if (dur === 'permanent') {
        let label = (id === 'pixel_acne') ? '🔴 Aktiv – bis Clearasil' : '⚡ Dauerhaft aktiv';
        return `
            <div class="buff-timer-block" data-item-id="${id}">
                <div class="buff-pbar-wrap"><div class="buff-pbar" data-item-id="${id}" style="width:100%; background:#e67e22;"></div></div>
                <div class="buff-cd-text" data-item-id="${id}" style="color:#e67e22;">${label}</div>
            </div>`;
    }

    // Daily effects: countdown to midnight
    let remaining, totalDur;
    if (dur === 'daily') {
        let midnight = new Date(); midnight.setHours(24, 0, 0, 0);
        remaining = Math.max(0, Math.floor((midnight.getTime() - Date.now()) / 1000));
        totalDur  = 86400;
    } else {
        if (!buffExpiries[id] || buffExpiries[id].expiry <= Date.now()) {
            // Buff is active in game but no real-time expiry stored yet
            remaining = 0; totalDur = dur;
        } else {
            remaining = Math.max(0, Math.floor((buffExpiries[id].expiry - Date.now()) / 1000));
            totalDur  = dur;
        }
    }

    let pct     = (totalDur > 0 && remaining > 0) ? Math.max(0, (remaining / totalDur) * 100) : 0;
    let expired = remaining <= 0;
    let barClr  = expired ? '#a4b0be' : '#4CAF50';
    let txtClr  = expired ? '#a4b0be' : '#27ae60';
    let timeStr = expired ? 'Effekt abgelaufen' : `Effekt aktiv: ${formatCountdown(remaining)}`;

    return `
        <div class="buff-timer-block" data-item-id="${id}">
            <div class="buff-pbar-wrap"><div class="buff-pbar" data-item-id="${id}" style="width:${pct.toFixed(1)}%; background:${barClr};"></div></div>
            <div class="buff-cd-text" data-item-id="${id}" style="color:${txtClr};">${timeStr}</div>
        </div>`;
}

function updateAllCountdowns() {
    document.querySelectorAll('.buff-timer-block').forEach(block => {
        let id  = block.dataset.itemId;
        let dur = ITEM_DURATIONS[id];
        if (!dur || dur === 'permanent') return; // permanent bars never change

        let isActive = isBuffCurrentlyActive(id);
        let bar  = block.querySelector('.buff-pbar');
        let text = block.querySelector('.buff-cd-text');

        if (!isActive) {
            if (bar)  { bar.style.width = '0%'; bar.style.background = '#a4b0be'; }
            if (text) { text.textContent = 'Effekt abgelaufen'; text.style.color = '#a4b0be'; }
            return;
        }

        let remaining, totalDur;
        if (dur === 'daily') {
            let midnight = new Date(); midnight.setHours(24, 0, 0, 0);
            remaining = Math.max(0, Math.floor((midnight.getTime() - Date.now()) / 1000));
            totalDur  = 86400;
        } else {
            if (!buffExpiries[id] || buffExpiries[id].expiry <= Date.now()) {
                remaining = 0; totalDur = dur;
            } else {
                remaining = Math.max(0, Math.floor((buffExpiries[id].expiry - Date.now()) / 1000));
                totalDur  = dur;
            }
        }

        let pct     = (totalDur > 0 && remaining > 0) ? Math.max(0, (remaining / totalDur) * 100) : 0;
        let expired = remaining <= 0;
        if (bar)  { bar.style.width = `${pct.toFixed(1)}%`; bar.style.background = expired ? '#a4b0be' : '#4CAF50'; }
        if (text) { text.textContent = expired ? 'Effekt abgelaufen' : `Effekt aktiv: ${formatCountdown(remaining)}`; text.style.color = expired ? '#a4b0be' : '#27ae60'; }
    });
}

function startCountdownUpdater() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateAllCountdowns, 1000);
}
function stopCountdownUpdater() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}
// ================== END BUFF TIMER SYSTEM ==================

function updateCoinDisplay() {
    document.getElementById('tCoinDisplay').innerText = tCoins;
    let shopDisp = document.getElementById('shopCoinDisplay');
    if(shopDisp) shopDisp.innerHTML = `${tCoins} <i class="fa-solid fa-coins"></i>`;
    safeSetItem('tama_tcoins', tCoins);
    safeSetItem('tama_inventory', JSON.stringify(inventory));
}

// Zentrale Konfiguration aller Multiplikator-Booster.
// key = Speicher-Slot in pet.buffs (pro Kategorie nur 1 aktiv, stärkerer überschreibt);
// f = Faktor (bei 'luck' = Rettungs-Chance 0..1); dur = Dauer in aktiven Sekunden.
const MULT_META = {
    // 💰 Coins
    'mult_coins':    { key: 'mCoins',   f: 2,  dur: 1800, icon: '💰', anim: '💰 ×2<br>Coin-Booster aktiv!' },
    'mult_coins3':   { key: 'mCoins',   f: 3,  dur: 1800, icon: '💰', anim: '💰 ×3<br>Coin-Verstärker aktiv!' },
    'mult_coins5':   { key: 'mCoins',   f: 5,  dur: 1500, icon: '🧲', anim: '🧲 ×5<br>Coin-Magnet aktiv!' },
    'mult_coins8':   { key: 'mCoins',   f: 8,  dur: 1200, icon: '💰', anim: '💰 ×8<br>Coin-Rausch aktiv!' },
    'mult_coins15':  { key: 'mCoins',   f: 15, dur: 900,  icon: '🌟', anim: '🌟 ×15<br>GOLDRAUSCH!' },
    // 🎫 Tickets
    'mult_tickets':   { key: 'mTickets', f: 2,  dur: 3600, icon: '🎫', anim: '🎫 ×2<br>Ticket-Booster aktiv!' },
    'mult_tickets3':  { key: 'mTickets', f: 3,  dur: 3600, icon: '🎫', anim: '🎫 ×3<br>Ticket-Verstärker aktiv!' },
    'mult_tickets5':  { key: 'mTickets', f: 5,  dur: 2700, icon: '🎰', anim: '🎰 ×5<br>Ticket-Maschine aktiv!' },
    'mult_tickets8':  { key: 'mTickets', f: 8,  dur: 1800, icon: '🎫', anim: '🎫 ×8<br>Ticket-Flut aktiv!' },
    'mult_tickets12': { key: 'mTickets', f: 12, dur: 1200, icon: '💎', anim: '💎 ×12<br>TICKET-JACKPOT!' },
    // 🎓 XP
    'mult_xp':    { key: 'mXp', f: 2,  dur: 1800, icon: '🎓', anim: '🎓 ×2<br>XP-Booster aktiv!' },
    'mult_xp3':   { key: 'mXp', f: 3,  dur: 1800, icon: '🎓', anim: '🎓 ×3<br>XP-Verstärker aktiv!' },
    'mult_xp5':   { key: 'mXp', f: 5,  dur: 1500, icon: '🧠', anim: '🧠 ×5<br>Wissens-Turbo aktiv!' },
    'mult_xp8':   { key: 'mXp', f: 8,  dur: 1200, icon: '💥', anim: '💥 ×8<br>XP-Explosion aktiv!' },
    'mult_xp12':  { key: 'mXp', f: 12, dur: 900,  icon: '🌟', anim: '🌟 ×12<br>GENIE-MODUS!' },
    // 🍀 Glück (f = Rettungs-Chance)
    'mult_luck':    { key: 'mLuck', f: 0.33, dur: 1800, icon: '🍀', anim: '🍀 +33%<br>Glücks-Booster aktiv!' },
    'mult_luck50':  { key: 'mLuck', f: 0.50, dur: 1800, icon: '🍀', anim: '🍀 +50%<br>Glücks-Verstärker aktiv!' },
    'mult_luck66':  { key: 'mLuck', f: 0.66, dur: 1800, icon: '☘️', anim: '☘️ +66%<br>Kleeblatt-Zauber aktiv!' },
    'mult_luck85':  { key: 'mLuck', f: 0.85, dur: 1200, icon: '✨', anim: '✨ +85%<br>Glücks-Aura aktiv!' },
    'mult_luck100': { key: 'mLuck', f: 1.00, dur: 600,  icon: '🎯', anim: '🎯 100%<br>GARANTIERTER SIEG!' },
    // 💪 Kraft
    'mult_power':  { key: 'mPower', f: 1.5, dur: 86400, icon: '💪', anim: '💪 ×1.5<br>Kraft-Booster aktiv!' },
    'mult_power2': { key: 'mPower', f: 2,   dur: 86400, icon: '💪', anim: '💪 ×2<br>Kraft-Verstärker aktiv!' },
    'mult_power3': { key: 'mPower', f: 3,   dur: 43200, icon: '😤', anim: '😤 ×3<br>Berserker aktiv!' },
    'mult_power4': { key: 'mPower', f: 4,   dur: 21600, icon: '🗿', anim: '🗿 ×4<br>Titan-Kraft aktiv!' },
    'mult_power6': { key: 'mPower', f: 6,   dur: 10800, icon: '⚡', anim: '⚡ ×6<br>GOTTMODUS!' },
    // 🌈 Mega (Coins+Tickets+XP gleichzeitig)
    'mult_mega':  { key: 'mMega', f: 3, dur: 3600, icon: '🌈', anim: '🌈 ×3<br>MEGA-BOOSTER!<br>Coins, Tickets & XP!' },
    'mult_mega5': { key: 'mMega', f: 5, dur: 1800, icon: '🌌', anim: '🌌 ×5<br>OMNI-BOOSTER!<br>Coins, Tickets & XP!' },
};

// Liefert den aktiven Faktor für coins/tickets/xp/power (Mega gibt Untergrenze für coins/tickets/xp)
function getActiveMultiplier(kind) {
    if (!pet || !pet.buffs) return 1;
    let a = pet.activeSeconds;
    let b = pet.buffs;
    let keyMap = { coins: 'mCoins', tickets: 'mTickets', xp: 'mXp', power: 'mPower' };
    let m = 1;
    let key = keyMap[kind];
    if (key && b[key] && a < b[key].u) m = b[key].f;
    // Mega-Booster wirkt gleichzeitig auf coins/tickets/xp
    if ((kind === 'coins' || kind === 'tickets' || kind === 'xp') && b.mMega && a < b.mMega.u) {
        m = Math.max(m, b.mMega.f);
    }
    return m;
}

// Liefert die aktive Glücks-Rettungschance (0 = kein Glücks-Booster aktiv)
function getLuckChance() {
    // Vermächtnis-Bonus wirkt immer, Booster kommt obendrauf
    let base = (typeof getLegacyBonus === 'function') ? getLegacyBonus('luck') : 0;
    if (!pet || !pet.buffs || !pet.buffs.mLuck) return base;
    if (pet.activeSeconds >= pet.buffs.mLuck.u) return base;
    return Math.min(1, base + pet.buffs.mLuck.f);
}

// Dauer aller Multiplikatoren zentral aus MULT_META in ITEM_DURATIONS eintragen (für die Timer-Anzeige)
Object.keys(MULT_META).forEach(mid => { ITEM_DURATIONS[mid] = MULT_META[mid].dur; });

function addCoins(amount) {
    if (amount > 0 && typeof getVillageEffect === 'function') {
        amount = Math.round(amount * (1 + getVillageEffect('mint'))); // Münzprägerei: mehr T-Coins
        amount = Math.round(amount * getActiveMultiplier('coins'));   // Coin-Booster
        amount = Math.round(amount * (1 + getLegacyBonus('coinGain'))); // Vermächtnis
    }
    tCoins += amount;
    updateCoinDisplay();
    playSound('coin');
    if (amount > 0) spawnFloatText('tCoinDisplay', `+${amount}`, '#f1c40f');
    return amount;   // Aufrufer zeigen den tatsaechlich gutgeschriebenen Betrag an
}

// Zentraler Ticket-Gewinn inkl. Multiplikator
function addTickets(amount) {
    if (amount <= 0) return 0;
    amount = Math.round(amount * getActiveMultiplier('tickets'));
    tickets += amount;
    safeSetItem('tama_tickets', tickets.toString());
    updateTicketDisplay();
    return amount;
}

const SHOP_ITEMS = [

    // === 🍔 Essen & Trinken ===
    { id: 'mystery_meat', cat: '🍔 Essen & Trinken', name: 'Mystery Meat 🥩', desc: '+5 Happy (aber: 20% Chance auf Darmverstimmung: -30 Energie + Poop).', price: 15, type: 'consumable' },
    { id: 'jitter_drink', cat: '🍔 Essen & Trinken', name: 'Zitter-Alarm ⚡', desc: '+10 Energie (aber: -10 Laune bei Minispielen wg. Zittern).', price: 20, type: 'consumable' },
    { id: 'sad_salad', cat: '🍔 Essen & Trinken', name: 'Trauriger Salat 🥗', desc: '+0 alles (aber: Tamagotchi weint jämmerlich beim Essen).', price: 5, type: 'consumable' },
    { id: 'candy_overload', cat: '🍔 Essen & Trinken', name: 'Süssigkeiten-Overload 🍭', desc: '+15 Happy beim Spielen (aber: nach 3x Spielen sofortiger Zucker-Crash).', price: 25, type: 'consumable' },
    { id: 'apple', cat: '🍔 Essen & Trinken', name: 'Goldener Apfel 🍎', desc: 'Füllt den Hunger sofort auf 100%.', price: 15, type: 'consumable' },
    { id: 'pizza', cat: '🍔 Essen & Trinken', name: 'Wolken-Pizza 🍕', desc: '+40 Hunger & +10 Laune. Ein echter Sattmacher.', price: 30, type: 'consumable' },
    { id: 'vegan_burger', cat: '🍔 Essen & Trinken', name: 'Grünling-Burger 🥬', desc: '+35 Hunger, +5 Intelligenz und ganz ohne Gewichtszunahme.', price: 35, type: 'consumable' },
    { id: 'glitch_cookie', cat: '🍔 Essen & Trinken', name: 'Glitch-Kekse 👾', desc: 'Lecker! Löst beim Essen einen zufälligen Farbwechsel aus.', price: 40, type: 'consumable' },
    { id: 'premium_food', cat: '🍔 Essen & Trinken', name: 'Sternekoch-Menü 🍽️', desc: '+60 Hunger, +15 Laune, +5 Energie. Das Beste vom Besten.', price: 70, ticketPrice: 1, type: 'consumable' },
    { id: 'spicy_ramen', cat: '🍔 Essen & Trinken', name: 'Höllen-Ramen 🌶️', desc: '+30 Hunger. Macht dein Tamagotchi 1 Stunde lang feuerspuckend! 🔥', price: 55, type: 'consumable' },

    // === 💊 Apotheke & Heilung ===
    { id: 'medkit', cat: '💊 Apotheke & Heilung', name: 'Erste-Hilfe ⚕️', desc: 'Heilt Krankheiten augenblicklich.', price: 30, type: 'consumable' },
    { id: 'shot', cat: '💊 Apotheke & Heilung', name: 'Abnehmspritze 💉', desc: 'Tamagotchi verliert 10g (aber: Stoffwechsel rast = -50% Hunger).', price: 50, type: 'consumable' },
    { id: 'superfood', cat: '💊 Apotheke & Heilung', name: 'Superfood 🥦', desc: 'Kein Hunger mehr heute! (Senkt Max-Life um 30 Min).', price: 300, ticketPrice: 3, type: 'consumable' },
    { id: 'immortal', cat: '💊 Apotheke & Heilung', name: 'Unsterblichkeits-Trank 🛡️', desc: 'Rettet dich 1x vor dem Tod durch Hunger/Dicke/Trauer.', price: 800, ticketPrice: 8, type: 'consumable' },
    { id: 'poop_gold', cat: '💊 Apotheke & Heilung', name: 'Poop zu Gold 🪙', desc: 'Verwandle 1x Kot am Gehäuse in 200 Münzen. Riecht nach Betrug!', price: 50, ticketPrice: 2, type: 'consumable' },


    // === 🎩 Hüte & Accessoires ===
    { id: 'hat_flower', cat: '🎩 Hüte & Accessoires', name: 'Blume 🌸', desc: 'Ein Hauch von Natur.', price: 80, type: 'hat', val: '🌸' },
    { id: 'hat_bow', cat: '🎩 Hüte & Accessoires', name: 'Rote Schleife 🎀', desc: 'Macht jedes Pet extrem niedlich.', price: 100, type: 'hat', val: '🎀' },
    { id: 'hat_bottle', cat: '🎩 Hüte & Accessoires', name: 'Flasche 🍼', desc: 'Für den kleinen Durst (wird neben dem Pet getragen).', price: 100, type: 'hat', val: '🍼' },
    { id: 'hat_palette', cat: '🎩 Hüte & Accessoires', name: 'Farbpalette 🎨', desc: 'Für kreative Tamagotchis (wird neben dem Pet getragen).', price: 120, type: 'hat', val: '🎨' },
    { id: 'hat_bat', cat: '🎩 Hüte & Accessoires', name: 'Baseballschläger 🏏', desc: 'Sieht gefährlich aus (wird neben dem Pet getragen).', price: 150, type: 'hat', val: '🏏' },
    { id: 'hat_mic', cat: '🎩 Hüte & Accessoires', name: 'Mikrofon 🎤', desc: 'Let\'s sing! (wird neben dem Pet getragen).', price: 180, type: 'hat', val: '🎤' },
    { id: 'hat_knife', cat: '🎩 Hüte & Accessoires', name: 'Messer 🔪', desc: 'Vorsicht, scharf! (wird neben dem Pet getragen).', price: 200, type: 'hat', val: '🔪' },
    { id: 'hat_sun', cat: '🎩 Hüte & Accessoires', name: 'Celebrity-Status 🕶️', desc: 'Das Tamagotchi trägt dauerhaft Sonnenbrille.', price: 250, ticketPrice: 3, type: 'hat', val: '🕶️' },
    { id: 'hat_controller', cat: '🎩 Hüte & Accessoires', name: 'Controller 🎮', desc: 'Gamer-Status (wird neben dem Pet getragen).', price: 300, type: 'hat', val: '🎮' },
    { id: 'hat_crown', cat: '🎩 Hüte & Accessoires', name: 'Krone 👑', desc: 'Für wahre Könige des Wolkendorfs.', price: 750, ticketPrice: 5, type: 'hat', val: '👑' },
    { id: 'hat_rainbow', cat: '🎩 Hüte & Accessoires', name: 'Hut der 1000 Farben', desc: 'Ein Luxuszylinder, der stetig seine Farbe wechselt.', price: 1200, ticketPrice: 6, type: 'hat', val: '🎩', fx: 'rainbow-fx' },

    // === 🎨 Lacke & Skins ===
    { id: 'eightball', cat: '🎩 Hüte & Accessoires', name: 'Mystic 8-Ball 🎱', desc: 'Beantwortet dir jede Ja/Nein-Frage. Aus dem Inventar starten, Frage stellen, B drücken, schütteln lassen.', price: 400, ticketPrice: 3, type: 'toy' },
    { id: 'col_gold', cat: '🎨 Lacke & Skins', name: 'Lack: Pures Gold', desc: 'Macht das Gehäuse komplett Golden (Edler Verlauf).', price: 150, ticketPrice: 4, type: 'paint', valC: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)', valP: 0 },
    { id: 'col_dark', cat: '🎨 Lacke & Skins', name: 'Lack: Dark Mode', desc: 'Mattschwarzes, edles Gehäuse.', price: 150, type: 'paint', valC: '#2f3542', valP: 0 },
    { id: 'col_matrix', cat: '🎨 Lacke & Skins', name: 'Muster: Hacker', desc: 'Schwarz mit grünen Matrix-Linien.', price: 200, ticketPrice: 3, type: 'paint', valC: '#000000', valPC: 'rgba(0,255,0,0.5)', valP: 3 },
    { id: 'poop_rainbow', cat: '🎨 Lacke & Skins', name: 'Regenbogen-Kot', desc: 'Macht die Häufchen magisch bunt (dauerhaft).', price: 600, ticketPrice: 3, type: 'unlock_poop' },
    { id: 'custom_skin', cat: '🎨 Lacke & Skins', name: 'Eigenes Bild / Skin', desc: 'Schaltet frei, eine eigene Bild-URL als Gehäuse-Textur zu nutzen.', price: 1500, ticketPrice: 10, type: 'unlock_skin' },
    { id: 'custom_bg', cat: '🎨 Lacke & Skins', name: 'Hintergrundbild 🖼️', desc: 'Nutze eine eigene Bild-URL als Display-Hintergrund.', price: 500, ticketPrice: 4, type: 'unlock_bg' },
    { id: 'chaos_orb', cat: '🎨 Lacke & Skins', name: 'Chaos-Kugel 🔮', desc: 'Würfelt die komplette Hülle neu durch: Farbe, Muster, Farbton UND Form. Jedes Mal eine Überraschung – manchmal wunderschön, manchmal ein Albtraum!', price: 120, ticketPrice: 1, type: 'consumable' },


    // === 🕹️ Arcade-Automaten ===
    { id: 'arcade_invaders', cat: '🕹️ Arcade-Automaten', name: 'Space Invaders 👾', desc: 'Retro-Klassiker! Herausgezoomt steuerst du dein ganzes Ei als Kanone gegen anrückende Alien-Wellen. Einmalkauf, beliebig oft spielbar.', price: 900, ticketPrice: 8, type: 'arcade', arcade: 'invaders' },
    { id: 'arcade_pong', cat: '🕹️ Arcade-Automaten', name: 'Pong 🏓', desc: 'Der Urvater aller Videospiele! Dein Ei ist der Schläger im Duell gegen die Wolken-KI. Einmalkauf, beliebig oft spielbar.', price: 750, ticketPrice: 6, type: 'arcade', arcade: 'pong' },
    { id: 'arcade_defender', cat: '🕹️ Arcade-Automaten', name: 'Defender 🚀', desc: 'Rasanter 80er-Shooter! Dein Ei fliegt durchs Weltall und ballert sich durch UFO-Schwärme. Einmalkauf, beliebig oft spielbar.', price: 1100, ticketPrice: 10, type: 'arcade', arcade: 'defender' },

    // === 🏕️ Hobbys & Abenteuer ===
    { id: 'toy_ball', cat: '🏕️ Hobbys & Abenteuer', name: 'Wolken-Kreisel 🪀', desc: 'Lieblings-Spielzeug: +15 Laune bei jedem Spielen. Mehrfach nutzbar.', price: 200, type: 'consumable' },
    { id: 'robot_friend', cat: '🏕️ Hobbys & Abenteuer', name: 'Roboter-Kumpel 🤖', desc: 'Ein treuer Blechfreund: +12 Laune, +3 Intelligenz. Nie mehr allein.', price: 450, type: 'consumable' },
    { id: 'book', cat: '🏕️ Hobbys & Abenteuer', name: 'Bilderbuch 📖', desc: 'Eine gute Geschichte: +5 Intelligenz und +5 Laune.', price: 175, type: 'consumable' },
    { id: 'instrument', cat: '🏕️ Hobbys & Abenteuer', name: 'Wolken-Ukulele 🎸', desc: 'Musizieren macht glücklich: +18 Laune, +2 Intelligenz und eine kleine Melodie.', price: 325, type: 'consumable' },
    { id: 'tent', cat: '🏕️ Hobbys & Abenteuer', name: 'Abenteuer-Zelt ⛺', desc: 'Camping unterm Sternenhimmel: +20 Laune und +15 Energie durch Erholung.', price: 375, type: 'consumable' },
    { id: 'diving_gear', cat: '🏕️ Hobbys & Abenteuer', name: 'Taucher-Set 🤿', desc: 'Abtauchen ins Wolkenmeer: +18 Laune und wäscht das Tamagotchi blitzsauber.', price: 350, type: 'consumable' },
    { id: 'diary', cat: '🏕️ Hobbys & Abenteuer', name: 'Geheimes Tagebuch 📔', desc: 'Gedanken sortieren: +10 Laune und beruhigt (heilt leichten Stress).', price: 225, type: 'consumable' },
    { id: 'camera', cat: '🏕️ Hobbys & Abenteuer', name: 'Sofortbild-Kamera 📸', desc: 'Schnappschuss fürs Album: +12 Laune und mit etwas Glück ein Trinkgeld-Fund (Münzen).', price: 275, type: 'consumable' },
    // === 🎟️ Events & Dating ===
    { id: 'dating_app', cat: '🎟️ Events & Dating', name: 'Dating-App 💖', desc: 'Swipe für 5 Münzen. 10% Match (+20 Happy), 90% Ghosting (-10 Happy).', price: 5, type: 'consumable' },
    { id: 'casino', cat: '🎟️ Events & Dating', name: 'Casino: All-in 🎰', desc: 'Setze 50 Münzen auf Kopf/Zahl. Gewinne 100 oder verliere alles.', price: 50, type: 'consumable' },
    { id: 'therapy', cat: '🎟️ Events & Dating', name: 'Therapie-Session 🛋️', desc: 'Kostet 20 Münzen für +25 Happy. Urteilender Therapeut inklusive.', price: 20, type: 'consumable' },
    { id: 'tiktok', cat: '🎟️ Events & Dating', name: 'TikTok-Challenge 🕺', desc: 'Ausrüstung für 15 Münzen. 40% viral (+30 Happy), 60% Flop (-15 Happy).', price: 15, type: 'consumable' },

    // === ✖️ Multiplikatoren ===
    { id: 'mult_coins',    cat: '✖️ Multiplikatoren', name: 'Coin-Booster 💰 ×2',    desc: 'Verdoppelt alle T-Coin-Gewinne für 30 Min.',        price: 80, ticketPrice: 2,  type: 'consumable' },
    { id: 'mult_coins3',   cat: '✖️ Multiplikatoren', name: 'Coin-Verstärker 💰 ×3', desc: 'Verdreifacht alle T-Coin-Gewinne für 30 Min.',      price: 150, ticketPrice: 2, type: 'consumable' },
    { id: 'mult_coins5',   cat: '✖️ Multiplikatoren', name: 'Coin-Magnet 🧲 ×5',     desc: 'Verfünffacht alle T-Coin-Gewinne für 25 Min.',     price: 280, ticketPrice: 5, type: 'consumable' },
    { id: 'mult_coins8',   cat: '✖️ Multiplikatoren', name: 'Coin-Rausch 💰 ×8',     desc: 'Ver-8-facht alle T-Coin-Gewinne für 20 Min.',      price: 450, ticketPrice: 8, type: 'consumable' },
    { id: 'mult_coins15',  cat: '✖️ Multiplikatoren', name: 'Goldrausch 🌟 ×15',     desc: 'Ver-15-facht alle T-Coin-Gewinne für 15 Min!',     price: 800, ticketPrice: 13, type: 'consumable' },
    { id: 'mult_tickets',   cat: '✖️ Multiplikatoren', name: 'Ticket-Booster 🎫 ×2',    desc: 'Verdoppelt alle Ticket-Gewinne für 1 Std.',      price: 90, ticketPrice: 2,  type: 'consumable' },
    { id: 'mult_tickets3',  cat: '✖️ Multiplikatoren', name: 'Ticket-Verstärker 🎫 ×3', desc: 'Verdreifacht alle Ticket-Gewinne für 1 Std.',    price: 170, ticketPrice: 3, type: 'consumable' },
    { id: 'mult_tickets5',  cat: '✖️ Multiplikatoren', name: 'Ticket-Maschine 🎰 ×5',   desc: 'Verfünffacht alle Ticket-Gewinne für 45 Min.',   price: 320, ticketPrice: 5, type: 'consumable' },
    { id: 'mult_tickets8',  cat: '✖️ Multiplikatoren', name: 'Ticket-Flut 🎫 ×8',       desc: 'Ver-8-facht alle Ticket-Gewinne für 30 Min.',    price: 500, ticketPrice: 8, type: 'consumable' },
    { id: 'mult_tickets12', cat: '✖️ Multiplikatoren', name: 'Ticket-Jackpot 💎 ×12',   desc: 'Ver-12-facht alle Ticket-Gewinne für 20 Min!',   price: 850, ticketPrice: 14, type: 'consumable' },
    { id: 'mult_xp',    cat: '✖️ Multiplikatoren', name: 'XP-Booster 🎓 ×2',    desc: 'Verdoppelt allen Pfleger-XP-Gewinn für 30 Min.',   price: 100, ticketPrice: 2, type: 'consumable' },
    { id: 'mult_xp3',   cat: '✖️ Multiplikatoren', name: 'XP-Verstärker 🎓 ×3', desc: 'Verdreifacht allen Pfleger-XP-Gewinn für 30 Min.', price: 180, ticketPrice: 3, type: 'consumable' },
    { id: 'mult_xp5',   cat: '✖️ Multiplikatoren', name: 'Wissens-Turbo 🧠 ×5', desc: 'Verfünffacht allen Pfleger-XP-Gewinn für 25 Min.', price: 330, ticketPrice: 6, type: 'consumable' },
    { id: 'mult_xp8',   cat: '✖️ Multiplikatoren', name: 'XP-Explosion 💥 ×8',  desc: 'Ver-8-facht allen Pfleger-XP-Gewinn für 20 Min.',  price: 520, ticketPrice: 9, type: 'consumable' },
    { id: 'mult_xp12',  cat: '✖️ Multiplikatoren', name: 'Genie-Modus 🌟 ×12',  desc: 'Ver-12-facht allen Pfleger-XP-Gewinn für 15 Min!', price: 880, ticketPrice: 15, type: 'consumable' },
    { id: 'mult_luck',    cat: '✖️ Multiplikatoren', name: 'Glücks-Booster 🍀 +33%',   desc: '33% Chance, eine Niederlage im Minispiel in einen Sieg zu drehen (30 Min).', price: 70, ticketPrice: 2,  type: 'consumable' },
    { id: 'mult_luck50',  cat: '✖️ Multiplikatoren', name: 'Glücks-Verstärker 🍀 +50%', desc: '50% Chance auf einen Rettungs-Sieg in Minispielen (30 Min).',                price: 130, ticketPrice: 2, type: 'consumable' },
    { id: 'mult_luck66',  cat: '✖️ Multiplikatoren', name: 'Kleeblatt-Zauber ☘️ +66%',  desc: '66% Chance auf einen Rettungs-Sieg in Minispielen (30 Min).',                price: 240, ticketPrice: 4, type: 'consumable' },
    { id: 'mult_luck85',  cat: '✖️ Multiplikatoren', name: 'Glücks-Aura ✨ +85%',       desc: '85% Chance auf einen Rettungs-Sieg in Minispielen (20 Min).',                price: 400, ticketPrice: 7, type: 'consumable' },
    { id: 'mult_luck100', cat: '✖️ Multiplikatoren', name: 'Garantierter Sieg 🎯 100%', desc: 'Du gewinnst JEDES Minispiel garantiert (10 Min)!',                           price: 700, ticketPrice: 12, type: 'consumable' },
    { id: 'mult_power',  cat: '✖️ Multiplikatoren', name: 'Kraft-Booster 💪 ×1.5', desc: 'Kampfkraft in Bosskämpfen & PvP ×1,5 für 24 Std.', price: 120, ticketPrice: 2,  type: 'consumable' },
    { id: 'mult_power2', cat: '✖️ Multiplikatoren', name: 'Kraft-Verstärker 💪 ×2', desc: 'Kampfkraft in Bosskämpfen & PvP ×2 für 24 Std.',  price: 220, ticketPrice: 4,  type: 'consumable' },
    { id: 'mult_power3', cat: '✖️ Multiplikatoren', name: 'Berserker 😤 ×3',        desc: 'Kampfkraft in Bosskämpfen & PvP ×3 für 12 Std.',  price: 400, ticketPrice: 7,  type: 'consumable' },
    { id: 'mult_power4', cat: '✖️ Multiplikatoren', name: 'Titan-Kraft 🗿 ×4',      desc: 'Kampfkraft in Bosskämpfen & PvP ×4 für 6 Std.',   price: 650, ticketPrice: 11,  type: 'consumable' },
    { id: 'mult_power6', cat: '✖️ Multiplikatoren', name: 'Gottmodus ⚡ ×6',        desc: 'Kampfkraft in Bosskämpfen & PvP ×6 für 3 Std!',   price: 1000, ticketPrice: 17, type: 'consumable' },
    // === 🧪 Buffs & Substanzen ===
    { id: 'cookie', cat: '🧪 Buffs & Substanzen', name: 'Glücks-Keks 🥠', desc: '+25% Laune (Effekt hält 8 Stunden).', price: 20, type: 'consumable' },
    { id: 'doomscroll', cat: '🧪 Buffs & Substanzen', name: 'Smartphone 📱', desc: '10 Min keine Bedürfnisse, keine Bewegung, IQ -2 (Doomscrolling).', price: 60, type: 'consumable' },
    { id: 'party', cat: '🧪 Buffs & Substanzen', name: 'Party-Pille 🪩', desc: 'Tamagotchi schläft heute nicht! (aber -5 Int)', price: 100, type: 'consumable' },
    { id: 'shiny', cat: '🧪 Buffs & Substanzen', name: 'Shiny-Spray ✨', desc: 'Tamagotchi wird heute nicht schmutzig (aber: -25% Laune durch Chemie-Geruch).', price: 120, type: 'consumable' },
    { id: 'energy', cat: '🧪 Buffs & Substanzen', name: 'Energizer-Bonbon 🍬', desc: '2x Intelligenz-Gain für 1h (danach Laune-Debuff).', price: 150, type: 'consumable' },
    { id: 'social', cat: '🧪 Buffs & Substanzen', name: 'Social-Media-Boost 📲', desc: 'Doppelte Laune bei allem, dann 1h Crash.', price: 200, type: 'consumable' },
    { id: 'maryjane', cat: '🧪 Buffs & Substanzen', name: 'Mary Jane 🌿', desc: '+50% Happy und Immun für 15 Min (aber sofort -75% Hunger).', price: 420, ticketPrice: 2, type: 'consumable' },
    { id: 'genie', cat: '🧪 Buffs & Substanzen', name: 'Genie-Pulver 🧠', desc: '+5 Intelligenz permanent (aber: verursacht starke Kopfschmerzen).', price: 500, ticketPrice: 3, type: 'consumable' },
    { id: 'double_happy', cat: '🧪 Buffs & Substanzen', name: 'Doppeltes Glück 🍀', desc: 'Verdopple dein Glück für 1h (danach: Existenzielle Krise = -5 Happy permanent).', price: 150, ticketPrice: 3, type: 'consumable' },
    { id: 'sleep_steal', cat: '🧪 Buffs & Substanzen', name: 'Schlaf-Diebstahl 💤', desc: 'Klaut 2h Schlaf. Heilt +50 Energie (aber Karma: -15 Happy).', price: 40, ticketPrice: 3, type: 'consumable' },
    { id: 'love_arrow', cat: '🧪 Buffs & Substanzen', name: 'Liebespfeil 💘', desc: '+10 Happy für 1 Tag. (aber: 30% Chance auf fiesen Stalker-Modus).', price: 100, type: 'consumable' },
    { id: 'time_warp', cat: '🧪 Buffs & Substanzen', name: 'Time Warp ⏳', desc: 'Verjüngt dein Tamagotchi sofort um 3 Tage (1,5 Std. jünger).', price: 150, ticketPrice: 4, type: 'consumable' },
    { id: 'musicbox', cat: '🧪 Buffs & Substanzen', name: 'Melodie-Box 🎵', desc: 'Spielt eine sanfte Melodie: +20 Laune und +10 Energie.', price: 45, type: 'consumable' },
    { id: 'toilet', cat: '🧪 Buffs & Substanzen', name: 'Wolken-WC 🚽', desc: 'Beseitigt sofort den Haufen am Gehäuse – ganz ohne Wischen.', price: 30, type: 'consumable' },
    { id: 'clone_machine', cat: '🧪 Buffs & Substanzen', name: 'Klon-Maschine 🧬', desc: 'Erzeugt kurz ein zweites Tamagotchi – das sofort Streit anfängt! (-10 Laune, viel Chaos.)', price: 200, ticketPrice: 2, type: 'consumable' },
    { id: 'dance_mat', cat: '🧪 Buffs & Substanzen', name: 'Tanzmatte 💃', desc: 'Dein Tamagotchi lernt die neuesten Moves. Cringe garantiert! (+25 Laune, tanzt eine Weile.)', price: 60, type: 'consumable' },
    { id: 'personal_dj', cat: '🧪 Buffs & Substanzen', name: 'Privat-DJ 🎧', desc: 'Legt einen Ohrwurm auf Endlosschleife auf: +15 Laune, aber -3 Intelligenz vom Dauer-Beat.', price: 80, type: 'consumable' },

    // === 👿 Debuffs & Trolle ===
    { id: 'bad_influence', cat: '👿 Debuffs & Trolle', name: 'Schlechter Einfluss 🚬', desc: '+2 Glück permanent, aber verliert täglich Intelligenz (-1 Int/Tag).', price: 30, type: 'consumable' },
    { id: 'boredom_curse', cat: '👿 Debuffs & Trolle', name: 'Fluch der Langeweile 💤', desc: 'Für 30 Min bringen alle Spiele nur noch +1 Happy statt normal.', price: 40, type: 'consumable' },
    { id: 'sm_addiction', cat: '👿 Debuffs & Trolle', name: 'Social Media Addiction 📱', desc: 'Tamagotchi verliert -1 Energie/5 Min wenn nicht im Shop.', price: 50, type: 'consumable' },
    { id: 'midlife_crisis', cat: '👿 Debuffs & Trolle', name: 'Midlife Crisis 💀', desc: 'Halbiert sofort alle Attribute des Tamagotchis.', price: 90, type: 'consumable' },
    { id: 'existential_void', cat: '👿 Debuffs & Trolle', name: 'Existenzielle Leere 🌌', desc: 'Verliert stetig Laune, bis es schläft oder isst.', price: 80, type: 'consumable' },
    { id: 'gaslighting', cat: '👿 Debuffs & Trolle', name: 'Gaslighting 🛒', desc: 'Der Shop-Besitzer betrügt dich. Alle Shoppreise steigen dauerhaft um 10%.', price: 70, type: 'consumable' },
    { id: 'chronic_cold', cat: '👿 Debuffs & Trolle', name: 'Ewiger Schnupfen 🤧', desc: 'Tamagotchi-Niest stetig. Jeder Nieser entzieht -5 Energie.', price: 60, type: 'consumable' },
    { id: 'pixel_acne', cat: '👿 Debuffs & Trolle', name: 'Pixel-Akne 🔴', desc: '-30% Happy sofort. Happy-Maximum auf 70% limitiert bis Heilung.', price: 50, type: 'consumable' },
    { id: 'clearasil', cat: '👿 Debuffs & Trolle', name: 'Clearasil ✨', desc: 'Heilt die lästige Pixel-Akne sofort.', price: 15, type: 'consumable' },
    { id: 'sleepwalker', cat: '👿 Debuffs & Trolle', name: 'Schlafwandler-Syndrom 🛌', desc: '20% Chance nachts im Schlaf willkürlich Shop-Items zu kaufen.', price: 120, type: 'consumable' },
    { id: 'stomach_upset_2', cat: '👿 Debuffs & Trolle', name: 'Magenverstimmung 2.0 🤮', desc: 'Jedes Essen hat ab jetzt eine 30% Chance auf Erbrechen (-30 Hunger/-30 Energie).', price: 110, type: 'consumable' },

    // === 💳 Abos & Mikros ===
    { id: 'happy_sub', cat: '💳 Abos & Mikros', name: 'Glücks-Abo 💳', desc: 'Kostet 5 Münzen/Tag für dauerhaft +10 Happy. Kündigung straft mit -10 Happy.', price: 30, ticketPrice: 6, type: 'unlock_sub' },
    { id: 'vip_sleep', cat: '💳 Abos & Mikros', name: 'VIP-Schlaf 👑', desc: 'Goldenes Bett. +4 Energie/Tick im Schlaf. Kostet 20 Münzen/Tag.', price: 40, ticketPrice: 6, type: 'unlock_sub' },
    { id: 'lootbox_gameover', cat: '💳 Abos & Mikros', name: 'Lootbox 🎁', desc: '90% Müll, 9% Super-Item, 1% Todeskralle = GAME OVER!', price: 30, type: 'consumable' },

    // === 🌟 Pfleger-Elite ===
    { id: 'hat_halo', cat: '🌟 Pfleger-Elite', name: 'Heiligenschein 😇', desc: 'Nur wahre Wolkendorf-Veteranen tragen dieses Symbol.', price: 2000, ticketPrice: 15, type: 'hat', val: '😇' },
    { id: 'col_aurora', cat: '🌟 Pfleger-Elite', name: 'Lack: Aurora', desc: 'Schillerndes Polarlicht-Finish, nur für erfahrene Pfleger.', price: 2500, ticketPrice: 18, type: 'paint', valC: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 50%, #ff00cc 100%)', valP: 0 },
    { id: 'hat_legend_crown', cat: '🌟 Pfleger-Elite', name: 'Legenden-Krone 🏵️', desc: 'Das ultimative Statussymbol des Wolkendorfs.', price: 3000, ticketPrice: 22, type: 'hat', val: '🏵️' },
    { id: 'mult_mega', cat: '🌟 Pfleger-Elite', name: 'Mega-Booster 🌈 ×3', desc: 'Verdreifacht Coins, Tickets UND XP gleichzeitig für 1 Std. Nur für Elite-Pfleger!', price: 750, ticketPrice: 12, type: 'consumable' },
    { id: 'mult_mega5', cat: '🌟 Pfleger-Elite', name: 'Omni-Booster 🌌 ×5', desc: 'Ver-5-facht Coins, Tickets UND XP gleichzeitig für 30 Min. Der ultimative Booster!', price: 1500, ticketPrice: 20, type: 'consumable' },

    // === 🏆 Boss-Trophäen ===
    { id: 'hat_boss_trophy', cat: '🏆 Boss-Trophäen', name: 'Boss-Pokal 🏆', desc: 'Nur durch einen Mini-Boss-Sieg in der Arena erhältlich.', price: 0, type: 'hat', val: '🏆' },
    { id: 'col_boss_fire', cat: '🏆 Boss-Trophäen', name: 'Lack: Boss-Flamme', desc: 'Seltene Kampftrophäe der Wolkendorf-Arena.', price: 0, type: 'paint', valC: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', valP: 0 },
    { id: 'hat_champion_belt', cat: '🏆 Boss-Trophäen', name: 'Champions-Gürtel 🥇', desc: 'Beweis eines harten Arena-Sieges.', price: 0, type: 'hat', val: '🥇' }
];

// Prüft, ob ein Item aktuell per Pfleger-Level im Shop freigeschaltet ist
function isItemUnlockedByLevel(id) {
    let it = SHOP_ITEMS.find(i => i.id === id);
    if (!it) return false;
    if (it.cat === '🌟 Pfleger-Elite' || it.cat === '🏆 Boss-Trophäen') return false;
    return accountLevel >= (SHOP_CATEGORY_MIN_LEVEL[it.cat] || 1);
}

function initWheel() {
    let today = new Date().toDateString();
    // Alten Spielständen (oder nach einem Level-Verlust) kann ein gesperrter
    // Gewinn im Rad hängen – dann neu generieren.
    let hasLockedPrize = inventory.wheel && inventory.wheel.prizes
        && inventory.wheel.prizes.some(p => p.t === 'item' && !isItemUnlockedByLevel(p.id));

    if(!inventory.wheel || inventory.wheel.date !== today || hasLockedPrize) {
        // Nur Items gewinnbar, deren Shop-Kategorie beim aktuellen Pfleger-Level
        // bereits freigeschaltet ist (Elite & Boss-Trophäen bleiben ausgeschlossen).
        let possibleItems = SHOP_ITEMS.filter(i =>
            (i.type === 'consumable' || i.type === 'paint')
            && i.cat !== '🌟 Pfleger-Elite'
            && i.cat !== '🏆 Boss-Trophäen'
            && accountLevel >= (SHOP_CATEGORY_MIN_LEVEL[i.cat] || 1)
        );
        let item1 = possibleItems.length ? possibleItems[Math.floor(Math.random()*possibleItems.length)] : null;

        let pool = [
            { t: 'niete', icon: '💨', name: 'Niete' },
            { t: 'niete', icon: '💨', name: 'Niete' },
            { t: 'niete', icon: '💨', name: 'Niete' },
            { t: 'niete', icon: '💨', name: 'Niete' },
            { t: 'coin', val: 10, icon: '🪙', name: '10 T-Coins' },
            { t: 'coin', val: 25, icon: '🪙', name: '25 T-Coins' },
            { t: 'coin', val: 50, icon: '💎', name: '50 T-Coins' },
            // Falls (theoretisch) noch keine Kategorie freigeschaltet ist: Ersatzgewinn in T-Coins
            item1 ? { t: 'item', id: item1.id, icon: '🎁', name: item1.name }
                  : { t: 'coin', val: 75, icon: '💰', name: '75 T-Coins' }
        ];
        pool.sort(() => Math.random() - 0.5);
        // Wird das Rad nur wegen eines gesperrten Gewinns am selben Tag neu
        // erzeugt, darf der bereits verbrauchte Dreh nicht zurückgesetzt werden.
        let keepSpun = (inventory.wheel && inventory.wheel.date === today) ? !!inventory.wheel.hasSpun : false;
        inventory.wheel = { date: today, prizes: pool, hasSpun: keepSpun, lastRotation: 0 };
        safeSetItem('tama_inventory', JSON.stringify(inventory));
    }
}

let isWheelSpinning = false;
let wheelSpinInterval;
function spinWheel() {
    if(isWheelSpinning || inventory.wheel.hasSpun) return;
    isWheelSpinning = true;
    inventory.wheel.hasSpun = true; 

    let winIndex = Math.floor(Math.random() * 8);
    let winPrize = inventory.wheel.prizes[winIndex];

    let targetDeg = 3600 - (winIndex * 45 + 22.5);
    inventory.wheel.lastRotation = targetDeg;

    let wheel = document.getElementById('fortuneWheel');
    wheel.style.transform = `rotate(${targetDeg}deg)`;

    let ticks = 0;
    wheelSpinInterval = setInterval(() => {
        playSound('tick');
        ticks++;
        if(ticks > 25) clearInterval(wheelSpinInterval);
    }, 150);

    setTimeout(() => {
        isWheelSpinning = false;
        safeSetItem('tama_inventory', JSON.stringify(inventory));
        if(winPrize.t === 'coin') {
            addCoins(winPrize.val);
            playSound('win');
            alert(`Glückwunsch! Du hast ${winPrize.name} gewonnen!`);
        } else if(winPrize.t === 'item') {
            inventory.items[winPrize.id] = (inventory.items[winPrize.id] || 0) + 1;
            playSound('win');
            updateCoinDisplay();
            alert(`Glückwunsch! Du hast [${winPrize.name}] gewonnen!\nDas Item liegt in deinem Inventar.`);
        } else {
            playSound('lose');
            alert(`Schade! Du hast eine Niete gezogen.\nVersuch es morgen wieder.`);
        }
        switchShopTab('wheel');
    }, 4100);
}

function openShopModal() {
    playSound('select');
    updateCoinDisplay();
    switchShopTab('shop');
    document.getElementById('shopModal').style.display = 'flex';
    startCountdownUpdater();
}

function switchShopTab(tab) {
    playSound('beep');
    currentShopTab = tab;
    document.getElementById('tabShop').className = `shop-tab ${tab === 'shop' ? 'active' : ''}`;
    document.getElementById('tabInventory').className = `shop-tab ${tab === 'inventory' ? 'active' : ''}`;
    document.getElementById('tabWheel').className = `shop-tab ${tab === 'wheel' ? 'active' : ''}`;

    let container = document.getElementById('shopContentContainer');

    if (tab === 'wheel') {
        initWheel();
        let w = inventory.wheel;
        let slicesHtml = '';
        w.prizes.forEach((p, i) => {
            let rot = i * 45 + 22.5; 
            slicesHtml += `<div class="wheel-slice-content" style="transform: rotate(${rot}deg)">${p.icon}</div>`;
        });

        let btnClass = w.hasSpun ? 'btn-gray' : 'btn-gold';
        let btnText = w.hasSpun ? t('Heute schon gedreht') : t('Rad drehen!');
        let btnAction = w.hasSpun ? '' : 'spinWheel()';

        container.innerHTML = `
            <div style="text-align:center; padding:10px;">
                <p style="font-size:12px; margin-bottom:15px; color:#576574;">${t('Einmal täglich kostenlos drehen und T-Coins oder Items gewinnen!')}</p>
                <div class="wheel-container">
                    <div class="wheel-pointer"></div>
                    <div class="wheel" id="fortuneWheel" style="transform: rotate(${w.lastRotation || 0}deg)">
                        ${slicesHtml}
                    </div>
                </div>
                <button class="onboard-btn ${btnClass}" style="width:80%; margin-top:20px;" onclick="${btnAction}">${btnText}</button>
            </div>
        `;
        return;
    }

    // Kategorie-Schnellnavigation (nur im Laden-Tab): ein Tipp springt zur
    // Kategorie, statt auf dem Handy durch alles zu scrollen.
    let navHtml = '';
    if (tab === 'shop') {
        let cats = [];
        SHOP_ITEMS.forEach(it => {
            if (it.cat !== '🏆 Boss-Trophäen' && !cats.includes(it.cat)) cats.push(it.cat);
        });
        navHtml = '<div class="shop-cat-nav">' + cats.map((c, i) => {
            let locked = accountLevel < (SHOP_CATEGORY_MIN_LEVEL[c] || 1);
            let emoji = [...c][0];   // erstes Zeichen = Kategorie-Emoji
            return `<button class="shop-cat-chip ${locked ? 'locked' : ''}" title="${c}${locked ? ' (gesperrt)' : ''}" onclick="scrollToShopCat(${i})">${locked ? '🔒' : emoji}</button>`;
        }).join('') + '</div>';
    }
    container.innerHTML = navHtml + '<div class="shop-grid"></div>';
    let grid = container.querySelector('.shop-grid');

    if (tab === 'shop') {
        let lastCat = '';
        let catLocked = false;
        let catIndex = -1;
        SHOP_ITEMS.forEach(item => {
            if (item.cat === '🏆 Boss-Trophäen') return; // Nur als Arena-Loot erhältlich, nicht käuflich
            if(item.cat !== lastCat) {
                catIndex++;
                grid.innerHTML += `<div class="shop-cat-header" id="shopcat-${catIndex}">${t(item.cat)}</div>`;
                lastCat = item.cat;
                let minLvl = SHOP_CATEGORY_MIN_LEVEL[item.cat] || 1;
                catLocked = accountLevel < minLvl;
                if (catLocked) {
                    grid.innerHTML += `
                        <div class="shop-item">
                            <div class="shop-item-inner">
                                <div class="shop-item-info">
                                    <div class="shop-item-title">🔒 Gesperrt</div>
                                    <div class="shop-item-desc">Diese Kategorie schaltest du mit Pfleger-Level ${minLvl} frei. (Aktuell: Level ${accountLevel})</div>
                                </div>
                            </div>
                        </div>`;
                }
            }
            if (catLocked) return;

            let isUnlocked = false;
            if (item.type === 'hat' || item.type === 'arcade' || item.type === 'toy' || item.type.startsWith('unlock')) {
                isUnlocked = (inventory.items[item.id] > 0);
            }

            let price = item.price;
            if(pet.buffs && pet.buffs.gaslighting) {
                price = Math.round(price * 1.1); // Gaslighting 10% mehr
            }
            let ticketPrice = item.ticketPrice || 0;

            let canAfford = tCoins >= price && tickets >= ticketPrice;
            let priceLabel = ticketPrice > 0
                ? `${price} <i class="fa-solid fa-coins"></i> + ${ticketPrice} 🎫`
                : `${price} <i class="fa-solid fa-coins"></i>`;

            let btnHtml = isUnlocked 
                ? `<button class="shop-btn btn-gray" disabled>Im Besitz</button>`
                : `<button class="shop-btn ${canAfford ? 'btn-gold' : 'btn-gray'}" onclick="${canAfford ? `buyItem('${item.id}')` : ''}" style="${ticketPrice > 0 ? 'font-size:10px;' : ''}">${priceLabel}</button>`;

            let timerHtml = getBuffTimerHtml(item.id);
            grid.innerHTML += `
                <div class="shop-item" style="${timerHtml ? 'flex-direction:column;' : ''}">
                    <div class="shop-item-inner">
                        <div class="shop-item-info">
                            <div class="shop-item-title">${t(item.name)}</div>
                            <div class="shop-item-desc">${t(item.desc)}</div>
                        </div>
                        <div class="shop-item-action">${btnHtml}</div>
                    </div>
                    ${timerHtml}
                </div>`;
        });
    } else if (tab === 'inventory') {
        let hasItems = false;
        SHOP_ITEMS.forEach(item => {
            let count = inventory.items[item.id] || 0;
            let isActive = isBuffCurrentlyActive(item.id);

            // Zeige das Item, wenn wir es besitzen ODER wenn der Effekt gerade wirkt
            if (count > 0 || isActive) {
                hasItems = true;
                let btnText = "Benutzen";
                let btnClass = "btn-blue";
                let btnAction = `useItem('${item.id}')`;

                if (item.type === 'hat') {
                    let isEquipped = inventory.equippedHat === item.id;
                    btnText = isEquipped ? "Absetzen" : "Anziehen";
                    btnClass = isEquipped ? "btn-gray" : "btn-blue";
                } else if (item.type === 'unlock_skin') {
                    let isEquipped = inventory.customSkinActive;
                    btnText = isEquipped ? "Deaktivieren" : "Einstellen";
                    btnClass = isEquipped ? "btn-gray" : "btn-blue";
                } else if (item.type === 'unlock_poop') {
                    let isEquipped = inventory.rainbowPoop;
                    btnText = isEquipped ? "Deaktivieren" : "Aktivieren";
                    btnClass = isEquipped ? "btn-gray" : "btn-blue";
                } else if (item.type === 'unlock_bg') {
                    let isEquipped = inventory.customBgActive;
                    btnText = isEquipped ? "Deaktivieren" : "Einstellen";
                    btnClass = isEquipped ? "btn-gray" : "btn-blue";
                } else if (item.type === 'unlock_sub') {
                    let isEquipped = (item.id === 'happy_sub' && inventory.happySubActive) || (item.id === 'vip_sleep' && inventory.vipSleepActive);
                    btnText = isEquipped ? "Kündigen" : "Abonnieren";
                    btnClass = isEquipped ? "btn-red" : "btn-blue";
                } else if (item.type === 'arcade') {
                    btnText = "▶ Spielen";
                    btnClass = "btn-gold";
                    btnAction = `launchArcade('${item.arcade}')`;
                }

                let countBadge = (item.type === 'consumable' || item.type === 'paint' || item.type === 'gacha') && count > 0 ? `<span style="background:#2f3542; color:white; padding:1px 5px; border-radius:10px; font-size:10px;">x${count}</span>` : '';

                let customActionsHtml = '';
                if (count === 0 && (item.type === 'consumable' || item.type === 'paint' || item.type === 'gacha')) {
                    customActionsHtml = `<button class="shop-btn btn-gray" disabled>Wirkt gerade</button>`;
                } else {
                    customActionsHtml = `<button class="shop-btn ${btnClass}" onclick="${btnAction}">${btnText}</button>`;
                }

                let timerHtml = getBuffTimerHtml(item.id);
                grid.innerHTML += `
                    <div class="shop-item" style="${timerHtml ? 'flex-direction:column;' : ''}">
                        <div class="shop-item-inner">
                            <div class="shop-item-info">
                                <div class="shop-item-title">${t(item.name)} ${countBadge}</div>
                                <div class="shop-item-desc">${t(item.desc)}</div>
                            </div>
                            <div class="shop-item-action">${customActionsHtml}</div>
                        </div>
                        ${timerHtml}
                    </div>`;
            }
        });
        if(!hasItems) {
            grid.innerHTML = `<div style="text-align:center; padding: 20px; font-size:12px; color:#576574;">${t('Dein Inventar ist leer. Kauf etwas im Laden!')}</div>`;
        }
    }
}

function scrollToShopCat(i) {
    playSound('beep');
    let el = document.getElementById('shopcat-' + i);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buyItem(id) {
    let item = SHOP_ITEMS.find(i => i.id === id);
    let price = item.price;
    if(pet.buffs && pet.buffs.gaslighting) price = Math.round(price * 1.1); // Gaslighting 10% mehr
    let ticketPrice = item.ticketPrice || 0;

    if(tCoins >= price && tickets >= ticketPrice) {
        tCoins -= price;
        if(ticketPrice > 0) {
            tickets -= ticketPrice;
            safeSetItem('tama_tickets', tickets.toString());
            updateTicketDisplay();
        }
        inventory.items[id] = (inventory.items[id] || 0) + 1;
        playSound('coin');
        updateCoinDisplay();
        switchShopTab('shop');
    } else { playSound('lose'); }
}

// --- BACKUP MECHANIKEN ---
// --- Spielstand-Modal (Sichern & Laden) ---
const LAST_BACKUP_KEY = 'tama_last_backup';

function openSaveModal() {
    playSound('select');
    updateSaveStatus();
    // Eigener Medaillen-Rang - derselbe Badge, den andere beim Import/PvP sehen
    let r = document.getElementById('saveRank');
    if (r) r.innerHTML = medalRankBadgeHtml(dominantMedalTier(medalTiers), getUnlockedMedalCount());
    document.getElementById('saveModal').style.display = 'flex';
}

function markBackupDone() {
    safeSetItem(LAST_BACKUP_KEY, String(Date.now()));
    updateSaveStatus();
}

function fmtSince(ms) {
    let mins = Math.floor(ms / 60000);
    if (mins < 1)  return 'gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    let hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `vor ${hrs} Std.`;
    let days = Math.floor(hrs / 24);
    return days === 1 ? 'vor 1 Tag' : `vor ${days} Tagen`;
}

function updateSaveStatus() {
    let el = document.getElementById('saveStatus');
    if (!el) return;
    let raw = parseInt(safeGetItem(LAST_BACKUP_KEY) || '0', 10);
    if (!raw) {
        el.className = 'save-status warn';
        el.innerText = '⚠️ ' + t('Noch nie gesichert');
        return;
    }
    let age = Date.now() - raw;
    let old7 = age > 7 * 24 * 3600 * 1000;
    el.className = 'save-status' + (old7 ? ' warn' : '');
    el.innerText = (old7 ? '⚠️ ' : '✓ ') + 'Zuletzt gesichert: ' + fmtSince(age);
}

// ================================================================
// === BACKUP: SICHERN & LADEN ====================================
// ================================================================
// Gesichert wird der KOMPLETTE Fortschritt, nicht nur das Tamagotchi.
// Frueher enthielt die Datei ausschliesslich tama_save_v6 - auf einem
// anderen Geraet kam damit zwar die Kreatur an, aber Coins, Level,
// Medaillen, Wolkendorf und alles Uebrige blieben zurueck.
