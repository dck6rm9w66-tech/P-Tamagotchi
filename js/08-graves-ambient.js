/* Pausentamagotchi - Ahnengalerie, Grabpflege, Hintergrund-Ambiente, Raid, Bewertung */
const GRAVE_CARE_KEY = 'tama_graves_care';
const GRAVE_CARE_COST = 5;        // T-Coins pro Grab und Tag
const HAUNT_HAPPY_CAP = 25;       // Laune-Deckel, wenn die Ahnen heimsuchen

function loadGraves() {
    let raw = safeGetItem('tama_graveyard_v6');
    if (!raw) return [];
    try {
        let data = JSON.parse(raw);
        if (Array.isArray(data)) return data;
        if (data && data.name) return [data];      // alter Einzel-Eintrag
    } catch(e) {}
    return [];
}
function saveGraves(list) { safeSetItem('tama_graveyard_v6', JSON.stringify(list)); }
function graveId(g, i) { return g.id || ('grave_' + i + '_' + (g.deathDate || g.name || '')); }

let graveCare = {};
try { graveCare = JSON.parse(safeGetItem(GRAVE_CARE_KEY) || '{}'); } catch(e) { graveCare = {}; }
function saveGraveCare() { safeSetItem(GRAVE_CARE_KEY, JSON.stringify(graveCare)); }

// Wie viele Graeber werden gepflegt? Liefert Anteil 0..1 (ohne Graeber: 1 = alles gut)
function graveCareRatio() {
    let list = loadGraves();
    if (list.length === 0) return 1;
    let cared = list.filter((g, i) => graveCare[graveId(g, i)]).length;
    return cared / list.length;
}
// Suchen die Ahnen den Pfleger heim?
function isHaunted() {
    let list = loadGraves();
    if (list.length === 0) return false;
    return graveCareRatio() < 0.5;
}

function toggleGraveCare(id) {
    if (graveCare[id]) {
        delete graveCare[id];
        playSound('cancel');
    } else {
        if (tCoins < GRAVE_CARE_COST) {
            alert(t('Nicht genug T-Coins für die Grabpflege!'));
            playSound('lose'); return;
        }
        graveCare[id] = true;
        addCoins(-GRAVE_CARE_COST);         // erster Tag sofort faellig
        playSound('coin');
    }
    saveGraveCare();
    openGraveyardModal();
    updateHauntState();
}

// Taegliche Abbuchung. Reicht das Guthaben nicht, verfallen Abos.
function chargeGraveCare() {
    let ids = Object.keys(graveCare);
    if (ids.length === 0) return;
    let due = ids.length * GRAVE_CARE_COST;
    if (tCoins >= due) {
        addCoins(-due);
        showAchievementBanner('🪦', tf('Grabpflege: -{0} 🪙 für {1} Gräber', due, ids.length), 'generic');
    } else {
        // So viele Graeber pflegen, wie das Guthaben hergibt
        let affordable = Math.floor(tCoins / GRAVE_CARE_COST);
        let keep = ids.slice(0, affordable);
        graveCare = {};
        keep.forEach(id => graveCare[id] = true);
        saveGraveCare();
        if (affordable > 0) addCoins(-(affordable * GRAVE_CARE_COST));
        showAchievementBanner('🪦', t('Zu wenig T-Coins - Grabpflege teilweise eingestellt!'), 'generic');
    }
    updateHauntState();
}

// ================================================================
// === AMBIENTE HINTER DER HUELLE =================================
// ================================================================
// Zeigt Geister bei Ahnen-Heimsuchung und dezente Symbole, solange
// bestimmte Shop-Effekte laufen. Wird nur neu aufgebaut, wenn sich der
// Zustand aendert - sonst wuerden die Animationen jede Sekunde neu starten.

// Welche Shop-Effekte bekommen ein Hintergrund-Ambiente?
const AMBIENT_ITEMS = [
    { id: 'spicy_ramen',  emoji: '🔥', count: 5, check: () => pet.buffs && pet.buffs.fireUntil && pet.activeSeconds < pet.buffs.fireUntil },
    { id: 'dance_mat',    emoji: '🎵', count: 5, check: () => pet.buffs && pet.buffs.danceUntil && pet.activeSeconds < pet.buffs.danceUntil },
    { id: 'personal_dj',  emoji: '🎧', count: 4, check: () => pet.buffs && pet.buffs.djUntil && pet.activeSeconds < pet.buffs.djUntil },
    { id: 'maryjane',     emoji: '🌿', count: 5, check: () => pet.buffs && pet.buffs.mjUntil && pet.activeSeconds < pet.buffs.mjUntil },
    { id: 'love_arrow',   emoji: '💖', count: 5, check: () => pet.buffs && pet.buffs.loveArrowUntil && pet.activeSeconds < pet.buffs.loveArrowUntil },
    { id: 'double_happy', emoji: '🍀', count: 4, check: () => pet.buffs && pet.buffs.doubleHappyUntil && pet.activeSeconds < pet.buffs.doubleHappyUntil },
    { id: 'cookie',       emoji: '🥠', count: 3, check: () => isBuffCurrentlyActive('cookie') },
    { id: 'party',        emoji: '🪩', count: 4, check: () => pet.buffs && pet.buffs.partyToday },
    { id: 'shiny',        emoji: '✨', count: 4, check: () => pet.buffs && pet.buffs.shinyToday },
    { id: 'mult_mega',    emoji: '🌈', count: 4, check: () => getActiveMultiplier('coins') >= 3 },
    { id: 'chronic_cold', emoji: '🤧', count: 3, check: () => pet.buffs && pet.buffs.chronicCold },
    { id: 'existential_void', emoji: '🌌', count: 4, check: () => pet.buffs && pet.buffs.existentialVoid }
];

let ambientSignature = '';

