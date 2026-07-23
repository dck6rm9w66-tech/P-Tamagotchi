/* Pausentamagotchi - Spiel-Logik, Zustand, Rendern, Individualitaet */
let state = { view: 'main', iconIndex: -1, gameIndex: 0, feedIndex: 0, tempGameData: null, animFrame: '', isStarted: false, infoScreenIndex: 0 };
let pet = {};
let gameLoop;

function init() {
    updateCoinDisplay();
    initDailyQuests();
    updateTicketDisplay();
    updateLevelDisplay();
    updateFeatureLocks();
    updateVisitTimer();
    initDockNotifications();

    // Gespeicherte Sprache anwenden
    document.documentElement.setAttribute('lang', lang);
    applyStaticTranslations();
    updateLangButton();

    // Schrittzaehler: Android/Chrome braucht keine Erlaubnis und kann direkt
    // weiterzaehlen. iOS verlangt eine Nutzer-Geste -> dort bleibt der Knopf
    // blass, bis im Schritt-Fenster gestartet wird.
    updateStepDisplay();
    if (stepsSupported() && safeGetItem(STEPS_ON_KEY) === '1'
        && typeof DeviceMotionEvent.requestPermission !== 'function') {
        enableStepCounter();
    }

    // Antippen des Tamagotchis -> Spruch. Der Listener haengt an #screenContent,
    // weil render() nur dessen innerHTML ersetzt, das Element selbst aber bleibt.
    let sc = document.getElementById('screenContent');
    if (sc) sc.addEventListener('click', (e) => {
        if (e.target.closest('[onclick]')) return; // eigene Klickziele haben Vorrang
        petSpeak();
    });
    document.getElementById('soundIcon').className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    try {
        let saved = safeGetItem('tama_save_v6');
        if(saved) {
            pet = JSON.parse(saved);
            // Retrofit new vars for old saves
            if(pet.id === undefined) pet.id = generateId(); 
            if(pet.energy === undefined) pet.energy = 100;
            if(pet.intelligence === undefined) pet.intelligence = 0;
            if(pet.lastCareSec === undefined) pet.lastCareSec = pet.activeSeconds || 0;
            if(pet.iqDecayMark === undefined) pet.iqDecayMark = pet.activeSeconds || 0;
            if(pet.sickCount === undefined) pet.sickCount = pet.isSick ? 1 : 0;
            if(pet.buffs === undefined) pet.buffs = {};
            if(pet.hasImmortalPotion === undefined) pet.hasImmortalPotion = false;
            if(pet.dailyPlaytimeSeconds === undefined) pet.dailyPlaytimeSeconds = 0;
            pet.isDeparted = (pet.dailyPlaytimeSeconds >= 1800);
            if(pet.lastPlayedDate === undefined) pet.lastPlayedDate = new Date().toDateString();
            if(pet.maxLifetime === undefined) pet.maxLifetime = Math.floor(Math.random() * (30600 - 19800 + 1)) + 19800;
            if(pet.happyStreak === undefined) pet.happyStreak = 0;

            if(pet.countPlayed === undefined) pet.countPlayed = 0;
            if(pet.countWonLR === undefined) pet.countWonLR = 0;
            if(pet.countWonSSP === undefined) pet.countWonSSP = 0;
            if(pet.countWonBox === undefined) pet.countWonBox = 0;
            if(pet.isCrashedUntil === undefined) pet.isCrashedUntil = 0;
            // "Ignoriert" laeuft jetzt an der echten Uhr (ms-Zeitstempel) statt in aktiven Sekunden
            if(pet.ignoreUntilTs === undefined) pet.ignoreUntilTs = 0;
            if(pet.isIgnoredUntil !== undefined) delete pet.isIgnoredUntil; // Altfeld verwerfen -> haengende 2-Tage-Sperre faellt weg
            if(pet.lastXpAgeDay === undefined) pet.lastXpAgeDay = Math.floor(pet.activeSeconds / 1800);
            if(pet.hueShift === undefined) pet.hueShift = Math.round(Math.random() * 180);
            if(pet.distortType === undefined) pet.distortType = DISTORT_TYPES[Math.floor(Math.random() * DISTORT_TYPES.length)];
            if(pet.distortAmount === undefined) pet.distortAmount = Math.round(Math.random() * 60 - 30);

            state.isStarted = true;
            applyColors(); startLoop(); render();
            restorePomodoro(); // Laufende Fokus-Session fortsetzen / nachträglich abschliessen
        } else { openOnboarding(); }
    } catch(e) { openOnboarding(); }
}

function saveGame() { if(!pet.isDead && state.isStarted) safeSetItem('tama_save_v6', JSON.stringify(pet)); }

function fullReset() {
    playSound('cancel'); 
    let confirmReset = true;
    try { confirmReset = confirm("Möchtest du dein Tamagotchi wirklich zurücksetzen? Dein ganzer Fortschritt geht verloren!"); } catch(e) {} 
    if (confirmReset) { document.getElementById('device').classList.remove('is-flipped'); openOnboarding(); } 
    else { playSound('cancel'); }
}

// Aktion: Das allererste Tamagotchi eines Spielers wird garantiert ein Einhorn -
// aber nur, wenn es im Aktionszeitraum (17. Juli bis Ende Juli 2026) schluepft.
// Danach - und fuer alle weiteren Tiere - bleibt es zufaellig.
const UNICORN_INDEX = 12; // 🦄 in speciesList
function pickFirstSpeciesIndex() {
    let now = new Date();
    let start = new Date(2026, 6, 17, 0, 0, 0);        // 17.07.2026 00:00 (Monat 6 = Juli)
    let end   = new Date(2026, 6, 31, 23, 59, 59, 999); // 31.07.2026 23:59
    let inWindow = now >= start && now <= end;
    let isFirstEver = (LT('hatched') || 0) === 0;       // noch nie ein Ei geschluepft
    if (inWindow && isFirstEver) return UNICORN_INDEX;
    // Geheime Spezies (Index 16-18) sind bewusst sehr selten: zusammen 2 %.
    // Die uebrigen 98 % verteilen sich gleichmaessig auf die 16 normalen Tiere.
    if (Math.random() < SECRET_SPECIES_CHANCE) {
        let anzahlGeheim = speciesList.length - SECRET_SPECIES_START;
        return SECRET_SPECIES_START + Math.floor(Math.random() * anzahlGeheim);
    }
    return Math.floor(Math.random() * SECRET_SPECIES_START);
}

function resetPetState() {
    let minTime = 32400, maxTime = 54000; // Erhöht für längeres Erwachsenendasein
    let scale = Math.round((Math.random() < 0.5 ? (0.33 + Math.random() * 0.67) : (1.0 + Math.random() * 2.0)) * 100) / 100; 

    pet = {
        id: generateId(),
        name: "Tama", ownerName: "Spieler", stage: 0, speciesIndex: pickFirstSpeciesIndex(),
        activeSeconds: 0, maxLifetime: Math.round((Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime) * (1 + getLegacyBonus('lifespan'))), 
        dailyPlaytimeSeconds: 0, isDeparted: false, lastPlayedDate: new Date().toDateString(), bornDate: "-", deathDate: null,
        causeOfDeath: "", starvingSeconds: 0, depressedSeconds: 0,
        countFed: 0, countFedBurger: 0, countFedSnack: 0, 
        countBathed: 0, countGotDirty: 0, countLoved: 0, 
        countPlayed: 0, countWonLR: 0, countWonSSP: 0, countWonBox: 0,
        countDoctor: 0, countDiscipline: 0, countSleeps: 0, happyStreak: 0,
        weight: 1, hunger: 50, happiness: 50, intelligence: getVillageEffect('library') + getLegacyBonus('startIq') * 20, energy: 100,
        lightOff: false, wantsToSleep: false, sleepProgress: 0, 
        nextSleepTime: Math.floor(Math.random() * 241) + 960, 
        isDirty: false, isSick: false, sickCount: 0, misbehaving: false, isDead: false,
        colorIndex: pickEggColorIndex(),
        patternIndex: Math.floor(Math.random() * patternGenerators.length),
        patternColorIndex: Math.floor(Math.patternColorIndex || Math.floor(Math.random() * patternColors.length)),
        patternScale: scale, x: 60, y: 20, targetX: 60, targetY: 20, facingRight: true,
        overrideColor: null, overridePatColor: null, overridePatIdx: null,
        hueShift: Math.round(Math.random() * 180),                                   // 0%..50% Farbton-Verschiebung (0-180°)
        distortType: DISTORT_TYPES[Math.floor(Math.random() * DISTORT_TYPES.length)], // zufällige Verzerrungshülle
        distortAmount: Math.round((Math.random() * 60 - 30)),                        // -30%..30% Verzerrungsstärke
        buffs: {}, hasImmortalPotion: false, isCrashedUntil: 0, ignoreUntilTs: 0, lastXpAgeDay: 0,
        lastCareSec: 0, iqDecayMark: 0
    };
}

