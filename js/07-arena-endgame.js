/* Pausentamagotchi - Arena, PvP, Mini-Bosse, Fernrohr & Vermaechtnis */
const ARENA_BOSSES = [
    { id: 'boss_moodkiller', icon: '😤', name: 'Büro-Miesepeter',  lvl: 1, desc: 'Verbreitet schlechte Laune. Schwache Angriffe, aber nervig.', hp: 120, reward: { coins: 200, tickets: 4, xp: 40, lootChance: 0.25, lootId: 'hat_boss_trophy' } },
    { id: 'boss_hangry',     icon: '🍕', name: 'Hunger-Dämon',     lvl: 2, desc: 'Erscheint immer kurz vor der Mittagspause. Sehr aggressiv.', hp: 180, reward: { coins: 350, tickets: 6, xp: 60, lootChance: 0.20, lootId: 'hat_boss_trophy' } },
    { id: 'boss_monday',     icon: '📅', name: 'Der Montag',       lvl: 3, desc: 'Alle fürchten ihn. Schwer zu schlagen, aber süß zu besiegen.', hp: 260, reward: { coins: 600, tickets: 10, xp: 100, lootChance: 0.15, lootId: 'col_boss_fire' } },
    { id: 'boss_deadline',   icon: '⏰', name: 'Die Deadline',     lvl: 4, desc: 'Rückt unaufhaltsam näher. Jede Runde steigt ihr Angriff.',   hp: 350, reward: { coins: 900, tickets: 14, xp: 150, lootChance: 0.10, lootId: 'hat_champion_belt' } },
    { id: 'boss_burnout',    icon: '🔥', name: 'Burnout-Titan',    lvl: 5, desc: 'Der härteste Gegner. Nur wer ausgeruht & glücklich ist, gewinnt.', hp: 500, reward: { coins: 1500, tickets: 20, xp: 250, lootChance: 0.08, lootId: 'hat_champion_belt' } },
];

// ================================================================
// === ENDGAME: WOLKENDORF-FERNROHR & VERMÄCHTNIS (ab Level 32) ===
// ================================================================
// Der Pfleger kann sein Tamagotchi für 10 🎫 im Wolkendorf beobachten und
// ihm bis zu 3x täglich für je 250 🪙 ein Geschenk schicken. Jedes Geschenk
// hebt einen zufälligen Stat dauerhaft um 0,5% – für alle künftigen Tamagotchis.
const ENDGAME_MIN_LEVEL = 12;
const OBSERVE_TICKET_COST = 10;
const GIFT_COIN_COST = 250;
const GIFTS_PER_DAY = 3;
const LEGACY_STEP = 0.005; // +0,5% pro Geschenk

const LEGACY_STATS = [
    { id: 'startIq',     icon: '🧠', name: 'Angeborene Klugheit', desc: 'Start-Intelligenz jedes neuen Eis.' },
    { id: 'lifespan',    icon: '⏳', name: 'Lebenskraft',         desc: 'Maximale Lebensdauer.' },
    { id: 'coinGain',    icon: '🪙', name: 'Glückspfote',         desc: 'Alle T-Coin-Gewinne.' },
    { id: 'xpGain',      icon: '🎓', name: 'Lehrmeister',         desc: 'Aller Pfleger-XP-Gewinn.' },
    { id: 'power',       icon: '💪', name: 'Kampfgeist',          desc: 'Kampfkraft in Arena & PvP.' },
    { id: 'luck',        icon: '🍀', name: 'Wolkenglück',         desc: 'Rettungs-Chance in Minispielen.' },
    { id: 'hungerResist',icon: '🍽️', name: 'Guter Stoffwechsel',  desc: 'Hunger sinkt langsamer.' },
    { id: 'sickResist',  icon: '🛡️', name: 'Robuste Gesundheit',  desc: 'Geringeres Krankheitsrisiko.' },
    { id: 'dirtResist',  icon: '🧼', name: 'Reinliche Natur',     desc: 'Wird seltener schmutzig.' },
    { id: 'happyGain',   icon: '❤️', name: 'Frohes Gemüt',        desc: 'Mehr Laune beim Spielen.' },
    { id: 'energyRegen', icon: '⚡', name: 'Tiefschlaf',          desc: 'Schnellere Energie-Regeneration.' }
];

let legacy = JSON.parse(safeGetItem('tama_legacy') || '{}');
if (!legacy.bonuses) legacy.bonuses = {};

function saveLegacy() { safeSetItem('tama_legacy', JSON.stringify(legacy)); }

// Liefert den dauerhaften Bonus (als Bruchteil, z.B. 0.015 = +1,5%)
function getLegacyBonus(id) { return (legacy.bonuses && legacy.bonuses[id]) || 0; }

function resetGiftDayIfNeeded() {
    let today = new Date().toDateString();
    if (legacy.giftDate !== today) { legacy.giftDate = today; legacy.giftsToday = 0; saveLegacy(); }
}
function isObservingToday() {
    return legacy.observeDate === new Date().toDateString();
}

function openEndgameModal() {
    if (accountLevel < ENDGAME_MIN_LEVEL) { playSound('cancel'); return; }
    playSound('select');
    resetGiftDayIfNeeded();
    renderEndgameModal();
    document.getElementById('endgameModal').style.display = 'flex';
}