function currentAmbientState() {
    let haunt = (typeof isHaunted === 'function' && state.isStarted) ? isHaunted() : false;
    let items = [];
    if (state.isStarted && typeof pet !== 'undefined' && pet && !pet.isDead) {
        AMBIENT_ITEMS.forEach(a => { try { if (a.check()) items.push(a); } catch(e) {} });
    }
    return { haunt, items };
}

function updateHauntState() {
    let layer = document.getElementById('ambientLayer');
    if (!layer) return;
    let st = currentAmbientState();
    let sig = (st.haunt ? 'H' : '-') + '|' + st.items.map(i => i.id).join(',');
    if (sig === ambientSignature) return;      // nichts veraendert
    ambientSignature = sig;

    document.body.classList.toggle('haunted', st.haunt);
    let html = '';

    if (st.haunt) {
        // Geister steigen aus dem Boden auf
        const ghosts = ['👻','👻','💀','🕯️','👻','🪦'];
        for (let i = 0; i < 7; i++) {
            let left = 4 + Math.random() * 92;
            let dur = 11 + Math.random() * 9;
            let delay = -Math.random() * dur;
            let size = 26 + Math.random() * 18;
            html += `<div class="amb amb-ghost" style="left:${left}%; bottom:-8vh; font-size:${size}px;
                     animation-duration:${dur}s; animation-delay:${delay}s;">${ghosts[i % ghosts.length]}</div>`;
        }
    }

    st.items.forEach((a, k) => {
        for (let i = 0; i < a.count; i++) {
            let left = 3 + Math.random() * 94;
            let dur = 9 + Math.random() * 7;
            let delay = -Math.random() * dur;
            let size = 16 + Math.random() * 12;
            html += `<div class="amb amb-item" style="left:${left}%; bottom:-6vh; font-size:${size}px;
                     animation-duration:${dur}s; animation-delay:${delay}s;">${a.emoji}</div>`;
        }
    });

    layer.innerHTML = html;
}

function openGraveyardModal() {
    playSound('select');
    let content = document.getElementById('graveyardContent');
    let list = loadGraves();
    let isExample = list.length === 0;

    if (isExample) {
        list = [{
            name: "Bello (Bsp.)", ownerName: "Max", speciesIndex: 0, activeSeconds: 28800,
            causeOfDeath: "Altersschwäche", bornDate: "14.06.2026, 09:12", deathDate: "30.06.2026, 17:41",
            countFed: 42, countBathed: 5, countLoved: 12, countPlayed: 20, countDoctor: 1, countDiscipline: 3,
            colorIndex: 1, patternIndex: 2, patternColorIndex: 0, patternScale: 1.0
        }];
    }

    // --- Kopfzeile: Pflegestand aller Graeber ---
    let cared = isExample ? 0 : list.filter((g, i) => graveCare[graveId(g, i)]).length;
    let ratio = isExample ? 1 : (cared / list.length);
    let haunted = !isExample && ratio < 0.5;
    let dailyCost = cared * GRAVE_CARE_COST;

    let header = isExample ? '' : `
        <div style="background:${haunted ? '#3b2430' : '#eef7ee'}; border:2px solid ${haunted ? '#8e44ad' : '#a8d5a8'};
                    border-radius:10px; padding:10px 12px; margin-bottom:12px; color:${haunted ? '#f5e6ff' : '#2f3542'};">
            <div style="font-size:13px; font-weight:bold;">
                ${haunted ? '👻 ' + t('Die Ahnen sind erzürnt!') : '🕯️ ' + t('Die Ahnen ruhen in Frieden')}
            </div>
            <div style="font-size:11px; margin-top:4px; line-height:1.5;">
                ${tf('{0} von {1} Gräbern gepflegt ({2}%)', cared, list.length, Math.round(ratio * 100))}<br>
                ${haunted
                    ? t('Unter 50% Pflege suchen sie dein Tamagotchi heim: Es fürchtet sich und wird nur noch maximal 25% glücklich.')
                    : t('Ab 50% gepflegter Gräber bleibt alles beim Alten.')}
            </div>
            <div style="font-size:10px; margin-top:6px; opacity:0.85;">
                ${tf('Kosten: {0} 🪙 pro Tag ({1} 🪙 je Grab)', dailyCost, GRAVE_CARE_COST)}
            </div>
        </div>`;

    // --- Grabsteine, neueste zuerst ---
    let stones = list.slice().reverse().map((gPet, revIdx) => {
        let idx = list.length - 1 - revIdx;
        let gid = graveId(gPet, idx);
        let isCared = !isExample && !!graveCare[gid];
        let graveG = (typeof SPRITE_SPECIES !== 'undefined')
            ? `<img src="${SPRITE_BASE}${SPRITE_SPECIES[gPet.speciesIndex] || SPRITE_SPECIES[0]}_engel.png" alt="" style="width:1.1em;height:1.1em;object-fit:contain;vertical-align:middle;">`
            : (speciesList[gPet.speciesIndex] || '👻');
        let style = getShellStyle(gPet.colorIndex, gPet.patternIndex, gPet.patternColorIndex, gPet.patternScale);
        let miniShellHtml = `<div class="mini-shell" style="${style}">${graveG}</div>`;
        let reportId = 'graveReport_' + revIdx;

        return `
        <div class="tombstone ${isCared ? 'cared' : ''}">
            <div class="tombstone-cross">†</div>
            <div class="tombstone-rip">R.I.P.</div>
            <div class="tombstone-head">
                ${miniShellHtml}
                <div><span class="tombstone-name">${gPet.name}</span><br><span style="font-size:9px; color:#5a5148;">${t('Pfleger')}: ${gPet.ownerName || t('Unbekannt')}</span></div>
            </div>
            <div class="tombstone-dates">
                ${gPet.bornDate || '-'} &nbsp;–&nbsp; ${gPet.deathDate || '-'}
            </div>
            <div class="tombstone-body">
                <b>${t('Erreichtes Alter')}:</b> ${Math.floor((gPet.activeSeconds||0)/1800)} ${t('Lebenstage')}<br>
                <b>${t('Ursache')}:</b> ${t(gPet.causeOfDeath || 'Altersschwäche')}<br><br>
                <b>${t('Chronik')}:</b><br>
                🍔 ${gPet.countFed||0}x &nbsp; 🛁 ${gPet.countBathed||0}x &nbsp; ❤️ ${gPet.countLoved||0}x<br>
                🎮 ${gPet.countPlayed||0}x &nbsp; 🩺 ${gPet.countDoctor||0}x &nbsp; 💢 ${gPet.countDiscipline||0}x
            </div>
            ${isExample ? '' : `
            <button class="grave-care-btn ${isCared ? 'on' : ''}" onclick="toggleGraveCare('${gid}')">
                ${isCared ? '🕯️ ' + t('Gepflegt — Abo beenden') : '🪦 ' + tf('Pflegen für {0} 🪙/Tag', GRAVE_CARE_COST)}
            </button>`}
            <button class="tombstone-toggle" onclick="toggleGraveReport('${reportId}', this)">${t('📋 Pfleger-Bewertung anzeigen')}</button>
            <div id="${reportId}" style="display:none;">${caretakerReportHtml(gPet)}</div>
        </div>`;
    }).join('');

    content.innerHTML = header + stones;
    document.getElementById('graveyardModal').style.display = 'flex';
}