// Wählt eine zufällige Ei-Farbe, beschränkt auf das aktuelle Pfleger-Level (seltene Farben sind level-gated)
function pickEggColorIndex() {
    let pool = [];
    for (let i = 0; i < shellColors.length; i++) {
        let rare = (i >= RARE_EGG_BASE_INDEX) ? RARE_EGG_COLORS[i - RARE_EGG_BASE_INDEX] : null;
        if (!rare || accountLevel >= rare.minLevel) pool.push(i);
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

function startLoop() {
    if(gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        if(!state.isStarted || document.hidden || pet.isDead) return;

        // Gepufferte Display-Einblendungen nachholen. Der Tick greift auch
        // dann, wenn ein Overlay nicht ueber closeModal() geschlossen wurde.
        try { flushAnimationQueue(); } catch (e) {}

        // Ahnen-Heimsuchung: ungepflegte Graeber druecken die Laune
        if (isHaunted() && pet.happiness > HAUNT_HAPPY_CAP) {
            pet.happiness = HAUNT_HAPPY_CAP;
        }

        let today = new Date().toDateString();
        if(pet.lastPlayedDate !== today) { 
            pet.dailyPlaytimeSeconds = 0; 
            pet.lastPlayedDate = today; 
            pet.isDeparted = false;
            chargeGraveCare();   // taegliches Grabpflege-Abo abbuchen
            initDailyQuests(); // Reset daily quests
            // Reset daily buffs
            if(pet.buffs) {
                pet.buffs.noSleepToday = false;
                pet.buffs.noDirtToday = false;
                pet.buffs.superfoodToday = false;
            }
        }

        if (pet.dailyPlaytimeSeconds >= 1800 && !pet.isDead) {
            let justDeparted = !pet.isDeparted;
            pet.isDeparted = true; 
            saveGame(); 
            if(state.view !== 'info') state.view = 'main';
            render(); 
            // Beim Abschied direkt an offene Ergonomie-Quests erinnern
            if (justDeparted) setTimeout(() => { try { showErgoReminder(); } catch(e){} }, 2500);
            return; 
        }

        pet.activeSeconds++;
        pet.dailyPlaytimeSeconds++;

        // Pfleger-XP für jeden überlebten Tamagotchi-Tag (1 Tag = 1800 aktive Sekunden)
        let ageDaysNow = Math.floor(pet.activeSeconds / 1800);
        if (ageDaysNow > (pet.lastXpAgeDay || 0)) {
            pet.lastXpAgeDay = ageDaysNow;
            addAccountXP(15 + villageComfortXpBonus());
        }

        // BUFF LOGIC
        let freezeStats = false;
        let isDoomscrolling = (pet.buffs && pet.buffs.doomscrollUntil && pet.activeSeconds < pet.buffs.doomscrollUntil);

        if(pet.buffs && pet.buffs.cheatUntil && pet.activeSeconds < pet.buffs.cheatUntil) {
            freezeStats = true;
            if(pet.activeSeconds === pet.buffs.cheatUntil - 1) { pet.isCrashedUntil = pet.activeSeconds + 3600; }
        }
        if(isDoomscrolling) {
            freezeStats = true;
        }

        if(pet.buffs && pet.buffs.superfoodToday) pet.hunger = 100;

        // Expirations
        if(pet.buffs && pet.buffs.energyUntil && pet.activeSeconds === pet.buffs.energyUntil) { pet.happiness = Math.max(0, pet.happiness - 50); }
        if(pet.buffs && pet.buffs.socialUntil && pet.activeSeconds === pet.buffs.socialUntil) { pet.ignoreUntilTs = Date.now() + IGNORE_DURATION_MS; }

        if(pet.activeSeconds >= pet.maxLifetime && pet.causeOfDeath === "") pet.causeOfDeath = "Altersschwäche";

        // IMMORTAL POTION CHECK
        if(pet.causeOfDeath === "Übergewicht" || pet.causeOfDeath === "Verhungern" || pet.causeOfDeath === "Traurigkeit") {
            if(pet.hasImmortalPotion) {
                pet.hasImmortalPotion = false;
                pet.causeOfDeath = ""; pet.weight = 20; pet.hunger = 50; pet.happiness = 50;
                playAnimation('👼<br>Vor Tod bewahrt!', 3000);
            }
        }

        if(pet.causeOfDeath !== "") {
            if(!pet.isDead) { 
                pet.isDead = true; 
                pet.deathDate = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                foldPetIntoLifetime(pet); // Werte ins Lebenswerk übernehmen (für Medaillen-Stufen)
                let gl = loadGraves(); gl.push(JSON.parse(JSON.stringify(pet))); saveGraves(gl);
                exportScoreFile(pet); 
                clearInventoryOnDeath();   // Shop-Items (inkl. Arcade) verfallen - T-Coins & XP bleiben
                saveGame(); render(); openDeathModal();
            }
            return; 
        }

        // Stage growth - verlangsamte Intervalle
        if(pet.stage === 0 && pet.activeSeconds >= 15) { pet.stage = 1; pet.weight = 2; pet.intelligence+=2;} 
        else if(pet.stage === 1 && pet.activeSeconds >= 3600) { pet.stage = 2; pet.weight += 2; pet.intelligence+=5;}
        else if(pet.stage === 2 && pet.activeSeconds >= 14400) { pet.stage = 3; pet.weight += 3; pet.intelligence+=10;}
        else if(pet.stage === 3 && pet.activeSeconds >= 28800) { pet.stage = 4; pet.weight += 5; pet.intelligence+=15; checkPokedexDiscovery(); }

        // NEU: Senior - letzte Lebensphase. Greift ab 85% der individuellen
        // Lebenszeit, damit JEDES Tamagotchi das Alter erreicht (maxLifetime
        // variiert stark und liegt teils unter der Erwachsenen-Schwelle).
        if(pet.stage >= 2 && pet.stage < 5 && pet.activeSeconds >= pet.maxLifetime * 0.85) {
            pet.stage = 5; pet.intelligence += 20;
            checkPokedexDiscovery();
            playAnimation('🎂<br>' + t('Grauhaarig und weise:<br>Senior erreicht!'), 3000);
        }

        // Sleep Logic
        if (pet.buffs && !pet.buffs.noSleepToday && pet.activeSeconds >= pet.nextSleepTime && !pet.wantsToSleep && !pet.isCrashedUntil) { 
            pet.wantsToSleep = true; pet.sleepProgress = 0; 
        }

        let isActuallySleeping = (pet.wantsToSleep && pet.lightOff) || (pet.isCrashedUntil && pet.activeSeconds < pet.isCrashedUntil);

        if (isActuallySleeping) {
            pet.sleepProgress = (pet.sleepProgress || 0) + 1;
            pet.energy = Math.min(100, pet.energy + (inventory.vipSleepActive ? 4 : 2) * (1 + getLegacyBonus('energyRegen'))); // VIP-Schlaf + Vermächtnis
            if (pet.sleepProgress >= 120 && pet.wantsToSleep) { 
                pet.wantsToSleep = false; pet.sleepProgress = 0; pet.countSleeps++;
                pet.nextSleepTime = pet.activeSeconds + Math.floor(Math.random() * 241) + 960; 
                triggerWakeAlarm(); // Wecker klingelt & Hülle vibriert
            }
        } else if(!freezeStats) {
            if (pet.wantsToSleep && !pet.lightOff) { if (pet.activeSeconds % 30 === 0) pet.happiness = Math.max(0, pet.happiness - 1); }
            if (!pet.wantsToSleep && pet.lightOff) { if (pet.activeSeconds % 30 === 0) pet.happiness = Math.max(0, pet.happiness - 1); }

            let isHappyBuffed = (pet.buffs && pet.buffs.happy && pet.activeSeconds < pet.buffs.happy) || 
                                (pet.buffs && pet.buffs.mjUntil && pet.activeSeconds < pet.buffs.mjUntil) || 
                                (pet.buffs && pet.buffs.mysteryGoodUntil && pet.activeSeconds < pet.buffs.mysteryGoodUntil) ||
                                (pet.buffs && pet.buffs.doubleHappyUntil && pet.activeSeconds < pet.buffs.doubleHappyUntil);

            let isDebuffed1h = (pet.buffs && pet.buffs.mysteryBadUntil && pet.activeSeconds < pet.buffs.mysteryBadUntil);
            let drainMod = isDebuffed1h ? 2 : 1;

            // Stete Energie-Entladung während des Wachseins.
            // Gewicht und Laune beeinflussen, wie schnell die Energie sinkt:
            //  - schwerere Tamagotchis verbrauchen mehr (Übergewicht ermüdet),
            //  - glückliche Tamagotchis sind spritziger und verlieren langsamer,
            //    unglückliche/lustlose schneller.
            if (pet.activeSeconds % 20 === 0) {
                let drain = 1;
                // Gewicht: ein gesundes Mittelfeld (~10-20g) ist am effizientesten.
                //  - Übergewicht ermüdet (bis +1 bei 50g),
                //  - Untergewicht ebenso: zu wenig Reserven kosten extra (bis +0.7 bei 0g).
                if (pet.weight > 20) drain += Math.min(1, (pet.weight - 20) / 30);
                else if (pet.weight < 10) drain += Math.min(0.7, (10 - pet.weight) / 10 * 0.7);
                // Laune: über 70 spart Energie (bis -0.5), unter 30 kostet extra (bis +0.5)
                if (pet.happiness >= 70) drain -= (pet.happiness - 70) / 60;      // 70->0, 100->-0.5
                else if (pet.happiness < 30) drain += (30 - pet.happiness) / 60;  // 30->0, 0->+0.5
                drain = Math.max(0.3, drain);
                pet.energy = Math.max(0, pet.energy - drain);
            }

            if(pet.stage > 0) {
                let hungerInterval = Math.round((180 + getVillageEffect('cafeteria')) * (1 + getLegacyBonus('hungerResist'))); // Kantine + Vermächtnis
                if(pet.activeSeconds % hungerInterval === 0 && pet.buffs && !pet.buffs.superfoodToday && !(pet.buffs.mysteryGoodUntil && pet.activeSeconds < pet.buffs.mysteryGoodUntil)) {
                    pet.hunger = Math.max(0, pet.hunger - (2 * drainMod));
                }
                if(pet.activeSeconds % 240 === 0 && !isHappyBuffed) {
                    pet.happiness = Math.max(0, pet.happiness - (2 * drainMod));
                }
            }
        }

        // --- VERLERNEN DURCH VERNACHLÄSSIGUNG ---
        // Kümmert sich der Nutzer 5 Min lang nicht (keine Pflege, kein Spiel),
        // verliert das Tamagotchi ab da alle 5 Min 1 Intelligenzpunkt.
        if (pet.stage > 0 && !isActuallySleeping && !freezeStats && pet.intelligence > 0) {
            const IQ_GRACE = 300;   // 5 Min Schonfrist ohne Beschäftigung
            const IQ_PERIOD = 300;  // danach alle 5 Min -1 IQ
            let idleFor = pet.activeSeconds - (pet.lastCareSec || 0);
            if (idleFor >= IQ_GRACE && (pet.activeSeconds - (pet.iqDecayMark || 0)) >= IQ_PERIOD) {
                pet.iqDecayMark = pet.activeSeconds;
                pet.intelligence = Math.max(0, pet.intelligence - 1);
            }
        }

        // --- TROLLS PERIODIC TICKS ---
        // Bad Influence (Smoker): -1 IQ pro Tag (1800s)
        if(pet.buffs && pet.buffs.badInfluence && pet.activeSeconds % 1800 === 0) {
            pet.intelligence = Math.max(0, pet.intelligence - 1);
        }
        // SM Addiction: -1 Energie pro 5 Min (300s) wenn nicht im Shop
        if(pet.buffs && pet.buffs.smAddiction && pet.activeSeconds % 300 === 0 && state.view !== 'shop') {
            pet.energy = Math.max(0, pet.energy - 1);
        }
        // Existential Void: -3 Happy pro Stunde (600s)
        if(pet.buffs && pet.buffs.existentialVoid && pet.activeSeconds % 200 === 0) {
            pet.happiness = Math.max(0, pet.happiness - 1);
        }
        // Chronic Cold sneeze
        if(pet.buffs && pet.buffs.chronicCold && pet.activeSeconds % 300 === 0 && Math.random() < 0.4) {
            pet.energy = Math.max(0, pet.energy - 5);
            playAnimation('🤧 HATSCHE!<br>-5 Energie', 2000);
        }
        // Sleepwalker (Käufe in der Nacht)
        if(pet.buffs && pet.buffs.sleepwalker && isActuallySleeping && pet.activeSeconds % 600 === 0 && Math.random() < 0.2) {
            let cheapItems = SHOP_ITEMS.filter(i => i.price <= 50);
            let bought = cheapItems[Math.floor(Math.random()*cheapItems.length)];
            let price = bought.price; if(pet.buffs && pet.buffs.gaslighting) price = Math.round(price * 1.1);
            if(tCoins >= price) {
                tCoins -= price;
                inventory.items[bought.id] = (inventory.items[bought.id] || 0) + 1;
                safeSetItem('tama_inventory', JSON.stringify(inventory));
                updateCoinDisplay();
            }
        }
        // Abonnements Abrechnung (Alle 1800s / 1 Tag)
        if(inventory.happySubActive && pet.activeSeconds % 1800 === 0) {
            if(tCoins >= 5) { tCoins -= 5; pet.happiness = Math.min(100, pet.happiness + 10); updateCoinDisplay(); }
            else { inventory.happySubActive = false; pet.happiness = Math.max(0, pet.happiness - 20); alert("Konto leer! Glücks-Abo zwangsgekündigt: -20 Laune."); updateCoinDisplay(); }
        }
        if(inventory.vipSleepActive && pet.activeSeconds % 1800 === 0) {
            if(tCoins >= 20) { tCoins -= 20; updateCoinDisplay(); }
            else { inventory.vipSleepActive = false; alert("Konto leer! VIP-Schlaf wurde gekündigt!"); updateCoinDisplay(); }
        }

        // Akne Limitierung
        if(pet.buffs && pet.buffs.pixelAcne) {
            pet.happiness = Math.min(70, pet.happiness);
        }

        if(pet.stage > 0 && !isActuallySleeping && !freezeStats) {
            let dirtyChance = (0.3 - getVillageEffect('spa')) * (1 - getLegacyBonus('dirtResist')); // Therme + Vermächtnis
            if(pet.buffs && !pet.buffs.noDirtToday && pet.activeSeconds % 300 === 0 && Math.random() < dirtyChance) { pet.isDirty = true; pet.countGotDirty++; }
            let sickChance = (0.2 - getVillageEffect('clinic')) * (1 - getLegacyBonus('sickResist')); // Klinik + Vermächtnis
            if(pet.activeSeconds % 600 === 0 && Math.random() < sickChance && !pet.isSick) { 
                pet.isSick = true; 
                pet.sickCount = Math.floor(Math.random() * 10) + 1;
            }
            let misbehaveChance = 0.15 - getVillageEffect('watchtower'); // Wachturm: weniger Unartig-Risiko
            if(pet.activeSeconds % 450 === 0 && Math.random() < misbehaveChance && !pet.misbehaving) pet.misbehaving = true; 
        }

        if (pet.hunger <= 0 && pet.stage > 0 && !isActuallySleeping && !isDoomscrolling) pet.starvingSeconds++; else pet.starvingSeconds = 0;
        if (pet.happiness <= 0 && pet.stage > 0 && !isActuallySleeping && !isDoomscrolling) pet.depressedSeconds++; else pet.depressedSeconds = 0;

        if(pet.weight >= 50) pet.causeOfDeath = "Übergewicht";
        else if(pet.starvingSeconds >= 600) pet.causeOfDeath = "Verhungern"; 
        else if(pet.depressedSeconds >= 600) pet.causeOfDeath = "Traurigkeit"; 

        // Laufbereich des Tamagotchis innerhalb von .screen-content.
        // Frueher 10..40 - dabei lief das Tier so tief, dass es die untere
        // Icon-Reihe teilweise verdeckte (das Pet liegt auf z-index 15, die
        // Icons auf 5). Der Bereich ist deshalb um 10px angehoben.
        const WALK_Y_MIN = 0, WALK_Y_MAX = 30;

        // Walking animation
        if(state.view === 'main' && pet.stage > 0 && !isActuallySleeping && !pet.isSick && !pet.misbehaving && !isDoomscrolling) {
            // Bestehende Spielstaende laufen noch im alten, tieferen Bereich -
            // hier einmalig nach oben ziehen, damit die Umstellung sofort greift.
            if (pet.targetY > WALK_Y_MAX) pet.targetY = WALK_Y_MAX;
            if (pet.y > WALK_Y_MAX) pet.y = WALK_Y_MAX;

            if(Math.abs(pet.x - pet.targetX) < 5 && Math.abs(pet.y - pet.targetY) < 5) {
                if(Math.random() < 0.4) { pet.targetX = 10 + Math.random() * 100; pet.targetY = WALK_Y_MIN + Math.random() * (WALK_Y_MAX - WALK_Y_MIN); }
            } else {
                pet.facingRight = pet.targetX > pet.x;
                pet.x += (pet.targetX - pet.x) * 0.3; pet.y += (pet.targetY - pet.y) * 0.3;
            }
        }

        checkAchievements();
        saveGame();
        render();
    }, 1000); 
}

// --- BUTTONS LOGIK ---
// Direktauswahl per Maus: ein Klick auf ein Display-Icon wählt es aus und führt es sofort aus.
function clickMenuIcon(index) {
    if(!state.isStarted || pet.isDead || state.view === 'animating') return;
    // Direktauswahl nur im Hauptmenü; in Untermenüs (Spiel/Futter/Info) erst zurück navigieren
    if(state.view !== 'main') {
        if(state.view === 'gameSelect' || state.view === 'feedSelect' || state.view === 'info') {
            playSound('cancel');
            state.view = 'main'; state.iconIndex = -1; render();
        }
        return;
    }
    state.iconIndex = index; // Icon hervorheben, damit die Auswahl sichtbar ist
    playSound('select');
    executeMenuAction(index);
    render();
}

function btnA() {
    if(!state.isStarted || pet.isDead || state.view === 'animating') return;
    playSound('beep');
    if(state.view === 'main') state.iconIndex = (state.iconIndex + 1) % 8;
    else if(state.view === 'gameSelect') state.gameIndex = (state.gameIndex + 1) % 3;
    else if(state.view === 'feedSelect') state.feedIndex = (state.feedIndex + 1) % 2;
    else if(state.view === 'playingGame') handleGameInput('A');
    render();
}

function btnB() {
    if(!state.isStarted || pet.isDead || state.view === 'animating') return;
    if(state.view === 'eightball') { shakeEightBall(); return; }
    playSound('select');

    // Durchblättern der Info-Screens
    if(state.view === 'info') {
        state.infoScreenIndex = (state.infoScreenIndex + 1) % 2; // Nur noch 2 Screens!
        render();
        return;
    }

    if(state.view === 'main' && state.iconIndex !== -1) executeMenuAction(state.iconIndex);
    else if(state.view === 'gameSelect') startGame(state.gameIndex);
    else if(state.view === 'feedSelect') executeFeedAction(state.feedIndex);
    else if(state.view === 'playingGame') handleGameInput('B');
    render();
}

function btnC() {
    if(!state.isStarted || pet.isDead || state.view === 'animating') return;
    playSound('cancel');
    if(state.view === 'playingGame') state.view = 'gameSelect';
    else if(state.view === 'gameSelect' || state.view === 'feedSelect') { state.view = 'main'; state.iconIndex = -1; }
    else { state.view = 'main'; state.iconIndex = -1; }
    render();
}

// --- AKTIONEN & SPIELE ---
// Wird ein Item aus dem Inventar benutzt (z.B. aus "Events & Dating"), liegt das
// Modal ueber dem Geraet - die Einblendung auf dem Display waere unsichtbar.
// Deshalb: Ist irgendein Overlay offen, wird die Animation gepuffert und erst
// abgespielt, sobald der Blick wieder frei ist.
let _animQueue = [];

function isOverlayVisible() {
    let sel = '.modal-bg, .arcade-overlay, .arena-overlay, .pomodoro-overlay, .story-overlay, .feature-unlock-overlay';
    return Array.from(document.querySelectorAll(sel)).some(el => {
        if (!el) return false;
        let d = el.style.display;
        if (d === 'none' || d === '') return false;
        return el.offsetParent !== null || d === 'flex' || d === 'block';
    });
}

function playAnimation(htmlContent, duration) {
    if (isOverlayVisible()) {
        // Nicht verwerfen, sondern nachholen. Mehr als drei aufgestaute
        // Einblendungen waeren nur noch nervig.
        if (_animQueue.length < 3) _animQueue.push({ htmlContent, duration });
        return;
    }
    state.view = 'animating'; state.animFrame = htmlContent; render();
    setTimeout(() => {
        state.view = 'main'; render(); checkAchievements();
        flushAnimationQueue();
    }, duration);
}

// Spielt gepufferte Einblendungen ab, sobald kein Overlay mehr im Weg ist.
function flushAnimationQueue() {
    if (!_animQueue.length || isOverlayVisible()) return;
    if (state.view === 'animating') return;
    let next = _animQueue.shift();
    playAnimation(next.htmlContent, next.duration);
}

// "Ignoriert" (Social-Media-Crash) laeuft an der ECHTEN Uhr, nicht in aktiven Sekunden:
// Die Stunde verstreicht also auch, waehrend das Tamagotchi weg ist. Sonst waeren es
// 3600 aktive Sekunden = 2 volle Besuchstage ohne Interaktion.
const IGNORE_DURATION_MS = 3600 * 1000;
function ignoreSecondsLeft() {
    if (!pet || !pet.ignoreUntilTs) return 0;
    let left = Math.ceil((pet.ignoreUntilTs - Date.now()) / 1000);
    if (left > 3600) { pet.ignoreUntilTs = 0; return 0; } // unplausible Systemuhr -> Sperre aufheben
    return left > 0 ? left : 0;
}
function isIgnoredNow() { return ignoreSecondsLeft() > 0; }

function isInputBlocked() {
    if(pet.isCrashedUntil && pet.activeSeconds < pet.isCrashedUntil) return 'crash';
    if(isIgnoredNow()) return 'ignore';
    if(pet.buffs && pet.buffs.doomscrollUntil && pet.activeSeconds < pet.buffs.doomscrollUntil) return 'doomscroll';
    return false;
}

// Merkt sich, wann sich der Nutzer zuletzt aktiv um das Tamagotchi gekümmert hat.
// Bleibt die Zuwendung aus, verlernt es mit der Zeit (Intelligenz sinkt).
function markCareInteraction() {
    if (!pet || !state.isStarted || pet.isDead) return;
    pet.lastCareSec = pet.activeSeconds;
    pet.iqDecayMark = pet.activeSeconds;
}

function executeMenuAction(index) {
    // WENN DEPARTED: Nur das Waage-Info-Menü (Index 6) ist erlaubt
    if (pet.isDeparted) {
        if (index === 6) { state.view = 'info'; state.infoScreenIndex = 0; render(); } 
        else { playSound('cancel'); }
        return;
    }

    let blockReason = isInputBlocked();
    if(blockReason) {
        if (index === 6) { state.view = 'info'; state.infoScreenIndex = 0; render(); return; }
        playSound('cancel');
        if(blockReason === 'crash') playAnimation('💻<br>SYSTEM ERROR', 2000);
        else if(blockReason === 'ignore') playAnimation(getPetGraphicWithHat()+' 📱<br>...ignoriert dich.', 2000);
        else if(blockReason === 'doomscroll') playAnimation(getPetGraphicWithHat()+' 📱<br>...zu abgelenkt.', 2000);
        state.iconIndex = -1; return;
    }

    if(pet.stage === 0 && index !== 6 && index !== 1) { playSound('cancel'); playAnimation('🥚❓', 1500); state.iconIndex = -1; return; }
    let isActuallySleeping = pet.wantsToSleep && pet.lightOff;
    if(isActuallySleeping && index !== 1) { playSound('cancel'); playAnimation('💤', 1500); state.iconIndex = -1; return; }

    let petG = getPetGraphicWithHat();
    markCareInteraction(); // Nutzer beschäftigt sich aktiv mit dem Tamagotchi
    switch(index) {
        case 0: state.view = 'feedSelect'; state.feedIndex = 0; return;
        case 1: pet.lightOff = !pet.lightOff; playSound('select'); break;
        case 2: 
            if(pet.isDirty) { pet.isDirty = false; pet.countBathed++; updateQuestProgress('bathed', 1); playSound('win'); }
            else { playSound('select'); }
            playAnimation(`<div class="wave-container"><div style="font-size:35px; position:relative;">${petG}</div><div class="wave-anim">🌊🌊</div></div>`, 2000); 
            break;
        case 3: 
            let gain = (pet.buffs && pet.buffs.socialUntil && pet.activeSeconds < pet.buffs.socialUntil) ? 20 : 10;
            pet.happiness = Math.min(100, pet.happiness + gain); pet.countLoved++; updateQuestProgress('loved', 1); playSound('win'); playAnimation(`<div style="position:relative;">${petG} ❤️</div>`, 2000); break;
        case 4: state.view = 'gameSelect'; state.gameIndex = 0; return;
        case 5: 
            if(pet.isSick) { 
                pet.sickCount--;
                if(pet.sickCount > 0) {
                    playSound('select');
                    playAnimation(`<div style="position:relative;">${petAnimGraphic('_wuetend')}<br><span style="font-size:11px;">Noch ${pet.sickCount}x!</span></div>`, 2000);
                } else {
                    pet.isSick = false; pet.countDoctor++; updateQuestProgress('healed', 1); playSound('win'); playAnimation(`<div style="position:relative;">${petAnimGraphic('_wuetend')}</div>`, 2500); 
                }
            } else { 
                pet.happiness = Math.max(0, pet.happiness - 10);
                playSound('lose');
                // Kein Explosions-Emoji, kein Text - das wuetende Sprite spricht
                // fuer sich: das Tier war gar nicht krank.
                playAnimation(petAnimGraphic('_wuetend'), 2000); 
            } 
            break;
        case 6: state.view = 'info'; state.infoScreenIndex = 0; return;
        case 7: 
            if(pet.misbehaving) { 
                pet.misbehaving = false; pet.happiness = Math.max(0, pet.happiness - 5); pet.countDiscipline++; updateQuestProgress('disciplined', 1); pet.intelligence+=2; playSound('win'); playAnimation(`<div style="position:relative;">${petAnimGraphic('_wuetend')}</div>`, 2500); 
            } else { 
                pet.happiness = Math.max(0, pet.happiness - 10);
                playSound('lose');
                // Kein Explosions-Emoji, kein Text - das wuetende Sprite genuegt.
                playAnimation(petAnimGraphic('_wuetend'), 2000); 
            } 
            break;
    }
    state.iconIndex = -1;
    render();
    checkAchievements();
}

function executeFeedAction(index) {
    let petG = getPetGraphicWithHat();
    if(pet.hunger >= 100) { playSound('cancel'); playAnimation(`<div style="position:relative;">${petAnimGraphic()}<br>Schon satt!</div>`, 1800); } 
    else { 
        // Magenverstimmung 2.0 Chance
        if(pet.buffs && pet.buffs.stomachUpset2 && Math.random() < 0.3) {
            pet.hunger = Math.max(0, pet.hunger - 30);
            pet.energy = Math.max(0, pet.energy - 30);
            playSound('lose');
            playAnimation('🤮 Erbrochen!<br>-30 Hunger / -30 Energie', 3000);
            state.iconIndex = -1;
            return;
        }

        if(index === 0) {
            let weightGain = (Math.random() < getVillageEffect('gym')) ? 0 : 1; // Fitnessstudio: weniger Gewichtszunahme
            pet.hunger = Math.min(100, pet.hunger + 20 + getVillageEffect('bakery')); pet.weight += weightGain; pet.countFed++; pet.countFedBurger++; updateQuestProgress('fedBurger', 1); playSound('win'); playAnimation(`<div style="position:relative;">${petAnimGraphic()} 🍔</div>`, 2000); 
        } else {
            let gain = (pet.buffs && pet.buffs.socialUntil && pet.activeSeconds < pet.buffs.socialUntil) ? 20 : 10;
            pet.hunger = Math.min(100, pet.hunger + 10 + getVillageEffect('bakery')); pet.happiness = Math.min(100, pet.happiness + gain); pet.weight += 3; pet.countFed++; pet.countFedSnack++; updateQuestProgress('fedSnack', 1); playSound('win'); playAnimation(`<div style="position:relative;">${petAnimGraphic()} 🍦</div>`, 2000); 
        }
    }
    state.iconIndex = -1;
}

// Toben kostet Kraft: Jede Spielrunde macht hungrig. Zusammen mit dem
// Gewichtsverlust beim Spielen entsteht die eigentliche Entscheidung -
// fuellt der Pfleger den Hunger mit einer Mahlzeit (viel Hunger, wenig
// Gewicht) oder mit einem Snack (wenig Hunger, viel Gewicht, dafuer Laune)?
const GAME_HUNGER_COST = 8;

function startGame(index) {
    // Mit fast leerem Magen hat das Tamagotchi keine Kraft zum Spielen.
    if (pet.hunger < GAME_HUNGER_COST) {
        playSound('cancel');
        playAnimation(`${getPetGraphicWithHat()}<br><span style="font-size:10px;">Zu hungrig<br>zum Spielen! 🍔</span>`, 2200);
        state.view = 'main'; state.iconIndex = -1;
        return;
    }
    state.view = 'playingGame';
    state.tempGameData = { type: index, step: 0 };
    pet.hunger = Math.max(0, pet.hunger - GAME_HUNGER_COST);
    pet.countPlayed++;
    updateQuestProgress('gamesPlayed', 1);
}

function isJittery() { return (pet.buffs && pet.buffs.jitteryUntil && pet.activeSeconds < pet.buffs.jitteryUntil); }
function playHappyPenalty() { return isJittery() ? 2 : 0; }

function applyGameRewards(happyBase, intGain, coinsGain) {
    markCareInteraction(); // Spielen zählt als Beschäftigung
    let isBored = (pet.buffs && pet.buffs.boredUntil && pet.activeSeconds < pet.buffs.boredUntil);
    let finalHappy = isBored ? 1 : happyBase;
    finalHappy += getVillageEffect('playground'); // Spielplatz: Bonus-Laune pro Spiel
    finalHappy = finalHappy * (1 + getLegacyBonus('happyGain')); // Vermächtnis

    let isCandy = false;
    if(pet.buffs && pet.buffs.candyPlays > 0) {
        finalHappy += 15;
        pet.buffs.candyPlays--;
        if(pet.buffs.candyPlays <= 0) {
            isCandy = true;
        }
    }

    pet.happiness = Math.min(100, Math.max(0, pet.happiness + finalHappy - playHappyPenalty()));
    pet.weight = Math.max(1, pet.weight - 1);
    pet.intelligence += intGain;
    addCoins(coinsGain);
    addAccountXP(5); // Pfleger-XP für gelöstes Minispiel

    if(isCandy) {
        setTimeout(() => {
            pet.energy = Math.max(0, pet.energy - 10);
            pet.isCrashedUntil = pet.activeSeconds + 30;
            playAnimation('🍭💥 ZUCKER-CRASH!<br>-10 Energie', 3000);
        }, 2500);
    }
}

function handleGameInput(btn) {
    let g = state.tempGameData; let tama = getPetGraphicWithHat(); 
    let intMod = (pet.buffs && pet.buffs.energyUntil && pet.activeSeconds < pet.buffs.energyUntil) ? 2 : 1;

    if(g.type === 0) {
        let dir = (btn === 'A') ? 'Links' : 'Rechts'; let cpuDir = Math.random() < 0.5 ? 'Links' : 'Rechts';
        let win = (dir === cpuDir);
        // Glücks-Booster: zweite Chance bei Niederlage
        if(!win && Math.random() < getLuckChance()) { win = true; cpuDir = dir; }
        g.result = win ? '🎉' : '❌';

        if(win) { 
            playSound('win'); 
            pet.countWonLR++; 
            updateQuestProgress('wonLR', 1);
            applyGameRewards(10, 1 * intMod, 2); 
        } else { playSound('lose'); }
        playAnimation(`<div style="font-size:16px;">Du: ${dir === 'Links'?'👈':'👉'}<br><div style="position:relative; display:inline-block;">${tama}</div>: ${cpuDir === 'Links'?'👈':'👉'}<br>${g.result} ${win ? '+2<i class="fa-solid fa-coins" style="color:#f1c40f;"></i>':''}</div>`, 2500);
    } 
    else if(g.type === 1) {
        if(btn === 'A') g.step = (g.step + 1) % 3;
        else if(btn === 'B') {
            let cpu = Math.floor(Math.random() * 3); let icons = ['✊','🖐','✌️'];
            let win = (g.step===0 && cpu===2) || (g.step===1 && cpu===0) || (g.step===2 && cpu===1);
            // Glücks-Booster: verwandelt eine Niederlage in einen Sieg
            if(!win && g.step !== cpu && Math.random() < getLuckChance()) { win = true; cpu = (g.step === 0) ? 2 : (g.step === 1 ? 0 : 1); }
            let res = (g.step === cpu) ? '⚖️' : (win ? '🎉' : '❌');
            if(win) { 
                playSound('win'); 
                pet.countWonSSP++;
                updateQuestProgress('wonSSP', 1);
                applyGameRewards(15, 2 * intMod, 3);
            }
            else if(g.step === cpu) { playSound('cancel'); } else { playSound('lose'); }
            playAnimation(`<div style="font-size:16px;">Du: ${icons[g.step]} <br> <div style="position:relative; display:inline-block;">${tama}</div>: ${icons[cpu]}<br>${res} ${win ? '+3<i class="fa-solid fa-coins" style="color:#f1c40f;"></i>':''}</div>`, 2500);
        }
    }
    else if(g.type === 2) {
        if(btn === 'A') g.step = (g.step + 1) % 3;
        else if(btn === 'B') {
            let cpu = Math.floor(Math.random() * 3); let win = (g.step === cpu);
            // Glücks-Booster: zweite Chance, das richtige Hütchen zu treffen
            if(!win && Math.random() < getLuckChance()) { win = true; cpu = g.step; }
            if(win) { 
                playSound('win'); 
                pet.countWonBox++;
                updateQuestProgress('wonBox', 1);
                applyGameRewards(20, 3 * intMod, 5); 
            } else { playSound('lose'); }
            let boxes = ['📦','📦','📦']; boxes[cpu] = '💎'; if(!win) boxes[g.step] = '❌';
            playAnimation(`<div style="font-size:20px;">${boxes[0]} ${boxes[1]} ${boxes[2]}<br>${win?'🎉 +5<i class="fa-solid fa-coins" style="color:#f1c40f; font-size:14px;"></i>':'😭'}</div>`, 2500);
        }
    }
}

// === INDIVIDUALITÄT: Farbton + Verzerrungshülle ===
// 'fisheye' wurde entfernt - die Verzerrung war zu heftig und liess das Tier
// unkenntlich werden. Alte Speicherstaende werden unten abgefangen.
const DISTORT_TYPES = ['none','arc','arc_lower','arc_upper','bulge','inflate','pinch','swirl'];
const DISTORT_REMOVED = ['fisheye'];
// Normalisiert den Verzerrungstyp: entfernte Typen gelten als "keine".
function normalizeDistort(t) {
    return (!t || DISTORT_REMOVED.includes(t)) ? 'none' : t;
}
const DISTORT_LABELS = {
    none: 'Keine', arc: 'Bogen', arc_lower: 'Bogen unten', arc_upper: 'Bogen oben',
    bulge: 'Wulst', inflate: 'Aufblasen', pinch: 'Stauchen', swirl: 'Aufrauen'
};
// Radiale Displacement-Map (R = horizontale, G = vertikale Position) für Wulst/Aufblasen/Stauchen
const RADIAL_DISPLACE_MAP = "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>" +
    "<defs>" +
    "<linearGradient id='gx' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#f00'/></linearGradient>" +
    "<linearGradient id='gy' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#0f0'/></linearGradient>" +
    "</defs>" +
    "<rect width='100' height='100' fill='url(#gx)'/>" +
    "<rect width='100' height='100' fill='url(#gy)' style='mix-blend-mode:screen'/></svg>"
);

