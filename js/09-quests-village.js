/* Pausentamagotchi - Geschichte, Tages-Quests, Ergonomie, Tagebuch, Wolkendorf, Pomodoro */
const STORY_CHAPTERS = [
    {
        scene: '☁️🥚', minis: [{e:'✨',x:'18%',y:'20%',d:'0s'},{e:'⭐',x:'78%',y:'28%',d:'0.6s'},{e:'✨',x:'70%',y:'72%',d:'1.1s'}],
        title: 'Hoch über den Wolken',
        text: 'Weit oben, wo der Himmel ganz weich ist, schwebt das geheime <b>Wolkendorf</b>. Dort schlüpfen kleine Wolkenwesen aus zarten Wolken-Eiern. 🥚'
    },
    {
        scene: '😴💭', minis: [{e:'💤',x:'20%',y:'25%',d:'0s'},{e:'☁️',x:'75%',y:'30%',d:'0.5s'},{e:'💭',x:'72%',y:'70%',d:'1s'}],
        title: 'Die müden Träumchen',
        text: 'Die Wolkenwesen schicken den gestressten Menschen unten auf der Erde schöne <b>Pausen-Träume</b>. Doch das macht sie schrecklich müde – sie brauchen jemanden, der sich um sie kümmert. 💭'
    },
    {
        scene: '🚌☁️', minis: [{e:'✨',x:'16%',y:'22%',d:'0s'},{e:'☁️',x:'80%',y:'26%',d:'0.7s'},{e:'⭐',x:'22%',y:'74%',d:'1.2s'}],
        title: 'Die Reise zu dir',
        text: 'Ein besonders neugieriges Ei hat <b>genau dich</b> ausgesucht! Der Wolken-Bus bringt es in deinen Pausen zu dir – damit du zwischendurch kurz innehältst, Wasser trinkst und dich bewegst. 🚌'
    },
    {
        scene: '❤️🍔', minis: [{e:'🎮',x:'18%',y:'24%',d:'0s'},{e:'🛁',x:'78%',y:'26%',d:'0.6s'},{e:'💊',x:'74%',y:'72%',d:'1.1s'}],
        title: 'Deine wichtige Aufgabe',
        text: 'Die Erdenluft ist anstrengend, darum darf es nur <b>30 Minuten pro Tag</b> bleiben. In dieser Zeit brauchst du es: füttern, spielen, sauber halten und pflegen, damit es stark und glücklich heranwächst. ❤️'
    },
    {
        scene: '🌈🤝', minis: [{e:'✨',x:'20%',y:'22%',d:'0s'},{e:'⭐',x:'76%',y:'28%',d:'0.5s'},{e:'💚',x:'72%',y:'70%',d:'1s'}],
        title: 'Für immer Freunde',
        text: 'Gemeinsam wachst ihr über euch hinaus: dein Wolkenwesen gedeiht – und du machst gesündere, achtsamere Pausen. Bereit, deinen neuen Freund kennenzulernen? 🌈'
    }
];
let storyIndex = 0;

function startStory() {
    storyIndex = 0;
    renderStoryChapter();
    document.getElementById('storyOverlay').style.display = 'flex';
}

function renderStoryChapter() {
    let c = STORY_CHAPTERS[storyIndex];
    let sceneEl = document.getElementById('storyScene');
    let minis = (c.minis || []).map(m => `<span class="s-mini" style="left:${m.x}; top:${m.y}; animation-delay:${m.d};">${m.e}</span>`).join('');
    sceneEl.innerHTML = `${minis}<span class="s-emoji">${c.scene}</span>`;
    document.getElementById('storyTitle').innerText = c.title;
    document.getElementById('storyText').innerHTML = c.text;
    document.getElementById('storyDots').innerHTML = STORY_CHAPTERS.map((_, i) => `<div class="story-dot ${i === storyIndex ? 'active' : ''}"></div>`).join('');
    document.getElementById('storyBtn').innerText = (storyIndex === STORY_CHAPTERS.length - 1) ? "Los geht's! 🥚" : 'Weiter →';
    let textEl = document.getElementById('storyText');
    sceneEl.classList.remove('story-anim-in'); textEl.classList.remove('story-anim-in');
    void sceneEl.offsetWidth;
    sceneEl.classList.add('story-anim-in'); textEl.classList.add('story-anim-in');
    playSound('select');
}

function nextStoryChapter() {
    if (storyIndex < STORY_CHAPTERS.length - 1) {
        storyIndex++;
        renderStoryChapter();
    } else {
        finishStory();
    }
}

function finishStory() {
    safeSetItem('tama_story_seen', '1');
    document.getElementById('storyOverlay').style.display = 'none';
    document.getElementById('onboardingModal').style.display = 'flex';
}

function openOnboarding() {
    if(gameLoop) clearInterval(gameLoop); 
    pomodoroActive = false; clearInterval(pomodoroInterval); clearPomodoroState();
    if (state.isStarted && pet && pet.stage !== undefined) foldPetIntoLifetime(pet);
    state.isStarted = false; state.view = 'off';      
    resetPetState(); applyColors(); render();
    // Beim allerersten Start zuerst die niedliche Geschichte zeigen
    if (!safeGetItem('tama_story_seen')) {
        startStory();
    } else {
        document.getElementById('onboardingModal').style.display = 'flex';
    }
}

function submitOnboarding() {
    playSound('select');
    let tInput = document.getElementById('tamaNameInput'), oInput = document.getElementById('ownerNameInput');
    pet.name = (tInput && tInput.value.trim() !== "") ? tInput.value.trim().substring(0, 10) : "Tama";
    pet.ownerName = (oInput && oInput.value.trim() !== "") ? oInput.value.trim().substring(0, 12) : "Spieler";
    pet.bornDate = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    document.getElementById('onboardingModal').style.display = 'none';
    state.isStarted = true; state.view = 'main';
    saveGame(); startLoop(); render();
}

function toggleFlip() { playSound('beep'); document.getElementById('device').classList.toggle('is-flipped'); }

