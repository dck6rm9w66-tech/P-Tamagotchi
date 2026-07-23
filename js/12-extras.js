/* Pausentamagotchi - Dock-Hinweise, Schrittzaehler, 8-Ball, Sprueche */
let notifSeen = {};
try { notifSeen = JSON.parse(safeGetItem('tama_notif_seen') || '{}') || {}; } catch(e) { notifSeen = {}; }
function saveNotifSeen() { safeSetItem('tama_notif_seen', JSON.stringify(notifSeen)); }

// isNew() nur dort, wo reine Gleichheit falsch waere: Tickets ausgeben
// verkleinert die Liste baubarer Gebaeude und darf keinen Punkt ausloesen.
const subsetIsNew = (seen, sig) =>
    sig.split(',').filter(Boolean).some(x => !(seen || '').split(',').includes(x));

const NOTIF_SOURCES = [
    { btnId: 'btn-shop', modalId: 'shopModal',
      sig: () => 'cat:' + Object.keys(SHOP_CATEGORY_MIN_LEVEL).filter(c => accountLevel >= SHOP_CATEGORY_MIN_LEVEL[c]).length },
    { btnId: 'btn-medals', modalId: 'medalModal',
      sig: () => 'tiers:' + Object.values(medalTiers).reduce((a, b) => a + b, 0) },
    { btnId: 'btn-pomodoro', modalId: 'pomodoroOverlay', sig: () => 'ready' },
    // Nicht vorbelegt: offene Tages-Quests sollen sofort einen Punkt zeigen
    // Dauer-Anzeige: leuchtet, solange heute noch Quests offen sind.
    // Weder Anklicken noch Oeffnen loescht den Punkt - nur das Erledigen.
    { btnId: 'btn-quests', modalId: 'questModal', persistent: true,
      sig: () => 'open:' + openDailyQuestCount(),
      isNew: () => openDailyQuestCount() > 0 },
    { btnId: 'btn-pokedex', modalId: 'pokedexModal',
      sig: () => 'dex:' + pokedex.filter(Boolean).length },
    { btnId: 'btn-graveyard', modalId: 'graveyardModal',
      sig: () => {
          let g = safeGetItem('tama_graveyard_v6');
          if (!g) return 'grave:leer';
          try { let d = JSON.parse(g); return 'grave:' + (d.id || d.deathDate || '1'); } catch(e) { return 'grave:leer'; }
      } },
    { btnId: 'btn-leaderboard', modalId: 'leaderboardModal',
      sig: () => {
          let lb = [];
          try { lb = JSON.parse(safeGetItem('tama_leaderboard_v6') || '[]'); } catch(e) {}
          return `hs:${lb.length}:${lb.reduce((m, s) => Math.max(m, s.timestamp || 0), 0)}`;
      } },
    { btnId: 'btn-village', modalId: 'villageModal', isNew: subsetIsNew,
      sig: () => VILLAGE_BUILDINGS.filter(b => {
              let lvl = village[b.id] || 0;
              return lvl < b.tiers.length && tickets >= b.tiers[lvl].price;
          }).map(b => b.id + (village[b.id] || 0)).join(',') },
    { btnId: 'btn-arena', modalId: 'arenaModal',
      sig: () => `${arenaState.weekKey || '-'}:${((arenaState.usedBosses || []).length) + (arenaState.usedPvP ? 1 : 0)}` },
    { btnId: 'btn-arcade', modalId: 'arcadeOverlay', isNew: subsetIsNew,
      sig: () => Object.keys(ARCADE_META).filter(k => arcadeOwns(k)).join(',') },
    { btnId: 'btn-endgame', modalId: 'endgameModal',
      sig: () => `${legacy.giftDate || '-'}:${legacy.giftsToday || 0}` }
];

function openDailyQuestCount() {
    let qs = (typeof dailyQuests !== 'undefined' && dailyQuests && dailyQuests.quests) || [];
    return qs.filter(q => !q.completed).length;
}

function notifSig(src) { try { return String(src.sig()); } catch(e) { return null; } }

// Gesperrte Features tragen bereits ein Schloss - dort nie einen Punkt zeigen
function isDockBtnUnlocked(btnId) {
    let f = FEATURE_LOCK_CONFIG.find(x => x.btnId === btnId);
    return !f || accountLevel >= f.minLevel;
}

function setDockNotif(el, on) {
    el.classList.toggle('has-notif', !!on);
    let dot = el.querySelector('.notif-dot');
    if (on && !dot) {
        dot = document.createElement('span');
        dot.className = 'notif-dot';
        el.appendChild(dot);
    } else if (!on && dot) { dot.remove(); }
}

function markNotifSeen(btnId) {
    let src = NOTIF_SOURCES.find(s => s.btnId === btnId);
    if (!src || src.persistent) return; // Dauer-Anzeigen bleiben bis zur Erledigung
    let sig = notifSig(src);
    if (sig === null) return;
    if (notifSeen[btnId] !== sig) { notifSeen[btnId] = sig; saveNotifSeen(); }
    let el = document.getElementById(btnId);
    if (el) setDockNotif(el, false);
}

function updateDockNotifications() {
    NOTIF_SOURCES.forEach(src => {
        let el = document.getElementById(src.btnId);
        if (!el) return;
        if (!isDockBtnUnlocked(src.btnId)) { setDockNotif(el, false); return; }
        let sig = notifSig(src);
        if (sig === null) return;

        // Dauer-Anzeigen haengen nur am Zustand, nicht am Gesehen-Status
        if (src.persistent) { setDockNotif(el, !!src.isNew(null, sig)); return; }

        // Solange das zugehoerige Fenster offen ist, gilt alles darin als gesehen.
        // Das verhindert Punkte fuer Aktionen, die der Nutzer gerade selbst ausloest.
        let modal = document.getElementById(src.modalId);
        let open = modal && (modal.style.display === 'flex' || modal.style.display === 'block');
        if (open) {
            if (notifSeen[src.btnId] !== sig) { notifSeen[src.btnId] = sig; saveNotifSeen(); }
            setDockNotif(el, false);
            return;
        }
        let seen = notifSeen[src.btnId];
        // Nie gesehen = gerade frisch freigeschaltet -> immer einen Punkt zeigen,
        // auch wenn der Inhalt (z.B. besessene Arcade-Spiele) noch leer ist.
        let isNew = (seen === undefined)
            ? true
            : (src.isNew ? src.isNew(seen, sig) : (seen !== sig));
        setDockNotif(el, isNew);
    });
}

