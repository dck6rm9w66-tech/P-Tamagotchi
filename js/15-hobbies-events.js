/* Achtsamkeits-Tamagotchi - Hobbys & Abenteuer / Begegnungen & Feste
 *
 * 1) HOBBYS: werden einmal gekauft und dann immer wieder ausgeuebt (mit kurzer
 *    Ruhezeit). Jedes Hobby hat 5 Meisterstufen und ein Sammelalbum mit 6
 *    Fundstuecken. Hoehere Stufe = staerkere Wirkung + seltenere Funde.
 *    Ein volles Album gibt eine grosse Belohnung.
 * 2) BEGEGNUNGEN & FESTE: Eintrittskarten (einmalig), die ein kleines
 *    interaktives Erlebnis in einem eigenen Overlay starten.
 *
 * Fortschritt liegt in localStorage 'tama_hobbies' (gehoert dem Pfleger und
 * ueberdauert den Tod des Tamagotchis, wie Medaillen oder das Wolkendorf).
 */

const HOBBY_KEY = 'tama_hobbies';
let hobbyData = {};
try { hobbyData = JSON.parse(safeGetItem(HOBBY_KEY) || '{}') || {}; } catch (e) { hobbyData = {}; }
function saveHobbies() { safeSetItem(HOBBY_KEY, JSON.stringify(hobbyData)); }

// Zweisprachige Kurzform (lang kommt aus 04-i18n.js)
function L(de, en) { return (typeof lang !== 'undefined' && lang === 'en') ? en : de; }

const HOBBY_LEVEL_XP = [0, 3, 8, 15, 25];          // XP-Schwellen fuer Stufe 1..5
const HOBBY_LEVEL_NAMES = [
    ['Neuling', 'Beginner'], ['Lehrling', 'Apprentice'], ['Geübt', 'Skilled'],
    ['Profi', 'Expert'], ['Meister', 'Master']
];
const HOBBY_COOLDOWN_MS = 15 * 60 * 1000;          // 15 Minuten Ruhezeit
const RARITY = {
    1: { w: 50, de: 'Häufig',   en: 'Common',    c: '#95a5a6' },
    2: { w: 30, de: 'Selten',   en: 'Uncommon',  c: '#27ae60' },
    3: { w: 15, de: 'Rar',      en: 'Rare',      c: '#2980b9' },
    4: { w: 5,  de: 'Legendär', en: 'Legendary', c: '#e67e22' }
};