// ================================================================
// === FEATURE: TAGES-QUESTS ======================================
// ================================================================
const QUEST_POOL = [
    { id: 'win_rps_3',    title: '✌️ Schlag-Profi',      desc: 'Gewinne 3x SchnickSchnack',        goal: 3, track: 'wonSSP',      reward: 1 },
    { id: 'feed_2',       title: '🍔 Satt & Zufrieden',  desc: 'Füttere 2 Mahlzeiten',             goal: 2, track: 'fedBurger',   reward: 1 },
    { id: 'heal_1',       title: '💊 Doktor spielen',    desc: 'Heile eine Krankheit vollständig', goal: 1, track: 'healed',      reward: 1 },
    { id: 'play_5',       title: '🎮 Spielekind',        desc: 'Spiele 5 Minispiele',              goal: 5, track: 'gamesPlayed', reward: 1 },
    { id: 'love_5',       title: '❤️ Kuschelzeit',       desc: 'Streichle 5 Mal',                 goal: 5, track: 'loved',       reward: 1 },
    { id: 'bathe_1',      title: '🛁 Sauber halten',     desc: 'Bade 1 Mal',                      goal: 1, track: 'bathed',      reward: 1 },
    { id: 'win_lr_2',     title: '🔮 Hellseher',         desc: 'Gewinne 2x L/R Raten',            goal: 2, track: 'wonLR',       reward: 1 },
    { id: 'win_box_2',    title: '📦 Hütchentrick',      desc: 'Gewinne 2x Hütchenspiel',         goal: 2, track: 'wonBox',      reward: 1 },
    { id: 'discipline_2', title: '💢 Strenge Regeln',    desc: 'Belehre 2 Mal',                   goal: 2, track: 'disciplined', reward: 1 },
    { id: 'snack_3',      title: '🍦 Nascherei',         desc: 'Gib 3 Snacks',                    goal: 3, track: 'fedSnack',    reward: 1 },
    { id: 'pomodoro_1',   title: '🍅 Fokus-Zeit',        desc: 'Schließe einen Pomodoro ab',      goal: 1, track: 'pomodoro',    reward: 1 },

    // === ERGONOMIE-QUESTS ===
    // Diese Quests bilden reale Büro-Ergonomie-Tipps ab. Da das Spiel die Handlung nicht automatisch
    // erkennen kann, bestätigt der Nutzer sie manuell über einen Button (mit Cooldown gegen Spam-Klicks).
    { id: 'ergo_sitting',  title: '🪑 Dynamisches Sitzen', desc: 'Wechsle 3x deine Sitzposition (max. 1x alle 30 Min), um einseitige Belastung der Wirbelsäule zu vermeiden.', goal: 3, track: 'ergoSitting',  reward: 2, manual: true, cooldownSec: 1800 },
    { id: 'ergo_standing', title: '🧍 Steh-Phasen',        desc: 'Arbeite einmal 15-20 Min am höhenverstellbaren Tisch im Stehen.',                                          goal: 1, track: 'ergoStanding', reward: 2, manual: true, cooldownSec: 0 },
    { id: 'ergo_stairs',   title: '🪜 Treppe statt Lift',  desc: 'Nimm 3x die Treppe statt den Lift, um deinen Kreislauf zwischendurch zu aktivieren.',                       goal: 3, track: 'ergoStairs',   reward: 2, manual: true, cooldownSec: 600 },
    { id: 'ergo_stretch',  title: '🤸 Bewegte Pausen',     desc: 'Mach 2x eine kurze Dehn- & Streckübung für Nacken, Schultern & Rücken direkt am Arbeitsplatz.',             goal: 2, track: 'ergoStretch',  reward: 2, manual: true, cooldownSec: 900 },
    { id: 'ergo_2020',     title: '👀 20-20-20-Regel',     desc: 'Schau 4x für 20 Sek. auf etwas mind. 6m Entferntes, um die Augenmuskulatur zu entspannen.',                 goal: 4, track: 'ergo2020',     reward: 2, manual: true, cooldownSec: 1200 },
    { id: 'ergo_airing',   title: '🌬️ Stoßlüften',        desc: 'Öffne 2x das Fenster komplett für 5 Min, statt es dauerhaft zu kippen, um frische Luft reinzulassen.',       goal: 2, track: 'ergoAiring',   reward: 2, manual: true, cooldownSec: 1800 },
    { id: 'ergo_water',    title: '💧 Wassercheck',         desc: 'Trink täglich 1–1,5 Liter Wasser. Bestätige 4x, dass du ein großes Glas (ca. 300 ml) getrunken hast.',      goal: 4, track: 'ergoWater',    reward: 2, manual: true, cooldownSec: 1800 },
];

let dailyQuests = {};
let tickets = parseInt(safeGetItem('tama_tickets') || '0');

function initDailyQuests() {
    let today = new Date().toDateString();
    try { dailyQuests = JSON.parse(safeGetItem('tama_quests') || '{}'); } catch(e) { dailyQuests = {}; }
    if (dailyQuests.date !== today) {
        let waterQuest = QUEST_POOL.find(q => q.id === 'ergo_water');
        let otherErgo = QUEST_POOL.filter(q => q.manual && q.id !== 'ergo_water').sort(() => Math.random() - 0.5);
        let normalPool = QUEST_POOL.filter(q => !q.manual).sort(() => Math.random() - 0.5);
        // Täglich genau 3 Quests: Wassercheck (immer) + 1 zufällige Ergo-Quest + 1 sonstige Tagesquest
        let chosen = [waterQuest, ...otherErgo.slice(0, 1), ...normalPool.slice(0, 1)].sort(() => Math.random() - 0.5);
        dailyQuests = { date: today, quests: chosen.map(q => ({ id: q.id, progress: 0, completed: false, last: 0 })) };
        safeSetItem('tama_quests', JSON.stringify(dailyQuests));
    }
    updateTicketDisplay();
}

function updateQuestProgress(track, amount) {
    if (!dailyQuests.quests || !state.isStarted || pet.isDead) return;
    let changed = false;
    dailyQuests.quests.forEach(q => {
        if (q.completed) return;
        let def = QUEST_POOL.find(p => p.id === q.id);
        if (!def || def.track !== track) return;
        q.progress = Math.min(def.goal, q.progress + amount);
        changed = true;
        if (q.progress >= def.goal) {
            q.completed = true;
            let gotT = addTickets(def.reward);
            spawnFloatText('ticketDisplay', `+${gotT} 🎫`, '#1dd1a1');
            showAchievementBanner('🎫', `Quest: +${gotT} Ticket${gotT > 1 ? 's' : ''}!`, 'ticket');
        }
    });
    if (changed) safeSetItem('tama_quests', JSON.stringify(dailyQuests));
}

// Manuelle Bestätigung einer Ergonomie-Aktion (Cooldown verhindert Spam-Klicks)
function logErgoAction(id) {
    if (!dailyQuests.quests) return;
    let q = dailyQuests.quests.find(x => x.id === id);
    let def = QUEST_POOL.find(p => p.id === id);
    if (!q || !def || q.completed) return;
    let now = Date.now();
    let cooldownMs = (def.cooldownSec || 0) * 1000;
    if (q.last && (now - q.last) < cooldownMs) {
        playSound('cancel');
        return; // Button ist im UI bereits gesperrt, das hier ist nur ein Sicherheitsnetz
    }
    q.last = now;
    safeSetItem('tama_quests', JSON.stringify(dailyQuests));
    // Kleiner Wellness-Bonus fürs Tamagotchi als sofortige, spürbare Belohnung
    if (state.isStarted && pet && !pet.isDead) {
        pet.happiness = Math.min(100, pet.happiness + 3);
        pet.energy = Math.min(100, pet.energy + 3);
    }
    playSound('ergo');
    spawnConfetti('ergo');
    bumpElement('btn-quests');
    updateQuestProgress(def.track, 1);
    openQuestModal();
}

function updateTicketDisplay() {
    let el = document.getElementById('ticketCount');
    if (el) el.innerText = tickets;
}

// === AKTIVE ERGONOMIE-ERINNERUNGEN (auch nach Abfahrt ins Wolkendorf) ===
function getOpenErgoQuests() {
    if (!dailyQuests || !dailyQuests.quests) return [];
    let res = [];
    dailyQuests.quests.forEach(q => {
        let def = QUEST_POOL.find(p => p.id === q.id);
        if (def && def.manual && !q.completed) res.push({ def, q });
    });
    return res;
}

let _ergoReminderHideTimer = null;
function showErgoReminder() {
    // Nicht während Onboarding/Story oder wenn noch nicht gestartet
    if (!state.isStarted) return;
    let story = document.getElementById('storyOverlay');
    if (story && story.style.display === 'flex') return;
    let open = getOpenErgoQuests();
    if (open.length === 0) return;

    let pick = open[Math.floor(Math.random() * open.length)].def;
    let remaining = pick.goal - (getOpenErgoQuests().find(o => o.def.id === pick.id)?.q.progress || 0);
    let petName = (typeof pet !== 'undefined' && pet && pet.name) ? pet.name : 'Dein Wolkenwesen';
    let departedNote = (typeof pet !== 'undefined' && pet && pet.isDeparted)
        ? `<div style="font-size:9px; opacity:0.85; margin-top:2px;">☁️ Grüße aus dem Wolkendorf!</div>` : '';

    let el = document.getElementById('ergoReminder');
    if (!el) return;
    el.innerHTML = `
        <div style="font-size:26px; line-height:1;">${pick.title.split(' ')[0]}</div>
        <div style="flex:1; text-align:left;">
            <div style="font-size:11px; font-weight:bold;">${petName} erinnert dich 💭</div>
            <div style="font-size:11px;">Noch offen: <b>${pick.title.replace(/^\S+\s/, '')}</b></div>
            ${departedNote}
        </div>`;
    el.classList.add('show');
    playSound('ergo');
    clearTimeout(_ergoReminderHideTimer);
    _ergoReminderHideTimer = setTimeout(() => el.classList.remove('show'), 7000);
}
function openQuestsFromReminder() {
    let el = document.getElementById('ergoReminder');
    if (el) el.classList.remove('show');
    openQuestModal();
}