let _lastDistortSig = '';
// Aktualisiert den gemeinsamen SVG-Verzerrungsfilter passend zum aktuellen Tamagotchi
function syncPetDistortFilter(p) {
    let disp = document.getElementById('pdDisp');
    if (!disp || !p) return;
    let t = normalizeDistort(p.distortType);
    let amt = (typeof p.distortAmount === 'number') ? p.distortAmount : 0;
    let sig = t + ':' + amt;
    if (sig === _lastDistortSig) return;
    _lastDistortSig = sig;

    let img = document.getElementById('pdMap');
    let turb = document.getElementById('pdTurb');
    let strength = Math.abs(amt) / 30; // 0..1
    let dirSign = amt < 0 ? -1 : 1;

    if (['bulge','inflate','pinch'].includes(t)) {
        if (img) img.setAttribute('href', RADIAL_DISPLACE_MAP);
        disp.setAttribute('in2', 'pdmap');
        // Bruchteile der Objekt-Bounding-Box => Verzerrung skaliert proportional mit der Darstellungsgröße
        let base = (t === 'inflate') ? 0.46 : 0.35;
        let sign = (t === 'pinch' ? -1 : 1) * dirSign;
        disp.setAttribute('scale', (base * (0.35 + 0.65 * strength) * sign).toFixed(3));
    } else if (t === 'swirl') {
        if (turb) {
            turb.setAttribute('baseFrequency', '0.9 2.2');
            turb.setAttribute('seed', String(Math.floor((amt + 30) * 4) + 1));
        }
        disp.setAttribute('in2', 'pdturb');
        // "Aufrauen": Der Filter rechnet in Bruchteilen der Bounding-Box, 0.33
        // entsprach also 33 % Versatz - das zerlegte das Sprite regelrecht.
        // Deckel bei 5 %, damit es eine feine Struktur bleibt statt Matsch.
        const AUFRAUEN_MAX = 0.05;
        disp.setAttribute('scale', (AUFRAUEN_MAX * (0.4 + 0.6 * strength) * dirSign).toFixed(4));
    } else {
        disp.setAttribute('scale', '0');
    }
}