// Fundstueck: [key, icon, de, en, rarity]
const HOBBIES = {
    toy_ball: {
        icon: '🪀', grad: ['#ff9ff3', '#f368e0'], scene: 'spin',
        title: ['Kreisel-Tricks', 'Spinner Tricks'],
        album: ['Trick-Sammlung', 'Trick collection'],
        verb: ['Kreiseln', 'Spin'],
        effect: { happy: 12 },
        finds: [
            ['loop', '➰', 'Looping', 'Loop', 1], ['wobble', '〰️', 'Wackel-Tanz', 'Wobble dance', 1],
            ['hop', '🦘', 'Hüpf-Trick', 'Hop trick', 2], ['double', '♾️', 'Doppel-Spin', 'Double spin', 2],
            ['record', '🏅', 'Rekord-Spin', 'Record spin', 3], ['galaxy', '🌀', 'Galaxie-Wirbel', 'Galaxy whirl', 4]
        ]
    },
    robot_friend: {
        icon: '🤖', grad: ['#7ed6df', '#22a6b3'], scene: 'robot',
        title: ['Basteln mit Robo', 'Tinkering with Robo'],
        album: ['Ersatzteil-Kiste', 'Parts box'],
        verb: ['Basteln', 'Tinker'],
        effect: { happy: 9, int: 2 },
        finds: [
            ['gear', '⚙️', 'Zahnrad', 'Gear', 1], ['battery', '🔋', 'Batterie', 'Battery', 1],
            ['bulb', '💡', 'Glühbirne', 'Light bulb', 2], ['magnet', '🧲', 'Magnet', 'Magnet', 2],
            ['antenna', '📡', 'Antenne', 'Antenna', 3], ['heart', '💖', 'Herz-Chip', 'Heart chip', 4]
        ]
    },
    book: {
        icon: '📖', grad: ['#f6e58d', '#f9ca24'], scene: 'read', sequential: true,
        title: ['Vorlesestunde', 'Story time'],
        album: ['„Die kleine Wolke"', '"The Little Cloud"'],
        verb: ['Weiterlesen', 'Read on'],
        effect: { happy: 4, int: 4 },
        finds: [
            ['p1', '1️⃣', 'Eine kleine Wolke fühlte sich immer zu klein.', 'A little cloud always felt too small.', 1],
            ['p2', '2️⃣', 'Sie wollte so groß sein wie die Gewitterwolken.', 'It wanted to be as big as the storm clouds.', 1],
            ['p3', '3️⃣', 'Eines Tages bat eine durstige Blume um Regen.', 'One day a thirsty flower asked for rain.', 1],
            ['p4', '4️⃣', 'Die kleine Wolke gab, was sie hatte – ein paar Tropfen.', 'The little cloud gave what it had – a few drops.', 1],
            ['p5', '5️⃣', 'Die Blume blühte auf und strahlte vor Dank.', 'The flower bloomed and beamed with thanks.', 1],
            ['p6', '6️⃣', 'Da verstand die Wolke: Sie war genau richtig, so wie sie war.', 'Then the cloud understood: it was just right, as it was.', 1]
        ]
    },
    instrument: {
        icon: '🎸', grad: ['#ffbe76', '#f0932b'], scene: 'music',
        title: ['Ukulele-Session', 'Ukulele session'],
        album: ['Liederbuch', 'Songbook'],
        verb: ['Musizieren', 'Play'],
        effect: { happy: 14, int: 1 },
        finds: [
            ['rain', '🌧️', 'Regenlied', 'Rain song', 1], ['lull', '🌙', 'Wiegenlied', 'Lullaby', 1],
            ['sunrise', '🌅', 'Sonnenaufgang', 'Sunrise', 2], ['waltz', '☁️', 'Wolkenwalzer', 'Cloud waltz', 2],
            ['star', '✨', 'Sternenmelodie', 'Star melody', 3], ['heart', '💓', 'Herzschlag-Groove', 'Heartbeat groove', 4]
        ],
        // Echte kleine Melodien (Frequenzen in Hz), werden beim Fund gespielt
        tunes: {
            rain: [659, 587, 523, 587, 659, 659, 659],
            lull: [392, 330, 392, 330, 392, 440, 392],
            sunrise: [262, 330, 392, 523, 659, 784],
            waltz: [392, 494, 587, 494, 392, 494, 587],
            star: [523, 523, 784, 784, 880, 880, 784],
            heart: [196, 196, 262, 196, 196, 294, 330, 262]
        }
    },
    tent: {
        icon: '⛺', grad: ['#686de0', '#30336b'], scene: 'stars',
        title: ['Sternen-Camping', 'Stargazing camp'],
        album: ['Sternbilder', 'Constellations'],
        verb: ['Zelten', 'Camp'],
        effect: { happy: 12, energy: 12 },
        finds: [
            ['wagon', '🌌', 'Großer Wagen', 'Big Dipper', 1], ['orion', '🏹', 'Orion', 'Orion', 1],
            ['cass', '👑', 'Kassiopeia', 'Cassiopeia', 2], ['swan', '🦢', 'Schwan', 'Cygnus', 2],
            ['lyra', '🎼', 'Leier', 'Lyra', 3], ['cloud', '☁️', 'Das Wolkenwesen', 'The Cloud Creature', 4]
        ]
    },
    diving_gear: {
        icon: '🤿', grad: ['#48dbfb', '#0abde3'], scene: 'dive',
        title: ['Tauchgang', 'Dive'],
        album: ['Schatzkiste', 'Treasure chest'],
        verb: ['Abtauchen', 'Dive in'],
        effect: { happy: 12, clean: true },
        finds: [
            ['shell', '🐚', 'Muschel', 'Seashell', 1], ['star', '⭐', 'Seestern', 'Starfish', 1],
            ['coral', '🪸', 'Koralle', 'Coral', 2], ['pearl', '🦪', 'Perle', 'Pearl', 2],
            ['key', '🗝️', 'Alter Schlüssel', 'Old key', 3], ['gem', '💎', 'Meeres-Juwel', 'Sea jewel', 4]
        ]
    },
    diary: {
        icon: '📔', grad: ['#c8d6e5', '#8395a7'], scene: 'write',
        title: ['Achtsam schreiben', 'Mindful journaling'],
        album: ['Gedanken-Sammlung', 'Thought collection'],
        verb: ['Schreiben', 'Write'],
        effect: { happy: 10, energy: 4 },
        finds: [
            ['thanks', '🙏', 'Wofür bist du heute dankbar?', 'What are you grateful for today?', 1],
            ['smile', '😊', 'Was hat dich heute zum Lächeln gebracht?', 'What made you smile today?', 1],
            ['kind', '💌', 'Wem könntest du heute etwas Gutes tun?', 'Who could you do something kind for today?', 2],
            ['proud', '🌱', 'Worauf bist du gerade stolz?', 'What are you proud of right now?', 2],
            ['letgo', '🍃', 'Was darfst du heute loslassen?', 'What can you let go of today?', 3],
            ['self', '💛', 'Was würdest du einer guten Freundin raten?', 'What would you tell a good friend?', 4]
        ]
    },
    camera: {
        icon: '📸', grad: ['#ff7979', '#eb4d4b'], scene: 'photo',
        title: ['Foto-Spaziergang', 'Photo walk'],
        album: ['Fotoalbum', 'Photo album'],
        verb: ['Fotografieren', 'Shoot'],
        effect: { happy: 10, coinsChance: 0.3 },
        finds: [
            ['morning', '🌄', 'Morgenlicht', 'Morning light', 1], ['noon', '☀️', 'Mittagssonne', 'Midday sun', 1],
            ['evening', '🌇', 'Abendrot', 'Sunset glow', 2], ['night', '🌃', 'Mondnacht', 'Moonlit night', 2],
            ['selfie', '🤳', 'Selfie mit Tama', 'Selfie with Tama', 3], ['rainbow', '🌈', 'Regenbogen', 'Rainbow', 4]
        ]
    }
};

function isHobbyItem(id) { return !!HOBBIES[id]; }

function hobbyState(id) {
    if (!hobbyData[id]) hobbyData[id] = { xp: 0, last: 0, found: {}, done: false, uses: 0 };
    let s = hobbyData[id];
    s.found = s.found || {};
    return s;
}
function hobbyLevel(id) {
    let xp = hobbyState(id).xp, lv = 1;
    for (let i = 0; i < HOBBY_LEVEL_XP.length; i++) if (xp >= HOBBY_LEVEL_XP[i]) lv = i + 1;
    return lv;
}
function hobbyCooldownLeft(id) {
    let s = hobbyState(id);
    let mult = (typeof getVillageEffect === 'function') ? (1 - Math.min(0.5, getVillageEffect('park') || 0)) : 1;
    return Math.max(0, (s.last || 0) + HOBBY_COOLDOWN_MS * mult - Date.now());
}
function fmtMs(ms) {
    let m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m + ':' + String(s).padStart(2, '0');
}