function openQuestModal() {
    playSound('select');
    if (!dailyQuests.quests) initDailyQuests();
    let html = '';
    dailyQuests.quests.forEach(q => {
        let def = QUEST_POOL.find(p => p.id === q.id);
        if (!def) return;
        let pct = def.goal > 0 ? Math.min(100, Math.round(q.progress / def.goal * 100)) : 100;
        let fillColor = q.completed ? '#1dd1a1' : (def.manual ? '#00b894' : '#f39c12');

        let actionHtml = '';
        if (def.manual && !q.completed) {
            let cooldownMs = (def.cooldownSec || 0) * 1000;
            let remain = q.last ? Math.max(0, cooldownMs - (Date.now() - q.last)) : 0;
            actionHtml = remain > 0
                ? `<button class="onboard-btn btn-gray" style="width:auto; padding:6px 14px; font-size:11px; margin-top:6px;" disabled>⏳ Verfügbar in ${Math.ceil(remain / 60000)} Min</button>`
                : `<button class="onboard-btn btn-blue" style="width:auto; padding:6px 14px; font-size:11px; margin-top:6px;" onclick="logErgoAction('${q.id}')">✅ Jetzt erledigt</button>`;
        }

        html += `
            <div class="quest-item ${q.completed ? 'done' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:13px;">${def.title}</b>
                    <span style="font-size:12px; color:#f39c12; white-space:nowrap; margin-left:8px;">🎫 +${def.reward}</span>
                </div>
                <div style="font-size:11px; color:#576574; margin-top:2px;">${def.desc}</div>
                <div class="quest-bar-bg"><div class="quest-bar-fill" style="width:${pct}%; background:${fillColor};"></div></div>
                <div style="font-size:10px; color:#576574; margin-top:3px;">${q.progress} / ${def.goal} ${q.completed ? '✅ Erledigt!' : ''}</div>
                ${actionHtml}
            </div>`;
    });
    html += `<div style="margin-top:12px; padding:10px 12px; background:rgba(241,196,15,0.1); border-radius:8px; font-size:12px; color:#576574; text-align:center;">
        🎫 Deine Tickets: <b style="color:#f39c12; font-size:14px;">${tickets}</b><br>
        <span style="font-size:10px;">🌿 Ergonomie-Quests bestätigst du selbst per Klick. Gib Tickets im Wolkendorf-Ausbau (🏘️) für dauerhafte Gebäude-Boni aus!</span>
    </div>`;
    document.getElementById('questContent').innerHTML = html;
    document.getElementById('questModal').style.display = 'flex';
}

// ================================================================
// === FEATURE: WOLKENDORF-TAGEBUCH (POKÉDEX) =====================
// ================================================================
let pokedex = JSON.parse(safeGetItem('tama_pokedex') || 'null') || new Array(19).fill(false);
// Migration: aeltere Speicherstaende kennen nur 16 Spezies.
while (pokedex.length < 19) pokedex.push(false);

const SPECIES_LORE = [
    { name: 'Wuffi',   lore: 'Treu bis in den Tod. Folgt dir überall hin, auch in Meetings.' },
    { name: 'Miezi',   lore: 'Beobachtet dich aus sicherer Distanz. Verurteilt deine Arbeitszeit.' },
    { name: 'Mäusi',   lore: 'Sammelt heimlich Käsekrümel auf dem Schreibtisch.' },
    { name: 'Hamsti',  lore: 'Schläft ¾ des Tages. Hat trotzdem mehr Energie als du.' },
    { name: 'Hopsi',   lore: 'Reagiert auf jedes Geräusch. Sehr nervös in Meetings.' },
    { name: 'Fuxx',    lore: 'Listig und frech. Klaut gerne Items aus dem Inventar.' },
    { name: 'Bärli',   lore: 'Gemütlich und entspannt. Liebt Honig und Mittagspausen.' },
    { name: 'Pandoo',  lore: 'Isst nur Bambus. Oder Burger. Hauptsache viel davon.' },
    { name: 'Leo',     lore: 'Der Chef im Büro. Alle respektieren ihn. Auch du.' },
    { name: 'Tigri',   lore: 'Schnell und fokussiert. Hält Deadlines immer ein.' },
    { name: 'Quaxi',   lore: 'Mag feuchte Umgebungen. Ist im Homeoffice am glücklichsten.' },
    { name: 'Affe',    lore: 'Hat den Bürostuhl zur Schaukel umfunktioniert.' },
    { name: 'Enzo',    lore: 'Trägt immer ein Horn. Niemand weiß warum. Es ist toll.' },
    { name: 'Okto',    lore: 'Hat 8 Arme und schafft damit 8× mehr als du. Respekt.' },
    { name: 'Dino',    lore: 'Uralt aber weise. Erinnert sich an die Zeit vor E-Mails.' },
    { name: 'Eule',    lore: 'Arbeitet am besten nachts. Kommt nie pünktlich ins Büro.' },
    // --- geheime Spezies ---
    { name: 'Phönix',  lore: 'Verbrennt zu Asche und steht wieder auf. Kennt keine Montagsmüdigkeit.', secret: true },
    { name: 'Kristo',  lore: 'Ein wandelnder Kristall. Bricht dein Licht in siebzehn Farben.', secret: true },
    { name: 'Stella',  lore: 'Trägt eine kleine Galaxie im Fell. Riecht nach kalter Nachtluft.', secret: true },
];

function checkPokedexDiscovery() {
    if (!pet || pet.stage < 4 || pokedex[pet.speciesIndex]) return;
    pokedex[pet.speciesIndex] = true;
    safeSetItem('tama_pokedex', JSON.stringify(pokedex));
    let name = SPECIES_LORE[pet.speciesIndex]?.name || speciesList[pet.speciesIndex];
    showAchievementBanner('📖', `Neu entdeckt: ${name}!`, 'discover');
}

function openPokedexModal() {
    playSound('select');
    let count = pokedex.filter(Boolean).length;
    document.getElementById('pokedexProgress').innerText = `${count} / ${SPECIES_LORE.length} Spezies entdeckt`;
    let html = '';
    speciesList.forEach((sp, i) => {
        let found = pokedex[i];
        let lore = SPECIES_LORE[i];
        let geheim = lore && lore.secret;
        html += `<div class="pokedex-entry ${found ? 'discovered' : ''}${geheim && found ? ' secret-found' : ''}" onclick="showPokedexLore(${i})">
            <div style="font-size:26px; ${found ? '' : 'color:#c8ccd4;'}">${found ? (typeof SPRITE_SPECIES !== 'undefined' ? `<img src="${SPRITE_BASE}${SPRITE_SPECIES[i]}_erwachsen.png" alt="${t(lore.name)}" style="width:44px;height:44px;object-fit:contain;display:block;margin:0 auto;image-rendering:pixelated;">` : sp) : '?'}</div>
            <div style="font-size:9px; margin-top:3px; font-weight:bold; color:${found ? '#2f3542' : '#bbb'};">${found ? (geheim ? '✨ ' : '') + t(lore.name) : '???'}</div>
        </div>`;
    });
    document.getElementById('pokedexGrid').innerHTML = html;
    document.getElementById('pokedexLore').innerText = t('Klicke auf eine Spezies für mehr Info.');
    document.getElementById('pokedexModal').style.display = 'flex';
}

function showPokedexLore(i) {
    let lore = document.getElementById('pokedexLore');
    if (pokedex[i]) {
        lore.innerText = `"${t(SPECIES_LORE[i].lore)}"`;
        lore.style.color = '#2f3542';
    } else {
        lore.innerText = t('??? — Erziehe diese Spezies zum Erwachsenen, um sie zu entdecken!');
        lore.style.color = '#aaa';
    }
}