// Pfleger-Bewertung im Friedhof ein-/ausblenden
function toggleGraveReport(id, btn) {
    let el = document.getElementById(id || 'graveReport');
    if (!el) return;
    let show = el.style.display === 'none';
    el.style.display = show ? 'block' : 'none';
    if (btn) btn.textContent = show ? t('📋 Pfleger-Bewertung ausblenden') : t('📋 Pfleger-Bewertung anzeigen');
    playSound('beep');
}

// --- ACCOUNT RESET ---
function fullAccountReset() {
    playSound('cancel');
    if(confirm("ACHTUNG! Willst du wirklich deinen gesamten Account, alle Medaillen, T-Coins und den Friedhof unwiderruflich löschen?")) {
        if(confirm("Bist du GANZ sicher? Dies kann nicht rückgängig gemacht werden!")) {
            safeSetItem('tama_save_v6', '');
            safeSetItem('tama_medals', '[]');
            safeSetItem('tama_graveyard_v6', '');
            safeSetItem('tama_leaderboard_v6', '[]');
            safeSetItem('tama_tcoins', '0');
            safeSetItem('tama_inventory', '');
            safeSetItem('tama_buff_expiries', '{}');
            safeSetItem('tama_quests', '{}');
            safeSetItem('tama_tickets', '0');
            safeSetItem('tama_pokedex', 'null');
            safeSetItem('tama_village', '{}');
            safeSetItem('tama_acc_level', '1');
            safeSetItem('tama_acc_xp', '0');
            safeSetItem('tama_legacy', '{}');
            safeSetItem('tama_lifetime', '{}');
            try { localStorage.removeItem('tama_pomodoro'); } catch(e) {}
            location.reload(); 
        }
    }
}

// ================================================================
// --- BÜRO-HACK LEADERBOARD ---
// Baut einen Highscore-Eintrag mit ALLEN Disziplinen:
// Überleben, PvP-Siege, Mini-Boss-Siege und Arcade-Punkte.
function buildScoreEntry(p, kind) {
    let arcadeVals = Object.values(arcadeHi || {}).map(v => parseInt(v) || 0);
    let arcadeBest = arcadeVals.length ? Math.max(...arcadeVals) : 0;
    let arcadeTotal = arcadeVals.reduce((a, b) => a + b, 0);
    // Beim Spieler-Steckbrief zaehlt die beste je erreichte Lebenszeit
    let secs = (kind === 'player')
        ? Math.max(LT('bestActive') || 0, (p && p.activeSeconds) || 0)
        : ((p && p.activeSeconds) || 0);
    return {
        id: (p && p.id) || generateId(),
        kind: kind,                               // 'pet' = verstorbenes Tama, 'player' = Steckbrief
        name: (p && p.name) || 'Tamagotchi',
        ownerName: (p && p.ownerName) || 'Unbekannt',
        animal: speciesList[(p && p.speciesIndex) || 0] || '👻',
        hours: Math.floor(secs / 3600),
        minutes: Math.floor(secs / 60),           // feinere Sortierung bei kurzen Leben
        timestamp: new Date().getTime(),
        colorIndex: (p && p.colorIndex) || 0, patternIndex: (p && p.patternIndex) || 0,
        patternColorIndex: (p && p.patternColorIndex) || 0, patternScale: (p && p.patternScale) || 1,
        medals: getUnlockedMedalCount(),
        level: accountLevel,
        rankTier: dominantMedalTier(medalTiers),
        pvpWins: LT('pvpWins') || 0,
        bossWins: LT('bossWins') || 0,
        arcadeBest: arcadeBest,
        arcadeTotal: arcadeTotal,
        v: 2
    };
}

function downloadScoreObj(entry, filename, fromUserGesture) {
    let exportObj = { data: entry, sig: createHashV2(entry), v: 2 };
    let text = JSON.stringify(exportObj);
    // Kein data:-Link mehr - iOS ignoriert dort das download-Attribut,
    // dadurch passierte beim Antippen schlicht nichts.
    if (fromUserGesture) {
        saveOrShareFile(text, filename, 'Pausentamagotchi Highscore', false);
    } else {
        // Automatischer Export (beim Tod): ohne Nutzer-Geste lehnt iOS das
        // Teilen ab - hier bleibt nur der reguläre Download.
        downloadBlobFile(new Blob([text], { type: 'application/json' }), filename, false);
    }
}

function exportScoreFile(deadPet) {
    try {
        let scoreEntry = buildScoreEntry(deadPet, 'pet');
        let localLb = JSON.parse(safeGetItem('tama_leaderboard_v6') || '[]');
        localLb.push(scoreEntry);
        safeSetItem('tama_leaderboard_v6', JSON.stringify(localLb));
        downloadScoreObj(scoreEntry, `tama_score_${deadPet.name}_${scoreEntry.timestamp}.json`);
    } catch(e) {}
}