// Fund auswuerfeln. Hoehere Stufe verschiebt die Gewichte zu selteneren Funden.
function rollHobbyFind(id) {
    let def = HOBBIES[id], s = hobbyState(id), lv = hobbyLevel(id);
    if (def.sequential) {
        let next = def.finds.find(f => !s.found[f[0]]);
        return next || def.finds[Math.floor(Math.random() * def.finds.length)];
    }
    if (id === 'camera') {
        // Motiv haengt von der Tageszeit ab; Selfie & Regenbogen sind Glueckstreffer
        let r = Math.random();
        if (r < 0.04 + lv * 0.02) return def.finds[5];
        if (r < 0.16 + lv * 0.03) return def.finds[4];
        let h = new Date().getHours();
        let key = h < 11 ? 'morning' : h < 17 ? 'noon' : h < 21 ? 'evening' : 'night';
        if (h < 5) key = 'night';
        return def.finds.find(f => f[0] === key);
    }
    let weights = def.finds.map(f => {
        let w = RARITY[f[4]].w;
        if (f[4] >= 3) w *= (1 + (lv - 1) * 0.35);    // Meisterschaft macht Rares wahrscheinlicher
        if (!s.found[f[0]]) w *= 1.4;                 // Neues bevorzugt
        return w;
    });
    let sum = weights.reduce((a, b) => a + b, 0), r = Math.random() * sum;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return def.finds[i]; }
    return def.finds[0];
}

function playTune(freqs) {
    if (typeof isMuted !== 'undefined' && isMuted) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        freqs.forEach((f, i) => {
            const t0 = audioCtx.currentTime + i * 0.22;
            const osc = audioCtx.createOscillator(), gn = audioCtx.createGain();
            osc.type = 'triangle'; osc.frequency.value = f;
            osc.connect(gn); gn.connect(audioCtx.destination);
            gn.gain.setValueAtTime(0.0001, t0);
            gn.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
            osc.start(t0); osc.stop(t0 + 0.42);
        });
    } catch (e) {}
}