// ================================================================
// === FEATURE: WOLKENDORF-AUSBAU (BASE BUILDING) =================
// ================================================================
// Jedes Gebäude hat 12 Ausbaustufen. Bezahlt wird ausschließlich mit 🎫 Pausen-Tickets.
// Die Effekte gelten dauerhaft für alle aktuellen und zukünftigen Tamagotchis.
const VILLAGE_BUILDINGS = [
    { id: 'clinic', icon: '🏥', name: 'Klinik', desc: 'Tamagotchis werden seltener krank.', tiers: [
        { price: 6, value: 0.0167, effectLabel: '-2% Krankheitswahrscheinlichkeit' },
        { price: 9, value: 0.0333, effectLabel: '-3% Krankheitswahrscheinlichkeit' },
        { price: 12, value: 0.05, effectLabel: '-5% Krankheitswahrscheinlichkeit' },
        { price: 15, value: 0.0667, effectLabel: '-7% Krankheitswahrscheinlichkeit' },
        { price: 18, value: 0.0833, effectLabel: '-8% Krankheitswahrscheinlichkeit' },
        { price: 21, value: 0.1, effectLabel: '-10% Krankheitswahrscheinlichkeit' },
        { price: 24, value: 0.1167, effectLabel: '-12% Krankheitswahrscheinlichkeit' },
        { price: 27, value: 0.1333, effectLabel: '-13% Krankheitswahrscheinlichkeit' },
        { price: 30, value: 0.15, effectLabel: '-15% Krankheitswahrscheinlichkeit' },
        { price: 33, value: 0.1667, effectLabel: '-17% Krankheitswahrscheinlichkeit' },
        { price: 36, value: 0.1833, effectLabel: '-18% Krankheitswahrscheinlichkeit' },
        { price: 39, value: 0.2, effectLabel: '-20% Krankheitswahrscheinlichkeit (Max.)' }
    ]},
    { id: 'library', icon: '📚', name: 'Bibliothek', desc: 'Jedes neue Ei startet mit mehr Intelligenz.', tiers: [
        { price: 6, value: 0.25, effectLabel: '+0.25 Start-IQ' },
        { price: 9, value: 0.5, effectLabel: '+0.5 Start-IQ' },
        { price: 12, value: 0.75, effectLabel: '+0.75 Start-IQ' },
        { price: 15, value: 1, effectLabel: '+1 Start-IQ' },
        { price: 18, value: 1.25, effectLabel: '+1.25 Start-IQ' },
        { price: 21, value: 1.5, effectLabel: '+1.5 Start-IQ' },
        { price: 24, value: 1.75, effectLabel: '+1.75 Start-IQ' },
        { price: 27, value: 2, effectLabel: '+2 Start-IQ' },
        { price: 30, value: 2.25, effectLabel: '+2.25 Start-IQ' },
        { price: 33, value: 2.5, effectLabel: '+2.5 Start-IQ' },
        { price: 36, value: 2.75, effectLabel: '+2.75 Start-IQ' },
        { price: 39, value: 3, effectLabel: '+3 Start-IQ (Max.)' }
    ]},
    { id: 'cafeteria', icon: '☕', name: 'Kantine', desc: 'Der Hunger sinkt langsamer.', tiers: [
        { price: 6, value: 3.75, effectLabel: '-2% Hunger-Drain' },
        { price: 9, value: 7.5, effectLabel: '-4% Hunger-Drain' },
        { price: 12, value: 11.25, effectLabel: '-6% Hunger-Drain' },
        { price: 15, value: 15, effectLabel: '-8% Hunger-Drain' },
        { price: 18, value: 18.75, effectLabel: '-10% Hunger-Drain' },
        { price: 21, value: 22.5, effectLabel: '-12% Hunger-Drain' },
        { price: 24, value: 26.25, effectLabel: '-15% Hunger-Drain' },
        { price: 27, value: 30, effectLabel: '-17% Hunger-Drain' },
        { price: 30, value: 33.75, effectLabel: '-19% Hunger-Drain' },
        { price: 33, value: 37.5, effectLabel: '-21% Hunger-Drain' },
        { price: 36, value: 41.25, effectLabel: '-23% Hunger-Drain' },
        { price: 39, value: 45, effectLabel: '-25% Hunger-Drain (Max.)' }
    ]},
    { id: 'gym', icon: '💪', name: 'Fitnessstudio', desc: 'Weniger Gewichtszunahme beim Füttern.', tiers: [
        { price: 6, value: 0.0417, effectLabel: '-4% Gewichtszunahme' },
        { price: 9, value: 0.0833, effectLabel: '-8% Gewichtszunahme' },
        { price: 12, value: 0.125, effectLabel: '-12% Gewichtszunahme' },
        { price: 15, value: 0.1667, effectLabel: '-17% Gewichtszunahme' },
        { price: 18, value: 0.2083, effectLabel: '-21% Gewichtszunahme' },
        { price: 21, value: 0.25, effectLabel: '-25% Gewichtszunahme' },
        { price: 24, value: 0.2917, effectLabel: '-29% Gewichtszunahme' },
        { price: 27, value: 0.3333, effectLabel: '-33% Gewichtszunahme' },
        { price: 30, value: 0.375, effectLabel: '-38% Gewichtszunahme' },
        { price: 33, value: 0.4167, effectLabel: '-42% Gewichtszunahme' },
        { price: 36, value: 0.4583, effectLabel: '-46% Gewichtszunahme' },
        { price: 39, value: 0.5, effectLabel: '-50% Gewichtszunahme (Max.)' }
    ]},
    { id: 'playground', icon: '🎡', name: 'Spielplatz', desc: 'Minispiele machen mehr Laune.', tiers: [
        { price: 8, value: 0.25, effectLabel: '+0.25 Bonus-Laune pro Spiel' },
        { price: 11, value: 0.5, effectLabel: '+0.5 Bonus-Laune pro Spiel' },
        { price: 14, value: 0.75, effectLabel: '+0.75 Bonus-Laune pro Spiel' },
        { price: 17, value: 1, effectLabel: '+1 Bonus-Laune pro Spiel' },
        { price: 20, value: 1.25, effectLabel: '+1.25 Bonus-Laune pro Spiel' },
        { price: 23, value: 1.5, effectLabel: '+1.5 Bonus-Laune pro Spiel' },
        { price: 26, value: 1.75, effectLabel: '+1.75 Bonus-Laune pro Spiel' },
        { price: 29, value: 2, effectLabel: '+2 Bonus-Laune pro Spiel' },
        { price: 32, value: 2.25, effectLabel: '+2.25 Bonus-Laune pro Spiel' },
        { price: 35, value: 2.5, effectLabel: '+2.5 Bonus-Laune pro Spiel' },
        { price: 38, value: 2.75, effectLabel: '+2.75 Bonus-Laune pro Spiel' },
        { price: 41, value: 3, effectLabel: '+3 Bonus-Laune pro Spiel (Max.)' }
    ]},
    { id: 'bakery', icon: '🥐', name: 'Bäckerei', desc: 'Mahlzeiten sättigen stärker.', tiers: [
        { price: 8, value: 0.6667, effectLabel: '+0.7 Bonus-Hunger pro Mahlzeit' },
        { price: 11, value: 1.3333, effectLabel: '+1.3 Bonus-Hunger pro Mahlzeit' },
        { price: 14, value: 2, effectLabel: '+2 Bonus-Hunger pro Mahlzeit' },
        { price: 17, value: 2.6667, effectLabel: '+2.7 Bonus-Hunger pro Mahlzeit' },
        { price: 20, value: 3.3333, effectLabel: '+3.3 Bonus-Hunger pro Mahlzeit' },
        { price: 23, value: 4, effectLabel: '+4 Bonus-Hunger pro Mahlzeit' },
        { price: 26, value: 4.6667, effectLabel: '+4.7 Bonus-Hunger pro Mahlzeit' },
        { price: 29, value: 5.3333, effectLabel: '+5.3 Bonus-Hunger pro Mahlzeit' },
        { price: 32, value: 6, effectLabel: '+6 Bonus-Hunger pro Mahlzeit' },
        { price: 35, value: 6.6667, effectLabel: '+6.7 Bonus-Hunger pro Mahlzeit' },
        { price: 38, value: 7.3333, effectLabel: '+7.3 Bonus-Hunger pro Mahlzeit' },
        { price: 41, value: 8, effectLabel: '+8 Bonus-Hunger pro Mahlzeit (Max.)' }
    ]},
    { id: 'spa', icon: '🛀', name: 'Therme', desc: 'Dein Tamagotchi wird seltener schmutzig.', tiers: [
        { price: 8, value: 0.0125, effectLabel: '-4% Schmutz-Chance' },
        { price: 11, value: 0.025, effectLabel: '-8% Schmutz-Chance' },
        { price: 14, value: 0.0375, effectLabel: '-12% Schmutz-Chance' },
        { price: 17, value: 0.05, effectLabel: '-17% Schmutz-Chance' },
        { price: 20, value: 0.0625, effectLabel: '-21% Schmutz-Chance' },
        { price: 23, value: 0.075, effectLabel: '-25% Schmutz-Chance' },
        { price: 26, value: 0.0875, effectLabel: '-29% Schmutz-Chance' },
        { price: 29, value: 0.1, effectLabel: '-33% Schmutz-Chance' },
        { price: 32, value: 0.1125, effectLabel: '-38% Schmutz-Chance' },
        { price: 35, value: 0.125, effectLabel: '-42% Schmutz-Chance' },
        { price: 38, value: 0.1375, effectLabel: '-46% Schmutz-Chance' },
        { price: 41, value: 0.15, effectLabel: '-50% Schmutz-Chance (Max.)' }
    ]},
    { id: 'observatory', icon: '🔭', name: 'Sternwarte', desc: 'Du sammelst schneller Pfleger-XP.', tiers: [
        { price: 10, value: 0.0292, effectLabel: '+3% Pfleger-XP' },
        { price: 14, value: 0.0583, effectLabel: '+6% Pfleger-XP' },
        { price: 18, value: 0.0875, effectLabel: '+9% Pfleger-XP' },
        { price: 22, value: 0.1167, effectLabel: '+12% Pfleger-XP' },
        { price: 26, value: 0.1458, effectLabel: '+15% Pfleger-XP' },
        { price: 30, value: 0.175, effectLabel: '+18% Pfleger-XP' },
        { price: 34, value: 0.2042, effectLabel: '+20% Pfleger-XP' },
        { price: 38, value: 0.2333, effectLabel: '+23% Pfleger-XP' },
        { price: 42, value: 0.2625, effectLabel: '+26% Pfleger-XP' },
        { price: 46, value: 0.2917, effectLabel: '+29% Pfleger-XP' },
        { price: 50, value: 0.3208, effectLabel: '+32% Pfleger-XP' },
        { price: 54, value: 0.35, effectLabel: '+35% Pfleger-XP (Max.)' }
    ]},
    { id: 'mint', icon: '🪙', name: 'Münzprägerei', desc: 'Du erhältst mehr T-Coins.', tiers: [
        { price: 10, value: 0.0292, effectLabel: '+3% T-Coins' },
        { price: 14, value: 0.0583, effectLabel: '+6% T-Coins' },
        { price: 18, value: 0.0875, effectLabel: '+9% T-Coins' },
        { price: 22, value: 0.1167, effectLabel: '+12% T-Coins' },
        { price: 26, value: 0.1458, effectLabel: '+15% T-Coins' },
        { price: 30, value: 0.175, effectLabel: '+18% T-Coins' },
        { price: 34, value: 0.2042, effectLabel: '+20% T-Coins' },
        { price: 38, value: 0.2333, effectLabel: '+23% T-Coins' },
        { price: 42, value: 0.2625, effectLabel: '+26% T-Coins' },
        { price: 46, value: 0.2917, effectLabel: '+29% T-Coins' },
        { price: 50, value: 0.3208, effectLabel: '+32% T-Coins' },
        { price: 54, value: 0.35, effectLabel: '+35% T-Coins (Max.)' }
    ]},
    { id: 'watchtower', icon: '🗼', name: 'Wachturm', desc: 'Dein Tamagotchi ist seltener unartig.', tiers: [
        { price: 8, value: 0.0062, effectLabel: '-4% Unartig-Chance' },
        { price: 11, value: 0.0125, effectLabel: '-8% Unartig-Chance' },
        { price: 14, value: 0.0187, effectLabel: '-12% Unartig-Chance' },
        { price: 17, value: 0.025, effectLabel: '-17% Unartig-Chance' },
        { price: 20, value: 0.0312, effectLabel: '-21% Unartig-Chance' },
        { price: 23, value: 0.0375, effectLabel: '-25% Unartig-Chance' },
        { price: 26, value: 0.0438, effectLabel: '-29% Unartig-Chance' },
        { price: 29, value: 0.05, effectLabel: '-33% Unartig-Chance' },
        { price: 32, value: 0.0562, effectLabel: '-37% Unartig-Chance' },
        { price: 35, value: 0.0625, effectLabel: '-42% Unartig-Chance' },
        { price: 38, value: 0.0687, effectLabel: '-46% Unartig-Chance' },
        { price: 41, value: 0.075, effectLabel: '-50% Unartig-Chance (Max.)' }
    ]}
];