// Aktuellen Spielstand als Steckbrief teilen - ohne auf den Tod zu warten.
function exportMyScoreFile() {
    try {
        let entry = buildScoreEntry(state.isStarted ? pet : null, 'player');
        let localLb = JSON.parse(safeGetItem('tama_leaderboard_v6') || '[]');
        // eigener Steckbrief ersetzt den vorherigen
        localLb = localLb.filter(e => !(e.kind === 'player' && e.id === entry.id));
        localLb.push(entry);
        safeSetItem('tama_leaderboard_v6', JSON.stringify(localLb));
        downloadScoreObj(entry, `tama_steckbrief_${entry.ownerName}_${entry.timestamp}.json`, true);
        playSound('win');
        renderLeaderboardTable(localLb);
    } catch(e) { alert('Export fehlgeschlagen.'); }
}

function handleOfficeScoresImport(event) {
    const files = event.target.files;
    if(!files || files.length === 0) return;
    let loadedScores = []; 
    let promises = [];
    let rejectedCount = 0;

    for (let i = 0; i < files.length; i++) {
        let p = new Promise((resolve) => {
            let reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let obj = JSON.parse(e.target.result);
                    if(obj.data && obj.sig && obj.data.id) {
                        // v2 deckt alle Disziplinen ab; aeltere Dateien nutzen die alte Signatur
                        let ok = (createHashV2(obj.data) === obj.sig) || (createHash(obj.data) === obj.sig);
                        if(ok) { loadedScores.push(obj.data); }
                        else { rejectedCount++; }
                    } else { rejectedCount++; }
                } catch(err) { rejectedCount++; } 
                resolve();
            };
            reader.readAsText(files[i]);
        });
        promises.push(p);
    }

    Promise.all(promises).then(() => {
        let localLb = JSON.parse(safeGetItem('tama_leaderboard_v6') || '[]');
        let allScores = localLb.concat(loadedScores);
        // Verstorbene Tamagotchis: jeder Eintrag zaehlt einzeln.
        // Spieler-Steckbriefe: nur der neueste je Spieler bleibt stehen.
        let uniqueScores = []; let seen = new Set(); let newestPlayer = {};
        allScores.forEach(s => {
            if (s.kind === 'player') {
                let prev = newestPlayer[s.id];
                if (!prev || (s.timestamp || 0) > (prev.timestamp || 0)) newestPlayer[s.id] = s;
                return;
            }
            let key = s.id + "_" + s.timestamp;
            if(!seen.has(key)) { seen.add(key); uniqueScores.push(s); }
        });
        Object.values(newestPlayer).forEach(s => uniqueScores.push(s));
        safeSetItem('tama_leaderboard_v6', JSON.stringify(uniqueScores));
        renderLeaderboardTable(withMyLiveEntry(uniqueScores));

        if (rejectedCount > 0) {
            alert(`${rejectedCount} Datei(en) wurden blockiert, da sie manipuliert oder ungültig sind.`);
            playSound('lose');
        } else { playSound('win'); }
    });
}

// Highscore-Kategorien: jede hat ihre eigene Kennzahl und Sortierung
const LB_CATEGORIES = [
    { id: 'survival', icon: '🕐', name: 'Überleben', head: 'Zeit',
      val: e => (e.minutes !== undefined ? e.minutes : (e.hours||0)*60),
      fmt: e => (e.hours||0) >= 1 ? `${e.hours}h` : `${e.minutes||0}m`,
      empty: 'Noch kein Tamagotchi ist von uns gegangen.' },
    { id: 'pvp', icon: '⚔️', name: 'PvP', head: 'Siege',
      val: e => e.pvpWins || 0, fmt: e => `${e.pvpWins || 0}`,
      empty: 'Noch keine PvP-Duelle gewonnen.' },
    { id: 'boss', icon: '👹', name: 'Bosse', head: 'Siege',
      val: e => e.bossWins || 0, fmt: e => `${e.bossWins || 0}`,
      empty: 'Noch kein Mini-Boss besiegt.' },
    { id: 'arcade', icon: '🕹️', name: 'Arcade', head: 'Punkte',
      val: e => e.arcadeBest || 0, fmt: e => `${(e.arcadeBest || 0).toLocaleString('de-CH')}`,
      empty: 'Noch keine Arcade-Punkte erspielt.' }
];
let lbCategory = 'survival';

function switchLeaderboardCat(id) {
    lbCategory = id;
    playSound('beep');
    renderLeaderboardTable(withMyLiveEntry(JSON.parse(safeGetItem('tama_leaderboard_v6') || '[]')));
}