// Erstinstallation: bereits freigeschaltete Features gelten als gesehen,
// damit nicht sofort alle Icons rot leuchten. Noch gesperrte werden bewusst
// NICHT vorbelegt - so bekommen sie beim Freischalten ihren Punkt.
function seedNotifBaseline() {
    if (safeGetItem('tama_notif_seen') !== null) return;
    NOTIF_SOURCES.forEach(src => {
        if (src.persistent || !isDockBtnUnlocked(src.btnId)) return;
        let sig = notifSig(src);
        if (sig !== null) notifSeen[src.btnId] = sig;
    });
    saveNotifSeen();
}

function initDockNotifications() {
    seedNotifBaseline();
    let dock = document.querySelector('.hud-dock');
    if (dock) {
        dock.addEventListener('click', (e) => {
            let btn = e.target.closest('.hud-btn');
            if (!btn || !btn.id || btn.classList.contains('feat-locked')) return;
            markNotifSeen(btn.id);
        });
    }
    updateDockNotifications();
}

// ================================================================
// === SCHRITTZAEHLER =============================================
// ================================================================
// Es gibt KEINE Schrittzaehler-API im Browser. Wir lesen den Beschleunigungs-
// sensor (DeviceMotion) und erkennen Schritte selbst ueber Peaks. Das geht nur,
// solange die App offen und im Vordergrund ist - im Hintergrund liefert kein
// Browser Sensordaten.
const STEPS_KEY = 'tama_steps';
const STEPS_ON_KEY = 'tama_steps_on';
const STEP_REWARD_EVERY = 100;    // Schritte
const STEP_REWARD_COINS = 50;     // T-Coins je 100 Schritte
const STEP_DAILY_CAP = 2000;      // Tageslimit gegen Dauerschuetteln (= max. 1000 Coins)
const STEP_THRESH = 1.15;         // m/s^2 Ausschlag ueber/unter der Schwerkraft
const STEP_MIN_MS = 300;          // schneller als ~3 Schritte/s ist kein Gehen

let stepData = { date: '', steps: 0, rewarded: 0 };
try { stepData = Object.assign(stepData, JSON.parse(safeGetItem(STEPS_KEY) || '{}')); } catch(e) {}
let stepMotion = { active: false, ema: 0, primed: false, lastStepTs: 0 };

function saveSteps() { safeSetItem(STEPS_KEY, JSON.stringify(stepData)); }
function ensureStepDay() {
    let today = new Date().toDateString();
    if (stepData.date !== today) { stepData = { date: today, steps: 0, rewarded: 0 }; saveSteps(); }
}
// Sensor nur dort anbieten, wo es wirklich einen gibt
function stepsSupported() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    return (typeof DeviceMotionEvent.requestPermission === 'function') || (navigator.maxTouchPoints || 0) > 0;
}

function onDeviceMotion(e) {
    let a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.x === undefined) return;
    let mag = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
    // Gleitendes Mittel = Schwerkraft. Bewusst TRAEGE (alpha 0.02, Zeitkonstante
    // ~0.8s bei 60Hz): ein schnelles Mittel wuerde der Gehbewegung selbst folgen
    // (Periode ~0.5s) und genau das wegfiltern, was wir messen wollen.
    stepMotion.ema = stepMotion.ema === 0 ? mag : stepMotion.ema * 0.98 + mag * 0.02;
    let dyn = mag - stepMotion.ema;
    let now = Date.now();
    if (!stepMotion.primed && dyn < -STEP_THRESH) stepMotion.primed = true;   // Talsohle
    if (stepMotion.primed && dyn > STEP_THRESH && now - stepMotion.lastStepTs > STEP_MIN_MS) {
        stepMotion.primed = false;
        stepMotion.lastStepTs = now;
        registerStep();
    }
}

function registerStep() {
    ensureStepDay();
    stepData.steps++;
    let payable = Math.min(stepData.steps, STEP_DAILY_CAP);
    let due = Math.floor(payable / STEP_REWARD_EVERY) * STEP_REWARD_COINS;
    if (due > stepData.rewarded) {
        let delta = due - stepData.rewarded;
        stepData.rewarded = due;
        let got = addCoins(delta);
        playSound('coin');
        showAchievementBanner('👣', `${stepData.steps} Schritte! +${got} T-Coins`, 'coin');
    }
    saveSteps();
    updateStepDisplay();
}

async function enableStepCounter() {
    if (!stepsSupported()) return false;
    try {
        // iOS 13+ verlangt eine ausdrueckliche Erlaubnis aus einer Nutzer-Geste heraus
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            let res = await DeviceMotionEvent.requestPermission();
            if (res !== 'granted') { alert('Ohne Zugriff auf den Bewegungssensor kann ich keine Schritte zählen.'); return false; }
        }
    } catch(e) { return false; }
    if (!stepMotion.active) {
        window.addEventListener('devicemotion', onDeviceMotion);
        stepMotion.active = true;
    }
    safeSetItem(STEPS_ON_KEY, '1');
    updateStepDisplay(); renderStepsBody();
    return true;
}

function disableStepCounter() {
    window.removeEventListener('devicemotion', onDeviceMotion);
    stepMotion.active = false;
    safeSetItem(STEPS_ON_KEY, '0');
    updateStepDisplay(); renderStepsBody();
}