let village = JSON.parse(safeGetItem('tama_village') || '{}');
// Migration: alte Saves speicherten "true" statt einer Stufen-Zahl
Object.keys(village).forEach(k => { if (village[k] === true) village[k] = 1; });

// Liefert den aktuellen Effektwert eines Gebäudes (0, falls noch nicht gebaut)
// Wie stark unterdrueckt das Dorf Krankheit/Schmutz/Hunger/Unartigkeit? (0..~1 je Gebaeude)
// Daraus ein XP-Bonus: ruhigere Pflege = mehr Belohnung, damit es sich lohnt.
function villageComfortXpBonus() {
    let clinic = getVillageEffect('clinic') / 0.20;       // 0..1 (Krankheit)
    let spa    = getVillageEffect('spa') / 0.15;          // 0..1 (Schmutz)
    let tower  = getVillageEffect('watchtower') / 0.075;  // 0..1 (Unartig)
    let cafe   = getVillageEffect('cafeteria') / 45;      // 0..1 (Hunger-Drain)
    let comfort = clinic + spa + tower + cafe;            // 0..4
    // Bis zu +40 XP pro Tag obendrauf bei voll ausgebautem Komfort-Dorf (10 je Achse).
    return Math.round(comfort * 10);
}

function getVillageEffect(id) {
    let lvl = village[id] || 0;
    if (lvl <= 0) return 0;
    let b = VILLAGE_BUILDINGS.find(x => x.id === id);
    if (!b || !b.tiers[lvl - 1]) return 0;
    return b.tiers[lvl - 1].value;
}