function petPresentOrWarn() {
    if (!state.isStarted || pet.isDead || pet.isDeparted) {
        alert(L('Dafür muss dein Tamagotchi gerade bei dir sein!', 'Your Tamagotchi needs to be with you for this!'));
        return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// Hobby ausueben
// ---------------------------------------------------------------------------
function useHobby(id) {
    let def = HOBBIES[id]; if (!def) return;
    if (!petPresentOrWarn()) return;
    let left = hobbyCooldownLeft(id);
    if (left > 0) { playSound('cancel'); return; }

    let s = hobbyState(id);
    let lvBefore = hobbyLevel(id);
    let find = rollHobbyFind(id);
    let isNew = !s.found[find[0]];
    s.found[find[0]] = (s.found[find[0]] || 0) + 1;
    s.last = Date.now();
    s.uses = (s.uses || 0) + 1;
    s.xp += isNew ? 3 : 1;
    let lv = hobbyLevel(id);

    // Wirkung waechst mit der Meisterstufe
    let bonus = (lv - 1) * 2, e = def.effect, lines = [];
    if (e.happy)  { let v = e.happy + bonus; pet.happiness = Math.min(100, pet.happiness + v); lines.push('😊 +' + v); }
    if (e.int)    { let v = e.int + Math.floor(bonus / 2); pet.intelligence += v; lines.push('🧠 +' + v); }
    if (e.energy) { let v = e.energy + bonus; pet.energy = Math.min(100, pet.energy + v); lines.push('⚡ +' + v); }
    if (e.clean)  { pet.isDirty = false; lines.push('🫧 ' + L('sauber', 'clean')); }
    if (e.coinsChance && Math.random() < e.coinsChance + lv * 0.04) {
        let g = addCoins(15 + lv * 8); lines.push('🪙 +' + g);
    }
    if (typeof markCareInteraction === 'function') markCareInteraction();
    if (typeof addAccountXP === 'function') addAccountXP(isNew ? 4 : 2);

    let rewards = [];
    if (lv > lvBefore) {
        let c = addCoins(40 * lv);
        rewards.push(`⭐ ${L('Stufe', 'Level')} ${lv}: ${L(HOBBY_LEVEL_NAMES[lv-1][0], HOBBY_LEVEL_NAMES[lv-1][1])}! +${c} 🪙`);
    }
    let complete = def.finds.every(f => s.found[f[0]]);
    if (complete && !s.done) {
        s.done = true;
        let c = addCoins(250), tk = addTickets(5);
        if (typeof addAccountXP === 'function') addAccountXP(30);
        rewards.push(`🏆 ${L('Album komplett!', 'Album complete!')} +${c} 🪙 +${tk} 🎫`);
    }
    saveHobbies();
    saveGame();

    if (def.tunes && def.tunes[find[0]]) playTune(def.tunes[find[0]]); else playSound(isNew ? 'sparkle' : 'select');

    openExperience(hobbySceneHtml(id, find, isNew, lines, rewards));
    if (lv > lvBefore || (complete && rewards.length)) {
        setTimeout(() => showAchievementBanner(def.icon,
            complete && rewards.some(r => r.startsWith('🏆')) ? L(def.album[0] + ' komplett!', def.album[1] + ' complete!')
                     : `${L(def.title[0], def.title[1])} – ${L('Stufe', 'Level')} ${lv}`, 'unlock'), 900);
    }
    if (typeof switchShopTab === 'function') switchShopTab('inventory');
}

// Animierte Szene pro Hobby
function sceneDecor(scene) {
    switch (scene) {
        case 'spin':  return `<div class="xp-deco xp-spin">🪀</div><div class="xp-trail">✨</div>`;
        case 'robot': return `<div class="xp-deco xp-bob">🤖</div><div class="xp-spark s1">⚡</div><div class="xp-spark s2">🔧</div>`;
        case 'read':  return `<div class="xp-deco xp-page">📖</div>`;
        case 'music': return `<div class="xp-deco xp-bob">🎸</div><div class="xp-note n1">♪</div><div class="xp-note n2">♫</div><div class="xp-note n3">♪</div>`;
        case 'stars': return `<div class="xp-starfield"></div><div class="xp-deco">⛺</div>`;
        case 'dive':  return `<div class="xp-water"></div><div class="xp-deco xp-sink">🤿</div><div class="xp-bubble b1"></div><div class="xp-bubble b2"></div><div class="xp-bubble b3"></div>`;
        case 'write': return `<div class="xp-deco xp-bob">📔</div><div class="xp-pen">✏️</div>`;
        case 'photo': return `<div class="xp-flash"></div><div class="xp-deco">📸</div>`;
    }
    return '';
}

function hobbySceneHtml(id, find, isNew, lines, rewards) {
    let def = HOBBIES[id], s = hobbyState(id), lv = hobbyLevel(id);
    let rar = RARITY[find[4]];
    let label = L(find[2], find[3]);
    let longText = def.sequential || id === 'diary';
    let foundCount = def.finds.filter(f => s.found[f[0]]).length;
    return `
      <div class="xp-stage xp-${def.scene}" style="--g1:${def.grad[0]};--g2:${def.grad[1]}">
        ${sceneDecor(def.scene)}
      </div>
      <div class="xp-title">${L(def.title[0], def.title[1])}</div>
      <div class="xp-find ${isNew ? 'is-new' : ''}">
        ${isNew ? `<div class="xp-new">${L('NEU!', 'NEW!')}</div>` : ''}
        <div class="xp-find-icon">${find[1]}</div>
        <div class="xp-find-name ${longText ? 'long' : ''}">${longText ? '„' + label + '"' : label}</div>
        ${def.sequential ? '' : `<div class="xp-rarity" style="color:${rar.c}">${L(rar.de, rar.en)}</div>`}
      </div>
      <div class="xp-stats">${lines.join(' &nbsp; ')}</div>
      ${rewards.map(r => `<div class="xp-reward">${r}</div>`).join('')}
      <div class="xp-progress">${L(def.album[0], def.album[1])}: ${foundCount}/${def.finds.length} · ${L('Stufe', 'Level')} ${lv}</div>
      ${def.sequential && foundCount === def.finds.length ? `<div class="xp-story">${def.finds.map(f => L(f[2], f[3])).join(' ')}</div>` : ''}
    `;
}

// ---------------------------------------------------------------------------
// Erlebnis-Overlay (gemeinsam fuer Hobbys & Feste)
// ---------------------------------------------------------------------------
function ensureExperienceOverlay() {
    let ov = document.getElementById('experienceModal');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.className = 'modal-bg';
    ov.id = 'experienceModal';
    ov.style.zIndex = '110';
    ov.innerHTML = `<div class="modal-content xp-modal">
        <span class="modal-close" onclick="closeExperience()">&times;</span>
        <div id="experienceBody"></div>
      </div>`;
    document.body.appendChild(ov);
    return ov;
}
function openExperience(html, withClose) {
    let ov = ensureExperienceOverlay();
    document.getElementById('experienceBody').innerHTML = html +
        (withClose === false ? '' : `<button class="onboard-btn btn-blue xp-done" onclick="closeExperience()">${L('Schön! 🌸', 'Lovely! 🌸')}</button>`);
    ov.style.display = 'flex';
}
function closeExperience() {
    let ov = document.getElementById('experienceModal');
    if (ov) ov.style.display = 'none';
    if (_talentLoop) { cancelAnimationFrame(_talentLoop); _talentLoop = null; }
    if (typeof flushAnimationQueue === 'function') { try { flushAnimationQueue(); } catch (e) {} }
    if (typeof updateCoinDisplay === 'function') updateCoinDisplay();
    if (typeof render === 'function') render();
    if (typeof switchShopTab === 'function' && document.getElementById('shopModal') &&
        document.getElementById('shopModal').style.display === 'flex') switchShopTab(typeof currentShopTab !== 'undefined' ? currentShopTab : 'inventory');
}

// ---------------------------------------------------------------------------
// Karten im Shop & Inventar
// ---------------------------------------------------------------------------
// Das Emoji am Namensende steht schon gross im Badge -> im Titel weglassen
function richTitle(item) {
    return t(item.name).replace(/\s*[\p{Extended_Pictographic}\u{FE0F}\u{200D}]+\s*$/u, '');
}
function hobbyStarsHtml(lv) {
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<span class="${i <= lv ? 'on' : ''}">★</span>`;
    return `<span class="hb-stars">${s}</span>`;
}

function richShopCardHtml(item, mode, actionHtml, timerHtml) {
    if (HOBBIES[item.id]) return hobbyCardHtml(item, mode, actionHtml);
    if (EVENT_DEFS[item.id]) return eventCardHtml(item, mode, actionHtml, timerHtml);
    return null;
}

function hobbyCardHtml(item, mode, actionHtml) {
    let def = HOBBIES[item.id], s = hobbyState(item.id), lv = hobbyLevel(item.id);
    let owned = (inventory.items[item.id] || 0) > 0;
    let foundCount = def.finds.filter(f => s.found[f[0]]).length;
    let nextXp = HOBBY_LEVEL_XP[lv] !== undefined ? HOBBY_LEVEL_XP[lv] : null;
    let pct = nextXp === null ? 100 : Math.round((s.xp - HOBBY_LEVEL_XP[lv-1]) / (nextXp - HOBBY_LEVEL_XP[lv-1]) * 100);
    let slots = def.finds.map(f => {
        let got = s.found[f[0]];
        let tip = got ? L(f[2], f[3]) : '???';
        return `<span class="hb-slot ${got ? 'got' : ''} r${f[4]}" title="${tip.replace(/"/g, '&quot;')}">${got ? f[1] : '?'}</span>`;
    }).join('');

    let action = actionHtml;
    if (mode === 'inventory') {
        let left = hobbyCooldownLeft(item.id);
        action = left > 0
            ? `<button class="shop-btn btn-gray hb-cd" data-hobby-cd="${item.id}" disabled>⏳ ${fmtMs(left)}</button>`
            : `<button class="shop-btn btn-gold" onclick="useHobby('${item.id}')">${L(def.verb[0], def.verb[1])} ▶</button>`;
    }
    return `
    <div class="shop-item rich-card hobby-card" style="--g1:${def.grad[0]};--g2:${def.grad[1]}">
      <div class="rc-top">
        <div class="rc-badge">${def.icon}</div>
        <div class="rc-info">
          <div class="shop-item-title">${richTitle(item)}</div>
          <div class="rc-sub">${L(def.title[0], def.title[1])}${owned || s.xp ? ' · ' + L(HOBBY_LEVEL_NAMES[lv-1][0], HOBBY_LEVEL_NAMES[lv-1][1]) : ''}</div>
          ${owned || s.xp ? hobbyStarsHtml(lv) : ''}
        </div>
        <div class="shop-item-action">${action}</div>
      </div>
      <div class="shop-item-desc">${t(item.desc)}</div>
      ${owned || s.xp ? `<div class="hb-bar"><div style="width:${pct}%"></div></div>` : ''}
      <div class="hb-album">
        <span class="hb-album-label">${L(def.album[0], def.album[1])} ${foundCount}/${def.finds.length}${s.done ? ' 🏆' : ''}</span>
        <div class="hb-slots">${slots}</div>
      </div>
      ${mode === 'shop' ? `<div class="rc-tags"><span>♻️ ${L('Dauerhaft', 'Permanent')}</span><span>⭐ ${L('5 Stufen', '5 levels')}</span><span>🎒 ${L('6 Funde', '6 finds')}</span></div>` : ''}
    </div>`;
}