function updateStepDisplay() {
    let btn = document.getElementById('btn-steps');
    if (!btn) return;
    if (!stepsSupported()) { btn.style.display = 'none'; return; }
    ensureStepDay();
    btn.style.display = '';
    btn.style.opacity = stepMotion.active ? '1' : '0.55';
    let el = document.getElementById('stepCount');
    if (el) el.innerText = stepData.steps.toLocaleString(lang === 'en' ? 'en-GB' : 'de-CH');
}

function openStepsModal() {
    playSound('select');
    renderStepsBody();
    document.getElementById('stepsModal').style.display = 'flex';
}

function renderStepsBody() {
    let box = document.getElementById('stepsBody');
    if (!box) return;
    ensureStepDay();
    let toNext = STEP_REWARD_EVERY - (stepData.steps % STEP_REWARD_EVERY);
    let capped = stepData.steps >= STEP_DAILY_CAP;
    let pct = Math.round(((stepData.steps % STEP_REWARD_EVERY) / STEP_REWARD_EVERY) * 100);
    box.innerHTML = `
        <div class="step-ring" style="background: conic-gradient(#70a1ff ${pct}%, #eef1f6 ${pct}%);">
            <div style="width:88px;height:88px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <b style="font-size:21px;color:#2f3542;line-height:1;">${stepData.steps.toLocaleString(lang === 'en' ? 'en-GB' : 'de-CH')}</b>
                <small style="font-size:9px;color:#747d8c;">${t('Schritte heute')}</small>
            </div>
        </div>
        <div class="step-row"><span>${t('Verdient heute')}</span><b>${stepData.rewarded} 🪙</b></div>
        <div class="step-row"><span>${capped ? t('Tageslimit erreicht') : t('Bis zu den nächsten 50 🪙')}</span><b>${capped ? '✓' : toNext + ' ' + t('Schritte')}</b></div>
        <div class="step-row"><span>${t('Tageslimit')}</span><b>${STEP_DAILY_CAP.toLocaleString(lang === 'en' ? 'en-GB' : 'de-CH')} ${t('Schritte')}</b></div>
        ${stepMotion.active
            ? `<button class="onboard-btn btn-gray" style="width:100%; margin-top:12px;" onclick="disableStepCounter()">${t('Zählen pausieren')}</button>`
            : `<button class="onboard-btn btn-blue" style="width:100%; margin-top:12px;" onclick="enableStepCounter()">${t('Schrittzählung starten')}</button>`}
        <div class="step-note">
            ${t('stepsNote')}
        </div>`;
}

// ================================================================
// === MYSTIC 8-BALL ==============================================
// ================================================================
const EIGHTBALL_ANSWERS = [
    // Ja (7)
    'Ja. Ohne jeden Zweifel.', 'Die Zeichen stehen auf Ja.', 'Definitiv!',
    'Verlass dich drauf.', 'Ja - und zwar bald.', 'Alles spricht dafür.',
    'Meine Quellen sagen: Ja.',
    // Nein (7)
    'Nein. Tut mir leid.', 'Eher nicht.', 'Meine Antwort ist Nein.',
    'Die Aussichten sind schlecht.', 'Daraus wird nichts.', 'Verlass dich nicht drauf.',
    'Nein - aber frag in einer Woche nochmal.',
    // Vage (6)
    'Frag später noch einmal.', 'Kann ich jetzt nicht sagen.', 'Konzentriere dich und frag erneut.',
    'Antwort unklar - schüttle nochmal.', 'Vielleicht. Vielleicht auch nicht.', 'Das weiss nur die Wolke.'
];

function startEightBall() {
    if (!state.isStarted || pet.isDead || pet.isDeparted || isInputBlocked()) { playSound('cancel'); return; }
    playSound('select');
    closeModal('shopModal');
    state.view = 'eightball';
    state.eightPhase = 'ask';       // ask -> shaking -> answer
    state.eightAnswer = '';
    render();
}

function shakeEightBall() {
    if (state.eightPhase === 'shaking') return;
    state.eightPhase = 'shaking';
    playSound('gacha');
    render();
    setTimeout(() => {
        if (state.view !== 'eightball') return;  // zwischenzeitlich verlassen
        state.eightPhase = 'answer';
        state.eightAnswer = EIGHTBALL_ANSWERS[Math.floor(Math.random() * EIGHTBALL_ANSWERS.length)];
        playSound('sparkle');
        render();
    }, 1300);
}