// Zeichnet das Wolkendorf als kleine Skyline. Jedes Gebaeude waechst mit
// seiner Stufe: hoeher, mehr Stockwerks-Fenster, ab hohen Stufen ein Dach-
// aufsatz. Ungebaute Gebaeude erscheinen als blasse Baustelle. Ein Klick
// aufs Haus scrollt zur passenden Karte in der Liste.
// Hilfsfunktion: Hex-Farbe aufhellen/abdunkeln (f: -1..1)
function shadeColor(hex, f) {
    let n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

// Zeichnet EIN Haus an Position (bx, groundY). Gibt SVG-String zurueck.
function villageHouseSvg(b, idx, bx, bw, groundY) {
    let lvl = village[b.id] || 0;
    const maxTiers = 12;
    const minBuildingH = 15, maxBuildingH = 80;
    const palette = ['#ff9f80','#ffd479','#8fd3e8','#c3a6e0','#ffb0c4','#f4c07a','#93dcb4','#a9b8ff','#ffce7a','#a9c8d8'];
    let built = lvl > 0;
    let frac = lvl / maxTiers;
    let bh = built ? (minBuildingH + (maxBuildingH - minBuildingH) * frac) : minBuildingH;
    let by = groundY - bh + 6;
    let color = built ? palette[idx % palette.length] : '#e7ecf0';

    let s = `<g class="vc-house" onclick="scrollToVillage('${b.id}')">`;

    if (built) {
        let roofC = shadeColor(palette[idx % palette.length], -0.28);
        let doorC = shadeColor(palette[idx % palette.length], -0.45);
        let roofH = lvl >= 8 ? 11 : (lvl >= 4 ? 7 : 0);

        s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2.5" fill="${color}" stroke="${roofC}" stroke-width="0.8"/>`;
        s += `<rect x="${bx+bw-5}" y="${by}" width="5" height="${bh}" rx="2.5" fill="rgba(0,0,0,0.08)"/>`;

        if (lvl >= 9) s += `<rect x="${bx}" y="${groundY+1}" width="${bw}" height="5" fill="rgba(0,0,0,0.14)"/>`;
        if (roofH) s += `<path d="M${bx-2.5},${by} L${bx+bw/2},${by-roofH} L${bx+bw+2.5},${by} Z" fill="${roofC}"/>`;

        if (lvl >= 6) {
            let chTop = by - (roofH ? roofH*0.55 : 0) - 6;
            s += `<rect x="${bx+bw*0.66}" y="${chTop}" width="4.5" height="${(by - chTop) + 2}" fill="${doorC}"/>`;
            if (lvl >= 7) {
                s += `<circle cx="${bx+bw*0.71}" cy="${chTop-3}" r="1.7" fill="#eef3f6" opacity="0.9"/>`;
                s += `<circle cx="${bx+bw*0.74}" cy="${chTop-7}" r="2.2" fill="#eef3f6" opacity="0.6"/>`;
            }
        }
        if (lvl >= 10 && roofH) s += `<circle cx="${bx+bw/2}" cy="${by - roofH*0.42}" r="2.4" fill="#fff3c1" stroke="${roofC}" stroke-width="0.7"/>`;
        if (lvl >= 11) {
            let ax = bx + bw*0.24, ay = by - (roofH ? roofH*0.5 : 0);
            s += `<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${ay-9}" stroke="${doorC}" stroke-width="1.1"/>`;
            s += `<circle cx="${ax}" cy="${ay-9.8}" r="1.4" fill="${doorC}"/>`;
        }
        if (lvl >= maxTiers) {
            let fx = bx + bw - 5, fy = by - roofH;
            s += `<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${fy-10}" stroke="#e17055" stroke-width="1.4"/>`;
            s += `<path d="M${fx},${fy-10} l6.5,2.6 l-6.5,2.6 z" fill="#ff7f66"/>`;
        }

        let rows = lvl < 2 ? 0 : Math.min(5, 1 + Math.floor((lvl - 2) / 2.5));
        let wyLast = null;
        for (let r = 0; r < rows; r++) {
            let wy = by + 6 + r * ((bh - 12) / rows);
            if (wy > by + bh - 9) break;
            s += `<rect x="${bx+bw*0.22}" y="${wy}" width="5.5" height="5.5" rx="1.2" fill="#fff3c1" stroke="${roofC}" stroke-width="0.6"/>`;
            s += `<rect x="${bx+bw*0.58}" y="${wy}" width="5.5" height="5.5" rx="1.2" fill="#fff3c1" stroke="${roofC}" stroke-width="0.6"/>`;
            wyLast = wy;
        }
        if (lvl >= 5 && wyLast !== null) {
            s += `<rect x="${bx+bw*0.22-0.8}" y="${wyLast+5.8}" width="7" height="2.2" rx="1" fill="#e56b6f"/>`;
            s += `<rect x="${bx+bw*0.58-0.8}" y="${wyLast+5.8}" width="7" height="2.2" rx="1" fill="#e56b6f"/>`;
        }
        if (lvl >= 3 && bh >= 22) {
            s += `<rect x="${bx+bw/2-3}" y="${groundY-3}" width="6" height="9" rx="1.5" fill="${doorC}"/>`;
            s += `<circle cx="${bx+bw/2+1.6}" cy="${groundY+1.5}" r="0.7" fill="#fff" opacity="0.8"/>`;
        }
    } else {
        s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2.5" fill="rgba(255,255,255,0.35)" stroke="#b8c4cc" stroke-width="1" stroke-dasharray="3 2"/>`;
        s += `<text x="${bx+bw/2}" y="${by+bh/2+3.5}" text-anchor="middle" font-size="9">🚧</text>`;
    }

    // Emoji ueber der Dachspitze
    let roofTop = built ? (lvl >= 8 ? 11 : (lvl >= 4 ? 7 : 0)) : 0;
    let extra = built && lvl >= 7 ? 6 : 0;
    s += `<text x="${bx+bw/2}" y="${by - roofTop - extra - 4}" text-anchor="middle" font-size="11">${b.icon}</text>`;
    // Stufe unter dem Boden
    s += `<text class="vc-lvl" x="${bx+bw/2}" y="${groundY+16+9}">${lvl}/${maxTiers}</text>`;
    s += `</g>`;
    return s;
}

function drawVillageCity() {
    let box = document.getElementById('villageCity');
    if (!box) return;

    // Drei Reihen: 3 / 4 / 3 Gebaeude. Ein Himmel oben, darunter durchgehende
    // Wiese, auf der alle Reihen stehen. Grossere Zellen -> auf dem Handy besser
    // lesbar als 10 winzige Haeuser nebeneinander.
    const rows = [
        VILLAGE_BUILDINGS.slice(0, 3),
        VILLAGE_BUILDINGS.slice(3, 7),
        VILLAGE_BUILDINGS.slice(7, 10)
    ];
    const cellW = 62, gap = 8, padX = 12;
    const maxPerRow = 4;
    const rowContentW = maxPerRow*cellW + (maxPerRow-1)*gap;   // breiteste Reihe (4)
    const W = padX*2 + rowContentW;

    const skyH = 46;              // gemeinsamer Himmel oben
    const rowH = 104;             // Hoehe je Reihe (Haus max 80 + Boden + Beschriftung)
    const buildingBottom = 70;    // Boden-Offset (10px hoeher als zuvor)
    const labelPad = 16;          // Fussraum, damit die unterste Stufen-Zahl reinpasst
    const H = skyH + rows.length*rowH + labelPad;

    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:100%;height:auto;aspect-ratio:${W}/${H};" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wolkendorf">`;
    svg += `<defs>
        <linearGradient id="vcSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1a1a3d"/><stop offset="60%" stop-color="#2d2b55"/><stop offset="100%" stop-color="#4a3f6b"/>
        </linearGradient>
        <linearGradient id="vcGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffe0ec"/><stop offset="35%" stop-color="#e7e0ff"/><stop offset="70%" stop-color="#d9f0ff"/><stop offset="100%" stop-color="#e0fff0"/>
        </linearGradient>
        <radialGradient id="vcMoon" cx="0.4" cy="0.4" r="0.7">
            <stop offset="0%" stop-color="#fffbe8"/><stop offset="100%" stop-color="#f2e9c0"/>
        </radialGradient>
        <filter id="vcCloudBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5"/>
        </filter>
    </defs>`;

    // 1) EIN Nachthimmel ganz oben
    svg += `<rect x="0" y="0" width="${W}" height="${skyH}" fill="url(#vcSky)"/>`;
    // Mond mit Halo und Kratern
    svg += `<circle cx="${W-28}" cy="18" r="15" fill="#fff8dc" opacity="0.18"/>`;
    svg += `<circle cx="${W-28}" cy="18" r="9" fill="url(#vcMoon)"/>`;
    svg += `<circle cx="${W-31}" cy="15" r="1.6" fill="#e6dcae" opacity="0.7"/><circle cx="${W-25}" cy="20" r="2.1" fill="#e6dcae" opacity="0.6"/><circle cx="${W-27}" cy="22" r="1.1" fill="#e6dcae" opacity="0.6"/>`;
    // Sterne: fest gesetzte Positionen + sanftes Funkeln
    const stars = [[18,10],[42,20],[70,8],[95,24],[120,13],[150,9],[176,22],[205,12],[232,26],[60,30],[110,32],[190,32],[255,16],[30,26],[135,25]];
    stars.forEach((s, k) => {
        let r = (k % 3 === 0) ? 1.4 : (k % 3 === 1 ? 1.0 : 0.7);
        let dur = 2 + (k % 4) * 0.6;
        svg += `<circle cx="${s[0]}" cy="${s[1]}" r="${r}" fill="#fffbe0">
            <animate attributeName="opacity" values="0.25;1;0.25" dur="${dur}s" repeatCount="indefinite" begin="${(k%5)*0.4}s"/>
        </circle>`;
    });
    // eine Sternschnuppe
    svg += `<line x1="${W*0.2}" y1="8" x2="${W*0.2+10}" y2="12" stroke="#fffbe0" stroke-width="1" opacity="0" stroke-linecap="round">
        <animate attributeName="opacity" values="0;0;0.9;0" dur="6s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0,0; 26,10" dur="6s" repeatCount="indefinite"/>
    </line>`;

    // 2) Durchgehender Wolkenboden in Regenbogen-Pastell (hinter allen Reihen)
    svg += `<rect x="0" y="${skyH}" width="${W}" height="${H-skyH}" fill="url(#vcGround)"/>`;
    // Weiche Wolkenpolster als "Boden" jeder Reihe - abwechselnde Pastelltoene
    const cloudTints = ['#ffd6e8','#e6d6ff','#d6ecff','#d9fff0','#fff4d6'];
    for (let r = 0; r < rows.length; r++) {
        let baseY = skyH + r*rowH + buildingBottom;
        let t1 = cloudTints[(r*2) % cloudTints.length];
        let t2 = cloudTints[(r*2+1) % cloudTints.length];
        // mehrere ueberlappende Ellipsen = flauschige Wolkenbank, auf der die Haeuser stehen
        svg += `<g opacity="0.85" filter="url(#vcCloudBlur)">
            <ellipse cx="${W*0.16}" cy="${baseY+8}" rx="${W*0.22}" ry="13" fill="${t1}"/>
            <ellipse cx="${W*0.44}" cy="${baseY+9}" rx="${W*0.24}" ry="14" fill="${t2}"/>
            <ellipse cx="${W*0.72}" cy="${baseY+8}" rx="${W*0.24}" ry="13" fill="${t1}"/>
            <ellipse cx="${W*0.93}" cy="${baseY+9}" rx="${W*0.16}" ry="12" fill="${t2}"/>
            <ellipse cx="${W*0.5}" cy="${baseY+3}" rx="${W*0.52}" ry="6" fill="#ffffff" opacity="0.5"/>
        </g>`;
    }

    // 3) Gebaeude reihenweise, jede Reihe horizontal zentriert
    const bw = cellW - 14;
    rows.forEach((rowBuildings, rIdx) => {
        let count = rowBuildings.length;
        let contentW = count*cellW + (count-1)*gap;
        let startX = (W - contentW) / 2;
        let groundY = skyH + rIdx*rowH + buildingBottom;

        rowBuildings.forEach((b, j) => {
            // globaler Index fuer Farbe/Palette
            let globalIdx = (rIdx === 0 ? 0 : rIdx === 1 ? 3 : 7) + j;
            let cellX = startX + j*(cellW+gap);
            let bx = cellX + (cellW - bw)/2;
            svg += villageHouseSvg(b, globalIdx, bx, bw, groundY);

            // kleines Wolkenpuschel zwischen den Haeusern
            if (j < count-1) {
                let sx = cellX + cellW - gap/2;
                svg += `<g filter="url(#vcCloudBlur)"><circle cx="${sx}" cy="${groundY+5}" r="4" fill="#ffffff" opacity="0.85"/><circle cx="${sx+3.2}" cy="${groundY+6}" r="3" fill="#f0eaff" opacity="0.9"/></g>`;
            }
        });
    });

    // Wenn der Wolken-Bus das Tamagotchi abgeholt hat: Bus parkt im Dorf und
    // das blanke Tier (ohne Haus/Huelle) tapst in Miniatur ueber die Wiese.
    if (typeof pet !== 'undefined' && pet && pet.isDeparted && !pet.isDead) {
        // Aktuelles Sprite des Tieres statt eines Emojis
        let animalSrc = (typeof spriteSrc === 'function') ? spriteSrc(pet) : '';
        // Bus parkt oben in der ERSTEN Reihe - selbes Emoji wie im Ei-Display (🚌)
        let topLaneY = skyH + 0 * rowH + buildingBottom + 4;
        let busX = 16;
        svg += `<text x="${busX}" y="${topLaneY}" text-anchor="middle" font-size="20">🚌</text>`;
        svg += `<text x="${busX+15}" y="${topLaneY-9}" font-size="8" opacity="0.7">💨</text>`;

        // Das blanke Tier (ohne Huelle) laeuft langsam durch ALLE drei Reihen.
        // animateMotion entlang eines Zickzack-Pfades: Reihe 1 -> 2 -> 3 -> zurueck.
        let y1 = skyH + 0*rowH + buildingBottom + 3;
        let y2 = skyH + 1*rowH + buildingBottom + 3;
        let y3 = skyH + 2*rowH + buildingBottom + 3;
        let xL = 30, xR = W - 24;
        // Weg: startet neben dem Bus, schlaengelt sich Reihe fuer Reihe nach unten und wieder hoch
        let path = `M ${busX+20},${y1} L ${xR},${y1} L ${xR},${y2} L ${xL},${y2} L ${xL},${y3} L ${xR},${y3} L ${xR},${y2} L ${xL},${y2} L ${xL},${y1} L ${busX+20},${y1} Z`;
        // Das Sprite haengt als <image> in der animierten Gruppe. Die Bewegung
        // liegt jetzt auf dem <g>, damit sie fuer Bilder statt Text gilt.
        let sz = 20;
        svg += `<g>
            <animateMotion dur="52s" repeatCount="indefinite" rotate="0" path="${path}"/>
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.5; 0,0" dur="0.7s" repeatCount="indefinite" additive="sum"/>
            ${animalSrc
                ? `<image href="${animalSrc}" x="${-sz/2}" y="${-sz+4}" width="${sz}" height="${sz}" style="image-rendering:pixelated;"/>`
                : `<text text-anchor="middle" font-size="15">${speciesList[pet.speciesIndex] || '🐾'}</text>`}
        </g>`;
    }

    svg += `</svg>`;
    box.innerHTML = svg;
}

function scrollToVillage(id) {
    playSound('beep');
    let el = document.getElementById('village-card-' + id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('vflash'); setTimeout(()=>el.classList.remove('vflash'), 900); }
}

function openVillageModal() {
    playSound('select');
    let html = '';
    let totalLevels = 0, maxLevels = 0;
    VILLAGE_BUILDINGS.forEach(b => {
        let curLevel = village[b.id] || 0;
        maxLevels += b.tiers.length;
        totalLevels += curLevel;
        let isMaxed = curLevel >= b.tiers.length;
        let nextTier = !isMaxed ? b.tiers[curLevel] : null;
        let canAfford = nextTier && tickets >= nextTier.price;

        let dotsHtml = b.tiers.map((t, i) => `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:3px; background:${i < curLevel ? '#1dd1a1' : '#dfe6e9'};"></span>`).join('');

        let btnHtml = isMaxed
            ? `<button class="shop-btn btn-gray" disabled style="white-space:nowrap;">MAX ✓</button>`
            : `<button class="shop-btn ${canAfford ? 'btn-gold' : 'btn-gray'}" onclick="${canAfford ? `buyVillageUpgrade('${b.id}')` : ''}" style="white-space:nowrap;">${nextTier.price} 🎫</button>`;

        let currentEffectText = curLevel > 0 ? t(b.tiers[curLevel - 1].effectLabel) : t('Noch nicht gebaut');
        let nextEffectText = !isMaxed ? `${t('Nächste Stufe')}: ${t(nextTier.effectLabel)} (${nextTier.price} 🎫)` : t('Maximalstufe erreicht!');

        html += `
            <div class="village-upgrade ${curLevel > 0 ? 'owned' : ''}" id="village-card-${b.id}" style="flex-direction:column; align-items:stretch;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <div style="flex:1;">
                        <div style="font-size:14px; font-weight:bold;">${b.icon} ${t(b.name)} <span style="font-size:10px; color:#576574;">(${t('Stufe')} ${curLevel}/${b.tiers.length})</span></div>
                        <div style="font-size:11px; color:#576574; margin-top:2px;">${t(b.desc)}</div>
                        <div style="font-size:10px; color:#1dd1a1; margin-top:2px;">✦ ${currentEffectText}</div>
                        <div style="font-size:10px; color:#576574; margin-top:1px;">${nextEffectText}</div>
                    </div>
                    <div>${btnHtml}</div>
                </div>
                <div style="margin-top:6px;">${dotsHtml}</div>
            </div>`;
    });
    html += `<div style="margin-top:10px; font-size:11px; color:#576574; text-align:center; padding:8px; background:rgba(0,0,0,0.04); border-radius:8px;">
        🌤️ ${t('Wolkendorf-Ausbau')}: <b>${totalLevels} / ${maxLevels}</b> ${t('Stufen')}<br>
        <span style="font-size:10px;">${t('villageFootnote')}</span>
    </div>`;
    document.getElementById('villageContent').innerHTML = '<div id="villageCity"></div>' + html;
    drawVillageCity();
    document.getElementById('villageModal').style.display = 'flex';
}