function renderLeaderboardTable(scoresArray) {
    let content = document.getElementById('leaderboardContent');
    if(!content) return;
    if(!scoresArray || scoresArray.length === 0) scoresArray = [];

    let cat = LB_CATEGORIES.find(c => c.id === lbCategory) || LB_CATEGORIES[0];

    // Reiter fuer die vier Disziplinen
    let tabs = '<div class="lb-tabs">' + LB_CATEGORIES.map(c =>
        `<button class="lb-tab ${c.id === lbCategory ? 'active' : ''}" onclick="switchLeaderboardCat('${c.id}')">${c.icon} ${t(c.name)}</button>`
    ).join('') + '</div>';

    // In den Kampf-/Arcade-Wertungen zaehlt der Spieler, nicht das einzelne Tamagotchi:
    // pro Pfleger bleibt nur sein bester Eintrag stehen.
    let list = scoresArray.slice();
    if (cat.id !== 'survival') {
        let best = {};
        list.forEach(e => {
            let key = (e.ownerName || 'Unbekannt').toLowerCase();
            if (!best[key] || cat.val(e) > cat.val(best[key])) best[key] = e;
        });
        list = Object.values(best);
    }
    list = list.filter(e => cat.val(e) > 0);
    list.sort((a, b) => cat.val(b) - cat.val(a));
    let topScores = list.slice(0, 20);

    if (topScores.length === 0) {
        content.innerHTML = tabs + `<p style="font-size:11px; color:#576574; text-align:center; padding:18px 8px;">${t(cat.empty)}<br><span style="font-size:10px;">${t('Lade Steckbriefe deiner Kolleginnen und Kollegen, um zu vergleichen.')}</span></p>`;
        return;
    }

    let html = tabs + `<table class="lb-table"><tr><th>${t('Rang')}</th><th>${cat.id === 'survival' ? t('Tamagotchi') : t('Pfleger')}</th><th>${t(cat.head)}</th></tr>`;
    topScores.forEach((entry, index) => {
        let medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index+1}.`));
        let style = getShellStyle(entry.colorIndex||0, entry.patternIndex||0, entry.patternColorIndex||0, entry.patternScale||1.0);
        let miniShellHtml = `<div class="mini-shell" style="${style}">${entry.animal}</div>`;
        let medalsCountHtml = entry.medals !== undefined ? `<span style="font-size:9px; color:#f39c12; margin-left:4px;">🏅 ${entry.medals}</span>` : '';
        // In den Spieler-Wertungen steht der Pfleger oben, sonst das Tamagotchi
        let title = cat.id === 'survival' ? entry.name : (entry.ownerName || 'Unbekannt');
        let sub   = cat.id === 'survival' ? `${t('von')} ${entry.ownerName || t('Unbekannt')}` : `${t('mit')} ${entry.name}`;

        html += `<tr${entry.isMe ? ' style="background:rgba(84,160,255,0.14);"' : ''}>
                    <td class="lb-rank">${medal}</td>
                    <td style="line-height:1.2; padding:8px 0;">
                        <div style="display:flex; align-items:center;">
                            ${miniShellHtml}
                            <div><b style="font-size:13px;">${title}</b>${entry.isMe ? ' <span style="font-size:9px;color:#54a0ff;font-weight:bold;">' + t('(Du)') + '</span>' : ''} ${medalsCountHtml}<br><span style="font-size:9px; color:#576574;">${sub}</span></div>
                        </div>
                    </td>
                    <td class="lb-score">${cat.fmt(entry)}</td>
                 </tr>`;
    });
    html += '</table>';
    content.innerHTML = html;
}

// Mischt den eigenen aktuellen Stand zur Anzeige mit ein (wird nicht gespeichert).
function withMyLiveEntry(lb) {
    try {
        let me = buildScoreEntry(state.isStarted ? pet : null, 'player');
        me.isMe = true;
        me.ownerName = me.ownerName || 'Ich';
        // eigenen (evtl. schon exportierten) Steckbrief ersetzen
        let rest = lb.filter(e => !(e.kind === 'player' && e.id === me.id));
        return rest.concat([me]);
    } catch(e) { return lb; }
}

function openLeaderboardModal() {
    playSound('select');
    lbCategory = 'survival';
    let lb = JSON.parse(safeGetItem('tama_leaderboard_v6') || '[]');
    if (lb.length === 0) {
        lb.push({ name: "Bello (Bsp.)", ownerName: "Max", animal: '🐶', hours: 8, minutes: 480, colorIndex: 1, patternIndex: 2, patternColorIndex: 0, patternScale: 1.0, timestamp: 1, medals: 12, kind: 'pet', pvpWins: 3, bossWins: 2, arcadeBest: 640, arcadeTotal: 1180 });
    }
    renderLeaderboardTable(withMyLiveEntry(lb));
    document.getElementById('leaderboardModal').style.display = 'flex';
}

// ================================================================
// === RAID-BOSS: der Wolken-Titan ================================
// ================================================================
// Nur im Verbund zu schaffen: Es braucht mindestens zwei Tamagotchis,
// also dein eigenes plus wenigstens einen tagesaktuellen Spielstand
// einer anderen Person. Je mehr mitkaempfen, desto groesser die Beute.
const RAID_BOSS = {
    id: 'raid_titan', icon: '🌩️', name: 'Wolken-Titan',
    desc: 'Ein gewaltiges Gewitterwesen. Allein chancenlos – nur ein Verbund aus mehreren Tamagotchis kann ihn stellen.',
    hp: 900,
    base: { coins: 1800, tickets: 24, xp: 280 },
    lootItems: 3            // drei zufaellige Shop-Gegenstaende als Beute
};

let raidAllies = [];        // geladene Verbuendete dieser Sitzung

// Ein Spielstand zaehlt nur, wenn er von heute ist.
function isSaveFromToday(parsed, allyPet) {
    let today = new Date().toDateString();
    if (parsed && parsed.created) {
        let d = new Date(parsed.created);
        if (!isNaN(d) && d.toDateString() === today) return true;
    }
    if (allyPet && allyPet.lastPlayedDate === today) return true;
    return false;
}

function triggerRaidImport() {
    resetArenaWeekIfNeeded();
    if (arenaState.usedRaid) { playSound('cancel'); return; }
    playSound('select');
    document.getElementById('raidAllyInput').click();
}

function handleRaidImport(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    let added = 0, stale = 0, bad = 0, dupes = 0;
    let promises = [];

    for (let i = 0; i < files.length; i++) {
        promises.push(new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = e => {
                try {
                    let parsed = JSON.parse(e.target.result);
                    let allyPet = null;
                    if (parsed && parsed.format === BACKUP_FORMAT && parsed.data && parsed.data.tama_save_v6) {
                        allyPet = JSON.parse(parsed.data.tama_save_v6);
                    } else if (parsed && parsed.name && parsed.id) {
                        allyPet = parsed;                       // aeltere, blanke Spielstaende
                    }
                    if (!allyPet || !allyPet.name) { bad++; resolve(); return; }
                    if (allyPet.isDead) { bad++; resolve(); return; }
                    if (!isSaveFromToday(parsed, allyPet)) { stale++; resolve(); return; }
                    if (allyPet.id && allyPet.id === pet.id) { dupes++; resolve(); return; }
                    if (raidAllies.some(a => a.id === allyPet.id)) { dupes++; resolve(); return; }
                    raidAllies.push(allyPet);
                    added++;
                } catch (err) { bad++; }
                resolve();
            };
            reader.readAsText(files[i]);
        }));
    }

    Promise.all(promises).then(() => {
        let notes = [];
        if (added) notes.push(`${added} Verbündete${added === 1 ? 'r' : ''} bereit!`);
        if (stale) notes.push(`${stale} Datei(en) sind nicht von heute – der Titan akzeptiert nur tagesaktuelle Spielstände.`);
        if (dupes) notes.push(`${dupes} Datei(en) waren doppelt oder dein eigener Spielstand.`);
        if (bad) notes.push(`${bad} Datei(en) waren ungültig oder gehören einem verstorbenen Tamagotchi.`);
        if (notes.length) alert(notes.join('\n'));
        playSound(added ? 'win' : 'lose');
        openArenaModal();
    });
    event.target.value = '';
}

function clearRaidAllies() { raidAllies = []; playSound('cancel'); openArenaModal(); }

// Beute: drei zufaellige Gegenstaende aus dem Laden (keine Debuffs, keine Freischaltungen)
function pickRaidLoot(count) {
    let pool = SHOP_ITEMS.filter(i =>
        i.cat !== '👿 Debuffs & Trolle' &&
        i.cat !== '🏆 Boss-Trophäen' &&
        !String(i.type).startsWith('unlock'));
    // Ohne Zuruecklegen ziehen, damit die Beute wirklich abwechslungsreich ist
    let bag = pool.slice(), picked = [];
    for (let k = 0; k < count && bag.length; k++) {
        picked.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    }
    return picked;
}

async function startRaidFight() {
    resetArenaWeekIfNeeded();
    if (arenaState.usedRaid) { playSound('cancel'); return; }
    if (!state.isStarted || pet.isDead) { alert('Dein Tamagotchi muss aktiv sein!'); return; }
    if (raidAllies.length < 1) {
        alert('Der Wolken-Titan ist zu mächtig für ein einzelnes Tamagotchi!\n\nLade mindestens einen tagesaktuellen Spielstand einer anderen Person, damit ihr zu zweit antreten könnt.');
        playSound('cancel'); return;
    }

    closeModal('arenaModal');
    let participants = 1 + raidAllies.length;
    let myPow = calcPetPower(pet);
    let allyPow = raidAllies.reduce((sum, a) => sum + calcPetPower(a), 0);
    let teamPow = myPow + allyPow;
    let winChance = Math.min(0.90, Math.max(0.12, teamPow / (teamPow + RAID_BOSS.hp * 0.75)));
    let myWin = Math.random() < winChance;

    arenaState.usedRaid = true; saveArenaState();

    let teamEmoji = [speciesList[pet.speciesIndex] || '🐾']
        .concat(raidAllies.map(a => speciesList[a.speciesIndex] || '🐾')).join('');
    let teamName = participants === 2 ? `${pet.name} & ${raidAllies[0].name}` : `${pet.name} + ${raidAllies.length} Verbündete`;

    await showArenaAnimation('raid', teamEmoji, teamName, teamPow, RAID_BOSS.icon, RAID_BOSS.name, RAID_BOSS.hp, myWin);

    if (myWin) {
        lifetime.raidWins = (lifetime.raidWins || 0) + 1;
        lifetime.bossWins = (lifetime.bossWins || 0) + 1;   // zaehlt auch als Boss-Sieg
        saveLifetime();
        // Mehr Teilnehmer = mehr Beute
        let mult = 1 + (participants - 2) * 0.35;
        let gotC = addCoins(Math.round(RAID_BOSS.base.coins * mult));
        let gotT = addTickets(Math.round(RAID_BOSS.base.tickets * mult));
        spawnFloatText('ticketDisplay', `+${gotT} 🎫`, '#1dd1a1');
        addAccountXP(Math.round(RAID_BOSS.base.xp * mult));

        // Drei zufaellige Gegenstaende (ein zusaetzlicher ab vier Teilnehmern)
        let lootCount = RAID_BOSS.lootItems + (participants >= 4 ? 1 : 0);
        let loot = pickRaidLoot(lootCount);
        loot.forEach(it => { inventory.items[it.id] = (inventory.items[it.id] || 0) + 1; });
        safeSetItem('tama_inventory', JSON.stringify(inventory));

        spawnConfetti('building');
        showAchievementBanner('🌩️', `Wolken-Titan bezwungen! +${gotC}🪙 +${gotT}🎫`, 'building');
        setTimeout(() => {
            alert(`🌩️ DER WOLKEN-TITAN IST BESIEGT!\n\n`
                + `Verbund: ${participants} Tamagotchis\n`
                + `Beute: ${gotC} 🪙 · ${gotT} 🎫 · ${Math.round(RAID_BOSS.base.xp * mult)} XP\n\n`
                + `Gegenstände:\n` + loot.map(i => '• ' + i.name).join('\n'));
        }, 2600);
    } else {
        pet.happiness = Math.max(0, pet.happiness - 20);
        pet.energy = Math.max(0, pet.energy - 25);
        showAchievementBanner('💀', `Der Wolken-Titan war zu stark! Nächste Woche mit mehr Verbündeten!`, 'generic');
        playSound('lose');
    }
    raidAllies = [];
    saveGame();
}

// ================================================================
// === PFLEGER-BEWERTUNG (nach dem Tod) ===========================
// ================================================================
// Bewertet, wie gut sich der Pfleger gekuemmert hat und welche
// Prioritaeten er gesetzt hat - inklusive Wolkendorf-Ausbau
// (wirtschaftlich vs. gesundheitsbewusst). Gibt am Ende einen
// konkreten Verbesserungsvorschlag.
function buildCaretakerReport(p) {
    // --- 1) Pflege-Dimensionen aus den Zaehlern des Tamagotchis ---
    let fed      = p.countFed || 0;
    let bathed   = p.countBathed || 0;
    let loved    = p.countLoved || 0;
    let played   = p.countPlayed || 0;
    let doctor   = p.countDoctor || 0;
    let discipline = p.countDiscipline || 0;
    let ageDays  = Math.floor((p.activeSeconds || 0) / 1800);
    let sickTimes = p.sickCount || 0;

    // Erwartungswerte skalieren grob mit dem erreichten Alter,
    // damit ein kurzes Leben nicht unfair schlecht bewertet wird.
    let span = Math.max(1, ageDays);
    // Score je Dimension: 0..100 relativ zu einem lockeren Soll pro Lebenstag
    function dim(value, perDay) {
        return Math.max(0, Math.min(100, Math.round((value / (perDay * span)) * 100)));
    }
    let sFeed  = dim(fed, 3);
    let sClean = dim(bathed, 0.8);
    let sLove  = dim(loved, 1.2);
    let sPlay  = dim(played, 1.2);
    let sHealth= doctor > 0 || sickTimes === 0 ? Math.max(0, 100 - sickTimes * 15) : 40;

    let overall = Math.round((sFeed*0.28 + sClean*0.16 + sLove*0.24 + sPlay*0.16 + sHealth*0.16));

    // Todesursache faerbt die Gesamtnote
    let cod = p.causeOfDeath || '';
    if (cod === 'Altersschwäche') overall = Math.min(100, overall + 12);
    else if (cod === 'Verhungern') { overall = Math.max(0, overall - 25); sFeed = Math.max(0, sFeed - 40); }
    else if (cod === 'Übergewicht') { overall = Math.max(0, overall - 15); }
    else if (cod === 'Traurigkeit') { overall = Math.max(0, overall - 25); sLove = Math.max(0, sLove - 40); }

    // Note in Worte fassen
    let grade, gradeIcon, gradeColor;
    if (overall >= 85)      { grade = 'Vorbildlicher Pfleger'; gradeIcon = '🌟'; gradeColor = '#f5b301'; }
    else if (overall >= 68) { grade = 'Guter Pfleger';         gradeIcon = '💚'; gradeColor = '#1dd1a1'; }
    else if (overall >= 50) { grade = 'Solider Pfleger';       gradeIcon = '👍'; gradeColor = '#54a0ff'; }
    else if (overall >= 32) { grade = 'Ausbaufähig';           gradeIcon = '🤔'; gradeColor = '#ff9f43'; }
    else                    { grade = 'Überfordert';           gradeIcon = '💔'; gradeColor = '#ee5253'; }

    // --- 2) Wolkendorf-Prioritaeten: wirtschaftlich vs. Gesundheit ---
    const ECON_IDS   = ['mint', 'observatory'];                       // Coins / XP
    const HEALTH_IDS = ['clinic', 'spa', 'gym', 'cafeteria', 'bakery']; // Wohlbefinden
    const FUN_IDS    = ['playground', 'library', 'watchtower'];        // Laune / IQ / Verhalten
    let sum = ids => ids.reduce((a, id) => a + (village[id] || 0), 0);
    let econ = sum(ECON_IDS), health = sum(HEALTH_IDS), fun = sum(FUN_IDS);
    let totalVillage = econ + health + fun;

    let priorityText, priorityIcon;
    if (totalVillage === 0) {
        priorityIcon = '🏗️';
        priorityText = 'Das Wolkendorf blieb unbebaut – die Prioritäten lagen ganz beim Tamagotchi selbst.';
    } else {
        // Anteile bestimmen
        let econShare = econ / totalVillage, healthShare = health / totalVillage, funShare = fun / totalVillage;
        if (econShare >= 0.5) {
            priorityIcon = '💰';
            priorityText = 'Beim Dorfausbau dachtest du vor allem <b>wirtschaftlich</b> (Münzprägerei & Sternwarte) – Effizienz vor Fürsorge.';
        } else if (healthShare >= 0.5) {
            priorityIcon = '🏥';
            priorityText = 'Dein Dorf war klar auf <b>Gesundheit & Wohlbefinden</b> ausgerichtet (Klinik, Therme, Fitness, Ernährung).';
        } else if (funShare >= 0.5) {
            priorityIcon = '🎡';
            priorityText = 'Du hast auf <b>Laune, Bildung & gutes Benehmen</b> gesetzt (Spielplatz, Bibliothek, Wachturm).';
        } else {
            priorityIcon = '⚖️';
            priorityText = 'Du hast das Dorf <b>ausgewogen</b> entwickelt – Wirtschaft, Gesundheit und Wohlfühlen im Gleichgewicht.';
        }
    }

    // --- 3) Konkreter Verbesserungsvorschlag (schwaechste Dimension) ---
    let tips = [];
    if (cod === 'Verhungern') tips.push('Füttere regelmäßiger – der Hunger war die Todesursache. Ein Blick aufs 🍖-Symbol hilft.');
    if (cod === 'Traurigkeit') tips.push('Schenke mehr Aufmerksamkeit: Streicheln (❤️) und Spielen halten die Laune oben.');
    if (cod === 'Übergewicht') tips.push('Weniger Snacks, mehr Minispiele – so bleibt das Gewicht im Rahmen.');
    if (tips.length === 0) {
        let dims = [
            { s: sFeed,  t: 'Etwas regelmäßigeres Füttern gibt dem nächsten Tamagotchi einen ruhigeren Alltag.' },
            { s: sClean, t: 'Häufigeres Baden (🛁) hält dein Tamagotchi sauber und gesund.' },
            { s: sLove,  t: 'Mehr Streicheleinheiten (❤️) stärken die Bindung und die Laune.' },
            { s: sPlay,  t: 'Öfter spielen (🎮) hebt Laune und Intelligenz zugleich.' },
            { s: sHealth,t: 'Reagiere schneller auf Krankheit (🩺), um Folgeschäden zu vermeiden.' }
        ];
        dims.sort((a, b) => a.s - b.s);
        tips.push(dims[0].t);
    }
    // Dorf-Tipp ergaenzen
    if (totalVillage === 0) {
        tips.push('Tipp: Investiere 🎫 Tickets ins Wolkendorf – schon die Klinik senkt das Krankheitsrisiko für alle künftigen Tamagotchis.');
    } else if (health === 0) {
        tips.push('Tipp: Ein Gesundheits-Gebäude (Klinik oder Therme) würde deinem nächsten Schützling spürbar helfen.');
    } else if (econ === 0 && overall >= 68) {
        tips.push('Tipp: Du pflegst stark – eine Münzprägerei oder Sternwarte würde dein Wachstum zusätzlich beschleunigen.');
    }

    tips = tips.map(x => t(x));   // Tipps gleich in der aktiven Sprache
    return {
        overall, grade, gradeIcon, gradeColor,
        dims: { sFeed, sClean, sLove, sPlay, sHealth },
        priorityText, priorityIcon,
        tip: tips.join(' ')
    };
}

function caretakerReportHtml(p) {
    let r = buildCaretakerReport(p);
    function bar(label, val) {
        let col = val >= 70 ? '#1dd1a1' : (val >= 45 ? '#feca57' : '#ee5253');
        return `<div style="display:flex; align-items:center; gap:6px; margin:3px 0; font-size:11px;">
            <span style="width:66px; text-align:left; color:#576574;">${label}</span>
            <span style="flex:1; height:7px; background:#e8ecf0; border-radius:4px; overflow:hidden;">
                <span style="display:block; height:100%; width:${val}%; background:${col};"></span>
            </span>
            <span style="width:26px; text-align:right; color:#2f3542;">${val}</span>
        </div>`;
    }
    return `
        <div style="background:#f8f9fb; border-radius:10px; padding:10px 12px; margin-top:12px; text-align:left;">
            <div style="text-align:center; margin-bottom:6px;">
                <div style="font-size:26px;">${r.gradeIcon}</div>
                <div style="font-size:14px; font-weight:bold; color:${r.gradeColor};">${t(r.grade)}</div>
                <div style="font-size:10px; color:#576574;">${t('Pflege-Bewertung')}: ${r.overall}/100</div>
            </div>
            ${bar(t('Füttern'), r.dims.sFeed)}
            ${bar(t('Sauberkeit'), r.dims.sClean)}
            ${bar(t('Zuwendung'), r.dims.sLove)}
            ${bar(t('Beschäftigung'), r.dims.sPlay)}
            ${bar(t('Gesundheit'), r.dims.sHealth)}
            <div style="font-size:11px; color:#2f3542; margin-top:8px; line-height:1.5;">
                <b>${r.priorityIcon} ${t('Deine Prioritäten:')}</b><br>${t(r.priorityText)}
            </div>
            <div style="font-size:11px; color:#0b6b7d; margin-top:8px; line-height:1.5; background:#e7f7fb; border-radius:7px; padding:7px 9px;">
                <b>💡 ${t('Fürs nächste Mal:')}</b><br>${r.tip}
            </div>
        </div>`;
}

function openDeathModal() {
    playSound('select');
    let text = "";
    if(pet.causeOfDeath === "Altersschwäche") text = `Dein treuer Begleiter <b>${pet.name}</b> ist nach einem langen, glücklichen Leben friedlich in den Wolken-Himmel aufgestiegen.`;
    else if(pet.causeOfDeath === "Übergewicht") text = `Oh nein! <b>${pet.name}</b> hat zu viele Snacks gegessen und zu wenig Sport getrieben. Es ist leider an Übergewicht gestorben.`;
    else if(pet.causeOfDeath === "Verhungern") text = `Tragisch! <b>${pet.name}</b> wurde zu lange nicht gefüttert und ist leider an Hunger gestorben.`;
    else if(pet.causeOfDeath === "Traurigkeit") text = `Wie traurig... <b>${pet.name}</b> hat sich zu einsam gefühlt und ist an einem gebrochenen Herzen gestorben.`;
    else if(pet.causeOfDeath === "Schicksalsrad") text = `Du hast hoch gepokert und alles verloren. Das Schicksalsrad hat das sofortige Ende von <b>${pet.name}</b> besiegelt.`;
    else if(pet.causeOfDeath === "Lootbox") text = `Du hast beim Öffnen einer Lootbox die gefürchtete Todeskralle gezogen! Game Over für <b>${pet.name}</b>.`;

    text += `<br><br><i>Seine Geschichte liegt nun in der Ahnengalerie (💀).</i>`;
    text += caretakerReportHtml(pet);
    text += `<div style="background:#fff0f0; border-left:4px solid #d63031; border-radius:7px; padding:8px 10px; margin-top:12px; font-size:11px; line-height:1.5; text-align:left;">
                <b>💸 ${t('Mit ins Grab gegangen')}:</b> ${t('Alle T-Coins 🪙 und Pausen-Tickets 🎫 sowie gekaufte Gegenstände sind verloren.')}<br>
                <b>✅ ${t('Dir bleiben')}:</b> ${t('Pfleger-Level, Medaillen, Wolkendorf, Arcade-Automaten und dein eigenes Bild.')}
             </div>`;
    text += `<br><b style="color:#d63031;">${t('Highscore gesichert')}:</b> ${t('Deine fälschungssichere Datei wurde heruntergeladen – verschiebe sie in euren Büro-Ordner fürs Leaderboard!')}`;

    document.getElementById('deathModalText').innerHTML = text;
    document.getElementById('deathModal').style.display = 'flex';
    checkAchievements(); 
}

// --- ONBOARDING LOGIK ---
// === ERSTSTART-GESCHICHTE ===