// Liefert die CSS-Filter/Transform-Kombination für die Individualität des Pets
function getPetIndividualityStyle(p) {
    if (!p) return '';
    let parts = [];
    let filters = [];
    if (p.hueShift) filters.push(`hue-rotate(${p.hueShift}deg)`);
    let t = normalizeDistort(p.distortType);
    let amt = (typeof p.distortAmount === 'number') ? p.distortAmount : 0;
    let strength = Math.abs(amt) / 30;
    // SVG-Displacement nur für radiale/wirbelnde Typen; Bögen nutzen reinen CSS-Transform
    if (['bulge','inflate','pinch','swirl'].includes(t)) filters.push('url(#petDistort)');
    // Bögen zusätzlich mit sanftem Perspektiv-Transform betonen
    let transform = '';
    if (t === 'arc')        transform = `perspective(160px) rotateY(${(dirSigned(amt) * (12 + 20 * strength)).toFixed(1)}deg)`;
    else if (t === 'arc_upper') transform = `perspective(160px) rotateX(${(-(8 + 22 * strength)).toFixed(1)}deg)`;
    else if (t === 'arc_lower') transform = `perspective(160px) rotateX(${((8 + 22 * strength)).toFixed(1)}deg)`;
    else if (t === 'inflate')   transform = `scale(${(1 + 0.12 * strength).toFixed(3)})`;
    else if (t === 'pinch')     transform = `scale(${(1 - 0.10 * strength).toFixed(3)}, ${(1 + 0.10 * strength).toFixed(3)})`;
    // Aufrauen soll strukturieren, nicht kippen: hoechstens 2 Grad.
    else if (t === 'swirl')     transform = `rotate(${(dirSigned(amt) * 2 * strength).toFixed(1)}deg)`;
    if (filters.length) parts.push('filter:' + filters.join(' '));
    if (transform) parts.push('transform:' + transform);
    if (parts.length) parts.push('display:inline-block');
    return parts.join('; ');
}
function dirSigned(a) { return a < 0 ? -1 : 1; }