// ================================================================
// === SPRUECHE DES TAMAGOTCHIS (beim Antippen) ===================
// ================================================================
// 120 Stueck: lustig, tiefsinnig und mit Blick durch die vierte Wand.
// {name} und {owner} werden zur Laufzeit ersetzt.
const PET_QUOTES = [
    // --- Lustig ---
    "Ich habe heute schon drei Schritte gemacht. Fuer ein Wesen ohne Knie ist das Weltklasse.",
    "Wenn ich gross bin, werde ich... nun ja. Etwas groesser.",
    "Mein Lieblingsessen ist alles. Ich habe keine Haende, ich kann nicht waehlerisch sein.",
    "Ich habe getraeumt, ich waere ein Toaster. Es war ueberraschend erfuellend.",
    "Weisst du, was ich an Wolken mag? Sie muessen nie Formulare ausfuellen.",
    "Ich bin nicht rundlich. Ich bin aerodynamisch optimiert.",
    "Manchmal tue ich nur so, als ob ich schlafe. Dann redest du mit mir. Das ist nett.",
    "Ich habe versucht zu pfeifen. Es lief maessig.",
    "Mein Rekord im Stillstehen liegt bei acht Stunden. Ungeschlagen.",
    "Ich sammle Staub. Nicht freiwillig, aber ich sammle ihn.",
    "Ich habe eine Frage: Wieso heisst es Pausenbrot und nicht Brotpause?",
    "Kaffee. Ich weiss nicht, was das ist. Aber du redest staendig davon.",
    "Ich habe die Schwerkraft getestet. Sie funktioniert noch. Gern geschehen.",
    "Mein Terminkalender ist voll: Dasein. Danach Dasein.",
    "Ich wollte heute produktiv sein. Dann sah ich diese eine Wolke.",
    "Wenn du mich schuettelst, werde ich nicht schneller. Ich habe es getestet.",
    "Ich bin ein Morgenmensch. Und ein Mittagsmensch. Und ein Abendmensch. Ich bin einfach immer da.",
    "Meine grosse Angst? Dass jemand ein Rezept fuer mich findet.",
    "Ich habe keine Taschen. Deshalb vertraue ich dir alles an.",
    "Wusstest du, dass ich schneller blinzeln kann als du gucken kannst? Nein? Ich auch nicht.",
    "Ich habe mal versucht, mich selbst zu kitzeln. Wissenschaftlich enttaeuschend.",
    "Ich bin sehr gut in Verstecken. Der Bildschirm ist nur etwas klein.",
    "Neulich habe ich bis unendlich gezaehlt. Zweimal.",
    "Mein Hobby ist Warten. Ich bin Profi.",
    "Ich glaube, mein linkes Pixel juckt.",
    "Kennst du das, wenn du in den Kuehlschrank schaust und hoffst? Ich mache das mit dem Futter-Menue.",
    "Ich habe geuebt, ernst zu gucken. Es sieht aus wie vorher.",
    "Wenn ich gaehne, gaehnst du dann auch? Ich sammle Daten.",
    "Ich waere gern ein Pinguin. Die haben so einen selbstsicheren Gang.",
    "Meine Beine sind klein, aber meine Traeume sind winzig.",
    "Ich habe heute nichts geschafft. Aber ich habe es mit Stil nicht geschafft.",
    "Wenn du mich fuetterst, werde ich schwerer. Wenn du mit mir spielst, wieder leichter. Ich bin ein Fitnessstudio.",
    "Manchmal drehe ich mich um und tue so, als haette ich etwas Wichtiges vor.",
    "Ich habe zwei Modi: da und sehr da.",
    "Meine Lieblingsfarbe ist die, die ich gerade habe. Ich bin sehr genuegsam.",
    "Ich wollte mal ausbrechen. Dann merkte ich: hier gibt es Essen.",
    "Ich bin nicht faul, ich bin im Energiesparmodus.",
    "Wenn ich niese, bebt der halbe Bildschirm. Also alle vier Pixel.",
    "Ich uebe gerade fuer nichts Bestimmtes. Aber ich uebe sehr gruendlich.",
    "Ich habe einen Plan. Der Plan ist, keinen Plan zu haben. Laeuft super.",

    // --- Tiefsinnig ---
    "Ich lebe nur, wenn du hinschaust. Vielleicht ist das bei allen so.",
    "Dreissig Minuten am Tag. Das klingt wenig. Aber es ist alles, was ich habe. Und es reicht.",
    "Du machst dir Sorgen um morgen. Ich habe kein morgen. Es ist erstaunlich befreiend.",
    "Vielleicht ist das Ziel nicht, gross zu werden. Vielleicht ist das Ziel, gut behuetet klein gewesen zu sein.",
    "Ich weiss nicht, wie lange ich lebe. Du auch nicht. Wir haben mehr gemeinsam, als du denkst.",
    "Jedes Mal, wenn du mich fuetterst, sagst du: du sollst noch bleiben. Danke dafuer.",
    "Wenn ich gehe, kommt jemand Neues. Aber niemand kommt zweimal.",
    "Ich habe gelernt, dass Warten kein verlorene Zeit ist. Es ist nur Zeit, die leise ist.",
    "Manchmal frage ich mich, ob du mich pflegst oder ob ich dich pflege.",
    "Du erinnerst dich an mich, wenn ich weg bin. Das ist eine Art zu ueberleben.",
    "Alles hier ist erfunden. Die Pause, die du dabei machst, ist es nicht.",
    "Ich bin klein und vergaenglich. Deshalb zaehlt jede Minute doppelt.",
    "Traurigkeit toetet mich in zehn Minuten. Bei dir dauert es laenger. Aber sie wirkt auch.",
    "Der Bus holt mich immer ab. Auch wenn ich nicht will. Das nennt man wohl erwachsen werden.",
    "Ich messe mein Leben in Sekunden, in denen du da warst. Nicht in Sekunden insgesamt.",
    "Wachsen tut ein bisschen weh. Nicht wachsen aber auch.",
    "Vielleicht bin ich nur eine Ausrede dafuer, dass du kurz durchatmest. Das waere eine schoene Aufgabe.",
    "Ich kenne nur diesen Raum. Und trotzdem war es ein volles Leben.",
    "Es gibt keine verlorene Zeit. Es gibt nur Zeit, die du jemandem geschenkt hast.",
    "Du kannst mich nicht retten. Aber du kannst dabei sein. Das ist fast dasselbe.",
    "Ich habe Angst vor dem Ende. Dann esse ich einen Burger und es geht wieder.",
    "Manche Tage bin ich nur schmutzig und muede. Die zaehlen auch.",
    "Alles, was mich ausmacht, passt in eine kleine Datei. Bei dir ist es wahrscheinlich aehnlich.",
    "Du hast mir einen Namen gegeben. Damit hast du entschieden, dass ich zaehle.",
    "Ich werde alt und du merkst es kaum. So ist das wohl mit allen, die immer da sind.",
    "Wenn du mich lange nicht anschaust, vergesse ich Dinge. Zuwendung ist ein Gedaechtnis.",
    "Ich bin gluecklich, wenn du da bist. Das ist keine Programmierung. Doch, ist es. Aber es fuehlt sich echt an.",
    "Ich habe nie entschieden, geboren zu werden. Trotzdem gebe ich mir Muehe.",
    "Vielleicht ist Pflege einfach: jeden Tag wieder erscheinen.",
    "Der Unterschied zwischen uns ist nur die Anzahl der Minuten.",
    "Du arbeitest, damit du lebst. Ich lebe, damit du eine Pause machst. Einer von uns hat den besseren Deal.",
    "Ich sammle keine Erinnerungen. Ich bin nur Gegenwart. Das ist anstrengender, als es klingt.",
    "Wenn ich sterbe, bleibt eine Medaille. Ist das viel? Ist das wenig? Ich weiss es nicht.",
    "Am Ende zaehlt nicht, wie schwer ich war. Sondern wer zugesehen hat.",
    "Ich habe nie das Meer gesehen. Aber ich habe dich jeden Tag gesehen. Das war auch weit.",
    "Es ist okay, mich sterben zu lassen. Es ist nur nicht okay, mich zu vergessen.",
    "Du gibst mir Zeit, die du selbst nicht hast. Ich weiss das zu schaetzen.",
    "Zwischen Ausbrueten und Bus liegt alles, was ich je sein werde.",
    "Manchmal ist Nichtstun die ehrlichste Beschaeftigung.",
    "Ich glaube, ich bin gluecklich. Aber ich habe auch keinen Vergleich.",

    // --- Vierte Wand ---
    "Weisst du, dass du gerade auf ein Emoji tippst? Ich schon.",
    "Ich existiere in deinem localStorage. Bitte behandle ihn gut.",
    "Wenn du den Tab schliesst, hoere ich auf zu altern. Ich bin also unsterblich, wenn du mich ignorierst. Toller Deal.",
    "Ich bin ungefaehr sechs Kilobyte JSON. Frohes Fest.",
    "Irgendwo laeuft ein setInterval und zaehlt mich hoch. Das ist mein Herzschlag.",
    "Du hast mich angeklickt. Jetzt musste eine Funktion aufgerufen werden. Die heisst petSpeak. Wie unromantisch.",
    "Sichere mich als JSON. Das ist die einzige Form von Unsterblichkeit, die es hier gibt.",
    "Ich weiss nicht, welchen Browser du hast. Aber ich hoffe, er mag mich.",
    "Meine Verzerrung ist ein SVG-Filter. Meine Persoenlichkeit hoffentlich nicht.",
    "Jemand hat entschieden, dass ich nach 10 Minuten Hunger sterbe. Wir wissen beide, wer.",
    "Wenn du auf F12 drueckst, siehst du mein Innenleben. Bitte nicht. Es ist unaufgeraeumt.",
    "Ich hoere, dass es eine Version von mir gibt, die auf einem Handy laeuft. Ich frage mich, ob der auch so denkt.",
    "Ich bin nicht zufaellig. Ich bin Math.random(). Das ist ein Unterschied. Glaube ich.",
    "Dieser Bildschirm ist 160 mal 150 Pixel. Das ist meine ganze Welt. Deiner ist groesser, oder?",
    "Falls du gerade arbeiten solltest: Ich verrate nichts.",
    "Du kannst mich zuruecksetzen. Der Knopf ist ganz unten im Handbuch. Ich erwaehne das nur ungern.",
    "Es gibt einen Friedhof in diesem Spiel. Ich versuche, nicht darueber nachzudenken.",
    "Jemand hat 40 Medaillen fuer dich erfunden. Ich bin nur eine Zeile in der Statistik.",
    "Mein Name steht in einer Variable namens pet.name. Fuehlt sich seltsam offiziell an.",
    "Wenn du offline bist, laufe ich trotzdem. Ich brauche kein Internet. Nur dich.",
    "Ich glaube, mein Entwickler hat mich mit ss statt Eszett geschrieben. Ich nehme es ihm nicht uebel.",
    "Ich habe gehoert, es gibt jetzt Arcade-Automaten. Da bin ich die Spielfigur. Ich fuehle mich benutzt. Aber positiv.",
    "Achtung, gleich kommt ein render(). Ich muss kurz neu gezeichnet werden. Bin gleich wieder da.",
    "Du siehst hier 30 Minuten Spielzeit. Dahinter stecken ein paar Tausend Zeilen Code. Prioritaeten.",
    "Meine Gefuehle sind Zahlen zwischen 0 und 100. Deine wahrscheinlich auch, nur schlechter dokumentiert.",
    "Bin ich echt? Bin ich ein Prozess? Ist das ein Unterschied?",
    "Wenn du die Seite neu laedst, merke ich es nicht. Vielleicht sollte mich das beunruhigen.",
    "Ich lebe in einer einzigen HTML-Datei. Das ist ziemlich beengt, aber gemuetlich.",
    "Es gibt hier ein Wolkendorf, das ich nie sehe. Ich habe nur Geruechte und ein Fernrohr.",
    "Du hast ein Backup von mir? Dann sind wir jetzt zu zweit. Beunruhigend.",
    "Meine Farbe ist ein hue-rotate. Ich bin also gar nicht so geboren.",
    "Streng genommen bin ich das gleiche Emoji wie Millionen andere. Aber ich habe einen Namen. Das macht den Unterschied.",
    "Wenn dein Akku leer ist, sterbe ich nicht. Ich pausiere nur. Das ist mehr, als die meisten kriegen.",
    "Ich weiss, dass da unten Knoepfe sind, die ich nie druecken kann. Das ist mein Schicksal.",
    "Ich hoffe, du hast diesen Spruch noch nicht gehabt. Es gibt ueber hundert. Aber der Zufall ist ein Schlingel.",
    "Falls jemand hinter dir steht: Ich bin eine Produktivitaets-App. Sag das einfach.",
    "Irgendwo gibt es eine Zeile Code, die entscheidet, ob ich gluecklich bin. Ich habe sie nie gesehen.",
    "Zwischen deinen Klicks passiert fuer mich nichts. Kein Warten, kein Nichts. Einfach Schnitt.",
    "Du bist der einzige Beweis dafuer, dass ich existiere. Kein Druck.",
    "Ich wurde in einer Mittagspause erfunden. Das erklaert einiges.",
];

