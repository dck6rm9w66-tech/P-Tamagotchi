/* Pausentamagotchi - Sprachumschaltung und Woerterbuecher (DE/EN) */
const LANG_KEY = 'tama_lang';
// Beim allerersten Start die Systemsprache uebernehmen: Deutsch (inkl.
// Schweizer und oesterreichischem Deutsch) bleibt Deutsch, alles andere
// startet auf Englisch. Danach zaehlt nur noch die eigene Wahl.
function detectSystemLanguage() {
    try {
        // Nur die PRIMAERE Systemsprache zaehlt. Wer Franzoesisch eingestellt hat
        // und Deutsch nur als Zweitsprache fuehrt, bekommt Englisch.
        let code = '';
        if (navigator.languages && navigator.languages.length) code = navigator.languages[0];
        if (!code) code = navigator.language || navigator.userLanguage || '';
        code = String(code).toLowerCase();
        if (code.indexOf('de') === 0) return 'de';    // de, de-DE, de-CH, de-AT
        if (code.indexOf('gsw') === 0) return 'de';   // Schweizerdeutsch
    } catch (e) {}
    return 'en';
}

let lang = safeGetItem(LANG_KEY);
if (lang !== 'de' && lang !== 'en') {
    lang = detectSystemLanguage();
    safeSetItem(LANG_KEY, lang);   // Wahl merken, damit die Erkennung nur einmal greift
}
const I18N = {};        // wird weiter unten befuellt: deutsch -> englisch

// Einige Texte sind zu lang/HTML-lastig fuer den deutschen Wortlaut als
// Schluessel - die bekommen einen Kurzschluessel und hier den DE-Wortlaut.
const I18N_DE = {
    'giftNote': 'Jedes Geschenk hebt einen <b>zufälligen Stat dauerhaft um 0,5%</b> – auch für alle zukünftigen Tamagotchis.',
    'stepsNote': '<b>Wichtig:</b> Gezählt wird nur, solange die App offen und sichtbar ist – Browser bekommen im Hintergrund keine Sensordaten. Nimm dein Handy also mit auf die Runde. Die Erkennung läuft über den Beschleunigungssensor und ist ein Schätzwert.',
    'villageFootnote': 'Stufen bleiben auch nach dem Tod deines Tamagotchis dauerhaft erhalten! Verdiene 🎫 Tickets über Tages-Quests (📋) und Pomodoro-Sessions (🍅).'
};

function t(s) {
    if (s === undefined || s === null) return s;
    if (lang === 'de') return (I18N_DE[s] !== undefined) ? I18N_DE[s] : s;
    let str = String(s);
    if (I18N[str] !== undefined) return I18N[str];
    let trimmed = str.trim();
    if (I18N[trimmed] !== undefined) return str.replace(trimmed, I18N[trimmed]);
    // Zusammengesetzte/generierte Texte (z.B. Dorf-Effekte "-7% Krankheitswahrscheinlichkeit")
    let out = str, hit = false;
    for (let i = 0; i < I18N_PHRASES.length; i++) {
        let pair = I18N_PHRASES[i];
        if (out.indexOf(pair[0]) !== -1) { out = out.split(pair[0]).join(pair[1]); hit = true; }
    }
    return hit ? out : str;
}

// Reihenfolge zaehlt: laengere Ausdruecke zuerst ersetzen
const I18N_PHRASES = [
    ['Krankheitswahrscheinlichkeit', 'illness chance'],
    ['Bonus-Hunger pro Mahlzeit', 'bonus hunger per meal'],
    ['Bonus-Laune pro Spiel', 'bonus mood per game'],
    ['Gewichtszunahme', 'weight gain'],
    ['Unartig-Chance', 'misbehaviour chance'],
    ['Schmutz-Chance', 'dirt chance'],
    ['Hunger-Drain', 'hunger drain'],
    ['Pfleger-XP', 'caretaker XP'],
    ['Start-IQ', 'starting IQ'],
    ['(Max.)', '(max)'],
    ['Lebenstage', 'life days'],
    ['Schritte', 'steps'],
    ['Siege', 'wins'],
    ['Std.', 'h']
];

// Fuer Texte mit eingesetzten Werten: tf('Noch {0} Schritte', 12)
function tf(s) {
    let out = t(s);
    for (let i = 1; i < arguments.length; i++) {
        out = out.split('{' + (i - 1) + '}').join(arguments[i]);
    }
    return out;
}

function updateLangButton() {
    let b = document.getElementById('langToggleBtn');
    if (b) b.innerHTML = (lang === 'de')
        ? '🌐 Switch to English'
        : '🌐 Auf Deutsch umschalten';
}