function getPetGraphic() {
    // Sprites statt Emojis: Zustand (schlafend / wütend / Engel) und
    // Lebensphase werden komplett von spriteImg() aufgelöst.
    let style = getPetIndividualityStyle(pet);
    let inner;
    if (typeof spriteImg === 'function') {
        inner = spriteImg(pet, { alt: pet.name || 'Tamagotchi' });
    } else {
        // Notfall-Rückfall: js/00-sprites.js wurde nicht geladen (z.B. weil eine
        // alte index.html ohne den Script-Tag ausgeliefert wird). Lieber Emojis
        // als ein weisser Bildschirm.
        if (pet.isDead) inner = '👻';
        else if (pet.stage === 0) inner = '🥚';
        else if (pet.stage === 1) inner = '🐣';
        else inner = speciesList[pet.speciesIndex] || '🐾';
    }
    return style ? `<span class="pet-body" style="${style}">${inner}</span>` : inner;
}

// Liefert das Pet-Sprite mit einer ERZWUNGENEN Stimmung, unabhaengig vom
// tatsaechlichen Zustand. Wird gebraucht, wenn der Pfleger belehrt oder zum
// Arzt geht, das Tier aber gerade weder ungezogen noch krank ist - dann soll
// trotzdem das wuetende Sprite erscheinen.
// Pet-Darstellung fuer Display-Einblendungen. Der Animations-Container laeuft
// mit font-size:20px, das Sprite (1.55em) waere darin nur ~31px gross - deutlich
// kleiner als die ~54px im Hauptbildschirm. Die Klasse .anim-pet hebt die
// Schriftgroesse an, sodass das Tier in Animationen leicht VERGROESSERT erscheint.
function petAnimGraphic(mood) {
    let inner = mood ? getPetGraphicMood(mood) : getPetGraphicWithHat();
    return `<span class="anim-pet">${inner}</span>`;
}