// Countdown der Hobby-Buttons im Inventar live mitlaufen lassen
setInterval(function () {
    document.querySelectorAll('[data-hobby-cd]').forEach(btn => {
        let id = btn.getAttribute('data-hobby-cd');
        let left = hobbyCooldownLeft(id);
        if (left <= 0) {
            let def = HOBBIES[id];
            btn.outerHTML = `<button class="shop-btn btn-gold" onclick="useHobby('${id}')">${L(def.verb[0], def.verb[1])} ▶</button>`;
        } else btn.textContent = '⏳ ' + fmtMs(left);
    });
}, 1000);

// ---------------------------------------------------------------------------
// BEGEGNUNGEN & FESTE
// ---------------------------------------------------------------------------
const EVENT_DEFS = {
    dating_app: { icon: '🧺', grad: ['#ffcccc', '#ff9ff3'], tag: ['Begegnung', 'Encounter'], play: ['Hinweise lesen & Gesten wählen', 'Read hints & pick gestures'] },
    casino:     { icon: '🎡', grad: ['#ffeaa7', '#fdcb6e'], tag: ['Jahrmarkt', 'Funfair'],      play: ['Rad drehen – jede Runde gewinnt', 'Spin the wheel – every spin wins'] },
    therapy:    { icon: '🔥', grad: ['#fab1a0', '#e17055'], tag: ['Gemeinschaft', 'Together'],  play: ['Eine Geschichte am Feuer wählen', 'Pick a story by the fire'] },
    tiktok:     { icon: '🎤', grad: ['#a29bfe', '#6c5ce7'], tag: ['Bühne', 'Stage'],            play: ['Timing-Spiel mit 3 Einsätzen', 'Timing game with 3 beats'] }
};

function eventCardHtml(item, mode, actionHtml, timerHtml) {
    let def = EVENT_DEFS[item.id];
    let count = inventory.items[item.id] || 0;
    let action = actionHtml;
    if (mode === 'inventory') action = `<button class="shop-btn btn-gold" onclick="useItem('${item.id}')">${L('Einlösen', 'Redeem')} ▶</button>`;
    return `
    <div class="shop-item rich-card ticket-card" style="--g1:${def.grad[0]};--g2:${def.grad[1]}">
      <div class="rc-top">
        <div class="rc-badge">${def.icon}</div>
        <div class="rc-info">
          <div class="shop-item-title">${richTitle(item)} ${mode === 'inventory' && count > 0 ? `<span class="rc-count">x${count}</span>` : ''}</div>
          <div class="rc-sub">🎟️ ${L(def.tag[0], def.tag[1])} · ${L(def.play[0], def.play[1])}</div>
        </div>
        <div class="shop-item-action">${action}</div>
      </div>
      <div class="ticket-perf"></div>
      <div class="shop-item-desc">${t(item.desc)}</div>
      ${timerHtml || ''}
    </div>`;
}

function startEvent(id) {
    if (id === 'dating_app') return startPicnic();
    if (id === 'casino') return startWheel();
    if (id === 'therapy') return startCampfire();
    if (id === 'tiktok') return startTalent();
}

// --- 1) Wolken-Picknick: Hinweise lesen, passende Geste waehlen ---
const PICNIC_NAMES = ['Mira', 'Juno', 'Pip', 'Lumi', 'Fips', 'Nala', 'Tiko', 'Wolli', 'Sora', 'Bibi'];
const PICNIC_GESTURES = {
    listen: { icon: '👂', de: 'Zuhören',  en: 'Listen' },
    share:  { icon: '🍓', de: 'Teilen',   en: 'Share' },
    joke:   { icon: '😄', de: 'Spaßen',   en: 'Joke' }
};
const PICNIC_HINTS = {
    listen: [['schaut nachdenklich in die Wolken.', 'gazes thoughtfully at the clouds.'],
             ['seufzt leise und möchte etwas erzählen.', 'sighs softly and wants to tell you something.']],
    share:  [['schielt hungrig auf deinen Korb.', 'glances hungrily at your basket.'],
             ['hat das eigene Essen vergessen.', 'forgot to bring any food.']],
    joke:   [['kichert schon die ganze Zeit.', 'has been giggling the whole time.'],
             ['wirkt etwas gelangweilt.', 'seems a little bored.']]
};
let picnic = null;