function buyVillageUpgrade(id) {
    let b = VILLAGE_BUILDINGS.find(x => x.id === id);
    if (!b) return;
    let curLevel = village[id] || 0;
    if (curLevel >= b.tiers.length) { playSound('lose'); return; }
    let tier = b.tiers[curLevel];
    if (tickets < tier.price) { playSound('lose'); return; }
    tickets -= tier.price;
    village[id] = curLevel + 1;
    safeSetItem('tama_village', JSON.stringify(village));
    safeSetItem('tama_tickets', tickets.toString());
    updateTicketDisplay();
    showAchievementBanner(b.icon, `${t(b.name)} ${t('Stufe')} ${curLevel + 1}!`, 'building');
    openVillageModal();
}

// ================================================================
// === FEATURE: POMODORO-FOKUS-MODUS ==============================
// ================================================================
let pomodoroActive = false;
let pomodoroStartTime = null;
let pomodoroInterval = null;
const POMODORO_DURATION = 25 * 60;
const POMODORO_KEY = 'tama_pomodoro';

// Der Timer läuft an der echten Uhr, nicht am Browser-Tab: wir merken uns nur
// den Startzeitpunkt. Damit läuft die Session weiter, auch wenn der Nutzer das
// Fenster schliesst oder den Rechner sperrt.
function savePomodoroState() {
    safeSetItem(POMODORO_KEY, JSON.stringify({ start: pomodoroStartTime }));
}
function clearPomodoroState() {
    try { localStorage.removeItem(POMODORO_KEY); } catch(e) {}
    try { delete memoryStorage[POMODORO_KEY]; } catch(e) {}
}