function renderEndgameModal() {
    resetGiftDayIfNeeded();
    let observing = isObservingToday();
    let giftsLeft = GIFTS_PER_DAY - (legacy.giftsToday || 0);
    let html = '';

    if (!observing) {
        html += `
            <div style="text-align:center; padding:14px 10px; background:linear-gradient(135deg,#6a89cc,#a29bfe); border-radius:12px; color:white; margin-bottom:12px;">
                <div style="font-size:44px;">🔭</div>
                <div style="font-size:13px; font-weight:bold; margin-top:4px;">${t('Blick ins Wolkendorf')}</div>
                <div style="font-size:11px; opacity:0.9; margin-top:4px; line-height:1.5;">${t('Richte das Fernrohr auf das Wolkendorf und sieh, was dein Tamagotchi dort treibt. Der Blick gilt für den heutigen Tag.')}</div>
            </div>
            <button class="onboard-btn ${tickets >= OBSERVE_TICKET_COST ? 'btn-blue' : 'btn-gray'}"
                ${tickets >= OBSERVE_TICKET_COST ? 'onclick="buyObservation()"' : 'disabled'}
                style="width:auto; padding:10px 22px;">
                🔭 Beobachten — ${OBSERVE_TICKET_COST} 🎫
            </button>
            <div style="font-size:10px; color:#b2bec3; margin-top:6px;">Du hast ${tickets} 🎫</div>`;
    } else {
        let scene = getWolkendorfScene();
        html += `
            <div style="text-align:center; padding:14px 10px; background:linear-gradient(160deg,#74b9ff,#a29bfe 60%,#b8e994); border-radius:12px; color:#fff; margin-bottom:12px; position:relative; overflow:hidden;">
                <div style="font-size:10px; opacity:0.85; letter-spacing:1px; text-transform:uppercase;">${t('Live aus dem Wolkendorf')}</div>
                <div style="font-size:48px; margin:6px 0; animation:storyFloat 3s ease-in-out infinite;">${scene.emoji}</div>
                <div style="font-size:12px; font-weight:bold;">${(pet && pet.name) ? pet.name : 'Dein Tamagotchi'}</div>
                <div style="font-size:11px; opacity:0.95; margin-top:3px;">${scene.text}</div>
            </div>

            <div style="font-size:12px; color:#2d3436; font-weight:bold; margin-bottom:4px;">🎁 ${t('Geschenk schicken')}</div>
            <p style="font-size:11px; color:#576574; margin:0 0 10px;">${t('giftNote')}</p>
            <button class="onboard-btn ${(giftsLeft > 0 && tCoins >= GIFT_COIN_COST) ? 'btn-gold' : 'btn-gray'}"
                ${(giftsLeft > 0 && tCoins >= GIFT_COIN_COST) ? 'onclick="sendGift()"' : 'disabled'}
                style="width:auto; padding:10px 22px;">
                ${giftsLeft > 0 ? `🎁 ${t('Geschenk senden')} — ${GIFT_COIN_COST} 🪙` : '✅ ' + t('Heute alle 3 verschickt')}
            </button>
            <div style="font-size:10px; color:#b2bec3; margin-top:6px;">${t('Heute noch')} ${giftsLeft} / ${GIFTS_PER_DAY} ${t('Geschenke')} · ${t('Du hast')} ${tCoins} 🪙</div>`;
    }

    // Vermächtnis-Übersicht
    html += `<div style="margin-top:16px; text-align:left;">
        <div style="font-size:12px; font-weight:bold; color:#2d3436; border-bottom:1px solid #dfe6e9; padding-bottom:4px; margin-bottom:6px;">🏛️ ${t('Dein Vermächtnis (dauerhaft)')}</div>`;
    let any = false;
    LEGACY_STATS.forEach(s => {
        let b = getLegacyBonus(s.id);
        if (b > 0) any = true;
        let pct = (b * 100).toFixed(1).replace('.0','');
        html += `
            <div style="display:flex; align-items:center; gap:8px; padding:4px 0; ${b > 0 ? '' : 'opacity:0.4;'}">
                <div style="font-size:17px; width:24px; text-align:center;">${s.icon}</div>
                <div style="flex:1;">
                    <div style="font-size:11px; font-weight:bold;">${t(s.name)}</div>
                    <div style="font-size:9.5px; color:#576574;">${t(s.desc)}</div>
                </div>
                <div style="font-size:11px; font-weight:bold; color:${b > 0 ? '#00b894' : '#b2bec3'}; white-space:nowrap;">${b > 0 ? '+' + pct + '%' : '—'}</div>
            </div>`;
    });
    if (!any) html += `<div style="font-size:10px; color:#b2bec3; text-align:center; padding:6px;">${t('Noch keine Boni. Verschicke dein erstes Geschenk!')}</div>`;
    html += `</div>`;

    document.getElementById('endgameContent').innerHTML = html;
}

// Kleine, wechselnde Szenen aus dem Wolkendorf
const WOLKENDORF_SCENES = [
    { emoji: '☁️😴', text: 'Es macht ein Nickerchen auf einer besonders flauschigen Wolke.' },
    { emoji: '🌈🤸', text: 'Es turnt vergnügt über einen Regenbogen.' },
    { emoji: '☕☁️', text: 'Es trinkt Wolkentee mit seinen Freunden.' },
    { emoji: '🫧🛁', text: 'Es planscht in einem Wolkenbad voller Seifenblasen.' },
    { emoji: '📚🤓', text: 'Es liest in der Wolkenbibliothek – ganz vertieft.' },
    { emoji: '⭐🎣', text: 'Es angelt Sternschnuppen vom Himmelsrand.' },
    { emoji: '🎈☁️', text: 'Es lässt bunte Ballons über das Dorf steigen.' },
    { emoji: '🍰🎉', text: 'Im Dorf wird gefeiert – es hat das größte Stück Kuchen!' },
    { emoji: '💭🥺', text: 'Es schaut nach unten zur Erde… und vermisst dich ein bisschen.' },
    { emoji: '🌙✨', text: 'Es poliert den Mond, damit er heute Nacht besonders hell scheint.' }
];
function getWolkendorfScene() {
    // Szene wechselt stündlich, damit sie sich nicht bei jedem Klick ändert
    let h = Math.floor(Date.now() / 3600000);
    let sc = WOLKENDORF_SCENES[h % WOLKENDORF_SCENES.length];
    return { emoji: sc.emoji, text: t(sc.text) };
}