function startPicnic() {
    let sp = Math.floor(Math.random() * (typeof SPRITE_SPECIES !== 'undefined' ? 16 : speciesList.length));
    picnic = {
        name: PICNIC_NAMES[Math.floor(Math.random() * PICNIC_NAMES.length)],
        species: sp, round: 0, hearts: 0, wants: null
    };
    playSound('select');
    nextPicnicRound();
}
function guestImg(size) {
    if (typeof spriteImgBySpecies === 'function') return spriteImgBySpecies(picnic.species, size, 'erwachsen');
    return speciesList[picnic.species] || '🐾';
}
function nextPicnicRound(feedback) {
    let keys = Object.keys(PICNIC_GESTURES);
    picnic.wants = keys[Math.floor(Math.random() * keys.length)];
    let hint = PICNIC_HINTS[picnic.wants][Math.floor(Math.random() * 2)];
    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += i < picnic.hearts ? '💖' : '🤍';
    let btns = keys.map(k => `<button class="xp-choice" onclick="picnicChoose('${k}')"><span>${PICNIC_GESTURES[k].icon}</span>${L(PICNIC_GESTURES[k].de, PICNIC_GESTURES[k].en)}</button>`).join('');
    openExperience(`
      <div class="xp-stage xp-picnic" style="--g1:#ffe0e9;--g2:#c7ecee">
        <div class="pn-blanket"></div>
        <div class="pn-guest">${guestImg('64px')}</div>
        <div class="pn-me">${typeof spriteSrc === 'function' ? `<img src="${spriteSrc(pet)}" style="width:56px;height:56px;image-rendering:pixelated">` : ''}</div>
        <div class="pn-basket">🧺</div>
      </div>
      <div class="xp-title">${L('Wolken-Picknick mit', 'Cloud picnic with')} ${picnic.name}</div>
      <div class="pn-hearts">${hearts}</div>
      ${feedback ? `<div class="pn-feedback">${feedback}</div>` : ''}
      <div class="pn-hint">${L('Runde', 'Round')} ${picnic.round + 1}/3 — <b>${picnic.name}</b> ${L(hint[0], hint[1])}</div>
      <div class="xp-choices">${btns}</div>
    `, false);
}
function picnicChoose(k) {
    let ok = k === picnic.wants;
    if (ok) { picnic.hearts++; playSound('sparkle'); } else playSound('beep');
    picnic.round++;
    let fb = ok ? L('💖 Das hat gut getan!', '💖 That felt good!')
                : L(`🙂 Nett gemeint – ${PICNIC_GESTURES[picnic.wants].icon} hätte besser gepasst.`,
                    `🙂 Kind of you – ${PICNIC_GESTURES[picnic.wants].icon} would have fit better.`);
    if (picnic.round < 3) return nextPicnicRound(fb);

    // Abschluss
    let h = picnic.hearts, mood = 6 + h * 8, extra = [];
    pet.happiness = Math.min(100, pet.happiness + mood);
    let s = hobbyState('_social');
    s.friends = s.friends || {};
    if (h === 3) {
        s.friends[picnic.name] = (s.friends[picnic.name] || 0) + 1;
        let tk = addTickets(2); extra.push(`🎫 +${tk}`);
        if (typeof addAccountXP === 'function') addAccountXP(15);
    } else if (h === 2) { let c = addCoins(40); extra.push(`🪙 +${c}`); }
    saveHobbies(); if (typeof markCareInteraction === 'function') markCareInteraction(); saveGame();
    let friendCount = Object.keys(s.friends).length;
    let verdict = h === 3 ? L('Ihr seid jetzt Freunde fürs Leben! 💞', 'You are friends for life now! 💞')
               : h === 2 ? L('Ein richtig schöner Nachmittag.', 'A really lovely afternoon.')
               : h === 1 ? L('Etwas holprig – aber nett war\'s.', 'A bit bumpy – but nice.')
               : L('Manchmal passt es einfach nicht. Das ist okay.', 'Sometimes it just doesn\'t click. That\'s okay.');
    playSound(h >= 2 ? 'win' : 'select');
    openExperience(`
      <div class="xp-stage xp-picnic" style="--g1:#ffe0e9;--g2:#c7ecee">
        <div class="pn-blanket"></div><div class="pn-guest">${guestImg('64px')}</div>
        ${h >= 2 ? '<div class="xp-note n1">💖</div><div class="xp-note n2">💗</div><div class="xp-note n3">💖</div>' : ''}
      </div>
      <div class="xp-title">${verdict}</div>
      <div class="pn-hearts">${'💖'.repeat(h)}${'🤍'.repeat(3 - h)}</div>
      <div class="xp-stats">😊 +${mood} ${extra.join(' ')}</div>
      <div class="xp-progress">${L('Freundschaftsbuch', 'Friendship book')}: ${friendCount} ${L(friendCount === 1 ? 'Freund' : 'Freunde', friendCount === 1 ? 'friend' : 'friends')}</div>`);
}

// --- 2) Jahrmarkt-Gluecksrad: jede Drehung gewinnt etwas ---
const WHEEL = [
    { icon: '🪙', de: '+40 T-Coins',  en: '+40 T-Coins',  w: 26, c: '#ffeaa7', act: () => '🪙 +' + addCoins(40) },
    { icon: '😊', de: '+15 Laune',    en: '+15 mood',     w: 20, c: '#fab1a0', act: () => { pet.happiness = Math.min(100, pet.happiness + 15); return '😊 +15'; } },
    { icon: '💰', de: '+90 T-Coins',  en: '+90 T-Coins',  w: 16, c: '#ffeaa7', act: () => '🪙 +' + addCoins(90) },
    { icon: '🍪', de: 'Glückskeks',   en: 'Fortune cookie', w: 12, c: '#dfe6e9', act: () => { inventory.items['cookie'] = (inventory.items['cookie'] || 0) + 1; return '🥠 +1'; } },
    { icon: '🎫', de: '+2 Tickets',   en: '+2 tickets',   w: 12, c: '#a29bfe', act: () => '🎫 +' + addTickets(2) },
    { icon: '⚡', de: '+20 Energie',  en: '+20 energy',   w: 10, c: '#81ecec', act: () => { pet.energy = Math.min(100, pet.energy + 20); return '⚡ +20'; } },
    { icon: '🌟', de: 'JACKPOT 300',  en: 'JACKPOT 300',  w: 4,  c: '#fdcb6e', act: () => '🌟 +' + addCoins(300) }
];
let wheelBusy = false;