function openPomodoroModal() {
    if (!state.isStarted || pet.isDead || pet.isDeparted) {
        playSound('cancel'); playAnimation('🍅❌<br>' + t('Kein aktives Tama!'), 2000); return;
    }
    if (pomodoroActive) {
        document.getElementById('pomodoroOverlay').style.display = 'flex'; return;
    }
    if (confirm('🍅 Pomodoro-Fokus starten?\n\nDein Tamagotchi schläft 25 Minuten.\nLass es komplett in Ruhe → Belohnung!\nKlickst du vorher rein → Laune -20.\n\nDer Timer läuft weiter, auch wenn du das Fenster schliesst.\n\n"Ich gehe jetzt arbeiten! 💪"')) {
        startPomodoro();
    }
}

function startPomodoro(resumeStart) {
    pomodoroActive = true;
    pomodoroStartTime = resumeStart || Date.now();
    savePomodoroState();
    let overlay = document.getElementById('pomodoroOverlay');
    document.getElementById('pomodoroMsg').innerHTML = 'Ich schlafe und warte auf dich...<br>Arbeite 25 Minuten ohne mich anzuklicken! 💤';
    document.getElementById('pomodoroBtnRow').innerHTML = `<button class="onboard-btn btn-red" style="width:auto; padding:8px 20px;" onclick="interruptPomodoro()">❌ Abbrechen</button>`;
    overlay.style.display = 'flex';
    tickPomodoro(); // sofort die korrekte Restzeit anzeigen
    clearInterval(pomodoroInterval);
    pomodoroInterval = setInterval(tickPomodoro, 1000);
}

function tickPomodoro() {
    if (!pomodoroActive) { clearInterval(pomodoroInterval); return; }
    let elapsed = Math.floor((Date.now() - pomodoroStartTime) / 1000);
    let remaining = POMODORO_DURATION - elapsed;
    if (remaining <= 0) { finishPomodoro(); return; }
    let m = Math.floor(remaining / 60);
    let s = remaining % 60;
    let el = document.getElementById('pomodoroTimerDisplay');
    if (el) el.innerText = `${m}:${s.toString().padStart(2, '0')}`;
}

// Beim Laden prüfen, ob eine Session noch läuft oder in der Zwischenzeit fertig wurde
function restorePomodoro() {
    let raw = safeGetItem(POMODORO_KEY);
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch(e) { clearPomodoroState(); return; }
    if (!data || !data.start) { clearPomodoroState(); return; }

    let elapsed = Math.floor((Date.now() - data.start) / 1000);
    // Unsinnige Werte (z.B. verstellte Systemuhr) verwerfen
    if (elapsed < 0 || elapsed > 24 * 3600) { clearPomodoroState(); return; }

    if (elapsed >= POMODORO_DURATION) {
        // Session lief im Hintergrund durch – das Tamagotchi wurde in Ruhe gelassen!
        pomodoroActive = true;
        pomodoroStartTime = data.start;
        document.getElementById('pomodoroOverlay').style.display = 'flex';
        finishPomodoro(true);
    } else {
        startPomodoro(data.start); // nahtlos weiterlaufen lassen
    }
}

function interruptPomodoro() {
    if (!pomodoroActive) return;
    pomodoroActive = false;
    clearInterval(pomodoroInterval);
    clearPomodoroState();
    pet.happiness = Math.max(0, pet.happiness - 20);
    saveGame();
    document.getElementById('pomodoroOverlay').style.display = 'none';
    playSound('lose');
    playAnimation(getPetGraphicWithHat() + '<br>😤 Schon wieder gestört!<br>-20 Laune', 3000);
}

function finishPomodoro(wasAway) {
    pomodoroActive = false;
    clearInterval(pomodoroInterval);
    clearPomodoroState();
    let reward = 30;
    addCoins(reward);
    let gotT = addTickets(2);
    updateQuestProgress('pomodoro', 1);
    document.getElementById('pomodoroTimerDisplay').innerText = '0:00';
    let intro = wasAway
        ? `✅ <b>Willkommen zurück!</b><br>Deine Fokus-Session lief in der Zwischenzeit zu Ende.`
        : `✅ <b>Super gemacht!</b><br>25 Minuten Fokus-Arbeit abgeschlossen!`;
    document.getElementById('pomodoroMsg').innerHTML = `${intro}<br><br>🪙 +${reward} T-Coins &nbsp;&nbsp; 🎫 +${gotT} Tickets`;
    document.getElementById('pomodoroBtnRow').innerHTML = `<button class="onboard-btn btn-blue" style="width:auto; padding:8px 24px;" onclick="closePomodoroOverlay()">✅ Schließen</button>`;
    playSound('achievement');
    saveGame();
}

function closePomodoroOverlay() {
    document.getElementById('pomodoroOverlay').style.display = 'none';
    render();
}

// ================================================================
// === START LOGIK (original) =====================================
// ================================================================