function getPetGraphicMood(mood) {
    if (typeof spriteImg !== 'function') return getPetGraphicWithHat();
    let style = getPetIndividualityStyle(pet);
    let img = spriteImg(pet, { mood: mood, alt: pet.name || 'Tamagotchi' });
    let base = style ? `<span class="pet-body" style="${style}">${img}</span>` : img;
    return wrapWithHat(base);
}

// Huelle fuer Hut/Handheld - von getPetGraphicWithHat() und getPetGraphicMood()
// gemeinsam genutzt, damit die Zubehoer-Logik nur an einer Stelle steht.
function wrapWithHat(base) {
    if(pet.stage > 1 && !pet.isDead && inventory.equippedHat) {
        let hatObj = SHOP_ITEMS.find(i=>i.id === inventory.equippedHat);
        let fxClass = hatObj && hatObj.fx ? hatObj.fx : '';
        let isHandheld = ['hat_bottle', 'hat_palette', 'hat_bat', 'hat_mic', 'hat_knife', 'hat_controller'].includes(inventory.equippedHat);
        // Sprite und Zubehoer stecken zusammen in .pet-acc. Der Wrapper ist
        // selbst positioniert und umschliesst das Sprite exakt - dadurch sitzt
        // das Zubehoer in JEDEM Container gleich (Hauptbild, Fuettern, Waschen,
        // Schlafen, Wut). Vorher richtete es sich nach dem naechsten
        // positionierten Vorfahren und verrutschte nach links oben.
        let acc = isHandheld
            ? `<div class="pet-handheld ${fxClass}">${hatObj ? hatObj.val : ''}</div>`
            : `<div class="pet-hat ${fxClass}">${hatObj ? hatObj.val : ''}</div>`;
        return `<span class="pet-acc">${base}${acc}</span>`;
    }
    return base;
}