function startWheel() {
    wheelBusy = false;
    let n = WHEEL.length, seg = 360 / n;
    let grad = WHEEL.map((s, i) => `${s.c} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
    let labels = WHEEL.map((s, i) =>
        `<div class="wh-label" style="transform:rotate(${i * seg + seg / 2}deg) translateY(-72px)">${s.icon}</div>`).join('');
    openExperience(`
      <div class="wh-wrap">
        <div class="wh-pointer">▼</div>
        <div class="wh-wheel" id="whWheel" style="background:conic-gradient(${grad})">${labels}<div class="wh-hub">🎡</div></div>
      </div>
      <div class="xp-title">${L('Jahrmarkt-Glücksrad', 'Funfair wheel')}</div>
      <div class="xp-progress">${L('Jedes Feld gewinnt – der Jackpot ist selten!', 'Every slot wins – the jackpot is rare!')}</div>
      <div id="whResult" class="xp-stats"></div>
      <button class="onboard-btn btn-gold" id="whBtn" onclick="spinWheel()">${L('Drehen! 🎡', 'Spin! 🎡')}</button>
    `, false);
}
function spinWheel() {
    if (wheelBusy) return; wheelBusy = true;
    let sum = WHEEL.reduce((a, s) => a + s.w, 0), r = Math.random() * sum, idx = 0;
    for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r <= 0) { idx = i; break; } }
    let seg = 360 / WHEEL.length;
    // Zeiger oben (0deg): das Feld idx muss nach oben gedreht werden
    let target = 360 * 5 + (360 - (idx * seg + seg / 2)) + (Math.random() * seg * 0.6 - seg * 0.3);
    let w = document.getElementById('whWheel');
    document.getElementById('whBtn').disabled = true;
    playSound('gacha');
    w.style.transition = 'transform 3.2s cubic-bezier(0.15, 0.85, 0.25, 1)';
    w.style.transform = `rotate(${target}deg)`;
    setTimeout(() => {
        let s = WHEEL[idx], got = s.act();
        saveGame(); safeSetItem('tama_inventory', JSON.stringify(inventory));
        playSound(s.icon === '🌟' ? 'achievement' : 'win');
        document.getElementById('whResult').innerHTML = `<div class="xp-reward">${L('Gewonnen', 'You won')}: ${got}${s.icon === '🍪' ? ' ' + L('Glückskeks', 'fortune cookie') : ''}</div>`;
        let b = document.getElementById('whBtn');
        b.disabled = false; b.textContent = L('Schön! 🌸', 'Lovely! 🌸'); b.onclick = closeExperience;
        if (s.icon === '🌟') showAchievementBanner('🌟', 'JACKPOT!', 'generic');
    }, 3300);
}

// --- 3) Lagerfeuer-Abend: Geschichte waehlen ---
const CAMPFIRE_STORIES = [
    { icon: '🦁', de: 'Eine Mut-Geschichte',     en: 'A tale of courage',   eff: { energy: 25 },            out: ['Alle sitzen ein bisschen aufrechter.', 'Everyone sits up a little taller.'] },
    { icon: '😂', de: 'Eine lustige Anekdote',   en: 'A funny anecdote',    eff: { happy: 22 },             out: ['Gelächter hallt über die Wiese.', 'Laughter echoes across the meadow.'] },
    { icon: '🦉', de: 'Eine alte Weisheit',      en: 'An old wisdom',       eff: { int: 6, happy: 8 },      out: ['Nachdenkliche Stille, dann ein Nicken.', 'Thoughtful silence, then a nod.'] },
    { icon: '🌌', de: 'Eine Sternengeschichte',  en: 'A star story',        eff: { happy: 12, energy: 12 }, out: ['Alle blicken gemeinsam nach oben.', 'Everyone looks up together.'] },
    { icon: '💛', de: 'Etwas, wofür du dankbar bist', en: 'Something you\'re grateful for', eff: { happy: 16, int: 2 }, out: ['Warm ums Herz – nicht nur vom Feuer.', 'Warm inside – not just from the fire.'] }
];
let campfireOptions = [];

function startCampfire() {
    let pool = CAMPFIRE_STORIES.slice().sort(() => Math.random() - 0.5);
    campfireOptions = pool.slice(0, 3);
    playSound('select');
    openExperience(`
      <div class="xp-stage xp-fire">
        <div class="cf-sky"></div><div class="cf-fire">🔥</div>
        <div class="cf-spark s1"></div><div class="cf-spark s2"></div><div class="cf-spark s3"></div>
        <div class="cf-log">🪵</div>
      </div>
      <div class="xp-title">${L('Lagerfeuer-Abend', 'Campfire evening')}</div>
      <div class="pn-hint">${L('Die Dorfbewohner rücken zusammen. Was möchtest du erzählen?', 'The villagers gather close. What would you like to share?')}</div>
      <div class="xp-choices vertical">
        ${campfireOptions.map((o, i) => `<button class="xp-choice" onclick="campfireChoose(${i})"><span>${o.icon}</span>${L(o.de, o.en)}</button>`).join('')}
      </div>
    `, false);
}
function campfireChoose(i) {
    let o = campfireOptions[i], e = o.eff, lines = [];
    if (e.happy)  { pet.happiness = Math.min(100, pet.happiness + e.happy); lines.push('😊 +' + e.happy); }
    if (e.energy) { pet.energy = Math.min(100, pet.energy + e.energy); lines.push('⚡ +' + e.energy); }
    if (e.int)    { pet.intelligence += e.int; lines.push('🧠 +' + e.int); }
    let tk = addTickets(1); lines.push('🎫 +' + tk);
    if (typeof markCareInteraction === 'function') markCareInteraction();
    if (typeof addAccountXP === 'function') addAccountXP(8);
    saveGame(); playSound('win');
    openExperience(`
      <div class="xp-stage xp-fire"><div class="cf-sky"></div><div class="cf-fire">🔥</div>
        <div class="cf-spark s1"></div><div class="cf-spark s2"></div><div class="cf-spark s3"></div><div class="cf-log">🪵</div></div>
      <div class="xp-title">${o.icon} ${L(o.de, o.en)}</div>
      <div class="pn-hint">${L(o.out[0], o.out[1])}</div>
      <div class="xp-stats">${lines.join(' &nbsp; ')}</div>`);
}

// --- 4) Talentshow: Timing-Spiel ---
let talent = null, _talentLoop = null;

function startTalent() {
    talent = { beat: 0, score: 0, pos: 0, dir: 1, speed: 1.15, results: [] };
    playSound('select');
    openExperience(`
      <div class="xp-stage xp-talent">
        <div class="ts-spot"></div>
        <div class="ts-star">${typeof spriteSrc === 'function' ? `<img src="${spriteSrc(pet)}" style="width:60px;height:60px;image-rendering:pixelated">` : '🎤'}</div>
        <div class="ts-mic">🎤</div>
      </div>
      <div class="xp-title">${L('Talentshow!', 'Talent show!')}</div>
      <div class="pn-hint">${L('Tippe, wenn der Punkt in der goldenen Mitte ist – 3 Einsätze.', 'Tap when the dot is in the golden centre – 3 beats.')}</div>
      <div class="ts-bar"><div class="ts-good"></div><div class="ts-perfect"></div><div class="ts-dot" id="tsDot"></div></div>
      <div class="ts-results" id="tsResults">⚪ ⚪ ⚪</div>
      <button class="onboard-btn btn-gold ts-btn" id="tsBtn" onclick="talentTap()">${L('Jetzt! 🎵', 'Now! 🎵')}</button>
    `, false);
    let last = performance.now();
    const step = (now) => {
        let dt = Math.min(50, now - last); last = now;
        talent.pos += talent.dir * talent.speed * dt / 10;
        if (talent.pos >= 100) { talent.pos = 100; talent.dir = -1; }
        if (talent.pos <= 0)   { talent.pos = 0; talent.dir = 1; }
        let d = document.getElementById('tsDot');
        if (d) d.style.left = talent.pos + '%';
        _talentLoop = requestAnimationFrame(step);
    };
    _talentLoop = requestAnimationFrame(step);
}
function talentTap() {
    if (!talent || talent.beat >= 3) return;
    let off = Math.abs(talent.pos - 50);
    let res = off <= 6 ? 'perfect' : off <= 16 ? 'good' : 'miss';
    talent.results.push(res);
    talent.score += res === 'perfect' ? 2 : res === 'good' ? 1 : 0;
    talent.beat++;
    talent.speed += 0.35;     // jeder Einsatz wird schneller
    playSound(res === 'perfect' ? 'sparkle' : res === 'good' ? 'select' : 'beep');
    document.getElementById('tsResults').innerHTML = [0, 1, 2].map(i =>
        talent.results[i] === 'perfect' ? '🌟' : talent.results[i] === 'good' ? '⭐' : talent.results[i] === 'miss' ? '💨' : '⚪').join(' ');
    if (talent.beat < 3) return;

    cancelAnimationFrame(_talentLoop); _talentLoop = null;
    let sc = talent.score;   // 0..6
    let stars = sc >= 6 ? 3 : sc >= 4 ? 2 : sc >= 2 ? 1 : 0;
    let mood = 5 + stars * 7, lines = ['😊 +' + mood];
    pet.happiness = Math.min(100, pet.happiness + mood);
    if (stars >= 1) lines.push('🪙 +' + addCoins([0, 40, 90, 180][stars]));
    if (stars === 3) { lines.push('🎫 +' + addTickets(3)); }
    if (typeof addAccountXP === 'function') addAccountXP(5 + stars * 4);
    let s = hobbyState('_social'); s.bestShow = Math.max(s.bestShow || 0, sc); saveHobbies();
    if (typeof markCareInteraction === 'function') markCareInteraction();
    saveGame();
    let verdict = [L('Lampenfieber – nächstes Mal klappt\'s!', 'Stage fright – next time!'),
                   L('Netter Applaus! 👏', 'Nice applause! 👏'),
                   L('Das Publikum jubelt! 👏👏', 'The crowd cheers! 👏👏'),
                   L('STANDING OVATIONS! 🌟', 'STANDING OVATION! 🌟')][stars];
    playSound(stars >= 2 ? 'win' : 'select');
    setTimeout(() => {
        openExperience(`
          <div class="xp-stage xp-talent"><div class="ts-spot"></div>
            <div class="ts-star">${typeof spriteSrc === 'function' ? `<img src="${spriteSrc(pet)}" style="width:60px;height:60px;image-rendering:pixelated">` : '🎤'}</div>
            ${stars >= 2 ? '<div class="xp-note n1">👏</div><div class="xp-note n2">🌹</div><div class="xp-note n3">👏</div>' : ''}</div>
          <div class="xp-title">${verdict}</div>
          <div class="pn-hearts">${'🌟'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
          <div class="xp-stats">${lines.join(' &nbsp; ')}</div>
          <div class="xp-progress">${L('Beste Show', 'Best show')}: ${s.bestShow}/6</div>`);
        if (stars === 3) showAchievementBanner('🎤', L('Standing Ovations!', 'Standing ovation!'), 'generic');
    }, 450);
}