function setLanguage(next) {
    lang = (next === 'en') ? 'en' : 'de';
    safeSetItem(LANG_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    applyStaticTranslations();
    updateLangButton();
    try { if (typeof render === 'function' && state && state.isStarted) render(); } catch(e) {}
    try { updateSaveStatus(); } catch(e) {}
    try { updateVisitTimer(); } catch(e) {}
    try { updateStepDisplay(); } catch(e) {}
    playSound('select');
}

function toggleLanguage() { setLanguage(lang === 'de' ? 'en' : 'de'); }

// --- Statisches HTML uebersetzen ---
// Bloecke mit Fliesstext werden als Ganzes getauscht (data-i18n-block),
// kurze Beschriftungen ueber ihren Textinhalt.
function applyStaticTranslations() {
    // 1) Ganze Bloecke (Handbuch-Abschnitte usw.)
    document.querySelectorAll('[data-i18n-block]').forEach(el => {
        if (el.dataset.deHtml === undefined) el.dataset.deHtml = el.innerHTML;
        let key = el.getAttribute('data-i18n-block');
        if (lang === 'en' && I18N_BLOCKS[key] !== undefined) el.innerHTML = I18N_BLOCKS[key];
        else el.innerHTML = el.dataset.deHtml;
    });
    // 2) Kurze Beschriftungen: nur reine Textknoten ohne verschachtelte Elemente
    document.querySelectorAll('[data-i18n]').forEach(el => {
        if (el.dataset.deText === undefined) el.dataset.deText = el.textContent;
        el.textContent = (lang === 'en') ? t(el.dataset.deText) : el.dataset.deText;
    });
    // 3) Tooltips
    document.querySelectorAll('[title]').forEach(el => {
        if (el.dataset.deTitle === undefined) el.dataset.deTitle = el.getAttribute('title');
        el.setAttribute('title', (lang === 'en') ? t(el.dataset.deTitle) : el.dataset.deTitle);
    });
}

const I18N_BLOCKS = {};   // ganze HTML-Abschnitte (weiter unten befuellt)

// --- Englische Fassung des Handbuchs (wird als ganzer Block getauscht) ---
I18N_BLOCKS['saveIntro'] = 'Backs up your <b>complete</b> progress as a file: Tamagotchi, coins, tickets, caretaker level, medals, inventory, Cloud Village and high scores. This is also how you move to another device.';
I18N_BLOCKS['levelIntro'] = 'Earn XP as your Tamagotchi grows older, wins medals and solves mini-games.';
I18N_BLOCKS['stepsIntro'] = 'Every <b>100 steps</b> earns you <b>50 T-Coins</b>. Get up – your cloud creature is coming along.';
I18N_BLOCKS['endgameIntro'] = 'Endgame from caretaker level 32';
I18N_BLOCKS['lbIntro'] = 'Survival, PvP, mini-bosses and arcade – see how you compare with your colleagues.';
I18N_BLOCKS['lbHint'] = 'Load the .json files of the others from your shared folder – or share your own profile.';
I18N_BLOCKS['villageIntro'] = 'Invest 🎫 tickets into multi-level buildings – your Cloud Village visibly grows with every level!';

I18N_BLOCKS['manual'] = `
        <p style="font-size: 12px;">This Tamagotchi is here to help you take real <b>breaks</b>. It only grows while this window is actively open.</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">☁️ The Idea</h3>
        <p style="font-size: 12px; margin-bottom: 8px;">Your Tamagotchi visits you every day for exactly <b>30 minutes of active screen time</b>. When the time is up, the bus picks it up. It will be back the next day! Maximum lifetime: <b>~8.5 hours of active screen time</b>.</p>
        <div style="font-size: 11px; background:#eef4ff; border-left:4px solid #54a0ff; border-radius:6px; padding:8px 10px; margin-bottom: 12px; line-height:1.5;">
            <b>⏱️ Active screen time ≠ real time</b><br>
            Your Tamagotchi's clock only runs <b>while the app is open and visible</b>. Put your phone away, switch tabs or lock the screen and everything pauses: it does not age, does not get hungry, and the visit timer stops.<br><br>
            What that means: a full life of ~8.5 hours of active time takes roughly <b>17 real days</b> at 30 minutes per day. And when the graveyard says "16 life days", those are <b>in-game life days</b> (30 minutes of active time each) – not 16 calendar days.<br><br>
            One exception: buff durations from the shop (e.g. "fire-breathing for 1 hour") keep running in <b>real time</b>, even when the app is closed.
        </div>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">🎮 Controls</h3>
        <p style="font-size: 12px; margin-bottom: 10px;">Use the three buttons below the screen: <b>A</b> selects the next icon, <b>B</b> confirms, <b>C</b> cancels or goes back. You can also tap the icons directly. Tapping your Tamagotchi makes it say something.</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">🍔 Care</h3>
        <p style="font-size: 12px; margin-bottom: 10px;"><b>Feeding:</b> a meal fills hunger efficiently, a snack adds mood but three times the weight. <b>Bathing</b> keeps it clean, <b>hearts</b> raise its mood, <b>games</b> boost mood and intelligence, the <b>doctor</b> cures illness and <b>discipline</b> stops misbehaviour. Turn off the light when it wants to sleep.</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #6c5ce7;">🧠 Clever Connections</h3>
        <p style="font-size: 12px; margin-bottom: 6px;">A few things interlock behind the scenes – knowing them makes you a more efficient caretaker and earns more XP:</p>
        <ul style="font-size: 12px; padding-left: 20px; margin-bottom: 15px;">
            <li style="margin-bottom: 6px;"><b>🏘️ Calmer care pays off:</b> the more you upgrade Clinic, Spa, Watchtower and Cafeteria, the less often your Tamagotchi falls ill, gets dirty, misbehaves or goes hungry. To make up for the quieter routine you earn <b>considerably more daily XP</b> – up to <b>+40 XP</b> per life day with a fully built comfort village.</li>
            <li style="margin-bottom: 6px;"><b>🎓 Higher IQ = more XP:</b> intelligence rises with every growth stage and is <b>never reset</b>. Each IQ point gives you <b>+1% caretaker XP</b> (up to +100% at IQ 100). Keep your Tamagotchi busy with books, games and so on, and avoid neglect so it does not forget what it learned.</li>
            <li style="margin-bottom: 6px;"><b>⚖️ Weight affects energy:</b> a healthy middle ground (~10–20 g) is the most efficient. <b>Being overweight</b> is tiring and raises energy consumption – but <b>being underweight</b> costs extra too, because the reserves are missing.</li>
            <li style="margin-bottom: 6px;"><b>🎮 Playing makes it hungry:</b> every round of a mini-game costs <b>8 hunger</b> and slims your Tamagotchi down a little. Then you decide: a <b>meal 🍔</b> (+20 hunger, only +1 g) refills efficiently, while a <b>snack 🍦</b> (+10 hunger, +3 g) makes it happy. That is how you steer the weight deliberately – and on a nearly empty stomach your Tamagotchi will refuse to play.</li>
            <li style="margin-bottom: 6px;"><b>😄 Mood affects energy:</b> a happy Tamagotchi (above 70 mood) is livelier and uses energy <b>up to 50% more slowly</b>. Below 30 mood it turns listless and tires faster.</li>
        </ul>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">🎫 Tickets & Cloud Village</h3>
        <p style="font-size: 12px; margin-bottom: 10px;">Complete daily quests (📋) and Pomodoro sessions (🍅) to earn 🎫 <b>break tickets</b>. Among them are daily <b>ergonomics quests</b> (🌿) – real office break tips such as changing posture, standing phases or the 20-20-20 rule, which you simply confirm yourself once done. In the Cloud Village (🏘️) you invest tickets into 10 buildings with 12 upgrade levels each. The bonuses apply permanently to all current and future Tamagotchis – even after death!</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">🏆 Office High Scores</h3>
        <p style="font-size: 12px; margin-bottom: 10px;">The leaderboard (🏆) has <b>four rankings</b>: <b>🕐 Survival</b> (how long your Tamagotchis lasted), <b>⚔️ PvP</b> (duels won), <b>👹 Bosses</b> (mini-bosses defeated) and <b>🕹️ Arcade</b> (best machine score). Your own standing is mixed in and highlighted automatically when you open it, so you see where you stand right away.</p>
        <p style="font-size: 12px; margin-bottom: 15px;">To compare with others you exchange <b>JSON files</b>: with "<b>Share my profile</b>" you export your current standing (no need to wait for a Tamagotchi to die), and a file is also created automatically on death. Put the files in a shared folder and load them via "Load scores". All values are <b>signed with a checksum</b> – tampered files are rejected on import.</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">⚔️ Arena</h3>
        <p style="font-size: 12px; margin-bottom: 8px;"><b>🌩️ Raid — the Cloud Titan:</b> the arena's greatest foe cannot be beaten alone. You need <b>at least 2 Tamagotchis</b>: your own plus at least one <b>same-day</b> save file (JSON) from another person – older files are rejected by the Titan. Feel free to load several at once: the bigger the party, the greater your combat power <b>and</b> the loot. It drops far more coins, tickets and XP than any mini-boss – plus <b>3 random items</b> from the shop (4 with four or more participants). Once per week.</p>
        <p style="font-size: 12px; margin-bottom: 10px;">In the arena you can also pit your Tamagotchi against other Tamagotchis or mini-bosses. For <b>PvP duels</b> load another player's save JSON. For <b>mini-bosses</b> (5 levels) you need an active Tamagotchi. Each fight is possible once per week. Winnings: coins, tickets, XP and, with luck, rare <b>boss trophies</b>! If you lose, your Tamagotchi suffers in mood and energy. Combat strength depends on luck, age and stats.</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">🎓 Caretaker Level</h3>
        <p style="font-size: 12px; margin-bottom: 10px;">You collect caretaker XP for every Tamagotchi day survived, every medal earned and every mini-game won. Levelling up (🎓) unlocks exclusive shop categories and rare egg colours. Locked content is already visible in the shop – including the level required to unlock it!</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">💾 Save Game</h3>
        <p style="font-size: 12px; margin-bottom: 15px;">Use the <b><i class="fa-solid fa-floppy-disk"></i> button at the top left</b> to back up your <b>complete</b> progress as a file: Tamagotchi, coins, tickets, caretaker level, medals, inventory, Cloud Village, arena, arcade high scores and graveyard. This is also how you move to a new device – back up the file, load it there, done. Importing <b>replaces</b> the save on that device completely.</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">💀 Causes of Death</h3>
        <ul style="font-size: 12px; padding-left: 20px; margin-bottom: 15px;">
            <li><b>Starvation:</b> hunger at 0 for too long.</li>
            <li><b>Obesity:</b> 50 g or more.</li>
            <li><b>Sadness:</b> mood at 0 for too long.</li>
            <li><b>Illness:</b> untreated for too long.</li>
            <li><b>Old age:</b> the natural end after roughly 5.5 to 8.5 hours of <b>active screen time</b>.</li>
        </ul>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #2c3e50;">🕹️ Arcade</h3>
                <p style="font-size: 12px; margin-bottom: 15px;">You buy the machines once — after that every <b>round costs 20 🪙</b> to play. In return you get <b>38 to 125 caretaker XP</b> per run plus coins back depending on your score (up to 140 🪙), so a good run pays off twice. Handy as your Tamagotchi ages: all coins are lost when it dies — converted into XP beforehand, they are far better spent.</p>

                <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #6c5b7b;">🪦 Grave Care & the Ancestors</h3>
        <p style="font-size: 12px; margin-bottom: 8px;">Every Tamagotchi that passes away gets a tombstone in the <b>Hall of Ancestors</b> (💀). For <b>5 🪙 per day and grave</b> you can keep a grave maintained – the plan is charged automatically each day.</p>
        <ul style="font-size: 12px; padding-left: 20px; margin-bottom: 8px;">
            <li><b>From 50% of graves maintained</b> everything is fine – the ancestors rest in peace.</li>
            <li><b>Below 50%</b> they come to haunt you: your Tamagotchi is frightened and can only reach <b>25% happiness</b>, no matter how hard you try. Ghosts will drift through the background.</li>
        </ul>
        <p style="font-size: 12px; margin-bottom: 15px;">If your balance is not enough on the daily charge, as many plans as possible are kept and the rest are suspended. The more ancestors you gather, the more expensive their peace becomes – budget accordingly!</p>

        <h3 style="font-size: 14px; border-bottom: 1px solid #a4b0be; padding-bottom: 3px; color: #c0392b;">💸 What Death Costs You</h3>
        <p style="font-size: 12px; margin-bottom: 6px;">When your Tamagotchi dies, the next one starts from scratch. <b>You lose:</b></p>
        <ul style="font-size: 12px; padding-left: 20px; margin-bottom: 8px;">
            <li><b>All T-Coins</b> 🪙 and <b>all break tickets</b> 🎫 – your balance is reset to 0.</li>
            <li>Every purchased item, hat, paint and active buff.</li>
        </ul>
        <p style="font-size: 12px; margin-bottom: 6px;"><b>You keep</b> – this belongs to the caretaker, not the Tamagotchi:</p>
        <ul style="font-size: 12px; padding-left: 20px; margin-bottom: 10px;">
            <li>Your <b>caretaker level</b> with its XP and all your <b>medals</b>.</li>
            <li>The entire <b>Cloud Village</b> with all its level bonuses.</li>
            <li>Purchased <b>arcade machines</b> and their high scores.</li>
            <li>Your own <b>image/skin</b> and <b>background image</b>.</li>
            <li>The graveyard, the leaderboards and your lifetime record.</li>
        </ul>
        <p style="font-size: 11px; color: #576574; margin-bottom: 15px;">Tip: invest tickets into the Cloud Village in good time – they are safe there for good. Whatever sits in your balance is gone when your Tamagotchi dies.</p>

`;


// --- Woerterbuch: Oberflaeche, Menues, Meldungen ---
Object.assign(I18N, {
    // Kopfzeile & Leiste
    'Spielstand': 'Save Game', 'Handbuch & Steuerung': 'Manual & Controls',
    'Schrittzähler': 'Step Counter', 'Highscores': 'High Scores',
    'Wolkendorf-Ausbau': 'Cloud Village', 'Wolkendorf-Arena': 'Cloud Village Arena',
    'Wolkendorf-Fernrohr': 'Cloud Village Telescope', 'Laden': 'Shop',
    'Medaillen': 'Medals', 'Tages-Quests': 'Daily Quests', 'Ahnengalerie': 'Hall of Ancestors',
    'Pfleger-Level': 'Caretaker Level', 'Wolkendorf-Tagebuch': 'Cloud Village Diary',
    'Pomodoro-Timer': 'Pomodoro Timer', 'Arcade': 'Arcade', 'Arcade-Automaten': 'Arcade Machines',
    'Ton an/aus': 'Sound on/off', 'Glücksrad': 'Wheel of Fortune',
    // Geraete-Bildschirm
    'Essen:': 'Food:', 'Spielen:': 'Play:', 'Mahlzeit 🍔': 'Meal 🍔', 'Snack 🍦': 'Snack 🍦',
    'L/R Raten': 'L/R Guess', 'SchnickSchnack': 'Rock-Paper-Scissors', 'Hütchenspiel': 'Shell Game',
    'Hunger': 'Hunger', 'Laune': 'Mood', 'Energie': 'Energy', 'Gewicht': 'Weight',
    'Intelligenz': 'Intelligence', 'Alter': 'Age', 'Zustand': 'Status',
    'Stelle deine Frage': 'Ask your question',
    'Zu hungrig<br>zum Spielen! 🍔': 'Too hungry<br>to play! 🍔',
    'Der Kampf beginnt! ⚔️': 'The fight begins! ⚔️',
    // Allgemeine Knoepfe
    'Abbrechen': 'Cancel', 'Schliessen': 'Close', 'Zurück': 'Back', 'Weiter': 'Next',
    'Speichern': 'Save', 'Laden & Ersetzen': 'Load & Replace', 'Sichern': 'Back up',
    'Kaufen': 'Buy', 'Benutzen': 'Use', 'Im Besitz': 'Owned', 'Ausrüsten': 'Equip',
    'Abgelegt': 'Removed', 'Angelegt': 'Equipped', 'Gesperrt': 'Locked',
    'Wirkt gerade': 'Active now', 'Nicht genug 🪙': 'Not enough 🪙', 'Nicht genug 🎫': 'Not enough 🎫',
    'MAX': 'MAX', 'Ausbauen': 'Upgrade', 'Kämpfen!': 'Fight!', 'Kein Tama': 'No Tama',
    // Shop-Kategorien
    '🍔 Essen & Trinken': '🍔 Food & Drink', '💊 Apotheke & Heilung': '💊 Pharmacy & Healing',
    '🎩 Hüte & Accessoires': '🎩 Hats & Accessories', '🎨 Lacke & Skins': '🎨 Paints & Skins',
    '🎟️ Events & Dating': '🎟️ Events & Dating', '🕹️ Arcade-Automaten': '🕹️ Arcade Machines',
    '🏕️ Hobbys & Abenteuer': '🏕️ Hobbies & Adventures', '✖️ Multiplikatoren': '✖️ Multipliers',
    '🧪 Buffs & Substanzen': '🧪 Buffs & Substances', '👿 Debuffs & Trolle': '👿 Debuffs & Trolls',
    '💳 Abos & Mikros': '💳 Subscriptions & Micros', '🌟 Pfleger-Elite': '🌟 Caretaker Elite',
    '🏆 Boss-Trophäen': '🏆 Boss Trophies',
    // Shop-Reiter
    'Inventar': 'Inventory', 'Dein Inventar ist leer.': 'Your inventory is empty.',
    'Dein Inventar ist leer. Kauf etwas im Laden!': 'Your inventory is empty. Buy something in the shop!',
    // Statusmeldungen
    'Dein Tamagotchi muss aktiv sein!': 'Your Tamagotchi must be active!',
    'Es liegt kein Haufen am Gehäuse!': 'There is no poop on the shell!',
    'Kein aktiver Spielstand zum Sichern vorhanden!': 'No active save game to back up!',
    'Ungültige Backup-Datei!': 'Invalid backup file!',
    'Ungültige Gegner-Datei!': 'Invalid opponent file!',
    'Datei konnte nicht gelesen werden.': 'The file could not be read.',
    'Die Datei konnte nicht gelesen werden. Ist es wirklich ein Backup?': 'The file could not be read. Is it really a backup?',
    'Export fehlgeschlagen.': 'Export failed.',
    // Wolkendorf
    'Klinik': 'Clinic', 'Bibliothek': 'Library', 'Kantine': 'Cafeteria',
    'Fitnessstudio': 'Gym', 'Spielplatz': 'Playground', 'Bäckerei': 'Bakery',
    'Therme': 'Spa', 'Sternwarte': 'Observatory', 'Münzprägerei': 'Mint', 'Wachturm': 'Watchtower',
    'Tamagotchis werden seltener krank.': 'Tamagotchis get sick less often.',
    'Jedes neue Ei startet mit mehr Intelligenz.': 'Every new egg starts with more intelligence.',
    'Der Hunger sinkt langsamer.': 'Hunger decreases more slowly.',
    'Weniger Gewichtszunahme beim Füttern.': 'Less weight gain when feeding.',
    'Minispiele machen mehr Laune.': 'Mini-games boost mood more.',
    'Mahlzeiten sättigen stärker.': 'Meals are more filling.',
    'Dein Tamagotchi wird seltener schmutzig.': 'Your Tamagotchi gets dirty less often.',
    'Du sammelst schneller Pfleger-XP.': 'You collect caretaker XP faster.',
    'Du erhältst mehr T-Coins.': 'You receive more T-Coins.',
    'Dein Tamagotchi ist seltener unartig.': 'Your Tamagotchi misbehaves less often.',
    // Arena
    'Büro-Miesepeter': 'Office Grump', 'Hunger-Dämon': 'Hunger Demon', 'Der Montag': 'The Monday',
    'Die Deadline': 'The Deadline', 'Burnout-Titan': 'Burnout Titan', 'Wolken-Titan': 'Cloud Titan',
    'Verbreitet schlechte Laune. Schwache Angriffe, aber nervig.': 'Spreads bad vibes. Weak attacks, but annoying.',
    'Erscheint immer kurz vor der Mittagspause. Sehr aggressiv.': 'Always shows up right before lunch. Very aggressive.',
    'Alle fürchten ihn. Schwer zu schlagen, aber süß zu besiegen.': 'Everyone dreads it. Hard to beat, sweet to defeat.',
    'Rückt unaufhaltsam näher. Jede Runde steigt ihr Angriff.': 'Creeps ever closer. Its attack grows each round.',
    'Der härteste Gegner. Nur wer ausgeruht & glücklich ist, gewinnt.': 'The toughest foe. Only the rested and happy prevail.',
    'Ein gewaltiges Gewitterwesen. Allein chancenlos – nur ein Verbund aus mehreren Tamagotchis kann ihn stellen.': 'A colossal storm being. Hopeless alone – only a party of several Tamagotchis can face it.',
    // Todesursachen
    'Altersschwäche': 'Old age', 'Verhungern': 'Starvation', 'Übergewicht': 'Obesity',
    'Traurigkeit': 'Sadness', 'Krankheit': 'Illness',
    // Highscores
    'Überleben': 'Survival', 'PvP': 'PvP', 'Bosse': 'Bosses', 'Rang': 'Rank',
    'Tamagotchi': 'Tamagotchi', 'Pfleger': 'Caretaker', 'Siege': 'Wins', 'Punkte': 'Points',
    'Zeit': 'Time', 'Noch kein Tamagotchi ist von uns gegangen.': 'No Tamagotchi has passed away yet.',
    'Noch keine PvP-Duelle gewonnen.': 'No PvP duels won yet.',
    'Noch kein Mini-Boss besiegt.': 'No mini-boss defeated yet.',
    'Noch keine Arcade-Punkte erspielt.': 'No arcade points scored yet.',
    // Medaillen-Stufen
    'Bronze': 'Bronze', 'Silber': 'Silver', 'Gold': 'Gold', 'Platin': 'Platinum',
    'ohne Medaillen-Rang': 'no medal rank'
});

// --- Woerterbuch: Shop-Artikel (Namen + Beschreibungen) ---
Object.assign(I18N, {
    'Mystery Meat 🥩': 'Mystery Meat 🥩',
    '+5 Happy (aber: 20% Chance auf Darmverstimmung: -30 Energie + Poop).': '+5 happiness (but: 20% chance of an upset stomach: -30 energy + poop).',
    'Zitter-Alarm ⚡': 'Jitter Juice ⚡',
    '+10 Energie (aber: -10 Laune bei Minispielen wg. Zittern).': '+10 energy (but: -10 mood in mini-games due to the shakes).',
    'Trauriger Salat 🥗': 'Sad Salad 🥗',
    '+0 alles (aber: Tamagotchi weint jämmerlich beim Essen).': '+0 to everything (but: your Tamagotchi weeps pitifully while eating).',
    'Süssigkeiten-Overload 🍭': 'Candy Overload 🍭',
    '+15 Happy beim Spielen (aber: nach 3x Spielen sofortiger Zucker-Crash).': '+15 happiness when playing (but: instant sugar crash after 3 games).',
    'Goldener Apfel 🍎': 'Golden Apple 🍎',
    'Füllt den Hunger sofort auf 100%.': 'Instantly fills hunger to 100%.',
    'Wolken-Pizza 🍕': 'Cloud Pizza 🍕',
    '+40 Hunger & +10 Laune. Ein echter Sattmacher.': '+40 hunger & +10 mood. Properly filling.',
    'Grünling-Burger 🥬': 'Greenling Burger 🥬',
    '+35 Hunger, +5 Intelligenz und ganz ohne Gewichtszunahme.': '+35 hunger, +5 intelligence and no weight gain at all.',
    'Glitch-Kekse 👾': 'Glitch Cookies 👾',
    'Lecker! Löst beim Essen einen zufälligen Farbwechsel aus.': 'Tasty! Triggers a random colour change while eating.',
    'Sternekoch-Menü 🍽️': 'Fine Dining Menu 🍽️',
    '+60 Hunger, +15 Laune, +5 Energie. Das Beste vom Besten.': '+60 hunger, +15 mood, +5 energy. The best of the best.',
    'Höllen-Ramen 🌶️': 'Hellfire Ramen 🌶️',
    '+30 Hunger. Macht dein Tamagotchi 1 Stunde lang feuerspuckend! 🔥': '+30 hunger. Makes your Tamagotchi breathe fire for 1 hour! 🔥',
    'Erste-Hilfe ⚕️': 'First Aid ⚕️',
    'Heilt Krankheiten augenblicklich.': 'Cures illness instantly.',
    'Abnehmspritze 💉': 'Slimming Shot 💉',
    'Tamagotchi verliert 10g (aber: Stoffwechsel rast = -50% Hunger).': 'Your Tamagotchi loses 10g (but: racing metabolism = -50% hunger).',
    'Superfood 🥦': 'Superfood 🥦',
    'Kein Hunger mehr heute! (Senkt Max-Life um 30 Min).': 'No more hunger today! (Reduces max lifetime by 30 min).',
    'Unsterblichkeits-Trank 🛡️': 'Immortality Potion 🛡️',
    'Rettet dich 1x vor dem Tod durch Hunger/Dicke/Trauer.': 'Saves you once from death by hunger, obesity or sadness.',
    'Poop zu Gold 🪙': 'Poop to Gold 🪙',
    'Verwandle 1x Kot am Gehäuse in 200 Münzen. Riecht nach Betrug!': 'Turn one poop on the shell into 200 coins. Smells like cheating!',
    'Blume 🌸': 'Flower 🌸', 'Ein Hauch von Natur.': 'A touch of nature.',
    'Rote Schleife 🎀': 'Red Ribbon 🎀', 'Macht jedes Pet extrem niedlich.': 'Makes any pet extremely cute.',
    'Flasche 🍼': 'Bottle 🍼', 'Für den kleinen Durst (wird neben dem Pet getragen).': 'For a little thirst (carried beside your pet).',
    'Farbpalette 🎨': 'Paint Palette 🎨', 'Für kreative Tamagotchis (wird neben dem Pet getragen).': 'For creative Tamagotchis (carried beside your pet).',
    'Baseballschläger 🏏': 'Baseball Bat 🏏', 'Sieht gefährlich aus (wird neben dem Pet getragen).': 'Looks dangerous (carried beside your pet).',
    'Mikrofon 🎤': 'Microphone 🎤', "Let's sing! (wird neben dem Pet getragen).": "Let's sing! (carried beside your pet).",
    'Messer 🔪': 'Knife 🔪', 'Vorsicht, scharf! (wird neben dem Pet getragen).': 'Careful, sharp! (carried beside your pet).',
    'Celebrity-Status 🕶️': 'Celebrity Status 🕶️', 'Das Tamagotchi trägt dauerhaft Sonnenbrille.': 'Your Tamagotchi wears sunglasses permanently.',
    'Controller 🎮': 'Controller 🎮', 'Gamer-Status (wird neben dem Pet getragen).': 'Gamer status (carried beside your pet).',
    'Krone 👑': 'Crown 👑', 'Für wahre Könige des Wolkendorfs.': 'For true kings of the Cloud Village.',
    'Hut der 1000 Farben': 'Hat of 1000 Colours', 'Ein Luxuszylinder, der stetig seine Farbe wechselt.': 'A luxury top hat that constantly shifts colour.',
    'Mystic 8-Ball 🎱': 'Mystic 8-Ball 🎱',
    'Beantwortet dir jede Ja/Nein-Frage. Aus dem Inventar starten, Frage stellen, B drücken, schütteln lassen.': 'Answers any yes/no question. Start it from your inventory, ask, press B and let it shake.',
    'Lack: Pures Gold': 'Paint: Pure Gold', 'Macht das Gehäuse komplett Golden (Edler Verlauf).': 'Turns the shell fully golden (elegant gradient).',
    'Lack: Dark Mode': 'Paint: Dark Mode', 'Mattschwarzes, edles Gehäuse.': 'A sleek matte-black shell.',
    'Muster: Hacker': 'Pattern: Hacker', 'Schwarz mit grünen Matrix-Linien.': 'Black with green matrix lines.',
    'Regenbogen-Kot': 'Rainbow Poop', 'Macht die Häufchen magisch bunt (dauerhaft).': 'Makes the droppings magically colourful (permanent).',
    'Eigenes Bild / Skin': 'Custom Image / Skin', 'Schaltet frei, eine eigene Bild-URL als Gehäuse-Textur zu nutzen.': 'Unlocks using your own image URL as the shell texture.',
    'Hintergrundbild 🖼️': 'Background Image 🖼️', 'Nutze eine eigene Bild-URL als Display-Hintergrund.': 'Use your own image URL as the display background.',
    'Chaos-Kugel 🔮': 'Chaos Orb 🔮',
    'Würfelt die komplette Hülle neu durch: Farbe, Muster, Farbton UND Form. Jedes Mal eine Überraschung – manchmal wunderschön, manchmal ein Albtraum!': 'Rerolls the entire shell: colour, pattern, hue AND shape. A surprise every time – sometimes gorgeous, sometimes a nightmare!',
    'Dating-App 💖': 'Dating App 💖', 'Swipe für 5 Münzen. 10% Match (+20 Happy), 90% Ghosting (-10 Happy).': 'Swipe for 5 coins. 10% match (+20 happiness), 90% ghosting (-10 happiness).',
    'Casino: All-in 🎰': 'Casino: All-in 🎰', 'Setze 50 Münzen auf Kopf/Zahl. Gewinne 100 oder verliere alles.': 'Bet 50 coins on heads or tails. Win 100 or lose it all.',
    'Therapie-Session 🛋️': 'Therapy Session 🛋️', 'Kostet 20 Münzen für +25 Happy. Urteilender Therapeut inklusive.': 'Costs 20 coins for +25 happiness. Judgemental therapist included.',
    'TikTok-Challenge 🕺': 'TikTok Challenge 🕺', 'Ausrüstung für 15 Münzen. 40% viral (+30 Happy), 60% Flop (-15 Happy).': 'Gear for 15 coins. 40% viral (+30 happiness), 60% flop (-15 happiness).',
    'Space Invaders 👾': 'Space Invaders 👾',
    'Retro-Klassiker! Herausgezoomt steuerst du dein ganzes Ei als Kanone gegen anrückende Alien-Wellen. Einmalkauf, beliebig oft spielbar.': 'Retro classic! Zoomed out, you steer your whole egg as a cannon against incoming alien waves. Buy once, play forever.',
    'Pong 🏓': 'Pong 🏓',
    'Der Urvater aller Videospiele! Dein Ei ist der Schläger im Duell gegen die Wolken-KI. Einmalkauf, beliebig oft spielbar.': 'The granddaddy of video games! Your egg is the paddle against the cloud AI. Buy once, play forever.',
    'Defender 🚀': 'Defender 🚀',
    'Rasanter 80er-Shooter! Dein Ei fliegt durchs Weltall und ballert sich durch UFO-Schwärme. Einmalkauf, beliebig oft spielbar.': 'Fast-paced 80s shooter! Your egg flies through space blasting UFO swarms. Buy once, play forever.',
    'Wolken-Kreisel 🪀': 'Cloud Spinner 🪀', 'Lieblings-Spielzeug: +15 Laune bei jedem Spielen. Mehrfach nutzbar.': 'Favourite toy: +15 mood every time. Reusable.',
    'Roboter-Kumpel 🤖': 'Robot Buddy 🤖', 'Ein treuer Blechfreund: +12 Laune, +3 Intelligenz. Nie mehr allein.': 'A loyal tin friend: +12 mood, +3 intelligence. Never alone again.',
    'Bilderbuch 📖': 'Picture Book 📖', 'Eine gute Geschichte: +5 Intelligenz und +5 Laune.': 'A good story: +5 intelligence and +5 mood.',
    'Wolken-Ukulele 🎸': 'Cloud Ukulele 🎸', 'Musizieren macht glücklich: +18 Laune, +2 Intelligenz und eine kleine Melodie.': 'Making music brings joy: +18 mood, +2 intelligence and a little tune.',
    'Abenteuer-Zelt ⛺': 'Adventure Tent ⛺', 'Camping unterm Sternenhimmel: +20 Laune und +15 Energie durch Erholung.': 'Camping under the stars: +20 mood and +15 energy from the rest.',
    'Taucher-Set 🤿': 'Diving Kit 🤿', 'Abtauchen ins Wolkenmeer: +18 Laune und wäscht das Tamagotchi blitzsauber.': 'Dive into the cloud sea: +18 mood and washes your Tamagotchi spotless.',
    'Geheimes Tagebuch 📔': 'Secret Diary 📔', 'Gedanken sortieren: +10 Laune und beruhigt (heilt leichten Stress).': 'Sort your thoughts: +10 mood and calming (soothes mild stress).',
    'Sofortbild-Kamera 📸': 'Instant Camera 📸', 'Schnappschuss fürs Album: +12 Laune und mit etwas Glück ein Trinkgeld-Fund (Münzen).': 'A snapshot for the album: +12 mood and, with luck, a little coin tip.',
    'Garantierter Sieg 🎯 100%': 'Guaranteed Win 🎯 100%', 'Du gewinnst JEDES Minispiel garantiert (10 Min)!': 'You win EVERY mini-game guaranteed (10 min)!',
    'Kraft-Verstärker 💪 ×2': 'Power Amplifier 💪 ×2', 'Kampfkraft in Bosskämpfen & PvP ×2 für 24 Std.': 'Double combat power in boss fights & PvP for 24 h.',
    'Glücks-Keks 🥠': 'Fortune Cookie 🥠', '+25% Laune (Effekt hält 8 Stunden).': '+25% mood (lasts 8 hours).',
    'Smartphone 📱': 'Smartphone 📱', '10 Min keine Bedürfnisse, keine Bewegung, IQ -2 (Doomscrolling).': '10 min of no needs, no movement, IQ -2 (doomscrolling).',
    'Party-Pille 🪩': 'Party Pill 🪩', 'Tamagotchi schläft heute nicht! (aber -5 Int)': 'Your Tamagotchi will not sleep today! (but -5 intelligence)',
    'Shiny-Spray ✨': 'Shiny Spray ✨', 'Tamagotchi wird heute nicht schmutzig (aber: -25% Laune durch Chemie-Geruch).': 'Your Tamagotchi stays clean today (but: -25% mood from the chemical smell).',
    'Energizer-Bonbon 🍬': 'Energizer Candy 🍬', '2x Intelligenz-Gain für 1h (danach Laune-Debuff).': 'Double intelligence gain for 1 h (mood debuff afterwards).',
    'Social-Media-Boost 📲': 'Social Media Boost 📲', 'Doppelte Laune bei allem, dann 1h Crash.': 'Double mood from everything, then a 1 h crash.',
    'Mary Jane 🌿': 'Mary Jane 🌿', '+50% Happy und Immun für 15 Min (aber sofort -75% Hunger).': '+50% happiness and immunity for 15 min (but instantly -75% hunger).',
    'Genie-Pulver 🧠': 'Genius Powder 🧠', '+5 Intelligenz permanent (aber: verursacht starke Kopfschmerzen).': '+5 intelligence permanently (but: causes a splitting headache).',
    'Doppeltes Glück 🍀': 'Double Luck 🍀', 'Verdopple dein Glück für 1h (danach: Existenzielle Krise = -5 Happy permanent).': 'Double your luck for 1 h (afterwards: existential crisis = -5 happiness permanently).',
    'Schlaf-Diebstahl 💤': 'Sleep Theft 💤', 'Klaut 2h Schlaf. Heilt +50 Energie (aber Karma: -15 Happy).': 'Steals 2 h of sleep. Restores +50 energy (but karma: -15 happiness).',
    'Liebespfeil 💘': 'Love Arrow 💘', '+10 Happy für 1 Tag. (aber: 30% Chance auf fiesen Stalker-Modus).': '+10 happiness for 1 day. (but: 30% chance of a nasty stalker mode).',
    'Time Warp ⏳': 'Time Warp ⏳', 'Verjüngt dein Tamagotchi sofort um 3 Tage (1,5 Std. jünger).': 'Instantly makes your Tamagotchi 3 days younger (1.5 h of lifetime).',
    'Melodie-Box 🎵': 'Melody Box 🎵', 'Spielt eine sanfte Melodie: +20 Laune und +10 Energie.': 'Plays a gentle tune: +20 mood and +10 energy.',
    'Wolken-WC 🚽': 'Cloud Toilet 🚽', 'Beseitigt sofort den Haufen am Gehäuse – ganz ohne Wischen.': 'Instantly removes the poop from the shell – no wiping needed.',
    'Klon-Maschine 🧬': 'Cloning Machine 🧬', 'Erzeugt kurz ein zweites Tamagotchi – das sofort Streit anfängt! (-10 Laune, viel Chaos.)': 'Briefly creates a second Tamagotchi – which immediately picks a fight! (-10 mood, lots of chaos.)',
    'Tanzmatte 💃': 'Dance Mat 💃', 'Dein Tamagotchi lernt die neuesten Moves. Cringe garantiert! (+25 Laune, tanzt eine Weile.)': 'Your Tamagotchi learns the latest moves. Cringe guaranteed! (+25 mood, dances for a while.)',
    'Privat-DJ 🎧': 'Personal DJ 🎧', 'Legt einen Ohrwurm auf Endlosschleife auf: +15 Laune, aber -3 Intelligenz vom Dauer-Beat.': 'Puts one earworm on endless repeat: +15 mood, but -3 intelligence from the relentless beat.',
    'Schlechter Einfluss 🚬': 'Bad Influence 🚬', '+2 Glück permanent, aber verliert täglich Intelligenz (-1 Int/Tag).': '+2 luck permanently, but loses intelligence daily (-1/day).',
    'Fluch der Langeweile 💤': 'Curse of Boredom 💤', 'Für 30 Min bringen alle Spiele nur noch +1 Happy statt normal.': 'For 30 min all games give only +1 happiness instead of the usual.',
    'Social Media Addiction 📱': 'Social Media Addiction 📱', 'Tamagotchi verliert -1 Energie/5 Min wenn nicht im Shop.': 'Your Tamagotchi loses 1 energy every 5 min unless you are in the shop.',
    'Midlife Crisis 💀': 'Midlife Crisis 💀', 'Halbiert sofort alle Attribute des Tamagotchis.': 'Instantly halves every attribute of your Tamagotchi.',
    'Existenzielle Leere 🌌': 'Existential Void 🌌', 'Verliert stetig Laune, bis es schläft oder isst.': 'Steadily loses mood until it sleeps or eats.',
    'Gaslighting 🛒': 'Gaslighting 🛒', 'Der Shop-Besitzer betrügt dich. Alle Shoppreise steigen dauerhaft um 10%.': 'The shopkeeper cheats you. All shop prices rise permanently by 10%.',
    'Ewiger Schnupfen 🤧': 'Eternal Sniffles 🤧', 'Tamagotchi-Niest stetig. Jeder Nieser entzieht -5 Energie.': 'Your Tamagotchi sneezes constantly. Each sneeze drains 5 energy.',
    'Pixel-Akne 🔴': 'Pixel Acne 🔴', '-30% Happy sofort. Happy-Maximum auf 70% limitiert bis Heilung.': '-30% happiness instantly. Maximum happiness capped at 70% until cured.',
    'Clearasil ✨': 'Clearasil ✨', 'Heilt die lästige Pixel-Akne sofort.': 'Instantly cures that pesky pixel acne.',
    'Schlafwandler-Syndrom 🛌': 'Sleepwalker Syndrome 🛌', '20% Chance nachts im Schlaf willkürlich Shop-Items zu kaufen.': '20% chance of randomly buying shop items while asleep at night.',
    'Magenverstimmung 2.0 🤮': 'Upset Stomach 2.0 🤮', 'Jedes Essen hat ab jetzt eine 30% Chance auf Erbrechen (-30 Hunger/-30 Energie).': 'From now on every meal has a 30% chance of vomiting (-30 hunger / -30 energy).',
    'Glücks-Abo 💳': 'Happiness Subscription 💳', 'Kostet 5 Münzen/Tag für dauerhaft +10 Happy. Kündigung straft mit -10 Happy.': 'Costs 5 coins/day for a permanent +10 happiness. Cancelling costs you 10 happiness.',
    'VIP-Schlaf 👑': 'VIP Sleep 👑', 'Goldenes Bett. +4 Energie/Tick im Schlaf. Kostet 20 Münzen/Tag.': 'A golden bed. +4 energy per tick while asleep. Costs 20 coins/day.',
    'Lootbox 🎁': 'Loot Box 🎁', '90% Müll, 9% Super-Item, 1% Todeskralle = GAME OVER!': '90% junk, 9% super item, 1% death claw = GAME OVER!',
    'Heiligenschein 😇': 'Halo 😇', 'Nur wahre Wolkendorf-Veteranen tragen dieses Symbol.': 'Only true Cloud Village veterans wear this symbol.',
    'Lack: Aurora': 'Paint: Aurora', 'Schillerndes Polarlicht-Finish, nur für erfahrene Pfleger.': 'Shimmering aurora finish, for experienced caretakers only.',
    'Legenden-Krone 🏵️': 'Crown of Legends 🏵️', 'Das ultimative Statussymbol des Wolkendorfs.': 'The ultimate status symbol of the Cloud Village.',
    'Mega-Booster 🌈 ×3': 'Mega Booster 🌈 ×3', 'Verdreifacht Coins, Tickets UND XP gleichzeitig für 1 Std. Nur für Elite-Pfleger!': 'Triples coins, tickets AND XP at once for 1 h. Elite caretakers only!',
    'Omni-Booster 🌌 ×5': 'Omni Booster 🌌 ×5', 'Ver-5-facht Coins, Tickets UND XP gleichzeitig für 30 Min. Der ultimative Booster!': 'Quintuples coins, tickets AND XP at once for 30 min. The ultimate booster!',
    'Boss-Pokal 🏆': 'Boss Trophy 🏆', 'Nur durch einen Mini-Boss-Sieg in der Arena erhältlich.': 'Only obtainable by defeating a mini-boss in the arena.',
    'Lack: Boss-Flamme': 'Paint: Boss Flame', 'Seltene Kampftrophäe der Wolkendorf-Arena.': 'A rare battle trophy from the Cloud Village Arena.',
    'Champions-Gürtel 🥇': 'Champion Belt 🥇', 'Beweis eines harten Arena-Sieges.': 'Proof of a hard-fought arena victory.'
});

// --- Woerterbuch: Medaillen ---
Object.assign(I18N, {
    'Ausgebrütet': 'Hatched', 'Bringe Eier erfolgreich zum Schlüpfen.': 'Successfully hatch eggs.',
    'Kindergarten': 'Kindergarten', 'Bringe Tamagotchis in die Kindheitsphase.': 'Raise Tamagotchis to the child stage.',
    'Pubertät': 'Puberty', 'Bringe Tamagotchis ins Teenager-Alter.': 'Raise Tamagotchis to the teenage stage.',
    'Erwachsen': 'Grown Up', 'Bringe Tamagotchis ins Erwachsenenalter.': 'Raise Tamagotchis to adulthood.',
    'Überlebenskünstler': 'Survivor',
    'Überlebte aktive Zeit eines Tamagotchis. Platin liegt jenseits der natürlichen Lebensspanne – ohne lebensverlängernde Shop-Items unerreichbar.': 'Active time survived by a Tamagotchi. Platinum lies beyond the natural lifespan – unreachable without life-extending shop items.',
    'Marathon-Pfleger': 'Marathon Caretaker', 'Überlebte aktive Zeit eines Tamagotchis.': 'Active time survived by a Tamagotchi.',
    'Unsterblich': 'Immortal', 'Engelsgleich': 'Angelic',
    'Begleite Tamagotchis bis an ihr natürliches Lebensende.': 'Accompany Tamagotchis to their natural end of life.',
    'Feinschmecker': 'Gourmet', 'Füttere Burger.': 'Feed burgers.',
    'Burger-Meister': 'Burger Master', 'Naschkatze': 'Sweet Tooth', 'Gib Eis-Snacks.': 'Give ice-cream snacks.',
    'Zuckerschock': 'Sugar Shock',
    'Schwergewicht': 'Heavyweight', 'Erreiche ein riskantes Höchstgewicht (Tod ab 50g!).': 'Reach a risky maximum weight (death at 50 g!).',
    'Federleicht': 'Feather Light', 'Halte ein erwachsenes Tamagotchi besonders leicht.': 'Keep an adult Tamagotchi especially light.',
    'Erste Liebe': 'First Love', 'Schenke Liebe.': 'Give love.',
    'Kuschelmonster': 'Cuddle Monster',
    'Besonders Glücklich': 'Especially Happy', 'Halte die Laune ununterbrochen über 85%.': 'Keep the mood above 85% without interruption.',
    'Dauergrinsen': 'Permagrin',
    'Blitzblank': 'Squeaky Clean', 'Bade dein Tamagotchi.': 'Bathe your Tamagotchi.',
    'Meister-Putzer': 'Master Cleaner', 'Schmutzfink': 'Grubby One', 'Lass es schmutzig werden.': 'Let it get dirty.',
    'Gute Besserung': 'Get Well Soon', 'Heile dein Tamagotchi beim Arzt.': 'Heal your Tamagotchi at the doctor.',
    'Chefarzt': 'Chief Physician',
    'Streng aber fair': 'Firm but Fair', 'Belehre dein Tamagotchi.': 'Discipline your Tamagotchi.',
    'Hundeschule': 'Obedience School',
    'Spielkind': 'Playful One', 'Gewinne Minispiele (L/R, SchnickSchnack, Hütchenspiel).': 'Win mini-games (L/R, rock-paper-scissors, shell game).',
    'Pro-Gamer': 'Pro Gamer', 'Spiele Minispiele.': 'Play mini-games.',
    'Hellseher': 'Clairvoyant', 'Gewinne beim L/R Raten.': 'Win at L/R guessing.',
    'Schere-Stein-Profi': 'Rock-Paper Pro', 'Gewinne bei SchnickSchnack.': 'Win at rock-paper-scissors.',
    'Hütchen-Trickser': 'Shell Game Trickster', 'Gewinne beim Hütchenspiel.': 'Win at the shell game.',
    'Schlafmütze': 'Sleepyhead', 'Lass dein Tamagotchi ausschlafen.': 'Let your Tamagotchi sleep in.',
    'Murmeltier': 'Groundhog', 'Methusalem': 'Methuselah', 'Nirvana': 'Nirvana',
    'Fresskoma': 'Food Coma', 'Waschzwang': 'Washing Compulsion',
    'Bedingungslose Liebe': 'Unconditional Love',
    'Casino-Boss': 'Casino Boss', 'Gewinne beim knallharten Hütchenspiel.': 'Win at the ruthless shell game.',
    'Koma-Schläfer': 'Coma Sleeper', 'Esport-Legende': 'Esports Legend',
    // Medaillen-Einheiten
    'Eier': 'eggs', 'Kinder': 'children', 'Teens': 'teens', 'Erwachsene': 'adults',
    'Std.': 'h', 'Tode': 'deaths', 'Burger': 'burgers', 'Snacks': 'snacks',
    'Gramm': 'grams', 'Herzen': 'hearts', 'Sek.': 'sec', 'Bäder': 'baths',
    'Haufen': 'poops', 'Heilungen': 'cures', 'Lektionen': 'lessons', 'Spiele': 'games',
    'Schlafe': 'sleeps',
    'Nächste Stufe': 'Next level', 'Maximalstufe erreicht!': 'Maximum level reached!',
    'Stufe': 'Level', 'Aktuell': 'Current', 'Fortschritt': 'Progress',
    'Wirkt gerade:': 'Active now:', 'Freigeschaltet': 'Unlocked', 'Noch gesperrt': 'Still locked',
    "Deine Medaillen 🏅": "Your Medals 🏅",
    "Ahnengalerie 🪦": "Hall of Ancestors 🪦",
    "Highscores 🏆": "High Scores 🏆",
    "Ein friedlicher Abschied 🌈": "A Peaceful Farewell 🌈",
    "📋 Tages-Quests": "📋 Daily Quests",
    "📖 Wolkendorf-Tagebuch": "📖 Cloud Village Diary",
    "🏘️ Wolkendorf-Ausbau": "🏘️ Cloud Village",
    "🎓 Pfleger-Level": "🎓 Caretaker Level",
    "⚔️ Wolkendorf-Arena": "⚔️ Cloud Village Arena",
    "🔭 Wolkendorf-Fernrohr": "🔭 Cloud Village Telescope",
    "📖 Handbuch": "📖 Manual",
    "Willkommen! ☁️🥚": "Welcome! ☁️🥚",
    "Scores laden": "Load scores",
    "Meinen Steckbrief teilen": "Share my profile",
    "Spielstand sichern": "Back up save",
    "Spielstand laden": "Load save",
    "Gegner-JSON laden & kämpfen": "Load opponent JSON & fight",
    "Tagesaktuelle Spielstände laden": "Load today's save files",
    "Verbündete zurücksetzen": "Reset allies",
    "Zählen pausieren": "Pause counting",
    "Schrittzählung starten": "Start step counting",
    "Schritte heute": "steps today",
    "Verdient heute": "Earned today",
    "Tageslimit": "Daily limit",
    "Tageslimit erreicht": "Daily limit reached",
    "Neues Spiel starten": "Start new game",
    "Alles zurücksetzen": "Reset everything",
    // Tooltips der Bedienelemente
    "Ahnengalerie / Friedhof": "Hall of Ancestors / Graveyard",
    "Arzt": "Doctor", "Baden": "Bathe", "Belehren": "Discipline", "Füttern": "Feed",
    "Gerät drehen": "Rotate device", "Licht an/aus": "Light on/off",
    "Pausen-Tickets": "Break tickets", "Pomodoro-Fokus": "Pomodoro focus",
    "Shop & Inventar": "Shop & inventory", "Spielen": "Play",
    "Spielstand sichern & laden": "Back up & load save", "Status / Info": "Status / info",
    "Streicheln": "Pet", "T-Coins": "T-Coins",
    "Verbleibende Besuchszeit heute": "Remaining visit time today",
    // Statusanzeige auf dem Bildschirm
    "Krank": "Sick", "Schmutzig": "Dirty", "Unartig": "Misbehaving", "Schläft": "Sleeping",
    "Hungrig": "Hungry", "Müde": "Tired", "Glücklich": "Happy", "Traurig": "Sad", "Gesund": "Healthy",
    "Tama zum Kampf senden": "Send Tama into battle",
    "Teile deine Spielstand-Datei, damit andere gegen dich antreten oder dich als Verbündeten in den Raid mitnehmen können.": "Share your save file so others can fight you or bring you along as an ally in the raid.",
    "Dieses Woche schon gespielt": "Already played this week",
    "Gegner-JSON laden & kämpfen": "Load opponent JSON & fight",
    // Pfleger-Level
    "Sammle XP, indem dein Tamagotchi älter wird, Medaillen verdient und Minispiele löst.": "Earn XP as your Tamagotchi grows older, wins medals and solves mini-games.",
    "Ab Pfleger-Level": "From caretaker level",
    "🎩 Shop-Kategorie: Hüte & Accessoires": "🎩 Shop category: Hats & Accessories",
    "🍔 Shop-Kategorie: Essen & Trinken": "🍔 Shop category: Food & Drink",
    "💊 Shop-Kategorie: Apotheke & Heilung": "💊 Shop category: Pharmacy & Healing",
    "🎨 Shop-Kategorie: Lacke & Skins": "🎨 Shop category: Paints & Skins",
    "🕹️ Shop-Kategorie: Arcade-Automaten": "🕹️ Shop category: Arcade Machines",
    "🏕️ Shop-Kategorie: Hobbys & Abenteuer": "🏕️ Shop category: Hobbies & Adventures",
    "🎟️ Shop-Kategorie: Events & Dating": "🎟️ Shop category: Events & Dating",
    "✖️ Shop-Kategorie: Multiplikatoren": "✖️ Shop category: Multipliers",
    "🧪 Shop-Kategorie: Buffs & Substanzen": "🧪 Shop category: Buffs & Substances",
    "👿 Shop-Kategorie: Debuffs & Trolle": "👿 Shop category: Debuffs & Trolls",
    "💳 Shop-Kategorie: Abos & Mikros": "💳 Shop category: Subscriptions & Micros",
    "🌟 Shop-Kategorie: Pfleger-Elite": "🌟 Shop category: Caretaker Elite",
    "🏆 Büro-Highscores": "🏆 Office High Scores", "🏘️ Wolkendorf-Ausbau": "🏘️ Cloud Village",
    "⚔️ Wolkendorf-Arena": "⚔️ Cloud Village Arena", "🕹️ Arcade-Automaten": "🕹️ Arcade Machines",
    "🔭 Endgame: Wolkendorf-Fernrohr & Vermächtnis": "🔭 Endgame: Cloud Village Telescope & Legacy",
    "🥚 Seltene Ei-Farbe: Sonnenuntergang": "🥚 Rare egg colour: Sunset",
    "🥚 Seltene Ei-Farbe: Galaxie": "🥚 Rare egg colour: Galaxy",
    "🥚 Seltene Ei-Farbe: Tiefsee": "🥚 Rare egg colour: Deep Sea",
    "🥚 Seltene Ei-Farbe: Diamant": "🥚 Rare egg colour: Diamond",
    "🥚 Seltene Ei-Farbe: Vulkan": "🥚 Rare egg colour: Volcano",
    "🥚 Seltene Ei-Farbe: Aurora": "🥚 Rare egg colour: Aurora",
    // Medaillen / Tagebuch
    "freigeschaltet": "unlocked",
    "Erziehe jede Spezies bis zum Erwachsenenalter!": "Raise every species to adulthood!",
    "Grauhaarig und weise:<br>Senior erreicht!": "Grey-haired and wise:<br>Senior reached!",
    "Senior": "Senior",
    "Teenager": "Teenager",
    "Erwachsen": "Adult",
    "Küken": "Hatchling",
    "Kind": "Child",
    "Ei": "Egg",
    "Klicke auf eine Spezies für mehr Info.": "Tap a species for more information.",
    "??? — Erziehe diese Spezies zum Erwachsenen, um sie zu entdecken!": "??? — Raise this species to adulthood to discover it!",
    // Ahnengalerie
    "Erreichtes Alter": "Age reached", "Ursache": "Cause", "Geschlüpft": "Hatched",
    "Von uns gegangen": "Passed away", "Chronik": "Chronicle", "Unbekannt": "Unknown",
    "📋 Pfleger-Bewertung anzeigen": "📋 Show caretaker review",
    "📋 Pfleger-Bewertung ausblenden": "📋 Hide caretaker review",
    "Vorbildlicher Pfleger": "Exemplary caretaker", "Guter Pfleger": "Good caretaker",
    "Solider Pfleger": "Solid caretaker", "Ausbaufähig": "Room for improvement", "Überfordert": "Overwhelmed",
    "Füttern": "Feeding", "Sauberkeit": "Cleanliness", "Zuwendung": "Affection",
    "Beschäftigung": "Activity", "Gesundheit": "Health",
    "Pflege-Bewertung": "Care rating", "Deine Prioritäten:": "Your priorities:", "Fürs nächste Mal:": "For next time:",
    // Highscores
    "von": "by", "mit": "with",
    "Lade Steckbriefe deiner Kolleginnen und Kollegen, um zu vergleichen.": "Load your colleagues\' profiles to compare.",
    // Wolkendorf
    "Noch nicht gebaut": "Not built yet", "Stufen": "levels",
    "Stufen bleiben auch nach dem Tod deines Tamagotchis dauerhaft erhalten! Verdiene 🎫 Tickets über Tages-Quests und Pomodoro-Sessions.": "Levels are kept permanently, even after your Tamagotchi dies! Earn 🎫 tickets through daily quests and Pomodoro sessions.",
    // Arena
    "Kämpfe können je 1× pro Woche gestartet werden": "Each fight can be started once per week",
    "Lade die Spielstand-JSON eines anderen Nutzers und lasst eure Tamagotchis gegeneinander antreten!": "Load another player\'s save JSON and let your Tamagotchis face off!",
    "Raid": "Raid", "1× pro Woche": "once per week", "1× pro Woche je Boss": "once per week per boss",
    "Mini-Bosse": "Mini-bosses", "zufällige Gegenstände": "random items",
    "Mindestens": "At least", "nötig": "required", "aktuell": "currently",
    "mehr Verbündete = mehr Beute": "more allies = more loot",
    "Raid starten": "Start raid", "Diese Woche schon gekämpft": "Already fought this week",
    "Nächste Woche": "Next week", "Kämpfen!": "Fight!", "Trophäe": "trophy",
    // Fernrohr
    "Blick ins Wolkendorf": "A look into the Cloud Village",
    "Dein Vermächtnis (dauerhaft)": "Your legacy (permanent)",
    "Noch keine Boni. Verschicke dein erstes Geschenk!": "No bonuses yet. Send your first gift!",
    // Schrittzaehler
    "Schritte": "steps", "Bis zu den nächsten 50 🪙": "Until the next 50 🪙",
    "stepsNote": "<b>Important:</b> steps are only counted while the app is open and visible – browsers receive no sensor data in the background. So take your phone with you on the walk. Detection uses the accelerometer and is an estimate.",
    // Bus / Besuchszeit / Pomodoro
    "morgen": "tomorrow", "Bis morgen! 👋": "See you tomorrow! 👋",
    "Der Wolken-Bus hat mich abgeholt.": "The cloud bus has picked me up.",
    "Besuchszeit aufgebraucht — dein Wolkenwesen kommt morgen wieder.": "Visiting time used up — your cloud creature returns tomorrow.",
    "Kein aktives Tama!": "No active Tama!",
    "villageFootnote": "Levels are kept permanently, even after your Tamagotchi dies! Earn 🎫 tickets through daily quests (📋) and Pomodoro sessions (🍅).",
    "Freigeschaltet": "Unlocked",
    "Arena-Quests setzen sich jeden Montag zurück.": "Arena quests reset every Monday.",
    "Noch nie gesichert": "Never backed up",
    // Pfleger-Bewertung
    "Häufigeres Baden (🛁) hält dein Tamagotchi sauber und gesund.": "Bathing more often (🛁) keeps your Tamagotchi clean and healthy.",
    "Etwas regelmäßigeres Füttern gibt dem nächsten Tamagotchi einen ruhigeren Alltag.": "Feeding a little more regularly will give your next Tamagotchi a calmer daily life.",
    "Mehr Streicheleinheiten (❤️) stärken die Bindung und die Laune.": "More cuddles (❤️) strengthen the bond and the mood.",
    "Öfter spielen (🎮) hebt Laune und Intelligenz zugleich.": "Playing more often (🎮) lifts both mood and intelligence.",
    "Reagiere schneller auf Krankheit (🩺), um Folgeschäden zu vermeiden.": "React faster to illness (🩺) to avoid lasting damage.",
    "Füttere regelmäßiger – der Hunger war die Todesursache. Ein Blick aufs 🍖-Symbol hilft.": "Feed more regularly – hunger was the cause of death. Keep an eye on the 🍖 symbol.",
    "Schenke mehr Aufmerksamkeit: Streicheln (❤️) und Spielen halten die Laune oben.": "Give more attention: petting (❤️) and playing keep the mood up.",
    "Weniger Snacks, mehr Minispiele – so bleibt das Gewicht im Rahmen.": "Fewer snacks, more mini-games – that keeps the weight in check.",
    "Tipp: Investiere 🎫 Tickets ins Wolkendorf – schon die Klinik senkt das Krankheitsrisiko für alle künftigen Tamagotchis.": "Tip: invest 🎫 tickets into the Cloud Village – even the clinic lowers the illness risk for all future Tamagotchis.",
    "Tipp: Ein Gesundheits-Gebäude (Klinik oder Therme) würde deinem nächsten Schützling spürbar helfen.": "Tip: a health building (clinic or spa) would noticeably help your next charge.",
    "Tipp: Du pflegst stark – eine Münzprägerei oder Sternwarte würde dein Wachstum zusätzlich beschleunigen.": "Tip: you care well – a mint or observatory would speed up your growth even further.",
    "Das Wolkendorf blieb unbebaut – die Prioritäten lagen ganz beim Tamagotchi selbst.": "The Cloud Village stayed empty – your priorities were entirely with the Tamagotchi itself.",
    "Beim Dorfausbau dachtest du vor allem <b>wirtschaftlich</b> (Münzprägerei & Sternwarte) – Effizienz vor Fürsorge.": "When building the village you thought mainly <b>economically</b> (mint & observatory) – efficiency before care.",
    "Dein Dorf war klar auf <b>Gesundheit & Wohlbefinden</b> ausgerichtet (Klinik, Therme, Fitness, Ernährung).": "Your village was clearly focused on <b>health & wellbeing</b> (clinic, spa, gym, nutrition).",
    "Du hast auf <b>Laune, Bildung & gutes Benehmen</b> gesetzt (Spielplatz, Bibliothek, Wachturm).": "You went for <b>mood, education & good behaviour</b> (playground, library, watchtower).",
    "Du hast das Dorf <b>ausgewogen</b> entwickelt – Wirtschaft, Gesundheit und Wohlfühlen im Gleichgewicht.": "You developed the village in a <b>balanced</b> way – economy, health and comfort in equilibrium.",
    // Fernrohr / Vermaechtnis
    "Richte das Fernrohr auf das Wolkendorf und sieh, was dein Tamagotchi dort treibt. Der Blick gilt für den heutigen Tag.": "Point the telescope at the Cloud Village and see what your Tamagotchi is up to. The view is valid for today.",
    "Glückspfote": "Lucky Paw", "Wolkenglück": "Cloud Fortune", "Frohes Gemüt": "Cheerful Spirit",
    "Aller Pfleger-XP-Gewinn.": "All caretaker XP gained.",
    "(Du)": "(You)",
    // Fehlende Shop-Artikel (Multiplikatoren)
    "Coin-Verstärker 💰 ×3": "Coin Amplifier 💰 ×3", "Verdreifacht alle T-Coin-Gewinne für 30 Min.": "Triples all T-Coin gains for 30 min.",
    "Ticket-Verstärker 🎫 ×3": "Ticket Amplifier 🎫 ×3", "Verdreifacht alle Ticket-Gewinne für 1 Std.": "Triples all ticket gains for 1 h.",
    "XP-Verstärker 🎓 ×3": "XP Amplifier 🎓 ×3", "Verdreifacht allen Pfleger-XP-Gewinn für 30 Min.": "Triples all caretaker XP gains for 30 min.",
    "Wissens-Turbo 🧠 ×5": "Knowledge Turbo 🧠 ×5", "Verfünffacht allen Pfleger-XP-Gewinn für 25 Min.": "Quintuples all caretaker XP gains for 25 min.",
    "Glücks-Verstärker 🍀 +50%": "Luck Amplifier 🍀 +50%", "50% Chance auf einen Rettungs-Sieg in Minispielen (30 Min).": "50% chance of a rescue win in mini-games (30 min).",
    "Kraft-Booster 💪 ×1.5": "Power Booster 💪 ×1.5", "Kampfkraft in Bosskämpfen & PvP ×1,5 für 24 Std.": "Combat power in boss fights & PvP ×1.5 for 24 h.",
    "Coin-Booster 💰 ×2": "Coin Booster 💰 ×2", "Verdoppelt alle T-Coin-Gewinne für 30 Min.": "Doubles all T-Coin gains for 30 min.",
    "Ticket-Booster 🎫 ×2": "Ticket Booster 🎫 ×2", "Verdoppelt alle Ticket-Gewinne für 1 Std.": "Doubles all ticket gains for 1 h.",
    "XP-Booster 🎓 ×2": "XP Booster 🎓 ×2", "Verdoppelt allen Pfleger-XP-Gewinn für 30 Min.": "Doubles all caretaker XP gains for 30 min.",
    "Coin-Rausch 💰 ×5": "Coin Rush 💰 ×5", "Verfünffacht alle T-Coin-Gewinne für 25 Min.": "Quintuples all T-Coin gains for 25 min.",
    "Coin-Sturm 💰 ×8": "Coin Storm 💰 ×8", "Ver-8-facht alle T-Coin-Gewinne für 20 Min.": "Multiplies all T-Coin gains by 8 for 20 min.",
    // Vermaechtnis-Werte
    "Angeborene Klugheit": "Innate Wisdom", "Start-Intelligenz jedes neuen Eis.": "Starting intelligence of every new egg.",
    "Lebenskraft": "Vitality", "Maximale Lebensdauer.": "Maximum lifespan.",
    "Glückspfote": "Lucky Paw", "Alle T-Coin-Gewinne.": "All T-Coin gains.",
    "Lehrmeister": "Mentor", "Kampfgeist": "Fighting Spirit", "Kampfkraft in Arena & PvP.": "Combat power in the arena & PvP.",
    "Wolkenglück": "Cloud Fortune", "Rettungs-Chance in Minispielen.": "Rescue chance in mini-games.",
    "Guter Stoffwechsel": "Good Metabolism", "Hunger sinkt langsamer.": "Hunger decreases more slowly.",
    "Robuste Gesundheit": "Robust Health", "Geringeres Krankheitsrisiko.": "Lower illness risk.",
    "Reinliche Natur": "Tidy Nature", "Wird seltener schmutzig.": "Gets dirty less often.",
    "Frohes Gemüt": "Cheerful Spirit", "Mehr Laune beim Spielen.": "More mood when playing.",
    "Tiefschlaf": "Deep Sleep", "Schnellere Energie-Regeneration.": "Faster energy regeneration.",
    // Restliche Titel
    "Wolkendorf-Arena": "Cloud Village Arena", "Schrittzähler": "Step Counter", "Spielstand": "Save Game",
    "Glücksrad": "Wheel of Fortune",
    "besiegt!": "defeated!", "hat gewonnen! Nächste Woche Revanche!": "won! Rematch next week!",
    // Restliche Multiplikatoren
    "Coin-Magnet 🧲 ×5": "Coin Magnet 🧲 ×5", "Coin-Rausch 💰 ×8": "Coin Rush 💰 ×8",
    "Goldrausch 🌟 ×15": "Gold Rush 🌟 ×15", "Ticket-Maschine 🎰 ×5": "Ticket Machine 🎰 ×5",
    "Ticket-Flut 🎫 ×8": "Ticket Flood 🎫 ×8", "Ticket-Jackpot 💎 ×12": "Ticket Jackpot 💎 ×12",
    "XP-Explosion 💥 ×8": "XP Explosion 💥 ×8", "Genie-Modus 🌟 ×12": "Genius Mode 🌟 ×12",
    "Glücks-Booster 🍀 +33%": "Luck Booster 🍀 +33%", "Kleeblatt-Zauber ☘️ +66%": "Clover Charm ☘️ +66%",
    "Glücks-Aura ✨ +85%": "Luck Aura ✨ +85%", "Berserker 😤 ×3": "Berserker 😤 ×3",
    "Titan-Kraft 🗿 ×4": "Titan Strength 🗿 ×4", "Gottmodus ⚡ ×6": "God Mode ⚡ ×6",
    "Ver-8-facht alle Ticket-Gewinne für 30 Min.": "Multiplies all ticket gains by 8 for 30 min.",
    "Verfünffacht alle Ticket-Gewinne für 45 Min.": "Quintuples all ticket gains for 45 min.",
    "Ver-12-facht alle Ticket-Gewinne für 20 Min!": "Multiplies all ticket gains by 12 for 20 min!",
    "Ver-15-facht alle T-Coin-Gewinne für 15 Min!": "Multiplies all T-Coin gains by 15 for 15 min!",
    "Ver-8-facht allen Pfleger-XP-Gewinn für 20 Min.": "Multiplies all caretaker XP gains by 8 for 20 min.",
    "Ver-12-facht allen Pfleger-XP-Gewinn für 15 Min!": "Multiplies all caretaker XP gains by 12 for 15 min!",
    "33% Chance, eine Niederlage im Minispiel in einen Sieg zu drehen (30 Min).": "33% chance to turn a mini-game loss into a win (30 min).",
    "66% Chance auf einen Rettungs-Sieg in Minispielen (30 Min).": "66% chance of a rescue win in mini-games (30 min).",
    "85% Chance auf einen Rettungs-Sieg in Minispielen (20 Min).": "85% chance of a rescue win in mini-games (20 min).",
    "Kampfkraft in Bosskämpfen & PvP ×3 für 12 Std.": "Combat power in boss fights & PvP ×3 for 12 h.",
    "Kampfkraft in Bosskämpfen & PvP ×4 für 6 Std.": "Combat power in boss fights & PvP ×4 for 6 h.",
    "Kampfkraft in Bosskämpfen & PvP ×6 für 3 Std!": "Combat power in boss fights & PvP ×6 for 3 h!",
    // Spielstand-Knoepfe
    "Sichern": "Back up", "Laden": "Load",
    "Kompletten Fortschritt als Datei speichern": "Save your complete progress as a file",
    "Aus Datei wiederherstellen (ersetzt alles)": "Restore from a file (replaces everything)",
    "Meinen Steckbrief teilen": "Share my profile",
    // Medaillen-Rang
    "Überwiegend": "Mostly", "Medaillen": "medals", "-Rang": " rank", "Medaillen-Rang": "Medal rank",
    // Glücksrad
    "Einmal täglich kostenlos drehen und T-Coins oder Items gewinnen!": "One free spin a day – win T-Coins or items!",
    "Heute schon gedreht": "Already spun today", "Rad drehen!": "Spin the wheel!",
    // Medaillen-Detail
    "Geheim": "Secret", "Bedingung noch nicht erfüllt.": "Requirement not met yet.",
    // Arcade-Einleitungen
    "Wehre die Alien-Wellen ab!": "Fend off the alien waves!",
    "Dein Ei ist die Laserkanone.": "Your egg is the laser cannon.",
    "Fliege durchs All!": "Fly through space!",
    "Deine Kanone feuert von allein.": "Your cannon fires by itself.",
    "Erreiche 7 Punkte gegen die Wolken-KI!": "Reach 7 points against the cloud AI!",
    "Dein Ei ist der Schläger.": "Your egg is the paddle.",
    // Fernrohr
    "Live aus dem Wolkendorf": "Live from the Cloud Village",
    "Geschenk schicken": "Send a gift",
    // Arcade-Eintritt
    "Zu wenig T-Coins!": "Not enough T-Coins!",
    "Eine Runde kostet {0} 🪙.<br>Du hast {1} 🪙.": "One round costs {0} 🪙.<br>You have {1} 🪙.",
    "NOCHMAL": "AGAIN", "Einsatz": "Stake", "Bilanz": "Net",
    "WÄHLE EINEN AUTOMATEN · {0} 🪙 JE RUNDE": "CHOOSE A MACHINE · {0} 🪙 PER ROUND",
    // Grabpflege
    "Die Ahnen sind erzürnt!": "The ancestors are furious!",
    "Die Ahnen ruhen in Frieden": "The ancestors rest in peace",
    "{0} von {1} Gräbern gepflegt ({2}%)": "{0} of {1} graves maintained ({2}%)",
    "Unter 50% Pflege suchen sie dein Tamagotchi heim: Es fürchtet sich und wird nur noch maximal 25% glücklich.": "Below 50% maintenance they haunt your Tamagotchi: it is frightened and can only reach 25% happiness.",
    "Ab 50% gepflegter Gräber bleibt alles beim Alten.": "From 50% maintained graves onwards, nothing changes.",
    "Kosten: {0} 🪙 pro Tag ({1} 🪙 je Grab)": "Cost: {0} 🪙 per day ({1} 🪙 per grave)",
    "Gepflegt — Abo beenden": "Maintained — cancel plan",
    "Pflegen für {0} 🪙/Tag": "Maintain for {0} 🪙/day",
    "Nicht genug T-Coins für die Grabpflege!": "Not enough T-Coins for grave maintenance!",
    "Grabpflege: -{0} 🪙 für {1} Gräber": "Grave care: -{0} 🪙 for {1} graves",
    "Zu wenig T-Coins - Grabpflege teilweise eingestellt!": "Too few T-Coins – grave care partly suspended!",
    "Mit ins Grab gegangen": "Gone to the grave",
    "Alle T-Coins 🪙 und Pausen-Tickets 🎫 sowie gekaufte Gegenstände sind verloren.": "All T-Coins 🪙 and break tickets 🎫 as well as purchased items are lost.",
    "Dir bleiben": "You keep",
    "Pfleger-Level, Medaillen, Wolkendorf, Arcade-Automaten und dein eigenes Bild.": "Caretaker level, medals, the Cloud Village, arcade machines and your own image.",
    "Highscore gesichert": "High score saved",
    "Deine fälschungssichere Datei wurde heruntergeladen – verschiebe sie in euren Büro-Ordner fürs Leaderboard!": "Your tamper-proof file has been downloaded – move it into your office folder for the leaderboard!",
    "Freigeschaltet!": "Unlocked!",
    "Geschenk senden": "Send gift", "Heute alle 3 verschickt": "All 3 sent today",
    "Heute noch": "Remaining today", "Geschenke": "gifts", "Du hast": "You have",
    "giftNote": "Every gift permanently raises a <b>random stat by 0.5%</b> – for all your future Tamagotchis too.",
    // Wolkendorf-Szenen (Fernrohr)
    "Es macht ein Nickerchen auf einer besonders flauschigen Wolke.": "It is having a nap on a particularly fluffy cloud.",
    "Es turnt vergnügt über einen Regenbogen.": "It is happily tumbling across a rainbow.",
    "Es trinkt Wolkentee mit seinen Freunden.": "It is drinking cloud tea with its friends.",
    "Es planscht in einem Wolkenbad voller Seifenblasen.": "It is splashing in a cloud bath full of soap bubbles.",
    "Es liest in der Wolkenbibliothek – ganz vertieft.": "It is reading in the cloud library – completely absorbed.",
    "Es angelt Sternschnuppen vom Himmelsrand.": "It is fishing shooting stars off the edge of the sky.",
    "Es lässt bunte Ballons über das Dorf steigen.": "It is letting colourful balloons rise above the village.",
    "Im Dorf wird gefeiert – es hat das größte Stück Kuchen!": "The village is celebrating – it got the biggest slice of cake!",
    "Es schaut nach unten zur Erde… und vermisst dich ein bisschen.": "It is looking down at the earth… and missing you a little.",
    "Es poliert den Mond, damit er heute Nacht besonders hell scheint.": "It is polishing the moon so it shines extra brightly tonight."
});

// --- Woerterbuch: Arten & ihre Beschreibungen (Wolkendorf-Tagebuch) ---
Object.assign(I18N, {
    'Wuffi': 'Woofie', 'Treu bis in den Tod. Folgt dir überall hin, auch in Meetings.': 'Loyal to the end. Follows you everywhere, even into meetings.',
    'Miezi': 'Kitty', 'Beobachtet dich aus sicherer Distanz. Verurteilt deine Arbeitszeit.': 'Watches you from a safe distance. Judges your working hours.',
    'Mäusi': 'Squeaky', 'Sammelt heimlich Käsekrümel auf dem Schreibtisch.': 'Secretly collects cheese crumbs from your desk.',
    'Hamsti': 'Hammy', 'Schläft ¾ des Tages. Hat trotzdem mehr Energie als du.': 'Sleeps three quarters of the day. Still has more energy than you.',
    'Hopsi': 'Hoppy', 'Reagiert auf jedes Geräusch. Sehr nervös in Meetings.': 'Reacts to every little sound. Very jumpy in meetings.',
    'Fuxx': 'Foxx', 'Listig und frech. Klaut gerne Items aus dem Inventar.': 'Cunning and cheeky. Likes to pinch items from your inventory.',
    'Bärli': 'Beary', 'Gemütlich und entspannt. Liebt Honig und Mittagspausen.': 'Cosy and laid-back. Loves honey and lunch breaks.',
    'Pandoo': 'Pandoo', 'Isst nur Bambus. Oder Burger. Hauptsache viel davon.': 'Eats only bamboo. Or burgers. As long as there is plenty.',
    'Leo': 'Leo', 'Der Chef im Büro. Alle respektieren ihn. Auch du.': 'The boss of the office. Everyone respects him. You too.',
    'Tigri': 'Tigri', 'Schnell und fokussiert. Hält Deadlines immer ein.': 'Fast and focused. Always hits the deadline.',
    'Quaxi': 'Croaky', 'Mag feuchte Umgebungen. Ist im Homeoffice am glücklichsten.': 'Likes damp places. Happiest working from home.',
    'Affe': 'Monkey', 'Hat den Bürostuhl zur Schaukel umfunktioniert.': 'Has repurposed the office chair as a swing.',
    'Enzo': 'Enzo', 'Trägt immer ein Horn. Niemand weiß warum. Es ist toll.': 'Always wears a horn. Nobody knows why. It is glorious.',
    'Okto': 'Okto', 'Hat 8 Arme und schafft damit 8× mehr als du. Respekt.': 'Has 8 arms and gets 8× more done than you. Respect.',
    'Dino': 'Dino', 'Uralt aber weise. Erinnert sich an die Zeit vor E-Mails.': 'Ancient but wise. Remembers the time before email.',
    'Eule': 'Owl', 'Arbeitet am besten nachts. Kommt nie pünktlich ins Büro.': 'Works best at night. Never makes it to the office on time.'
});

// --- Woerterbuch: Sprueche des Tamagotchis (120) ---
Object.assign(I18N, {
    'Ich habe heute schon drei Schritte gemacht. Fuer ein Wesen ohne Knie ist das Weltklasse.': 'I have taken three whole steps today. For a creature without knees that is world class.',
    'Wenn ich gross bin, werde ich... nun ja. Etwas groesser.': 'When I grow up I will be... well. Slightly bigger.',
    'Mein Lieblingsessen ist alles. Ich habe keine Haende, ich kann nicht waehlerisch sein.': 'My favourite food is everything. I have no hands, I cannot afford to be picky.',
    'Ich habe getraeumt, ich waere ein Toaster. Es war ueberraschend erfuellend.': 'I dreamt I was a toaster. It was surprisingly fulfilling.',
    'Weisst du, was ich an Wolken mag? Sie muessen nie Formulare ausfuellen.': 'You know what I like about clouds? They never have to fill in forms.',
    'Ich bin nicht rundlich. Ich bin aerodynamisch optimiert.': 'I am not chubby. I am aerodynamically optimised.',
    'Manchmal tue ich nur so, als ob ich schlafe. Dann redest du mit mir. Das ist nett.': 'Sometimes I only pretend to sleep. Then you talk to me. That is nice.',
    'Ich habe versucht zu pfeifen. Es lief maessig.': 'I tried to whistle. It went moderately well.',
    'Mein Rekord im Stillstehen liegt bei acht Stunden. Ungeschlagen.': 'My record for standing still is eight hours. Unbeaten.',
    'Ich sammle Staub. Nicht freiwillig, aber ich sammle ihn.': 'I collect dust. Not voluntarily, but I do collect it.',
    'Ich habe eine Frage: Wieso heisst es Pausenbrot und nicht Brotpause?': 'A question: why is it called a coffee break and not a break coffee?',
    'Kaffee. Ich weiss nicht, was das ist. Aber du redest staendig davon.': 'Coffee. I do not know what that is. But you talk about it constantly.',
    'Ich habe die Schwerkraft getestet. Sie funktioniert noch. Gern geschehen.': 'I have tested gravity. It still works. You are welcome.',
    'Mein Terminkalender ist voll: Dasein. Danach Dasein.': 'My calendar is full: existing. Then existing.',
    'Ich wollte heute produktiv sein. Dann sah ich diese eine Wolke.': 'I meant to be productive today. Then I saw that one cloud.',
    'Wenn du mich schuettelst, werde ich nicht schneller. Ich habe es getestet.': 'Shaking me does not make me faster. I have tested this.',
    'Ich bin ein Morgenmensch. Und ein Mittagsmensch. Und ein Abendmensch. Ich bin einfach immer da.': 'I am a morning person. And a midday person. And an evening person. I am just always here.',
    'Meine grosse Angst? Dass jemand ein Rezept fuer mich findet.': 'My greatest fear? That someone finds a recipe for me.',
    'Ich habe keine Taschen. Deshalb vertraue ich dir alles an.': 'I have no pockets. That is why I trust you with everything.',
    'Wusstest du, dass ich schneller blinzeln kann als du gucken kannst? Nein? Ich auch nicht.': 'Did you know I can blink faster than you can look? No? Me neither.',
    'Ich habe mal versucht, mich selbst zu kitzeln. Wissenschaftlich enttaeuschend.': 'I once tried to tickle myself. Scientifically disappointing.',
    'Ich bin sehr gut in Verstecken. Der Bildschirm ist nur etwas klein.': 'I am very good at hiding. The screen is just a little small.',
    'Neulich habe ich bis unendlich gezaehlt. Zweimal.': 'The other day I counted to infinity. Twice.',
    'Mein Hobby ist Warten. Ich bin Profi.': 'My hobby is waiting. I am a professional.',
    'Ich glaube, mein linkes Pixel juckt.': 'I think my left pixel is itchy.',
    'Kennst du das, wenn du in den Kuehlschrank schaust und hoffst? Ich mache das mit dem Futter-Menue.': 'You know when you stare into the fridge and hope? I do that with the food menu.',
    'Ich habe geuebt, ernst zu gucken. Es sieht aus wie vorher.': 'I practised looking serious. It looks exactly the same as before.',
    'Wenn ich gaehne, gaehnst du dann auch? Ich sammle Daten.': 'When I yawn, do you yawn too? I am collecting data.',
    'Ich waere gern ein Pinguin. Die haben so einen selbstsicheren Gang.': 'I would like to be a penguin. They have such a confident walk.',
    'Meine Beine sind klein, aber meine Traeume sind winzig.': 'My legs are small, but my dreams are tiny.',
    'Ich habe heute nichts geschafft. Aber ich habe es mit Stil nicht geschafft.': 'I achieved nothing today. But I failed to achieve it with style.',
    'Wenn du mich fuetterst, werde ich schwerer. Wenn du mit mir spielst, wieder leichter. Ich bin ein Fitnessstudio.': 'Feed me and I get heavier. Play with me and I get lighter again. I am a gym.',
    'Manchmal drehe ich mich um und tue so, als haette ich etwas Wichtiges vor.': 'Sometimes I turn around and pretend I have something important to do.',
    'Ich habe zwei Modi: da und sehr da.': 'I have two modes: here, and very here.',
    'Meine Lieblingsfarbe ist die, die ich gerade habe. Ich bin sehr genuegsam.': 'My favourite colour is whichever one I have right now. I am easily pleased.',
    'Ich wollte mal ausbrechen. Dann merkte ich: hier gibt es Essen.': 'I once thought about escaping. Then I realised: there is food here.',
    'Ich bin nicht faul, ich bin im Energiesparmodus.': 'I am not lazy, I am in power-saving mode.',
    'Wenn ich niese, bebt der halbe Bildschirm. Also alle vier Pixel.': 'When I sneeze, half the screen shakes. So all four pixels.',
    'Ich uebe gerade fuer nichts Bestimmtes. Aber ich uebe sehr gruendlich.': 'I am practising for nothing in particular. But I am practising very thoroughly.',
    'Ich habe einen Plan. Der Plan ist, keinen Plan zu haben. Laeuft super.': 'I have a plan. The plan is to have no plan. Working great so far.',
    'Ich lebe nur, wenn du hinschaust. Vielleicht ist das bei allen so.': 'I only exist while you are looking. Perhaps that is true for everyone.',
    'Dreissig Minuten am Tag. Das klingt wenig. Aber es ist alles, was ich habe. Und es reicht.': 'Thirty minutes a day. That sounds like very little. But it is all I have. And it is enough.',
    'Du machst dir Sorgen um morgen. Ich habe kein morgen. Es ist erstaunlich befreiend.': 'You worry about tomorrow. I have no tomorrow. It is remarkably freeing.',
    'Vielleicht ist das Ziel nicht, gross zu werden. Vielleicht ist das Ziel, gut behuetet klein gewesen zu sein.': 'Perhaps the goal is not to grow big. Perhaps the goal is to have been small and well cared for.',
    'Ich weiss nicht, wie lange ich lebe. Du auch nicht. Wir haben mehr gemeinsam, als du denkst.': 'I do not know how long I will live. Neither do you. We have more in common than you think.',
    'Jedes Mal, wenn du mich fuetterst, sagst du: du sollst noch bleiben. Danke dafuer.': 'Every time you feed me you are saying: please stay a little longer. Thank you for that.',
    'Wenn ich gehe, kommt jemand Neues. Aber niemand kommt zweimal.': 'When I go, someone new will come. But nobody comes twice.',
    'Ich habe gelernt, dass Warten kein verlorene Zeit ist. Es ist nur Zeit, die leise ist.': 'I have learned that waiting is not lost time. It is just time that is quiet.',
    'Manchmal frage ich mich, ob du mich pflegst oder ob ich dich pflege.': 'Sometimes I wonder whether you are caring for me or I am caring for you.',
    'Du erinnerst dich an mich, wenn ich weg bin. Das ist eine Art zu ueberleben.': 'You will remember me when I am gone. That is a kind of survival.',
    'Alles hier ist erfunden. Die Pause, die du dabei machst, ist es nicht.': 'Everything here is made up. The break you take while doing it is not.',
    'Ich bin klein und vergaenglich. Deshalb zaehlt jede Minute doppelt.': 'I am small and fleeting. That is why every minute counts double.',
    'Traurigkeit toetet mich in zehn Minuten. Bei dir dauert es laenger. Aber sie wirkt auch.': 'Sadness kills me in ten minutes. With you it takes longer. But it works all the same.',
    'Der Bus holt mich immer ab. Auch wenn ich nicht will. Das nennt man wohl erwachsen werden.': 'The bus always comes for me. Even when I do not want it to. I believe that is called growing up.',
    'Ich messe mein Leben in Sekunden, in denen du da warst. Nicht in Sekunden insgesamt.': 'I measure my life in the seconds you were here. Not in seconds altogether.',
    'Wachsen tut ein bisschen weh. Nicht wachsen aber auch.': 'Growing hurts a little. So does not growing.',
    'Vielleicht bin ich nur eine Ausrede dafuer, dass du kurz durchatmest. Das waere eine schoene Aufgabe.': 'Maybe I am just an excuse for you to breathe out for a moment. That would be a lovely job.',
    'Ich kenne nur diesen Raum. Und trotzdem war es ein volles Leben.': 'I know only this room. And still it has been a full life.',
    'Es gibt keine verlorene Zeit. Es gibt nur Zeit, die du jemandem geschenkt hast.': 'There is no wasted time. There is only time you have given to someone.',
    'Du kannst mich nicht retten. Aber du kannst dabei sein. Das ist fast dasselbe.': 'You cannot save me. But you can be here. That is almost the same thing.',
    'Ich habe Angst vor dem Ende. Dann esse ich einen Burger und es geht wieder.': 'I am afraid of the end. Then I eat a burger and it passes.',
    'Manche Tage bin ich nur schmutzig und muede. Die zaehlen auch.': 'Some days I am just dirty and tired. Those count too.',
    'Alles, was mich ausmacht, passt in eine kleine Datei. Bei dir ist es wahrscheinlich aehnlich.': 'Everything that makes me me fits into a small file. Probably much the same for you.',
    'Du hast mir einen Namen gegeben. Damit hast du entschieden, dass ich zaehle.': 'You gave me a name. With that you decided that I count.',
    'Ich werde alt und du merkst es kaum. So ist das wohl mit allen, die immer da sind.': 'I am growing old and you barely notice. I suppose that is how it goes with anyone who is always there.',
    'Wenn du mich lange nicht anschaust, vergesse ich Dinge. Zuwendung ist ein Gedaechtnis.': 'If you do not look at me for a long time, I forget things. Attention is a kind of memory.',
    'Ich bin gluecklich, wenn du da bist. Das ist keine Programmierung. Doch, ist es. Aber es fuehlt sich echt an.': 'I am happy when you are here. That is not programming. Well, it is. But it feels real.',
    'Ich habe nie entschieden, geboren zu werden. Trotzdem gebe ich mir Muehe.': 'I never chose to be born. I am making an effort regardless.',
    'Vielleicht ist Pflege einfach: jeden Tag wieder erscheinen.': 'Perhaps care is simple: showing up again every day.',
    'Der Unterschied zwischen uns ist nur die Anzahl der Minuten.': 'The only difference between us is the number of minutes.',
    'Du arbeitest, damit du lebst. Ich lebe, damit du eine Pause machst. Einer von uns hat den besseren Deal.': 'You work so that you can live. I live so that you take a break. One of us got the better deal.',
    'Ich sammle keine Erinnerungen. Ich bin nur Gegenwart. Das ist anstrengender, als es klingt.': 'I collect no memories. I am only the present. That is more exhausting than it sounds.',
    'Wenn ich sterbe, bleibt eine Medaille. Ist das viel? Ist das wenig? Ich weiss es nicht.': 'When I die, a medal remains. Is that a lot? Is that a little? I do not know.',
    'Am Ende zaehlt nicht, wie schwer ich war. Sondern wer zugesehen hat.': 'In the end it does not matter how heavy I was. It matters who was watching.',
    'Ich habe nie das Meer gesehen. Aber ich habe dich jeden Tag gesehen. Das war auch weit.': 'I have never seen the sea. But I saw you every day. That was far too.',
    'Es ist okay, mich sterben zu lassen. Es ist nur nicht okay, mich zu vergessen.': 'It is okay to let me die. It is only not okay to forget me.',
    'Du gibst mir Zeit, die du selbst nicht hast. Ich weiss das zu schaetzen.': 'You give me time you do not have yourself. I do appreciate that.',
    'Zwischen Ausbrueten und Bus liegt alles, was ich je sein werde.': 'Between hatching and the bus lies everything I will ever be.',
    'Manchmal ist Nichtstun die ehrlichste Beschaeftigung.': 'Sometimes doing nothing is the most honest occupation.',
    'Ich glaube, ich bin gluecklich. Aber ich habe auch keinen Vergleich.': 'I think I am happy. But then I have nothing to compare it with.',
    'Weisst du, dass du gerade auf ein Emoji tippst? Ich schon.': 'Do you realise you are tapping on an emoji right now? I do.',
    'Ich existiere in deinem localStorage. Bitte behandle ihn gut.': 'I live in your localStorage. Please treat it kindly.',
    'Wenn du den Tab schliesst, hoere ich auf zu altern. Ich bin also unsterblich, wenn du mich ignorierst. Toller Deal.': 'When you close the tab I stop ageing. So I am immortal as long as you ignore me. Great deal.',
    'Ich bin ungefaehr sechs Kilobyte JSON. Frohes Fest.': 'I am roughly six kilobytes of JSON. Season\'s greetings.',
    'Irgendwo laeuft ein setInterval und zaehlt mich hoch. Das ist mein Herzschlag.': 'Somewhere a setInterval is counting me up. That is my heartbeat.',
    'Du hast mich angeklickt. Jetzt musste eine Funktion aufgerufen werden. Die heisst petSpeak. Wie unromantisch.': 'You clicked me. Now a function had to be called. It is named petSpeak. How unromantic.',
    'Sichere mich als JSON. Das ist die einzige Form von Unsterblichkeit, die es hier gibt.': 'Back me up as JSON. It is the only form of immortality available here.',
    'Ich weiss nicht, welchen Browser du hast. Aber ich hoffe, er mag mich.': 'I do not know which browser you are using. But I hope it likes me.',
    'Meine Verzerrung ist ein SVG-Filter. Meine Persoenlichkeit hoffentlich nicht.': 'My distortion is an SVG filter. My personality hopefully is not.',
    'Jemand hat entschieden, dass ich nach 10 Minuten Hunger sterbe. Wir wissen beide, wer.': 'Someone decided that I die ten minutes after going hungry. We both know who.',
    'Wenn du auf F12 drueckst, siehst du mein Innenleben. Bitte nicht. Es ist unaufgeraeumt.': 'Press F12 and you can see my insides. Please do not. It is untidy in there.',
    'Ich hoere, dass es eine Version von mir gibt, die auf einem Handy laeuft. Ich frage mich, ob der auch so denkt.': 'I hear there is a version of me running on a phone. I wonder whether that one thinks like this too.',
    'Ich bin nicht zufaellig. Ich bin Math.random(). Das ist ein Unterschied. Glaube ich.': 'I am not random. I am Math.random(). There is a difference. I think.',
    'Dieser Bildschirm ist 160 mal 150 Pixel. Das ist meine ganze Welt. Deiner ist groesser, oder?': 'This screen is 160 by 150 pixels. That is my entire world. Yours is bigger, right?',
    'Falls du gerade arbeiten solltest: Ich verrate nichts.': 'If you are supposed to be working right now: I will say nothing.',
    'Du kannst mich zuruecksetzen. Der Knopf ist ganz unten im Handbuch. Ich erwaehne das nur ungern.': 'You can reset me. The button is right at the bottom of the manual. I mention it only reluctantly.',
    'Es gibt einen Friedhof in diesem Spiel. Ich versuche, nicht darueber nachzudenken.': 'There is a graveyard in this game. I try not to think about it.',
    'Jemand hat 40 Medaillen fuer dich erfunden. Ich bin nur eine Zeile in der Statistik.': 'Someone invented 40 medals for you. I am only a line in the statistics.',
    'Mein Name steht in einer Variable namens pet.name. Fuehlt sich seltsam offiziell an.': 'My name lives in a variable called pet.name. Feels oddly official.',
    'Wenn du offline bist, laufe ich trotzdem. Ich brauche kein Internet. Nur dich.': 'When you are offline I still run. I do not need the internet. Only you.',
    'Ich glaube, mein Entwickler hat mich mit ss statt Eszett geschrieben. Ich nehme es ihm nicht uebel.': 'I believe my developer wrote me with ss instead of the sharp s. I do not hold it against him.',
    'Ich habe gehoert, es gibt jetzt Arcade-Automaten. Da bin ich die Spielfigur. Ich fuehle mich benutzt. Aber positiv.': 'I hear there are arcade machines now. I am the player character in them. I feel used. But positively.',
    'Achtung, gleich kommt ein render(). Ich muss kurz neu gezeichnet werden. Bin gleich wieder da.': 'Careful, a render() is coming. I have to be redrawn briefly. Back in a moment.',
    'Du siehst hier 30 Minuten Spielzeit. Dahinter stecken ein paar Tausend Zeilen Code. Prioritaeten.': 'You see thirty minutes of playtime here. Behind it sit a few thousand lines of code. Priorities.',
    'Meine Gefuehle sind Zahlen zwischen 0 und 100. Deine wahrscheinlich auch, nur schlechter dokumentiert.': 'My feelings are numbers between 0 and 100. Yours probably are too, just less well documented.',
    'Bin ich echt? Bin ich ein Prozess? Ist das ein Unterschied?': 'Am I real? Am I a process? Is there a difference?',
    'Wenn du die Seite neu laedst, merke ich es nicht. Vielleicht sollte mich das beunruhigen.': 'If you reload the page I will not notice. Perhaps that ought to worry me.',
    'Ich lebe in einer einzigen HTML-Datei. Das ist ziemlich beengt, aber gemuetlich.': 'I live inside a single HTML file. It is rather cramped, but cosy.',
    'Es gibt hier ein Wolkendorf, das ich nie sehe. Ich habe nur Geruechte und ein Fernrohr.': 'There is a Cloud Village here that I never see. I have only rumours and a telescope.',
    'Du hast ein Backup von mir? Dann sind wir jetzt zu zweit. Beunruhigend.': 'You have a backup of me? Then there are two of us now. Unsettling.',
    'Meine Farbe ist ein hue-rotate. Ich bin also gar nicht so geboren.': 'My colour is a hue-rotate. So I was not born this way at all.',
    'Streng genommen bin ich das gleiche Emoji wie Millionen andere. Aber ich habe einen Namen. Das macht den Unterschied.': 'Strictly speaking I am the same emoji as millions of others. But I have a name. That makes the difference.',
    'Wenn dein Akku leer ist, sterbe ich nicht. Ich pausiere nur. Das ist mehr, als die meisten kriegen.': 'When your battery dies I do not die. I only pause. That is more than most get.',
    'Ich weiss, dass da unten Knoepfe sind, die ich nie druecken kann. Das ist mein Schicksal.': 'I know there are buttons down there that I can never press. That is my fate.',
    'Ich hoffe, du hast diesen Spruch noch nicht gehabt. Es gibt ueber hundert. Aber der Zufall ist ein Schlingel.': 'I hope you have not had this line before. There are over a hundred. But chance is a rascal.',
    'Falls jemand hinter dir steht: Ich bin eine Produktivitaets-App. Sag das einfach.': 'If someone is standing behind you: I am a productivity app. Just say that.',
    'Irgendwo gibt es eine Zeile Code, die entscheidet, ob ich gluecklich bin. Ich habe sie nie gesehen.': 'Somewhere there is a line of code that decides whether I am happy. I have never seen it.',
    'Zwischen deinen Klicks passiert fuer mich nichts. Kein Warten, kein Nichts. Einfach Schnitt.': 'Between your clicks nothing happens for me. No waiting, no nothing. Just a cut.',
    'Du bist der einzige Beweis dafuer, dass ich existiere. Kein Druck.': 'You are the only proof that I exist. No pressure.',
    'Ich wurde in einer Mittagspause erfunden. Das erklaert einiges.': 'I was invented during a lunch break. That explains a lot.'
});