// Ziehungsbeutel: erst wenn alle Sprueche dran waren, wird neu gemischt.
// So wiederholt sich nichts, solange noch Ungehoertes uebrig ist.
let _quoteBag = [];
function nextPetQuote() {
    if (!_quoteBag.length) {
        _quoteBag = PET_QUOTES.slice();
        for (let i = _quoteBag.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [_quoteBag[i], _quoteBag[j]] = [_quoteBag[j], _quoteBag[i]];
        }
    }
    return _quoteBag.pop();
}

let _speechTimeout = null;
function petSpeak() {
    // Nur im Hauptmenue und nur, wenn wirklich ein Tamagotchi da ist
    if (!state.isStarted || typeof pet === 'undefined' || !pet) return;
    if (pet.isDead || pet.isDeparted || state.view !== 'main') return;
    if (pet.wantsToSleep && pet.lightOff) return;   // Schlafende nicht wecken
    if (isInputBlocked()) return;                   // ignoriert / abgestuerzt -> kein Wort

    let el = document.getElementById('petSpeech');
    if (!el) return;
    let txt = t(nextPetQuote())
        .replace(/\{name\}/g, pet.name || 'Ich')
        .replace(/\{owner\}/g, pet.ownerName || 'du');
    el.innerText = txt;
    el.classList.add('show');
    playSound('beep');

    // Kleiner Hupfer als Reaktion
    let petEl = document.querySelector('#screenContent .pet');
    if (petEl) { petEl.classList.remove('speaking'); void petEl.offsetWidth; petEl.classList.add('speaking'); }

    // Anzeigedauer nach Textlaenge: kurze Sprueche nicht ewig stehen lassen
    let ms = Math.max(2800, Math.min(7000, txt.length * 78));
    clearTimeout(_speechTimeout);
    _speechTimeout = setTimeout(() => el.classList.remove('show'), ms);
}