function getPetGraphicWithHat() {
    return wrapWithHat(getPetGraphic());
}

// Hilfsfunktion zum Generieren von Text-Balken für LCD
function makeTextBar(value) {
    let numBlocks = Math.min(10, Math.max(0, Math.round(value / 10)));
    return '[' + '█'.repeat(numBlocks) + '░'.repeat(10 - numBlocks) + ']';
}

// Weckt das Tamagotchi: Alarmton, vibrierende Hülle und (falls möglich) Haptik
function triggerWakeAlarm() {
    playSound('alarm');
    let dev = document.getElementById('device');
    if (dev) {
        dev.classList.remove('is-ringing');
        void dev.offsetWidth; // Animation neu starten
        dev.classList.add('is-ringing');
        setTimeout(() => dev.classList.remove('is-ringing'), 2100);
    }
    try { if (navigator.vibrate) navigator.vibrate([90, 60, 90, 60, 140]); } catch(e) {}
}

// Statuseffekte oberhalb des Tamagotchis aktualisieren (mit reaktiven Tooltips)
function updateActiveBuffsBar() {
    cleanupExpiredBuffs();
    let bar = document.getElementById('activeBuffsBar');
    if(!bar) return;
    if(!state.isStarted || pet.isDead) { bar.style.opacity = 0; return; }

    let list = []; // Sammelt alle aktiven Buffs { id, icon, tt (Tooltip) }

    function formatTime(sec) {
        if (sec <= 0) return "";
        let m = Math.floor(sec / 60);
        let s = sec % 60;
        return `\n⏳ ${m}m ${s}s verbleibend`;
    }

    // Wecker: zeigt an, wann das schlafende Tamagotchi aufwacht
    let sleepingNow = pet.wantsToSleep && pet.lightOff && !pet.isDeparted;
    if (sleepingNow) {
        let remain = Math.max(0, 120 - (pet.sleepProgress || 0));
        let wake = new Date(Date.now() + remain * 1000);
        let hh = String(wake.getHours()).padStart(2, '0');
        let mm = String(wake.getMinutes()).padStart(2, '0');
        list.push({
            id: 'alarm',
            icon: `⏰<span style="font-size:9px; font-weight:bold; margin-left:2px; vertical-align:middle;">${hh}:${mm}</span>`,
            tt: `Schlaft tief und fest 😴\nWeckt um ${hh}:${mm} Uhr.${formatTime(remain)}`
        });
    }

    if (pet.buffs && pet.buffs.mjUntil && pet.activeSeconds < pet.buffs.mjUntil) {
        list.push({ id: 'mj', icon: '🌿', tt: `Mary Jane:\n+50% Laune & immun gegen Launeverlust.${formatTime(pet.buffs.mjUntil - pet.activeSeconds)}` });
    }
    if (pet.buffs && pet.buffs.doomscrollUntil && pet.activeSeconds < pet.buffs.doomscrollUntil) {
        list.push({ id: 'doom', icon: '📱', tt: `Smartphone:\nStats gefroren, keine Bedürfnisse.${formatTime(pet.buffs.doomscrollUntil - pet.activeSeconds)}` });
    }
    if (pet.buffs && pet.buffs.noSleepToday) {
        list.push({ id: 'party', icon: '🪩', tt: `Party-Pille:\nTamagotchi schläft heute nicht. (-5 Intelligenz)` });
    }
    if (pet.buffs && pet.buffs.noDirtToday) {
        list.push({ id: 'shiny', icon: '✨', tt: `Shiny-Spray:\nWird heute nicht mehr schmutzig. (-25% Laune)` });
    }
    if (pet.buffs && pet.buffs.superfoodToday) {
        list.push({ id: 'super', icon: '🥦', tt: `Superfood:\nKein Hunger mehr heute! (Max-Leben verkürzt)` });
    }
    if (pet.buffs && pet.buffs.energyUntil && pet.activeSeconds < pet.buffs.energyUntil) {
        list.push({ id: 'energy', icon: '⚡', tt: `Energizer:\n2x Intelligenz-Gain.${formatTime(pet.buffs.energyUntil - pet.activeSeconds)}` });
    }
    if (pet.buffs && pet.buffs.socialUntil && pet.activeSeconds < pet.buffs.socialUntil) {
        list.push({ id: 'social', icon: '📲', tt: `Social-Media-Boost:\nDoppelte Laune bei Interaktionen.${formatTime(pet.buffs.socialUntil - pet.activeSeconds)}` });
    }
    if (pet.buffs && pet.buffs.cheatUntil && pet.activeSeconds < pet.buffs.cheatUntil) {
        list.push({ id: 'cheat', icon: '💻', tt: `Cheat-Code:\nStats eingefroren.${formatTime(pet.buffs.cheatUntil - pet.activeSeconds)}` });
    }
    if (pet.hasImmortalPotion) {
        list.push({ id: 'immortal', icon: '🛡️', tt: `Unsterblichkeits-Trank:\nRettet dich 1x vor dem Tod.` });
    }
    if (pet.isCrashedUntil && pet.activeSeconds < pet.isCrashedUntil) {
        list.push({ id: 'crash', icon: '❌', tt: `System-Crash:\nRebootet in ${Math.max(0, pet.isCrashedUntil - pet.activeSeconds)}s` });
    }
    if (ignoreSecondsLeft() > 0) {
        list.push({ id: 'ignore', icon: '📴', tt: `Ignoriert:\nTamagotchi straft dich mit Missachtung.${formatTime(ignoreSecondsLeft())}` });
    }
    if (pet.buffs && pet.buffs.stomachUpset2) {
        list.push({ id: 'upset', icon: '🤮', tt: `Magenverstimmung 2.0:\n30% Chance auf Erbrechen beim Essen.` });
    }
    if (pet.buffs && pet.buffs.smAddiction) {
        list.push({ id: 'sm', icon: '📱🔋', tt: `SM Sucht:\nVerliert stetig Energie außerhalb vom Shop.` });
    }
    if (pet.buffs && pet.buffs.existentialVoid) {
        list.push({ id: 'void', icon: '🌌', tt: `Existenzielle Leere:\nVerliert stetig Laune, bis es schläft oder isst.` });
    }
    if (pet.buffs && pet.buffs.badInfluence) {
        list.push({ id: 'badinf', icon: '🚬', tt: `Schlechter Einfluss:\n-1 IQ pro Tag.` });
    }
    if (pet.buffs && pet.buffs.chronicCold) {
        list.push({ id: 'cold', icon: '🤧', tt: `Ewiger Schnupfen:\nNiest oft und verliert dabei Energie.` });
    }
    if (pet.buffs && pet.buffs.pixelAcne) {
        list.push({ id: 'acne', icon: '🔴', tt: `Pixel-Akne:\n-5 Happy, Laune max 70% bis Heilung.` });
    }
    if (inventory.happySubActive) {
        list.push({ id: 'sub', icon: '💳', tt: `Glücks-Abo:\nTäglich +10 Laune für 5 Coins.` });
    }
    if (inventory.vipSleepActive) {
        list.push({ id: 'vip', icon: '👑🛏️', tt: `VIP-Schlaf:\nRegeneriert Energie doppelt so schnell im Schlaf.` });
    }
    // Multiplikatoren (neues MULT_META-Format: pet.buffs.mCoins = {u, f})
    let a = pet.activeSeconds;
    let mb = pet.buffs || {};
    if (mb.mMega && a < mb.mMega.u) {
        list.push({ id: 'mega', icon: mb.mMega.f >= 5 ? '🌌' : '🌈', tt: `Mega-Booster:\nCoins, Tickets & XP ×${mb.mMega.f}.${formatTime(mb.mMega.u - a)}` });
    }
    if (mb.mCoins && a < mb.mCoins.u) {
        list.push({ id: 'multc', icon: mb.mCoins.f >= 15 ? '🌟' : (mb.mCoins.f >= 5 ? '🧲' : '💰'), tt: `Coin-Booster:\nAlle T-Coin-Gewinne ×${mb.mCoins.f}.${formatTime(mb.mCoins.u - a)}` });
    }
    if (mb.mTickets && a < mb.mTickets.u) {
        list.push({ id: 'multt', icon: mb.mTickets.f >= 12 ? '💎' : (mb.mTickets.f >= 5 ? '🎰' : '🎫'), tt: `Ticket-Booster:\nAlle Ticket-Gewinne ×${mb.mTickets.f}.${formatTime(mb.mTickets.u - a)}` });
    }
    if (mb.mXp && a < mb.mXp.u) {
        list.push({ id: 'multx', icon: mb.mXp.f >= 12 ? '🌟' : (mb.mXp.f >= 8 ? '💥' : (mb.mXp.f >= 5 ? '🧠' : '🎓')), tt: `XP-Booster:\nAller Pfleger-XP ×${mb.mXp.f}.${formatTime(mb.mXp.u - a)}` });
    }
    if (mb.mLuck && a < mb.mLuck.u) {
        list.push({ id: 'multl', icon: mb.mLuck.f >= 1 ? '🎯' : (mb.mLuck.f >= 0.85 ? '✨' : (mb.mLuck.f >= 0.66 ? '☘️' : '🍀')), tt: `Glücks-Booster:\n${Math.round(mb.mLuck.f*100)}% Rettungs-Chance in Minispielen.${formatTime(mb.mLuck.u - a)}` });
    }
    if (mb.mPower && a < mb.mPower.u) {
        list.push({ id: 'multp', icon: mb.mPower.f >= 6 ? '⚡' : (mb.mPower.f >= 4 ? '🗿' : (mb.mPower.f >= 3 ? '😤' : '💪')), tt: `Kraft-Booster:\nKampfkraft in Arena & PvP ×${mb.mPower.f}.${formatTime(mb.mPower.u - a)}` });
    }

    // DOM-Synchronisierung (Vermeidet Neuzeichnen und damit Tooltip-Flackern)
    if(list.length > 0) {
        bar.style.opacity = 1;
        let newIds = list.map(l => l.id);

        // Alte/Abgelaufene Icons entfernen
        Array.from(bar.children).forEach(el => {
            if (!newIds.includes(el.dataset.id)) el.remove();
        });

        // Neue hinzufügen oder bestehende aktualisieren (Tooltips updaten)
        list.forEach(item => {
            let span = bar.querySelector(`span[data-id="${item.id}"]`);
            if (!span) {
                span = document.createElement('span');
                span.className = 'buff-icon-span';
                span.dataset.id = item.id;
                bar.appendChild(span);
            }
            // innerHTML + jedes Update, damit z.B. die Wecker-Uhrzeit live bleibt
            if (span.innerHTML !== item.icon) span.innerHTML = item.icon;
            span.setAttribute('data-tooltip', item.tt);
        });
    } else {
        bar.style.opacity = 0;
        bar.innerHTML = '';
    }
}

// ================================================================
// === ARCADE-AUTOMATEN (Space Invaders · Pong · Defender) ========
// ================================================================
// Herausgezoomte Retro-Spiele: das ganze Tamagotchi-Ei ist die Spielfigur.