function buyObservation() {
    if (tickets < OBSERVE_TICKET_COST) { playSound('lose'); return; }
    tickets -= OBSERVE_TICKET_COST;
    safeSetItem('tama_tickets', tickets.toString());
    updateTicketDisplay();
    legacy.observeDate = new Date().toDateString();
    saveLegacy();
    playSound('sparkle');
    spawnConfetti('unlock');
    renderEndgameModal();
}

function sendGift() {
    resetGiftDayIfNeeded();
    if ((legacy.giftsToday || 0) >= GIFTS_PER_DAY) { playSound('cancel'); return; }
    if (tCoins < GIFT_COIN_COST) { playSound('lose'); return; }

    tCoins -= GIFT_COIN_COST;
    updateCoinDisplay();
    legacy.giftsToday = (legacy.giftsToday || 0) + 1;

    // Zufälliger Stat wird dauerhaft um 0,5% angehoben
    let stat = LEGACY_STATS[Math.floor(Math.random() * LEGACY_STATS.length)];
    legacy.bonuses[stat.id] = (legacy.bonuses[stat.id] || 0) + LEGACY_STEP;
    saveLegacy();

    let total = (legacy.bonuses[stat.id] * 100).toFixed(1).replace('.0','');
    showAchievementBanner(stat.icon, `${stat.name} +0,5% (jetzt +${total}%)`, 'building');
    renderEndgameModal();
}

let arenaState = JSON.parse(safeGetItem('tama_arena') || '{}');

function getWeekKey() {
    let now = new Date();
    let start = new Date(now.getFullYear(), 0, 1);
    let week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
}

function resetArenaWeekIfNeeded() {
    let wk = getWeekKey();
    if (arenaState.weekKey !== wk) {
        arenaState = { weekKey: wk, usedBosses: [], usedPvP: false, usedRaid: false };
        safeSetItem('tama_arena', JSON.stringify(arenaState));
    }
    if (arenaState.usedRaid === undefined) arenaState.usedRaid = false;   // aeltere Spielstaende
}

function saveArenaState() { safeSetItem('tama_arena', JSON.stringify(arenaState)); }

function raidSectionHtml() {
    let used = arenaState.usedRaid;
    let participants = 1 + raidAllies.length;
    let ready = raidAllies.length >= 1;
    let mult = ready ? (1 + (participants - 2) * 0.35) : 1;
    let lootCount = RAID_BOSS.lootItems + (participants >= 4 ? 1 : 0);

    let allyList = raidAllies.length
        ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin:6px 0;">`
          + raidAllies.map(a => `<span style="background:#eef4ff; border:1px solid #cfe0ff; border-radius:999px; padding:2px 8px; font-size:10px;">${speciesList[a.speciesIndex]||'🐾'} ${a.name}</span>`).join('')
          + `</div>`
        : '';

    return `
        <div style="background:linear-gradient(135deg,#2c1e4a,#4a2c6b); border-radius:10px; padding:12px; color:#fff; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="font-size:34px;">${RAID_BOSS.icon}</div>
                <div style="flex:1;">
                    <div style="font-size:13px; font-weight:bold;">${t(RAID_BOSS.name)} <span style="font-size:10px; opacity:0.8;">${RAID_BOSS.hp} HP</span></div>
                    <div style="font-size:10px; opacity:0.85; margin-top:2px;">${t(RAID_BOSS.desc)}</div>
                </div>
            </div>
            <div style="font-size:10px; color:#ffd166; margin-top:8px;">
                💰${Math.round(RAID_BOSS.base.coins*mult)} · 🎫${Math.round(RAID_BOSS.base.tickets*mult)} · +${Math.round(RAID_BOSS.base.xp*mult)}XP · 🎁 ${lootCount} ${t('zufällige Gegenstände')}
            </div>
            <div style="font-size:10px; opacity:0.8; margin-top:4px;">
                ${t('Mindestens')} <b>2 ${t('Tamagotchis')}</b> ${t('nötig')} · ${t('aktuell')} <b>${participants}</b> · ${t('mehr Verbündete = mehr Beute')}
            </div>
            ${allyList}
        </div>
        ${used
            ? `<button class="onboard-btn btn-gray" disabled style="font-size:11px;">⏳ ${t('Diese Woche schon gekämpft')}</button>`
            : `<button class="onboard-btn btn-blue" style="font-size:11px;" onclick="triggerRaidImport()">📂 ${t('Tagesaktuelle Spielstände laden')}</button>
               <button class="onboard-btn ${ready ? 'btn-gold' : 'btn-gray'}" style="font-size:11px; margin-top:6px;" ${ready ? '' : 'disabled'} onclick="startRaidFight()">⚔️ ${t('Raid starten')} (${participants} ${t('Tamagotchis')})</button>
               ${ready ? `<button class="onboard-btn btn-gray" style="font-size:10px; margin-top:6px;" onclick="clearRaidAllies()">Verbündete zurücksetzen</button>` : ''}`
        }`;
}