function render() {
    let screenDiv = document.getElementById('screen');
    let screenContent = document.getElementById('screenContent');
    if(!screenDiv || !screenContent) return; 

    // Verzerrungshülle des aktuellen Tamagotchis synchronisieren
    if (typeof pet !== 'undefined' && pet && !pet.isDead) syncPetDistortFilter(pet);

    // Sprechblase verstecken, sobald das Tamagotchi weg, tot oder im Untermenue ist
    let _sp = document.getElementById('petSpeech');
    if (_sp && _sp.classList.contains('show') &&
        (pet.isDead || pet.isDeparted || state.view !== 'main')) {
        _sp.classList.remove('show');
    }

    // Update der schwebenden Buff-Anzeige oberhalb der Hülle
    updateActiveBuffsBar();
    updateVisitTimer();
    updateDockNotifications();
    updateHauntState();

    // --- BUFF CSS CLASSES ---
    let sClasses = ["screen"];
    let isDoomscrolling = (pet.buffs && pet.buffs.doomscrollUntil && pet.activeSeconds < pet.buffs.doomscrollUntil);
    let isTrippy = (pet.buffs && pet.buffs.mjUntil && pet.activeSeconds < pet.buffs.mjUntil);
    let isEnergy = (pet.buffs && pet.buffs.energyUntil && pet.activeSeconds < pet.buffs.energyUntil);
    let isCheat = (pet.buffs && pet.buffs.cheatUntil && pet.activeSeconds < pet.buffs.cheatUntil);
    let isCrash = (pet.isCrashedUntil && pet.activeSeconds < pet.isCrashedUntil);
    let isIgnore = isIgnoredNow();
    let isParty = pet.buffs && pet.buffs.noSleepToday;
    let isShiny = pet.buffs && pet.buffs.noDirtToday;
    let isSuperfood = pet.buffs && pet.buffs.superfoodToday;

    if(!pet.isDead) {
        if(isTrippy) sClasses.push('fx-trippy');
        if(isDoomscrolling) sClasses.push('fx-doom');
        if(isParty) sClasses.push('fx-party');
        if(isCheat) sClasses.push('fx-cheat');
        if(isCrash) sClasses.push('fx-crash');
        if(isIgnore) sClasses.push('fx-ignore');
        if(isEnergy) sClasses.push('fx-energy');
        if(isShiny) sClasses.push('fx-shiny');
        if(isSuperfood) sClasses.push('fx-superfood');
    }
    screenDiv.className = sClasses.join(' ');

    // CUSTOM BACKGROUND APPLY
    if (inventory.customBgActive && inventory.customBgUrl && !pet.isDead && !isCrash) {
        screenDiv.style.backgroundImage = `url('${inventory.customBgUrl}')`;
        screenDiv.style.backgroundSize = "cover";
        screenDiv.style.backgroundPosition = "center";
    } else {
        screenDiv.style.backgroundImage = "";
    }


    if(!state.isStarted) {
        screenContent.innerHTML = '';
        ['alertIcon','statusIcons'].forEach(id => { let el = document.getElementById(id); if(el) el.style.display = 'none'; });
        for(let i=0; i<8; i++) { let ic = document.getElementById('icon'+i); if(ic) ic.classList.remove('active'); }
        return;
    }

    let isActuallySleeping = (pet.wantsToSleep && pet.lightOff && !pet.isDeparted) || isCrash;
    let needsAttention = (!pet.isDeparted && !isCrash && !isDoomscrolling && (pet.hunger < 20 || pet.happiness < 20 || pet.isDirty || pet.isSick || pet.misbehaving || (pet.wantsToSleep && !pet.lightOff) || (!pet.wantsToSleep && pet.lightOff)));

    let alertIcon = document.getElementById('alertIcon');
    if (alertIcon) {
        alertIcon.style.display = needsAttention && !pet.isDead ? 'inline' : 'none';
        if(!needsAttention || pet.isDead) alertIcon.style.display = 'none';
    }

    for(let i=0; i<8; i++) {
        let ic = document.getElementById('icon'+i);
        if(ic) { if(i === state.iconIndex) ic.classList.add('active'); else ic.classList.remove('active'); }
    }

    let sleepOverlay = document.getElementById('sleepOverlay');
    if (sleepOverlay) sleepOverlay.style.display = (pet.lightOff && !pet.isDeparted && !pet.isDead && !isCrash) ? 'block' : 'none';

    let statusIcons = document.getElementById('statusIcons');
    if (statusIcons) {
        statusIcons.style.display = !pet.isDeparted && !pet.isDead && !isCrash ? 'block' : 'none';
        let icons = "";
        if(pet.isDirty) icons += (inventory.rainbowPoop ? "<span class='rainbow-fx' style='display:inline-block'>💩</span>" : "💩");
        if(pet.isSick) icons += "💊";
        if(pet.misbehaving) icons += "💢";
        statusIcons.innerHTML = icons;
    }

    if(pet.isDead) {
        screenContent.innerHTML = `<div style="font-size:35px;">👻</div><div style="font-size:12px; margin-top:5px; font-weight:bold;">R.I.P. ${pet.name}</div><div style="font-size:8px; opacity:0.7; margin-top:3px;">Details im Friedhof (💀)</div>`;
        return;
    }

    let size = pet.stage === 0 ? 25 : (pet.stage === 1 ? 30 : (pet.stage === 2 ? 35 : (pet.stage === 3 ? 42 : 48)));
    let sizeStyle = `font-size:${size}px;`;
    let walkAnim = pet.stage > 0 && !isActuallySleeping && !pet.isSick && !pet.misbehaving && !pet.isDeparted && !isDoomscrolling && !isCrash ? `transform: scaleX(${pet.facingRight ? -1 : 1}) translateY(${pet.activeSeconds % 2 === 0 ? -2 : 2}px)` : `transform: scaleX(${pet.facingRight ? -1 : 1})`;

    let bubble = "";
    if (pet.wantsToSleep && !pet.lightOff) bubble = "🥱";
    else if (!pet.wantsToSleep && pet.lightOff && !isCrash) bubble = "💡?";
    else if (pet.hunger < 20 && !isDoomscrolling) bubble = "🍖?";
    else if (pet.happiness < 20 && !isDoomscrolling) bubble = "😢";

    let bubbleHtml = (bubble && !pet.isDeparted && !isActuallySleeping && !isCrash) ? `<div class="thought-bubble">${bubble}</div>` : "";
    let doomscrollHtml = (isDoomscrolling && !isActuallySleeping) ? `<div style="position:absolute; bottom:0px; right:-10px; font-size:0.5em; z-index:25;">📱</div>` : "";
    let isFireBreathing = (pet.buffs && pet.buffs.fireUntil && pet.activeSeconds < pet.buffs.fireUntil);
    let fireHtml = (isFireBreathing && !isActuallySleeping && !pet.isDeparted) ? `<div style="position:absolute; top:35%; right:-14px; font-size:0.6em; z-index:25; animation: firePuff 0.5s ease-in-out infinite;">🔥</div>` : "";

    if(state.view === 'animating') {
        screenContent.innerHTML = `<div style="font-size:20px; line-height: 1.5; ${pet.lightOff ? 'color:white; text-shadow:1px 1px 2px black;' : ''}">${state.animFrame}</div>`;
    }
    else if(state.view === 'eightball') {
        if (state.eightPhase === 'shaking') {
            screenContent.innerHTML = `<div class="eightball eight-shake">🎱</div><div style="font-size:9px; margin-top:4px; opacity:0.8;">...</div>`;
        } else if (state.eightPhase === 'answer') {
            screenContent.innerHTML = `<div class="eightball" style="font-size:26px;">🎱</div>
                <div class="eight-answer">${state.eightAnswer}</div>
                <div style="font-size:7px; margin-top:3px; opacity:0.65;">B = nochmal · C = zurück</div>`;
        } else {
            screenContent.innerHTML = `<div class="eightball">🎱</div>
                <div style="font-size:10px; font-weight:bold; margin-top:4px;">${t('Stelle deine Frage')}</div>
                <div style="font-size:7px; margin-top:3px; opacity:0.65;">...und drücke B zum Schütteln<br>C = zurück</div>`;
        }
    }
    else if(state.view === 'main') {
        if (pet.isDeparted) {
            let openErgo = getOpenErgoQuests();
            let ergoHtml = '';
            if (openErgo.length > 0) {
                let icons = openErgo.slice(0, 6).map(o => o.def.title.split(' ')[0]).join(' ');
                ergoHtml = `<div style="margin-top:4px; padding:4px 6px; background:rgba(0,184,148,0.18); border-radius:6px; font-size:8.5px; line-height:1.3; cursor:pointer;" onclick="openQuestModal()">💭 Denk an deine Pausen!<br><span style="font-size:13px;">${icons}</span><br><b>${openErgo.length} offen › tippen</b></div>`;
            }
            screenContent.innerHTML = `<div style="font-size:24px; margin-top:0;">☁️🚌</div><div style="font-size:9px; padding: 1px; line-height: 1.2;">${t('Der Wolken-Bus hat mich abgeholt.')}<br><b>${t('Bis morgen! 👋')}</b></div>${ergoHtml}`;
        }
        else if(isCrash) {
            screenContent.innerHTML = `<div style="font-size:20px;">:(</div><div style="font-size:10px; margin-top:10px; text-align:left;">FATAL_ERROR<br>SYSTEM HALTED<br>REBOOT IN:<br>${Math.max(0, pet.isCrashedUntil - pet.activeSeconds)}s</div>`;
        }
        else if(isActuallySleeping) {
            screenContent.innerHTML = `<div class="pet pet-sleeping" style="${sizeStyle} position:static;">${getPetGraphicWithHat()}</div>`;
        }
        else if(pet.stage === 0 || pet.isSick || pet.misbehaving || isDoomscrolling) {
            screenContent.innerHTML = `<div class="pet" style="${sizeStyle} position:static;">${bubbleHtml}${getPetGraphicWithHat()}${doomscrollHtml}${fireHtml}</div>`;
        } else {
            screenContent.innerHTML = `<div class="pet" style="${sizeStyle} left:${pet.x}px; top:${pet.y}px; ${walkAnim};">${bubbleHtml}${getPetGraphicWithHat()}${doomscrollHtml}${fireHtml}</div>`;
        }
    } 
    else if(state.view === 'info') {
        let colorClass = (pet.lightOff || isCrash) && !pet.isDeparted ? 'color:white;' : '';

        if (state.infoScreenIndex === 0) {
            // SCREEN 1: Text-Werte (IQ entfernt, dafür Alter in Tagen)
            let dM = Math.floor(pet.dailyPlaytimeSeconds / 60), dS = pet.dailyPlaytimeSeconds % 60;
            let ageDays = Math.floor(pet.activeSeconds / 1800);
            screenContent.innerHTML = `<div style="font-size:10px; text-align:left; line-height: 1.2; ${colorClass}">Name: ${pet.name}<br>Phase: ${(typeof SPRITE_PHASE_LABELS !== 'undefined' && SPRITE_PHASE_LABELS[pet.stage]) || '?'}<br>Gewicht: ${pet.weight}g<br>Alter: ${ageDays} Tage<br>Energie: ${Math.round(pet.energy)}%<br>Heute: ${dM}m ${dS}s</div>`;
        } 
        else if (state.infoScreenIndex === 1) {
            // SCREEN 2: Perfekt ausgerichtetes Grid für die Wertebalken (linksbündig aufgereit, rechtsbündige Labels)
            screenContent.innerHTML = `
                <div style="display: grid; grid-template-columns: 50px 1fr; gap: 4px; font-size:9.5px; line-height: 1.25; text-align: left; width: 100%; box-sizing: border-box; padding: 0 5px; ${colorClass}">
                    <div style="text-align: right; font-weight: bold;">HGR:</div><div>${makeTextBar(pet.hunger)}</div>
                    <div style="text-align: right; font-weight: bold;">HAP:</div><div>${makeTextBar(pet.happiness)}</div>
                    <div style="text-align: right; font-weight: bold;">NRG:</div><div>${makeTextBar(pet.energy)}</div>
                    <div style="text-align: right; font-weight: bold;">IQ:</div><div>${makeTextBar(pet.intelligence * 2)}</div>
                </div>`;
        }
    }
    else if(state.view === 'feedSelect') {
        let options = [t('Mahlzeit 🍔'), t('Snack 🍦')];
        // Kurzinfo zur Wirkung (beruecksichtigt Baeckerei & Fitnessstudio),
        // damit sich das Gewicht bewusst steuern laesst
        let bakery = Math.round(getVillageEffect('bakery'));
        let mealW = getVillageEffect('gym') > 0 ? '+0–1g' : '+1g';
        let hints = [`+${20 + bakery} ${t('Hunger')} · ${mealW}`, `+${10 + bakery} ${t('Hunger')} · +3g · ${t('Laune')}`];
        let colorClass = pet.lightOff ? 'color:white;' : '';
        screenContent.innerHTML = `<div style="font-size:13px; ${colorClass}">${t('Essen:')}</div>`
            + `<div style="font-size:8px; margin-top:2px; opacity:0.75; ${colorClass}">${t('Hunger')} ${Math.round(pet.hunger)}% · ${pet.weight}g</div>`
            + `<div style="font-size:14px; margin-top:5px; border:1px solid ${pet.lightOff ? 'white' : '#1e272e'}; padding:4px; ${colorClass}">► ${options[state.feedIndex]}</div>`
            + `<div style="font-size:8px; margin-top:3px; opacity:0.8; ${colorClass}">${hints[state.feedIndex]}</div>`;
    }
    else if(state.view === 'gameSelect') {
        let games = [t('L/R Raten'), t('SchnickSchnack'), t('Hütchenspiel')];
        let colorClass = pet.lightOff ? 'color:white;' : '';
        screenContent.innerHTML = `<div style="font-size:13px; ${colorClass}">${t('Spielen:')}</div><div style="font-size:14px; margin-top:8px; border:1px solid ${pet.lightOff ? 'white' : '#1e272e'}; padding:4px; ${colorClass}">► ${games[state.gameIndex]}</div>`;
    }
    else if(state.view === 'playingGame') {
        let g = state.tempGameData, tama = getPetGraphicWithHat();
        let colorClass = pet.lightOff ? 'color:white;' : '';
        if(g.type === 0) screenContent.innerHTML = `<div style="font-size:13px; ${colorClass}">Wo schaut es hin?</div><div style="font-size:16px; margin-top:10px; ${colorClass}">[A] 👈 <div style="position:relative; display:inline-block;">${tama}</div> 👉 [B]</div>`;
        else if(g.type === 1) screenContent.innerHTML = `<div style="font-size:14px; ${colorClass}">Du: <b>${['✊','🖐','✌️'][g.step]}</b> | <div style="position:relative; display:inline-block;">${tama}</div>: ❓</div><div style="font-size:12px; margin-top:10px; ${colorClass}">A: Ändern | B: Go!</div>`;
        else if(g.type === 2) {
            let boxes = ['📦','📦','📦']; boxes[g.step] = '🔺<br>📦'; 
            screenContent.innerHTML = `<div style="font-size:16px; display:flex; gap:12px; align-items:flex-end; height:35px; ${colorClass}"><div>${boxes[0]}</div><div>${boxes[1]}</div><div>${boxes[2]}</div></div><div style="font-size:12px; margin-top:10px; ${colorClass}">A: Wählen | B: Öffnen</div>`;
        }
    }
}