function openArenaModal() {
    resetArenaWeekIfNeeded();
    playSound('select');
    let pvpUsed = arenaState.usedPvP;
    let html = `
        <div style="background:linear-gradient(135deg,#2d3436,#636e72); border-radius:10px; padding:12px; margin-bottom:12px; text-align:center; color:white;">
            <div style="font-size:28px; margin-bottom:4px;">⚔️</div>
            <div style="font-size:13px; font-weight:bold;">${t('Wolkendorf-Arena')}</div>
            <div style="margin-top:5px;">${medalRankBadgeHtml(dominantMedalTier(medalTiers), getUnlockedMedalCount(), true)}</div>
            <div style="font-size:10px; opacity:0.7; margin-top:3px;">${t('Kämpfe können je 1× pro Woche gestartet werden')}</div>
        </div>
        <div style="font-size:13px; font-weight:bold; color:#2d3436; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #dfe6e9;">🤝 PvP — Tamagotchi-Duell</div>
        <p style="font-size:11px; color:#576574; margin-bottom:8px;">${t('Lade die Spielstand-JSON eines anderen Nutzers und lasst eure Tamagotchis gegeneinander antreten!')}</p>
        ${pvpUsed
            ? `<button class="onboard-btn btn-gray" disabled style="font-size:11px;">⏳ ${t('Dieses Woche schon gespielt')}</button>`
            : `<button class="onboard-btn btn-blue" style="font-size:11px;" onclick="triggerPvPImport()">📂 ${t('Gegner-JSON laden & kämpfen')}</button>`
        }
        <button class="onboard-btn btn-gray" style="font-size:11px; margin-top:6px;" onclick="shareTamaForFight()"><i class="fa-solid fa-share-nodes"></i> ${t('Tama zum Kampf senden')}</button>
        <p style="font-size:10px; color:#576574; margin-top:4px;">${t('Teile deine Spielstand-Datei, damit andere gegen dich antreten oder dich als Verbündeten in den Raid mitnehmen können.')}</p>
        <div style="font-size:13px; font-weight:bold; color:#2d3436; margin:14px 0 6px; padding-bottom:4px; border-bottom:1px solid #dfe6e9;">🌩️ ${t('Raid')} — ${t(RAID_BOSS.name)} (${t('1× pro Woche')})</div>
        ${raidSectionHtml()}
        <div style="font-size:13px; font-weight:bold; color:#2d3436; margin:14px 0 6px; padding-bottom:4px; border-bottom:1px solid #dfe6e9;">👹 ${t('Mini-Bosse')} (${t('1× pro Woche je Boss')})</div>`;

    ARENA_BOSSES.forEach(b => {
        let used = arenaState.usedBosses.includes(b.id);
        let canFight = state.isStarted && !pet.isDead;   // abgereist ist ok: die Arena liegt im Wolkendorf
        html += `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f1f2f6;">
                <div style="font-size:28px; min-width:36px; text-align:center;">${b.icon}</div>
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:bold;">${t(b.name)} <span style="font-size:10px;">Lvl ${b.lvl}</span></div>
                    <div style="font-size:10px; color:#576574; margin-top:1px;">${t(b.desc)}</div>
                    <div style="font-size:10px; color:#f39c12; margin-top:2px;">💰${b.reward.coins} · 🎫${b.reward.tickets} · +${b.reward.xp}XP · ${Math.round(b.reward.lootChance*100)}% ${t('Trophäe')}</div>
                </div>
                <div>${used
                    ? `<button class="shop-btn btn-gray" disabled style="font-size:10px; white-space:nowrap;">⏳ ${t('Nächste Woche')}</button>`
                    : (canFight
                        ? `<button class="shop-btn btn-gold" onclick="startBossFight('${b.id}')" style="font-size:10px; white-space:nowrap;">⚔️ ${t('Kämpfen!')}</button>`
                        : `<button class="shop-btn btn-gray" disabled style="font-size:10px; white-space:nowrap;">Kein Tama</button>`)
                }</div>
            </div>`;
    });
    html += `<div style="margin-top:10px; font-size:10px; color:#b2bec3; text-align:center;">${t('Arena-Quests setzen sich jeden Montag zurück.')}</div>`;
    document.getElementById('arenaContent').innerHTML = html;
    document.getElementById('arenaModal').style.display = 'flex';
}

function triggerPvPImport() { document.getElementById('arenaOpponentInput').click(); }

// Eigenen Spielstand zum Kampf freigeben. Die Datei ist das normale
// Backup - genau das lesen PvP-Duell und Raid als Gegner bzw. Verbuendete.
// Versand ueber saveOrShareFile: auf iOS der Teilen-Dialog (direkt aus der
// Nutzer-Geste), auf allen anderen Systemen ein regulaerer Download.
function shareTamaForFight() {
    if (!safeGetItem('tama_save_v6')) { alert(t('Kein aktiver Spielstand zum Sichern vorhanden!')); return; }
    playSound('select');
    let who = (typeof pet !== 'undefined' && pet && pet.name) ? pet.name : 'tama';
    let stamp = new Date().toISOString().slice(0, 10);
    saveOrShareFile(buildBackup(), `tama_kampf_${who}_${stamp}.json`,
                    (lang === 'en' ? 'Tamagotchi battle file' : 'Tamagotchi Kampf-Datei'), false);
}

function handlePvPImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsed = JSON.parse(e.target.result);
            let enemy = null, enemyRank = 0;
            // Neues Backup-Format: Tamagotchi + Medaillen stecken in data
            if (parsed && parsed.format === BACKUP_FORMAT && parsed.data && parsed.data.tama_save_v6) {
                enemy = JSON.parse(parsed.data.tama_save_v6);
                try { enemyRank = dominantMedalTier(JSON.parse(parsed.data.tama_medals || '{}')); } catch(err2) {}
                // Manipulierte Gegner-Dateien direkt kenntlich machen
                if (parsed.version >= 3 && parsed.sig !== backupChecksum(parsed.data)) {
                    alert('⚠️ Diese Gegner-Datei wurde nach dem Sichern verändert (Prüfsumme ungültig)!\nDer Kampf findet trotzdem statt - aber sag deinem Gegner, dass Schummeln auffällt.');
                }
            }
            // Altes Format: die Datei ist direkt das Tamagotchi
            else if (parsed && parsed.name) { enemy = parsed; }

            if (!enemy || !enemy.name) { alert('Ungültige Gegner-Datei!'); return; }
            enemy._rankTier = enemyRank;
            startPvPFight(enemy);
        } catch(err) { alert('Datei konnte nicht gelesen werden.'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function calcPetPower(p) {
    let base = (p.happiness || 50) * 0.5 + (p.energy || 50) * 0.3 + (p.intelligence || 0) * 2;
    let ageFactor = Math.min(2.5, 1 + (p.activeSeconds || 0) / 7200);
    let luck = 0.75 + Math.random() * 0.5;
    // Kraft-Booster nur für das eigene Tamagotchi (nicht für importierte Gegner)
    let powerMult = (p === pet) ? getActiveMultiplier('power') * (1 + getLegacyBonus('power')) : 1;
    return Math.round(base * ageFactor * luck * powerMult);
}

async function startPvPFight(enemy) {
    resetArenaWeekIfNeeded();
    if (arenaState.usedPvP) { playSound('cancel'); return; }
    if (!state.isStarted || pet.isDead) { alert('Dein Tamagotchi muss aktiv sein!'); return; }
    closeModal('arenaModal');
    let myPow = calcPetPower(pet), enemyPow = calcPetPower(enemy);
    let myWin = myPow > enemyPow;
    let myAnimal = speciesList[pet.speciesIndex] || '🐾';
    let enemyAnimal = speciesList[enemy.speciesIndex] || '🐾';
    arenaState.usedPvP = true; saveArenaState();
    await showArenaAnimation('pvp', myAnimal, pet.name || 'Mein Tama', myPow, enemyAnimal, enemy.name || 'Gegner', enemyPow, myWin, dominantMedalTier(medalTiers), enemy._rankTier || 0);
    if (myWin) {
        addCoins(400);
        let gotT = addTickets(6);
        spawnFloatText('ticketDisplay', `+${gotT} 🎫`, '#1dd1a1');
        addAccountXP(50);
        lifetime.pvpWins = (lifetime.pvpWins || 0) + 1; saveLifetime();  // fuer die Highscores
        showAchievementBanner('🤝', `PvP-Sieg! +400🪙 +${gotT}🎫 +50XP`, 'building');
    } else {
        pet.happiness = Math.max(0, pet.happiness - 10);
        showAchievementBanner('😞', `Verloren gegen ${enemy.name}... Trainiere weiter!`, 'generic');
    }
}

async function startBossFight(bossId) {
    resetArenaWeekIfNeeded();
    if (arenaState.usedBosses.includes(bossId)) { playSound('cancel'); return; }
    if (!state.isStarted || pet.isDead) { alert('Dein Tamagotchi muss aktiv sein!'); return; }
    let boss = ARENA_BOSSES.find(b => b.id === bossId);
    if (!boss) return;
    closeModal('arenaModal');
    let petPow = calcPetPower(pet);
    let winChance = Math.min(0.85, Math.max(0.10, petPow / (petPow + boss.hp * 0.6)));
    let myWin = Math.random() < winChance;
    let myAnimal = speciesList[pet.speciesIndex] || '🐾';
    arenaState.usedBosses.push(bossId); saveArenaState();
    await showArenaAnimation('boss', myAnimal, pet.name || 'Mein Tama', petPow, boss.icon, boss.name, boss.hp, myWin);
    if (myWin) {
        lifetime.bossWins = (lifetime.bossWins || 0) + 1; saveLifetime();  // fuer die Highscores
        addCoins(boss.reward.coins);
        let gotT = addTickets(boss.reward.tickets);
        spawnFloatText('ticketDisplay', `+${gotT} 🎫`, '#1dd1a1');
        addAccountXP(boss.reward.xp);
        if (Math.random() < boss.reward.lootChance) {
            inventory.items[boss.reward.lootId] = (inventory.items[boss.reward.lootId] || 0) + 1;
            safeSetItem('tama_inventory', JSON.stringify(inventory));
            setTimeout(() => showAchievementBanner('🏆', `SELTENER LOOT: ${SHOP_ITEMS.find(i=>i.id===boss.reward.lootId)?.name || 'Trophäe'}!`, 'building'), 2400);
        }
        showAchievementBanner('🏆', `${t(boss.name)} ${t('besiegt!')} +${boss.reward.coins}🪙 +${gotT}🎫`, 'building');
    } else {
        pet.happiness = Math.max(0, pet.happiness - 15);
        pet.energy = Math.max(0, pet.energy - 20);
        showAchievementBanner('💀', `${t(boss.name)} ${t('hat gewonnen! Nächste Woche Revanche!')}`, 'generic');
        playSound('lose');
    }
}

function showArenaAnimation(mode, myEmoji, myName, myPow, enemyEmoji, enemyName, enemyPow, myWin, myRank, enemyRank) {
    return new Promise(resolve => {
        let overlay = document.getElementById('arenaOverlay');
        let box = document.getElementById('arenaAnimBox');
        const isBoss = (mode === 'boss' || mode === 'raid');
        const isRaid = (mode === 'raid');
        overlay.style.display = 'flex';
        overlay.classList.toggle('boss-mode', isBoss);
        box.classList.toggle('boss-box', isBoss);

        let rounds = isRaid ? 7 : (isBoss ? 6 : 5), frame = 0, myHp = 100, enemyHp = 100;
        const ATK = ['💥','⚡','🌀','🔥','💫','✨','💢','🗡️'];
        const WIN_L = ['Perfekter Treffer! ⚡','Unaufhaltsam! 💪','Bravour! 🎯','Schachmatt! ♟️'];
        const MISS_L = ['Knapp! 😤','Fast! 🙈','Aua! 😵','Weiter so! 🎲'];
        // Dramatischere Kampfrufe fuer Boss-Duelle
        const BOSS_HIT = ['VOLLTREFFER!! 💥','Der Boss wankt! 😵‍💫','Kritischer Schlag! ⚔️','Das sass! 🔥','Unglaublich! ⭐'];
        const BOSS_TAKE = ['Ein harter Schlag! 😖','Der Boss dröhnt! 😱','Das tat weh! 💢','Aufpassen! ⚠️','Fast am Boden! 🩸'];

        // Farben je nach Modus (Boss = dunkler Hintergrund)
        const cMain = isBoss ? '#f5f6fa' : '#2d3436';
        const cSub  = isBoss ? '#9aa4c4' : '#999';

        function getDmg(isMyTurn) {
            return isMyTurn
                ? (myWin ? Math.floor(Math.random()*12+10) : Math.floor(Math.random()*7+3))
                : (myWin ? Math.floor(Math.random()*6+2) : Math.floor(Math.random()*14+8));
        }

        function render(msg, atkEmoji, dmg, hitEnemy, isCrit) {
            let myBar = `<div style="background:${myHp<30?'#ff3b5c':'#e17055'};height:8px;border-radius:4px;width:${myHp}%;transition:width 0.4s;"></div>`;
            let enBar = `<div style="background:${enemyHp<30?'#ff3b5c':'#6c5ce7'};height:8px;border-radius:4px;width:${enemyHp}%;transition:width 0.4s;"></div>`;
            // Schwebende Schadenszahl ueber dem getroffenen Kaempfer
            let dmgHtml = (dmg != null)
                ? `<div class="dmg-float ${isCrit?'crit':''}" style="left:50%;top:6px;transform:translateX(-50%);color:${isCrit?'#ffd166':'#ff6b6b'};">−${dmg}${isCrit?'!':''}</div>`
                : '';
            let myHurt  = (dmg != null && !hitEnemy) ? 'fighter-hurt' : '';
            let enHurt  = (dmg != null && hitEnemy) ? 'fighter-hurt' : '';
            box.innerHTML = `
                <div style="font-size:10px;color:${cSub};margin-bottom:10px;letter-spacing:1px;text-transform:uppercase;">
                    ${isRaid ? `<span style="color:#ffd166;font-weight:bold;">🌩️ RAID · VERBUND-KAMPF 🌩️</span>`
                      : (isBoss ? `<span style="color:#ff3b5c;font-weight:bold;">☠️ Mini-Boss-Kampf ☠️</span>` : 'Tamagotchi-Duell')}
                </div>
                <div style="display:flex;align-items:flex-end;justify-content:center;gap:16px;margin-bottom:14px;">
                    <div style="text-align:center;position:relative;" class="${myHurt}">
                        ${(dmg != null && !hitEnemy) ? dmgHtml : ''}
                        <div style="font-size:${isRaid && myEmoji.length > 4 ? '26px' : '46px'};filter:drop-shadow(0 0 8px rgba(255,200,0,0.5));line-height:1.1;max-width:110px;">${myEmoji}</div>
                        <div style="font-size:11px;font-weight:bold;color:${cMain};margin-top:3px;">${myName}</div>
                        ${mode==='pvp' ? `<div style="margin-top:2px;">${medalRankBadgeHtml(myRank||0, undefined, true)}</div>` : ''}
                        <div style="width:76px;background:${isBoss?'#3b3054':'#dfe6e9'};border-radius:4px;margin:3px auto 0;overflow:hidden;">${myBar}</div>
                        <div style="font-size:10px;color:#e17055;">${myHp} HP</div>
                    </div>
                    <div style="font-size:${isCrit?'42px':'30px'};padding-bottom:18px;transition:font-size 0.15s;">${atkEmoji||'⚔️'}</div>
                    <div style="text-align:center;position:relative;" class="${enHurt}">
                        ${(dmg != null && hitEnemy) ? dmgHtml : ''}
                        <div style="font-size:${isBoss?'54px':'46px'};filter:drop-shadow(0 0 ${isBoss?'14px rgba(255,59,92,0.8)':'8px rgba(150,0,255,0.4)'});">${enemyEmoji}</div>
                        <div style="font-size:11px;font-weight:bold;color:${cMain};margin-top:3px;">${enemyName}</div>
                        ${mode==='pvp' ? `<div style="margin-top:2px;">${medalRankBadgeHtml(enemyRank||0, undefined, true)}</div>` : ''}
                        <div style="width:76px;background:${isBoss?'#3b3054':'#dfe6e9'};border-radius:4px;margin:3px auto 0;overflow:hidden;">${enBar}</div>
                        <div style="font-size:10px;color:${isBoss?'#ff3b5c':'#6c5ce7'};">${enemyHp} HP</div>
                    </div>
                </div>
                <div style="font-size:12px;color:${cMain};min-height:18px;font-style:italic;">${msg}</div>`;
        }

        // Erschuetterung ausloesen (nur im Boss-Kampf)
        function jolt(isCrit) {
            if (!isBoss) return;
            box.classList.remove('shake', 'crit');
            void box.offsetWidth;              // Reflow erzwingen, damit die Animation neu startet
            box.classList.add(isCrit ? 'crit' : 'shake');
        }

        function runFight() {
            let iv = setInterval(() => {
                frame++;
                let isMyTurn = frame % 2 === 1;
                let dmg = getDmg(isMyTurn);
                // Kritische Treffer nur im Boss-Kampf, ca. jeder 4. Schlag
                let isCrit = isBoss && Math.random() < 0.28;
                if (isCrit) dmg = Math.round(dmg * 1.8);
                let atkEmoji = isCrit ? '💥' : ATK[Math.floor(Math.random() * ATK.length)];
                if (isMyTurn) enemyHp = Math.max(0, enemyHp - dmg);
                else myHp = Math.max(0, myHp - dmg);

                let pool = isBoss
                    ? (isMyTurn ? BOSS_HIT : BOSS_TAKE)
                    : (isMyTurn === myWin ? WIN_L : MISS_L);
                let flavour = pool[frame % pool.length];
                let msg = isMyTurn
                    ? `${myName} greift an: −${dmg} HP! ${flavour}`
                    : `${enemyName} kontert: −${dmg} HP! ${flavour}`;

                render(msg, atkEmoji, dmg, isMyTurn, isCrit);
                jolt(isCrit);
                playSound(isCrit ? 'alarm' : (isMyTurn === myWin ? 'win' : 'cancel'));

                if (frame >= rounds * 2) {
                    clearInterval(iv);
                    myHp = myWin ? Math.max(18, myHp) : 0;
                    enemyHp = myWin ? 0 : Math.max(18, enemyHp);
                    if (isBoss) {
                        // Finaler Schlag mit Zeitlupe und K.O.-Tafel
                        jolt(true);
                        playSound('alarm');
                        render(myWin ? 'LETZTER SCHLAG...' : 'DU KANNST NICHT MEHR...', '💥', null, myWin, true);
                        setTimeout(() => {
                            box.innerHTML = `
                                <div style="font-size:11px;letter-spacing:3px;color:${myWin?'#ffd166':'#ff3b5c'};margin-bottom:6px;">${myWin ? 'SIEG' : 'NIEDERLAGE'}</div>
                                <div class="boss-entry" style="font-size:66px;">${myWin ? '🏆' : '💀'}</div>
                                <div style="font-size:17px;font-weight:bold;color:#f5f6fa;margin-top:10px;">
                                    ${myWin ? `${enemyName} besiegt!` : `${enemyName} war zu stark!`}
                                </div>
                                <div style="font-size:11px;color:#9aa4c4;margin-top:6px;">
                                    ${myWin ? `${myName} steht als Champion in der Wolkendorf-Arena. 🎉` : `${myName} braucht eine Pause – nächste Woche Revanche! 💪`}
                                </div>`;
                            playSound(myWin ? 'achievement' : 'lose');
                            if (myWin) spawnConfetti('building');
                            setTimeout(finish, 3000);
                        }, 900);
                    } else {
                        render(myWin ? `🏆 ${myName} GEWINNT! ` : `💀 ${enemyName} siegt!`, myWin ? '🏆' : '💀');
                        playSound(myWin ? 'achievement' : 'lose');
                        if (myWin) spawnConfetti('building');
                        setTimeout(finish, 2800);
                    }
                }
            }, isBoss ? 780 : 700);
        }

        function finish() {
            overlay.style.display = 'none';
            overlay.classList.remove('boss-mode');
            box.classList.remove('boss-box', 'shake', 'crit');
            resolve();
        }

        if (isBoss) {
            // Dramatischer Auftritt: Warnung -> Boss erscheint -> VS -> Kampf
            box.innerHTML = `<div class="boss-warn">${isRaid ? '⚠️ RAID-ALARM ⚠️' : '⚠️ WARNUNG ⚠️'}</div>
                <div style="font-size:12px;color:#9aa4c4;margin-top:10px;">${isRaid ? 'Der Himmel verdunkelt sich...' : 'Ein Mini-Boss betritt die Arena...'}</div>`;
            playSound('alarm');
            setTimeout(() => {
                box.innerHTML = `<div class="boss-entry">${enemyEmoji}</div>
                    <div style="font-size:19px;font-weight:bold;color:#ff3b5c;margin-top:8px;letter-spacing:1px;">${enemyName}</div>
                    <div style="font-size:11px;color:#9aa4c4;margin-top:4px;">Kampfkraft ${enemyPow}</div>`;
                playSound('gacha');
                jolt(true);
            }, 1200);
            setTimeout(() => {
                box.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:14px;">
                        <div style="font-size:46px;">${myEmoji}</div>
                        <div class="boss-vs">VS</div>
                        <div style="font-size:52px;filter:drop-shadow(0 0 14px rgba(255,59,92,0.8));">${enemyEmoji}</div>
                    </div>
                    <div style="font-size:12px;color:#f5f6fa;margin-top:12px;font-weight:bold;">${myName} &nbsp;·&nbsp; ${enemyName}</div>`;
                playSound('achievement');
                jolt(false);
            }, 2600);
            setTimeout(() => { render('Der Kampf beginnt! ⚔️', '⚔️'); runFight(); }, 3600);
        } else {
            render('Der Kampf beginnt! ⚔️', '⚔️');
            playSound('achievement');
            runFight();
        }
    });
}

function updateLevelDisplay() {
    let el = document.getElementById('levelBadge');
    if (el) el.innerText = accountLevel;
    // XP-Fortschritt direkt in der Pille anzeigen (ohne Modal öffnen zu müssen)
    let needed = xpNeededForLevel(accountLevel);
    let pct = Math.max(0, Math.min(100, (accountXP / needed) * 100));
    let fill = document.getElementById('pillXpFill');
    if (fill) fill.style.width = pct + '%';
    let txt = document.getElementById('pillXpText');
    if (txt) txt.innerText = `${accountXP}/${needed}`;
    let pill = document.getElementById('levelDisplay');
    if (pill) pill.title = `Pfleger-Level ${accountLevel} — ${accountXP} / ${needed} XP (${Math.round(pct)}%)`;
}

// --- Verbleibende Besuchszeit heute (30 Min/Tag) ---
const DAILY_VISIT_SECONDS = 1800;
function updateVisitTimer() {
    let pill = document.getElementById('visitDisplay');
    if (!pill) return;
    let fill = document.getElementById('visitFill');
    let txt  = document.getElementById('visitText');

    // Vor dem Start und nach dem Tod ist die Anzeige sinnlos
    if (typeof pet === 'undefined' || !pet || !state.isStarted || pet.isDead) {
        pill.style.display = 'none';
        return;
    }
    pill.style.display = '';

    let used = Math.min(DAILY_VISIT_SECONDS, Math.max(0, pet.dailyPlaytimeSeconds || 0));
    let left = DAILY_VISIT_SECONDS - used;
    let departed = pet.isDeparted || left <= 0;
    let pct = (left / DAILY_VISIT_SECONDS) * 100;

    if (fill) fill.style.width = pct + '%';

    // Farbstufen: gruen -> gelb (ab 10 Min) -> rot (ab 3 Min) -> grau (weg)
    pill.classList.toggle('warn', !departed && left <= 600 && left > 180);
    pill.classList.toggle('crit', !departed && left <= 180);
    pill.classList.toggle('gone', departed);

    if (departed) {
        if (txt) txt.innerText = t('morgen');
        pill.title = t('Besuchszeit aufgebraucht — dein Wolkenwesen kommt morgen wieder.');
    } else {
        let m = Math.floor(left / 60), s = left % 60;
        if (txt) txt.innerText = `${m}:${String(s).padStart(2, '0')}`;
        pill.title = `Besuchszeit heute: noch ${m} Min ${s} Sek von 30 Minuten`;
    }
}

function addAccountXP(amount) {
    if (!amount || amount <= 0) return;
    let bonus = (typeof getVillageEffect === 'function') ? getVillageEffect('observatory') : 0;
    // Klügere Tamagotchis bringen mehr XP: +1% je IQ-Punkt, gedeckelt bei +100%.
    let iqBonus = (typeof pet !== 'undefined' && pet && pet.intelligence > 0) ? Math.min(1, pet.intelligence * 0.01) : 0;
    amount = Math.max(1, Math.round(amount * (1 + bonus) * (1 + iqBonus) * getActiveMultiplier('xp') * (1 + getLegacyBonus('xpGain')))); // Sternwarte + IQ + XP-Booster + Vermächtnis
    accountXP += amount;
    let leveledUp = false;
    let newLevels = [];
    let prevLevel = accountLevel;
    while (accountXP >= xpNeededForLevel(accountLevel)) {
        accountXP -= xpNeededForLevel(accountLevel);
        accountLevel++;
        leveledUp = true;
        newLevels.push(accountLevel);
    }
    safeSetItem('tama_acc_level', accountLevel.toString());
    safeSetItem('tama_acc_xp', accountXP.toString());
    updateLevelDisplay();
    spawnFloatText('levelDisplay', `+${amount} XP`, '#a29bfe');
    if (!leveledUp) playSound('xp');
    if (leveledUp) {
        updateFeatureLocks();
        updateDockNotifications(); // frisch freigeschaltete Features sofort markieren
        showAchievementBanner('🎓', `Pfleger-Level ${accountLevel} erreicht!`, 'level');
        newLevels.forEach((lvl, i) => {
            setTimeout(() => checkLevelUnlocks(lvl), 1800 * (i + 1));
            // Zeige Feature-Unlock-Popup für alle Features die genau dieses Level benötigen
            FEATURE_LOCK_CONFIG.filter(f => f.minLevel === lvl).forEach((f, j) => {
                setTimeout(() => queueFeatureUnlockModal(f), 2200 * (i + 1) + j * 500);
            });
        });
    }
}

function checkLevelUnlocks(level) {
    LEVEL_UNLOCKS.filter(u => u.level === level).forEach(u => {
        showAchievementBanner('🔓', `${t('Freigeschaltet')}: ${t(u.name)}`, 'unlock');
    });
}

function openLevelModal() {
    playSound('select');
    let needed = xpNeededForLevel(accountLevel);
    document.getElementById('levelProgressText').innerText = `🎓 Level ${accountLevel} — ${accountXP} / ${needed} XP`;
    document.getElementById('levelProgressBar').style.width = `${Math.min(100, Math.round((accountXP / needed) * 100))}%`;

    let html = '';
    LEVEL_UNLOCKS.forEach(u => {
        let unlocked = accountLevel >= u.level;
        html += `
            <div style="display:flex; align-items:center; gap:8px; padding:6px 2px; border-bottom:1px solid rgba(0,0,0,0.06);">
                <div style="font-size:16px;">${unlocked ? '✅' : '🔒'}</div>
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:bold;">${t(u.name)}</div>
                    <div style="font-size:10px; color:#576574;">${unlocked ? t('Freigeschaltet!') : `${t('Ab Pfleger-Level')} ${u.level}`}</div>
                </div>
            </div>`;
    });
    document.getElementById('levelUnlocksContent').innerHTML = html;
    document.getElementById('levelModal').style.display = 'flex';
}


function openModal(id) { playSound('select'); document.getElementById(id).style.display = 'flex'; }

// Handbuch mit frischem Installations-Status oeffnen
function openInfoModal() { updateInstallHint(); openModal('infoModal'); }

// Zeigt an, ob die App schon als Home-Bildschirm-App laeuft. Sonst wuerde
// die Anleitung Leuten etwas raten, das sie laengst erledigt haben.
function isInstalledApp() {
    try {
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) {}
    return navigator.standalone === true; // iOS-Sonderweg
}

function updateInstallHint() {
    let el = document.getElementById('installState');
    if (!el) return;
    if (isInstalledApp()) {
        el.className = 'install-state ok';
        el.innerText = '✓ Läuft bereits als installierte App – dein Fortschritt ist geschützt.';
    } else if (!location.protocol.startsWith('http')) {
        el.className = 'install-state warn';
        el.innerText = '⚠️ Als lokale Datei geöffnet – installieren geht nur über eine https-Adresse.';
    } else {
        el.className = 'install-state warn';
        el.innerText = '⚠️ Läuft im Browser-Tab – noch nicht installiert.';
    }
}
function closeModal(id) { playSound('cancel'); document.getElementById(id).style.display = 'none'; if (id === 'shopModal') stopCountdownUpdater(); }

// ================================================================
// === AHNENGALERIE: mehrere Graeber + Grabpflege ==================
// ================================================================
// Frueher lag im Friedhof nur das zuletzt verstorbene Tamagotchi.
// Fuer die Grabpflege braucht es alle Ahnen - daher eine Liste, die
// alte Einzel-Eintraege beim ersten Laden automatisch uebernimmt.
