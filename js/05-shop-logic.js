/* Pausentamagotchi - Kaufen, Benutzen, Inventar, Gluecksrad */
const BACKUP_FORMAT = 'pausentamagotchi-backup';

// --- Medaillen-Rang: welcher Stufe gehoert die Mehrheit der Medaillen an? ---
function medalTierCountsFrom(tiersObj) {
    let counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    Object.values(tiersObj || {}).forEach(t => { if (counts[t] !== undefined) counts[t]++; });
    return counts;
}
// Liefert 0 (keine Medaillen) oder 1-4. Bei Gleichstand zaehlt die hoehere Stufe.
function dominantMedalTier(tiersObj) {
    let c = medalTierCountsFrom(tiersObj);
    let best = 0, bestN = 0;
    [1, 2, 3, 4].forEach(t => { if (c[t] >= bestN && c[t] > 0) { best = t; bestN = c[t]; } });
    return best;
}
function medalRankBadgeHtml(tier, medalCount, small) {
    if (!tier) return `<span class="rank-badge rank-none" style="${small?'font-size:9px;':''}">${t('ohne Medaillen-Rang')}</span>`;
    // Bewusst NICHT "t" nennen - das ist die Uebersetzungsfunktion.
    let mt = MEDAL_TIERS[tier - 1];
    return `<span class="rank-badge" style="background:${mt.color}22; border-color:${mt.color}; color:${mt.text}; ${small?'font-size:9px;':''}" title="${t('Überwiegend')} ${t(mt.name)}-${t('Medaillen')}">${mt.badge} ${t(mt.name)}${t('-Rang')}${medalCount !== undefined ? ` · ${medalCount} 🏅` : ''}</span>`;
}

// Pruefsumme ueber den kompletten Inhalt (sortierte Schluessel + Salt).
// Ehrlicherweise: Das ist ein Manipulations-DETEKTOR, kein Schutz - der
// Code ist im Browser einsehbar, wer will, kann die Summe nachrechnen.
// Gegen versehentliche Beschaedigung und schnelles Editieren reicht es.
function backupChecksum(data) {
    const salt = 'Pausentama_Backup_Sig_v3';
    let str = salt;
    Object.keys(data).sort().forEach(k => { str += '\u001f' + k + '=' + data[k]; });
    let a = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        a ^= str.charCodeAt(i);
        a = (a * 0x01000193) >>> 0;   // FNV-1a, 32 Bit
    }
    return a.toString(16).padStart(8, '0');
}

function buildBackup() {
    let data = {};
    BACKUP_KEYS.forEach(k => {
        let v = safeGetItem(k);
        if (v !== null && v !== undefined) data[k] = v;
    });
    return JSON.stringify({
        format: BACKUP_FORMAT,
        version: 3,
        created: new Date().toISOString(),
        petName: (typeof pet !== 'undefined' && pet && pet.name) ? pet.name : null,
        medalRank: dominantMedalTier(medalTiers),
        sig: backupChecksum(data),
        data: data
    }, null, 1);
}

// Rueckgabe: { msg } bei Erfolg, { cancelled: true } bei Nutzer-Abbruch, null bei Muell.
function applyBackup(parsed) {
    // Neues Format: vollstaendiger Fortschritt -> sauber ersetzen
    if (parsed && parsed.format === BACKUP_FORMAT && parsed.data) {
        let note = '';
        if (parsed.version >= 3) {
            if (parsed.sig !== backupChecksum(parsed.data)) {
                playSound('alarm');
                let ok = confirm('⚠️ WARNUNG: Die Prüfsumme stimmt nicht!\n\n' +
                    'Dieses Backup wurde nach dem Sichern verändert oder ist beschädigt. ' +
                    'Es könnte manipulierte Werte (Coins, Level, Medaillen ...) enthalten.\n\n' +
                    'Trotzdem laden?');
                if (!ok) return { cancelled: true };
                note = '\n⚠️ Achtung: Prüfsumme ungültig - Inhalt möglicherweise manipuliert.';
            }
        } else {
            note = '\nHinweis: Backup einer älteren Version (ohne Prüfsumme).';
        }
        BACKUP_KEYS.forEach(k => {
            if (Object.prototype.hasOwnProperty.call(parsed.data, k)) safeSetItem(k, parsed.data[k]);
            else safeRemoveItem(k);   // nicht im Backup = gab es dort nicht
        });
        let rank = dominantMedalTier(JSON.parse(parsed.data.tama_medals || '{}'));
        let rankTxt = rank ? ` ${t('Medaillen-Rang')}: ${MEDAL_TIERS[rank-1].badge} ${t(MEDAL_TIERS[rank-1].name)}.` : '';
        return { msg: `Kompletter Spielstand wiederhergestellt (${Object.keys(parsed.data).length} Bereiche).${rankTxt}${note}` };
    }
    // Altes Format (vor V2.16): die Datei war nur das Tamagotchi-Objekt
    if (parsed && parsed.id && parsed.name) {
        safeSetItem('tama_save_v6', JSON.stringify(parsed));
        return { msg: 'Aelteres Backup erkannt - es enthaelt nur das Tamagotchi, nicht den restlichen Fortschritt.' };
    }
    return null;
}

// Nur iOS/iPadOS braucht den Teilen-Umweg: dort ignoriert Safari das
// download-Attribut. iPadOS 13+ meldet sich als "Macintosh" und ist nur
// ueber die Touch-Punkte von einem echten Mac zu unterscheiden.
function isIOSLike() {
    let ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

function downloadBlobFile(blob, name, isBackup) {
    let url = URL.createObjectURL(blob);
    let dl = document.createElement('a');
    dl.href = url; dl.download = name;
    document.body.appendChild(dl); dl.click(); dl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (isBackup !== false) markBackupDone();
}

// Einheitlicher Datei-Export fuer alle Downloads.
// Auf iOS ignoriert Safari das download-Attribut - dort muss der
// Teilen-Dialog her, und zwar DIREKT aus der Nutzer-Geste (kein await davor).
function saveOrShareFile(text, name, title, isBackup) {
    let blob = new Blob([text], { type: 'application/json' });
    if (!isIOSLike()) { downloadBlobFile(blob, name, isBackup); return; }
    try {
        let file = new File([blob], name, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: title })
                .then(() => { if (isBackup !== false) markBackupDone(); })
                .catch(err => {
                    if (!err || err.name !== 'AbortError') downloadBlobFile(blob, name, isBackup);
                });
            return;
        }
    } catch (e) { /* kein File/Share vorhanden -> reguläerer Download */ }
    downloadBlobFile(blob, name, isBackup);
}

function exportBackup() {
    playSound('select');
    if (!safeGetItem('tama_save_v6')) { alert("Kein aktiver Spielstand zum Sichern vorhanden!"); return; }
    let stamp = new Date().toISOString().slice(0, 10);
    let who = (typeof pet !== 'undefined' && pet && pet.name) ? pet.name : 'spielstand';
    let name = `pausentamagotchi_${who}_${stamp}.json`;
    // Windows/Edge, macOS, Linux und Android laden regulaer herunter;
    // nur iOS bekommt den Teilen-Dialog (siehe saveOrShareFile).
    saveOrShareFile(buildBackup(), name, 'Pausentamagotchi Backup', true);
}

function triggerBackupImport() {
    playSound('select');
    document.getElementById('backupFileInput').click(); 
}

function handleBackupImport(event) {
    const input = event.target;
    const file = input.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let res = null;
        try {
            res = applyBackup(JSON.parse(e.target.result));
        } catch(err) {
            alert("Die Datei konnte nicht gelesen werden. Ist es wirklich ein Backup?");
            playSound('lose'); input.value = ''; return;
        }
        input.value = '';   // sonst laesst sich dieselbe Datei kein zweites Mal waehlen
        if (!res) {
            alert("Ungültige Backup-Datei!");
            playSound('lose'); return;
        }
        if (res.cancelled) { playSound('cancel'); return; }
        playSound('win');
        alert(res.msg + "\n\nDas Spiel wird jetzt neu geladen.");
        location.reload();
    };
    reader.onerror = function() {
        alert("Die Datei konnte nicht gelesen werden.");
        playSound('lose'); input.value = '';
    };
    reader.readAsText(file);
}

function useItem(id) {
    let item = SHOP_ITEMS.find(i => i.id === id);

    if (item.type === 'toy' && id === 'eightball') {
        startEightBall();
        return;
    }
    if (item.type === 'hat') {
        inventory.equippedHat = (inventory.equippedHat === item.id) ? null : item.id;
        playSound('select');
    } 
    else if (item.type === 'unlock_poop') {
        inventory.rainbowPoop = !inventory.rainbowPoop;
        playSound('select');
    }
    else if (item.type === 'unlock_skin') {
        if (inventory.customSkinActive) {
            inventory.customSkinActive = false;
            applyColors(); playSound('cancel');
        } else {
            document.getElementById('customSkinInput').value = inventory.customSkinUrl || "";
            document.getElementById('customSkinModal').style.display = 'flex';
            playSound('select');
        }
    }
    else if (item.type === 'unlock_bg') {
        if (inventory.customBgActive) {
            inventory.customBgActive = false;
            render(); playSound('cancel');
        } else {
            document.getElementById('customBgInput').value = inventory.customBgUrl || "";
            document.getElementById('customBgModal').style.display = 'flex';
            playSound('select');
        }
    }
    else if (item.type === 'unlock_sub') {
        // ABO-LOGIK (ABONNIEREN / KÜNDIGEN)
        if (id === 'happy_sub') {
            if (inventory.happySubActive) {
                inventory.happySubActive = false;
                pet.happiness = Math.max(0, pet.happiness - 10);
                alert("Abo gekündigt! Du hast die Kündigungsfrist ignoriert: -10 Laune!");
            } else {
                inventory.happySubActive = true;
                alert("Glücks-Abo aktiv! 5 Münzen/Tag werden fällig.");
            }
        }
        else if (id === 'vip_sleep') {
            if (inventory.vipSleepActive) {
                inventory.vipSleepActive = false;
                alert("VIP-Schlaf beendet. Goldenes Bett abgebaut.");
            } else {
                inventory.vipSleepActive = true;
                alert("VIP-Schlaf aktiv! Luxus-Miete beträgt 20 Münzen/Tag.");
            }
        }
        playSound('select');
    }
    else {
        if(!state.isStarted || pet.isDead || pet.isDeparted) {
            alert("Dafür muss dein Tamagotchi aktuell bei dir und wach/am leben sein!");
            return;
        }
        if(pet.isCrashedUntil && pet.activeSeconds < pet.isCrashedUntil) {
            alert("Systemfehler! Tamagotchi reagiert nicht auf Items."); return;
        }

        // Essen mit Magenverstimmung 2.0 Chance auf Erbrechen
        if (item.cat === '🍔 Essen & Trinken' && pet.buffs && pet.buffs.stomachUpset2 && Math.random() < 0.3) {
            inventory.items[id]--;
            if(inventory.items[id] <= 0) delete inventory.items[id];
            pet.hunger = Math.max(0, pet.hunger - 30);
            pet.energy = Math.max(0, pet.energy - 30);
            playSound('lose');
            playAnimation('🤮 Erbrochen!<br>-30 Hunger / -30 Energie', 3000);
            updateCoinDisplay();
            switchShopTab('inventory');
            return;
        }

        inventory.items[id]--;
        if(inventory.items[id] <= 0) delete inventory.items[id];

        playSound('win');
        let petG = getPetGraphicWithHat();

        if (id === 'cookie') { pet.buffs.happy = pet.activeSeconds + 28800; setBuffExpiry('cookie'); playAnimation(petG+' 🥠', 2000); }
        else if (id === 'apple') { pet.hunger = 100; setBuffExpiry('apple'); playAnimation(petG+' 🍎', 2000); }
        else if (id === 'medkit') { pet.isSick = false; pet.sickCount = 0; playAnimation(petG+' ⚕️', 2000); }
        else if (id === 'shot') { pet.weight = Math.max(1, pet.weight - 10); pet.hunger = Math.max(0, pet.hunger - 50); setBuffExpiry('shot'); playAnimation(petG+' 💉<br>-50% Hunger', 2000); }
        else if (id === 'doomscroll') { pet.intelligence = Math.max(0, pet.intelligence - 2); pet.buffs.doomscrollUntil = pet.activeSeconds + 600; setBuffExpiry('doomscroll'); playAnimation(petG+' 📱<br>Scrollt...', 2000); }

        // Essen & Trinken
        else if (id === 'mystery_meat') {
            if (Math.random() < 0.20) {
                pet.energy = Math.max(0, pet.energy - 30); pet.isDirty = true;
                playAnimation('🤮 Erbrochen!<br>-30 Hunger / -30 Energie', 3000);
            } else {
                pet.happiness = Math.min(100, pet.happiness + 5);
                setBuffExpiry('mystery_meat');
                playAnimation(petG+' 🥩 Mystery Meat', 2000);
            }
        }
        else if (id === 'jitter_drink') { pet.energy = Math.min(100, pet.energy + 10); pet.buffs.jitteryUntil = pet.activeSeconds + 600; setBuffExpiry('jitter_drink'); playAnimation(petG+' ⚡ Zitter-Alarm!', 2500); }
        else if (id === 'sad_salad') { playAnimation('😭 "Mama, ich will was mit Geschmack!"', 3500); }
        else if (id === 'candy_overload') { pet.happiness = Math.min(100, pet.happiness + 15); pet.buffs.candyPlays = 3; setBuffExpiry('candy_overload'); playAnimation(petG+' 🍭 Zucker-Schock!', 2500); }

        // Buffs & Powerups
        else if (id === 'double_happy') { pet.buffs.doubleHappyUntil = pet.activeSeconds + 600; setBuffExpiry('double_happy'); playAnimation('🍀 Glück verdoppelt!', 2000); }
        else if (id === 'sleep_steal') { pet.energy = Math.min(100, pet.energy + 50); pet.happiness = Math.max(0, pet.happiness - 15); playAnimation('😈 Schlaf geraubt!<br>+50 Energie / -15 Happy', 2500); }
        else if (id === 'poop_gold') {
            if (pet.isDirty) { pet.isDirty = false; addCoins(200); playAnimation('💩🪙 Scheisse zu Gold!<br>+200 Münzen', 2500); } 
            else { alert("Es liegt kein Haufen am Gehäuse!"); inventory.items[id] = (inventory.items[id]||0)+1; }
        }
        else if (id === 'love_arrow') {
            pet.happiness = Math.min(100, pet.happiness + 10); pet.buffs.loveArrowUntil = pet.activeSeconds + 1800;
            setBuffExpiry('love_arrow');
            if(Math.random() < 0.3) { pet.buffs.stalkerUntil = pet.activeSeconds + 1200; alert("Oh weh! Stalker-Modus wurde getriggert!"); }
            playAnimation('💘 Liebespfeil!', 2500);
        }
        else if (id === 'time_warp') { pet.activeSeconds = Math.max(0, pet.activeSeconds - 5400); pet.lastXpAgeDay = Math.floor(pet.activeSeconds / 1800); playAnimation('⏳ TIME WARP!<br>Um 3 Tage verjüngt! 🍼', 3000); }

        // Trolle & Debuffs
        else if (id === 'bad_influence') { pet.happiness = Math.min(100, pet.happiness + 2); pet.intelligence = Math.max(0, pet.intelligence - 1); pet.buffs.badInfluence = true; setBuffExpiry('bad_influence'); playAnimation('🚬 Schlechter Einfluss', 2000); }
        else if (id === 'boredom_curse') { pet.buffs.boredUntil = pet.activeSeconds + 1800; setBuffExpiry('boredom_curse'); playAnimation('💤 Fluch der Langeweile', 2000); }
        else if (id === 'sm_addiction') { pet.buffs.smAddiction = true; setBuffExpiry('sm_addiction'); playAnimation('📱 Suchtgefahr!', 2000); }
        else if (id === 'midlife_crisis') {
            pet.hunger = Math.round(pet.hunger/2); pet.happiness = Math.round(pet.happiness/2); pet.energy = Math.round(pet.energy/2); pet.intelligence = Math.round(pet.intelligence/2);
            playAnimation('💀 Midlife-Crisis!<br>Attribute halbiert!', 3000);
        }
        else if (id === 'existential_void') { pet.buffs.existentialVoid = true; setBuffExpiry('existential_void'); playAnimation('🌌 Existenzielle Leere', 2000); }
        else if (id === 'gaslighting') { pet.buffs.gaslighting = true; setBuffExpiry('gaslighting'); playAnimation('🛒 Betrug!<br>Preise steigen um 10%', 2500); }
        else if (id === 'chronic_cold') { pet.buffs.chronicCold = true; setBuffExpiry('chronic_cold'); playAnimation('🤧 Ewiger Schnupfen', 2000); }
        else if (id === 'pixel_acne') { pet.happiness = Math.max(0, pet.happiness - 5); pet.buffs.pixelAcne = true; setBuffExpiry('pixel_acne'); playAnimation('🔴 Pixel-Akne ausgbrochen!', 2000); }
        else if (id === 'clearasil') {
            if (pet.buffs.pixelAcne) { pet.buffs.pixelAcne = false; delete buffExpiries['pixel_acne']; safeSetItem('tama_buff_expiries', JSON.stringify(buffExpiries)); playAnimation('✨ Clearasil wirkt!<br>Akne geheilt', 2000); }
            else { alert("Keine Akne vorhanden!"); inventory.items[id] = (inventory.items[id]||0)+1; }
        }
        else if (id === 'sleepwalker') { pet.buffs.sleepwalker = true; setBuffExpiry('sleepwalker'); playAnimation('🛌 Schlafwandler', 2000); }
        else if (id === 'stomach_upset_2') { pet.buffs.stomachUpset2 = true; setBuffExpiry('stomach_upset_2'); playAnimation('🤮 Magenverstimmung 2.0', 2000); }

        // Gacha
        else if (id === 'lootbox_gameover') {
            let r = Math.random();
            if(r < 0.01) { playAnimation('💀 Todeskralle!<br>GAME OVER', 4000); setTimeout(() => { pet.causeOfDeath = "Lootbox"; }, 4000); }
            else if(r < 0.1) { inventory.items['cookie'] = (inventory.items['cookie']||0)+1; alert("Glückwunsch! Nützlicher Glückskeks erhalten!"); }
            else { alert("Nur nutzloser Müll in der Lootbox."); }
        }

        // Events & Dating
        else if (id === 'dating_app') {
            if(tCoins < 5) { alert("Kostet 5 Münzen!"); inventory.items[id] = (inventory.items[id]||0)+1; }
            else {
                tCoins -= 5;
                if(Math.random() < 0.1) { pet.happiness = Math.min(100, pet.happiness + 5); playAnimation('💖 MATCH!<br>+5 Laune', 2500); }
                else { pet.happiness = Math.max(0, pet.happiness - 2); playAnimation('👻 GHOSTED...<br>-2 Laune', 2500); }
            }
        }
        else if (id === 'casino') {
            if(tCoins < 50) { alert("Mindesteinsatz ist 50 T-Coins!"); inventory.items[id] = (inventory.items[id]||0)+1; }
            else {
                if(Math.random() < 0.45) { addCoins(50); playAnimation('🎰 GEWONNEN!<br>Einsatz verdoppelt!', 2500); }
                else { tCoins -= 50; playAnimation('🎰 Alles weg!<br>-50 Münzen', 2500); }
            }
        }
        else if (id === 'therapy') {
            if(tCoins < 20) { alert("Therapie kostet 20 T-Coins!"); inventory.items[id] = (inventory.items[id]||0)+1; }
            else {
                tCoins -= 20; pet.happiness = Math.min(100, pet.happiness + 10);
                playAnimation('🛋️ Therapist:<br>"Bist du mit deiner Kindheit im Reinen?"', 4000);
            }
        }
        else if (id === 'tiktok') {
            if(tCoins < 15) { alert("TikTok-Equipment kostet 15 T-Coins!"); inventory.items[id] = (inventory.items[id]||0)+1; }
            else {
                tCoins -= 15;
                if(Math.random() < 0.4) { pet.happiness = Math.min(100, pet.happiness + 5); playAnimation('🕺 VIRAL!<br>+5 Laune', 2500); }
                else { pet.happiness = Math.max(0, pet.happiness - 10); playAnimation('🤦 FLOP...<br>-10 Laune', 2500); }
            }
        }

        // Altbestände
        else if (id === 'party') { pet.buffs.noSleepToday = true; pet.intelligence = Math.max(0, pet.intelligence-5); setBuffExpiry('party'); playAnimation(petG+' 🪩', 2000); }
        else if (id === 'shiny') { pet.buffs.noDirtToday = true; pet.isDirty = false; pet.happiness = Math.max(0, pet.happiness - 25); setBuffExpiry('shiny'); playAnimation(petG+' ✨', 2000); }
        else if (id === 'superfood') { pet.buffs.superfoodToday = true; pet.hunger = 100; pet.maxLifetime -= 1800; setBuffExpiry('superfood'); playAnimation(petG+' 🥦', 2000); }
        else if (id === 'maryjane') { 
            pet.happiness = Math.min(100, pet.happiness + 50); 
            pet.hunger = Math.max(0, pet.hunger - 75); 
            pet.buffs.mjUntil = pet.activeSeconds + 900; 
            setBuffExpiry('maryjane');
            playAnimation(petG+' 🌿💨', 2500); 
        }
        else if (id === 'energy') { pet.buffs.energyUntil = pet.activeSeconds + 3600; setBuffExpiry('energy'); playAnimation(petG+' ⚡', 2000); }
        else if (id === 'social') { pet.buffs.socialUntil = pet.activeSeconds + 3600; setBuffExpiry('social'); playAnimation(petG+' 📱', 2000); }
        else if (id === 'genie') { pet.intelligence += 5; pet.isSick = true; pet.sickCount = 3; playAnimation('🧠 +5<br>🤕 Aua!', 2500); }

        // === Neue Items: Essen & Trinken ===
        else if (id === 'pizza') { pet.hunger = Math.min(100, pet.hunger + 40); pet.happiness = Math.min(100, pet.happiness + 10); markCareInteraction(); playSound('win'); playAnimation(petG+' 🍕 Mampf!', 2000); }
        else if (id === 'vegan_burger') { pet.hunger = Math.min(100, pet.hunger + 35); pet.intelligence += 5; markCareInteraction(); playSound('win'); playAnimation(petG+' 🥬 Guten Appetit!', 2000); }
        else if (id === 'glitch_cookie') {
            pet.hunger = Math.min(100, pet.hunger + 20);
            pet.colorIndex = Math.floor(Math.random() * shellColors.length);
            pet.hueShift = Math.round(Math.random() * 360);
            applyColors(); playSound('gacha'); spawnConfetti && spawnConfetti();
            playAnimation('👾 GLITCH!<br>Neue Farbe!', 2500);
        }
        else if (id === 'chaos_orb') {
            // Alles neu wuerfeln: Farbe, Muster, Musterfarbe, Skalierung, Farbton, Form.
            // Overrides zuruecksetzen, sonst wuerde ein gekaufter Lack die Wuerfelung ueberdecken.
            pet.overrideColor = null; pet.overridePatColor = null; pet.overridePatIdx = null;
            pet.colorIndex        = pickEggColorIndex();   // respektiert freigeschaltete (auch seltene) Farben
            pet.patternIndex      = Math.floor(Math.random() * patternGenerators.length);
            pet.patternColorIndex = Math.floor(Math.random() * patternColors.length);
            pet.patternScale      = 0.6 + Math.random() * 1.4;                 // 0.6x .. 2.0x
            pet.hueShift          = Math.round(Math.random() * 360);
            pet.distortType       = DISTORT_TYPES[Math.floor(Math.random() * DISTORT_TYPES.length)];
            pet.distortAmount     = Math.round(Math.random() * 80 - 40);       // -40% .. +40%
            syncPetDistortFilter && syncPetDistortFilter(pet);
            applyColors();
            playSound('gacha'); spawnConfetti && spawnConfetti();
            // Kleiner Spannungsaufbau: erst Kugel, dann Verwandlung
            playAnimation('🔮✨ CHAOS-KUGEL!', 1400);
            setTimeout(() => {
                if (pet.isDead || pet.isDeparted) return;
                playSound('sparkle');
                let verdicts = ['Wunderschön! 😍','Ähm... interessant. 🤔','Ein Albtraum! 😱','Voll das Kunstwerk! 🎨','Was ist DAS denn?! 🫠','Perfektion! ✨'];
                playAnimation(petG + '<br>' + verdicts[Math.floor(Math.random()*verdicts.length)], 2200);
            }, 1400);
        }
        else if (id === 'premium_food') { pet.hunger = Math.min(100, pet.hunger + 60); pet.happiness = Math.min(100, pet.happiness + 15); pet.energy = Math.min(100, pet.energy + 5); markCareInteraction(); playSound('achievement'); playAnimation(petG+' 🍽️ Gourmet!', 2000); }
        else if (id === 'spicy_ramen') {
            pet.hunger = Math.min(100, pet.hunger + 30);
            pet.buffs.fireUntil = pet.activeSeconds + 3600; setBuffExpiry('spicy_ramen');
            playSound('alarm'); playAnimation('🌶️🔥 FEUER!<br>1 Std. feuerspuckend!', 3000);
        }

        // === Neue Items: Buffs & Substanzen ===
        else if (id === 'musicbox') { pet.happiness = Math.min(100, pet.happiness + 20); pet.energy = Math.min(100, pet.energy + 10); markCareInteraction(); playSound('sparkle'); playAnimation(petG+' 🎵 La la la~', 2500); }
        else if (id === 'toilet') {
            if (pet.isDirty) { pet.isDirty = false; markCareInteraction(); playSound('win'); playAnimation('🚽 Erleichterung!<br>Sauber!', 2000); }
            else { alert("Es liegt kein Haufen am Gehäuse!"); inventory.items[id] = (inventory.items[id]||0)+1; }
        }
        else if (id === 'clone_machine') {
            pet.happiness = Math.max(0, pet.happiness - 10);
            pet.misbehaving = true;
            playSound('gacha');
            playAnimation(petG+'⚡'+petG+'<br>Streit mit dem Klon! 😡', 3500);
        }
        else if (id === 'dance_mat') {
            pet.happiness = Math.min(100, pet.happiness + 25);
            pet.buffs.danceUntil = pet.activeSeconds + 600; setBuffExpiry('dance_mat');
            markCareInteraction(); playSound('win'); playAnimation(petG+' 💃 Cringe-Moves!', 2500);
        }
        else if (id === 'personal_dj') {
            pet.happiness = Math.min(100, pet.happiness + 15);
            pet.intelligence = Math.max(0, pet.intelligence - 3);
            pet.buffs.djUntil = pet.activeSeconds + 1800; setBuffExpiry('personal_dj');
            playSound('sparkle'); playAnimation(petG+' 🎧 Endlos-Beat!', 2500);
        }

        // === Neue Items: Hobbys & Abenteuer ===
        else if (id === 'toy_ball') { pet.happiness = Math.min(100, pet.happiness + 15); markCareInteraction(); playSound('select'); playAnimation(petG+' 🪀 Juhu!', 2000); }
        else if (id === 'robot_friend') { pet.happiness = Math.min(100, pet.happiness + 12); pet.intelligence += 3; markCareInteraction(); playSound('select'); playAnimation(petG+' 🤖 Beep boop!', 2000); }
        else if (id === 'book') { pet.intelligence += 5; pet.happiness = Math.min(100, pet.happiness + 5); markCareInteraction(); playSound('select'); playAnimation(petG+' 📖 Spannend!', 2000); }
        else if (id === 'instrument') { pet.happiness = Math.min(100, pet.happiness + 18); pet.intelligence += 2; markCareInteraction(); playSound('sparkle'); playAnimation(petG+' 🎸 Strum~', 2000); }
        else if (id === 'tent') { pet.happiness = Math.min(100, pet.happiness + 20); pet.energy = Math.min(100, pet.energy + 15); markCareInteraction(); playSound('win'); playAnimation(petG+' ⛺ Erholung!', 2000); }
        else if (id === 'diving_gear') { pet.happiness = Math.min(100, pet.happiness + 18); pet.isDirty = false; markCareInteraction(); playSound('win'); playAnimation(petG+' 🤿 Platsch!', 2000); }
        else if (id === 'diary') { pet.happiness = Math.min(100, pet.happiness + 10); if (pet.buffs) pet.buffs.chronicCold = pet.buffs.chronicCold; markCareInteraction(); playSound('select'); playAnimation(petG+' 📔 Liebes Tagebuch...', 2000); }
        else if (id === 'camera') {
            pet.happiness = Math.min(100, pet.happiness + 12);
            let tip = Math.random() < 0.4;
            if (tip) { let g = addCoins(25); playSound('coin'); playAnimation(petG+' 📸 *klick*<br>+'+g+' 🪙 gefunden!', 2500); }
            else { markCareInteraction(); playSound('select'); playAnimation(petG+' 📸 *klick*', 2000); }
        }

        else if (id === 'immortal') { pet.hasImmortalPotion = true; playAnimation(petG+' 🛡️', 2000); }
        else if (id === 'cheat_code') { pet.buffs.cheatUntil = pet.activeSeconds + 300; playAnimation('💻 CODE OK', 2000); }
        else if (id === 'mystery_egg') {
            playSound('gacha');
            let r = Math.random();
            if(r < 0.01) { pet.happiness=100; pet.hunger=100; pet.weight=Math.max(1,pet.weight-10); pet.intelligence+=10; playAnimation('🌟 Goldenes Ei!', 3000);}
            else if(r < 0.3) { pet.buffs.mysteryGoodUntil = pet.activeSeconds + 3600; playAnimation('🎁 1h Super-Aura!', 2000); }
            else if(r < 0.6) { pet.buffs.mysteryBadUntil = pet.activeSeconds + 3600; playAnimation('💥 1h Pechsträhne!', 2000); }
            else { playAnimation('💨 Leer...', 1500); }
        }
        else if (id === 'fate_wheel') {
            playSound('gacha');
            if(Math.random() < 0.5) { pet.maxLifetime += 1800; playAnimation('🍀 +1 Tag!', 3000); }
            else { playAnimation('💀 TOD!', 3000); setTimeout(()=>{ pet.causeOfDeath = "Schicksalsrad"; }, 3000); }
        }
        else if (MULT_META[id]) {
            let cfg = MULT_META[id];
            pet.buffs[cfg.key] = { u: pet.activeSeconds + cfg.dur, f: cfg.f };
            setBuffExpiry(id);
            playAnimation(cfg.anim, 2800);
        }
        else if (item.type === 'paint') {
            inventory.customSkinActive = false;
            if(id === 'rand_shell') {
                pet.overrideColor = null; pet.overridePatColor = null; pet.overridePatIdx = null;
                pet.colorIndex = Math.floor(Math.random() * shellColors.length);
                pet.patternIndex = Math.floor(Math.random() * patternGenerators.length);
                pet.patternColorIndex = Math.floor(Math.patternColorIndex || Math.floor(Math.random() * patternColors.length));
            } else {
                pet.overrideColor = item.valC || null;
                pet.overridePatColor = item.valPC || null;
                pet.overridePatIdx = item.valP !== undefined ? item.valP : null;
            }
            applyColors();
            playAnimation('🎨✨', 2000);
        }
        saveGame();
    }

    updateCoinDisplay();
    render();
    switchShopTab('inventory');
}

function saveCustomSkinUrl() {
    playSound('select');
    let url = document.getElementById('customSkinInput').value.trim();
    inventory.customSkinUrl = url;
    inventory.customSkinActive = url !== "";
    updateCoinDisplay();
    applyColors();
    closeModal('customSkinModal');
    switchShopTab('inventory');
}

function saveCustomBgUrl() {
    playSound('select');
    let url = document.getElementById('customBgInput').value.trim();
    inventory.customBgUrl = url;
    inventory.customBgActive = url !== "";
    updateCoinDisplay();
    closeModal('customBgModal');
    render();
    switchShopTab('inventory');
}


// --- MEDAILLEN LOGIK (ACHIEVEMENTS) ---
// Jede Medaille hat 4 Qualitätsstufen: Bronze, Silber, Gold, Platin.
// Damit die höheren Stufen wirklich schwerer zu erreichen sind, zählen sie über
// mehrere Tamagotchi-Leben hinweg (Lebenswerk-Statistik) und nicht nur das aktuelle Tier.
const MEDAL_TIERS = [
    { n: 1, name: 'Bronze', color: '#cd7f32', text: '#8a4b12', badge: '🥉' },
    { n: 2, name: 'Silber', color: '#b6bcc4', text: '#4f5661', badge: '🥈' },
    { n: 3, name: 'Gold',   color: '#f5c518', text: '#7a5c00', badge: '🥇' },
    { n: 4, name: 'Platin', color: '#5ad0e6', text: '#0b6b7d', badge: '💎' }
];

// Kumulierte Statistik über alle bisherigen Tamagotchis
let lifetime = JSON.parse(safeGetItem('tama_lifetime') || '{}');
function saveLifetime() { safeSetItem('tama_lifetime', JSON.stringify(lifetime)); }
function LT(key) { return lifetime[key] || 0; }

// Summenwert = abgeschlossene Leben + aktuelles Tamagotchi
function sumStat(p, key, petKey) { return LT(key) + ((p && p[petKey]) || 0); }
function bestStat(p, key, petKey) { return Math.max(LT(key), (p && p[petKey]) || 0); }

// Wird beim Tod (oder Reset) eines Tamagotchis aufgerufen und schreibt seine Werte fest.
// Beim Tod eines Tamagotchis verfaellt der gesamte gekaufte Besitz:
// Verbrauchsgueter, Huete, Skins, Hintergruende UND die Arcade-Automaten.
// Ausdruecklich NICHT betroffen: T-Coins und Pfleger-Level/-XP - die gehoeren
// dem Pfleger, nicht dem Tamagotchi. Medaillen/Lebenswerk bleiben ebenfalls.
function clearInventoryOnDeath() {
    // Arcade-Automaten sind einmalige Anschaffungen und ueberdauern den Tod -
    // sie werden aus dem alten Inventar ins frische uebernommen.
    let keptItems = {};
    Object.values(ARCADE_META).forEach(m => {
        if (inventory.items && inventory.items[m.owned]) keptItems[m.owned] = inventory.items[m.owned];
    });
    // Eigenes Bild/Skin und Hintergrundbild bleiben ebenfalls erhalten (Uploads
    // des Pflegers, keine Anschaffung des Tamagotchis). Nur der Hut wird abgelegt.
    inventory = {
        items: keptItems,
        equippedHat: null,
        customSkinActive: inventory.customSkinActive || false,
        customSkinUrl: inventory.customSkinUrl || "",
        rainbowPoop: false,
        customBgActive: inventory.customBgActive || false,
        customBgUrl: inventory.customBgUrl || ""
    };
    safeSetItem('tama_inventory', JSON.stringify(inventory));
    // Aktive Buffs samt Echtzeit-Ablauf entfernen
    buffExpiries = {};
    safeSetItem('tama_buff_expiries', JSON.stringify(buffExpiries));

    // Waehrungen verfallen mit dem Tamagotchi: Der naechste Schuetzling
    // startet finanziell bei null. Erspieltes des PFLEGERS (Level, XP,
    // Medaillen, Dorf, Highscores) bleibt davon unberuehrt.
    tCoins = 0;
    safeSetItem('tama_tcoins', '0');
    tickets = 0;
    safeSetItem('tama_tickets', '0');
    try { updateCoinDisplay(); updateTicketDisplay(); } catch(e) {}

    // Nicht angetastet: Pfleger-Level/-XP, Medaillen,
    // Wolkendorf, Arcade-Bestenliste, Arcade-Automaten, eigener Skin & Hintergrund.
    try { applyColors(); } catch(e) {}
}

function foldPetIntoLifetime(p) {
    if (!p || p.foldedIntoLifetime) return;
    const sums = {
        burger: 'countFedBurger', snack: 'countFedSnack', loved: 'countLoved',
        bathed: 'countBathed', dirty: 'countGotDirty', doctor: 'countDoctor',
        discipline: 'countDiscipline', played: 'countPlayed', wonLR: 'countWonLR',
        wonSSP: 'countWonSSP', wonBox: 'countWonBox', sleeps: 'countSleeps'
    };
    for (const [k, petKey] of Object.entries(sums)) lifetime[k] = LT(k) + (p[petKey] || 0);

    if (p.stage >= 1) lifetime.hatched = LT('hatched') + 1;
    if (p.stage >= 2) lifetime.kid     = LT('kid') + 1;
    if (p.stage >= 3) lifetime.teen    = LT('teen') + 1;
    if (p.stage >= 4) lifetime.adult   = LT('adult') + 1;
    if (p.isDead && p.causeOfDeath === 'Altersschwäche') lifetime.oldAge = LT('oldAge') + 1;

    lifetime.bestActive = Math.max(LT('bestActive'), p.activeSeconds || 0);
    lifetime.bestStreak = Math.max(LT('bestStreak'), p.happyStreak || 0);
    lifetime.maxWeight  = Math.max(LT('maxWeight'), p.weight || 0);
    if (p.stage >= 4) lifetime.minAdultWeight = Math.min(lifetime.minAdultWeight ?? 99, p.weight ?? 99);

    p.foldedIntoLifetime = true;
    saveLifetime();
}

// Aktueller Stand inkl. laufendem Tamagotchi
function liveHatched(p, minStage, key) { return LT(key) + ((p && p.stage >= minStage) ? 1 : 0); }
function liveMinAdultWeight(p) {
    let cur = (p && p.stage >= 4) ? (p.weight ?? 99) : 99;
    return Math.min(lifetime.minAdultWeight ?? 99, cur);
}

// metric(p) -> Zahl | tiers = 4 aufsteigende Schwellen (bei lower: absteigend, kleiner ist besser)
const ACHIEVEMENTS = [
    { id: 1, icon: '🥚', title: 'Ausgebrütet', desc: 'Bringe Eier erfolgreich zum Schlüpfen.', unit: 'Eier', metric: p => liveHatched(p,1,'hatched'), tiers: [1,3,10,25] },
    { id: 2, icon: '🧸', title: 'Kindergarten', desc: 'Bringe Tamagotchis in die Kindheitsphase.', unit: 'Kinder', metric: p => liveHatched(p,2,'kid'), tiers: [1,3,10,25] },
    { id: 3, icon: '🛹', title: 'Pubertät', desc: 'Bringe Tamagotchis ins Teenager-Alter.', unit: 'Teenager', metric: p => liveHatched(p,3,'teen'), tiers: [1,3,10,25] },
    { id: 4, icon: '🎓', title: 'Erwachsen', desc: 'Bringe Tamagotchis ins Erwachsenenalter.', unit: 'Erwachsene', metric: p => liveHatched(p,4,'adult'), tiers: [1,3,8,20] },
    { id: 5, icon: '🕰️', title: 'Überlebenskünstler', desc: 'Überlebte aktive Zeit eines Tamagotchis. Platin liegt jenseits der natürlichen Lebensspanne – ohne lebensverlängernde Shop-Items unerreichbar.', unit: 'Std.', fmt: 'hours', metric: p => bestStat(p,'bestActive','activeSeconds'), tiers: [10800,16200,23400,32400] },
    { id: 6, icon: '⏳', title: 'Marathon-Pfleger', desc: 'Überlebte aktive Zeit eines Tamagotchis.', unit: 'Std.', fmt: 'hours', metric: p => bestStat(p,'bestActive','activeSeconds'), tiers: [21600,25200,28800,32400] },
    { id: 7, icon: '🏆', title: 'Unsterblich', desc: 'Überlebte aktive Zeit eines Tamagotchis.', unit: 'Std.', fmt: 'hours', metric: p => bestStat(p,'bestActive','activeSeconds'), tiers: [43200,48600,54000,59400] },
    { id: 8, icon: '👻', title: 'Engelsgleich', desc: 'Begleite Tamagotchis bis an ihr natürliches Lebensende.', unit: 'Abschiede', metric: p => LT('oldAge') + ((p && p.isDead && p.causeOfDeath === 'Altersschwäche') ? 1 : 0), tiers: [1,2,4,8] },

    { id: 9,  icon: '🍟', title: 'Feinschmecker', desc: 'Füttere Burger.', unit: 'Burger', metric: p => sumStat(p,'burger','countFedBurger'), tiers: [30,60,120,240] },
    { id: 10, icon: '🍔', title: 'Burger-Meister', desc: 'Füttere Burger.', unit: 'Burger', metric: p => sumStat(p,'burger','countFedBurger'), tiers: [150,300,600,1200] },
    { id: 11, icon: '🍦', title: 'Naschkatze', desc: 'Gib Eis-Snacks.', unit: 'Snacks', metric: p => sumStat(p,'snack','countFedSnack'), tiers: [20,40,80,160] },
    { id: 12, icon: '🍭', title: 'Zuckerschock', desc: 'Gib Eis-Snacks.', unit: 'Snacks', metric: p => sumStat(p,'snack','countFedSnack'), tiers: [100,200,400,800] },
    { id: 13, icon: '🏋️', title: 'Schwergewicht', desc: 'Erreiche ein riskantes Höchstgewicht (Tod ab 50g!).', unit: 'g', metric: p => bestStat(p,'maxWeight','weight'), tiers: [45,46,47,48] },
    { id: 14, icon: '🪶', title: 'Federleicht', desc: 'Halte ein erwachsenes Tamagotchi besonders leicht.', unit: 'g', lower: true, metric: p => liveMinAdultWeight(p), tiers: [5,4,3,2] },

    { id: 15, icon: '❤️', title: 'Erste Liebe', desc: 'Schenke Liebe.', unit: 'Mal', metric: p => sumStat(p,'loved','countLoved'), tiers: [20,40,80,160] },
    { id: 16, icon: '💖', title: 'Kuschelmonster', desc: 'Schenke Liebe.', unit: 'Mal', metric: p => sumStat(p,'loved','countLoved'), tiers: [150,300,600,1200] },
    { id: 17, icon: '😊', title: 'Besonders Glücklich', desc: 'Halte die Laune ununterbrochen über 85%.', unit: 'Min.', fmt: 'mins', metric: p => bestStat(p,'bestStreak','happyStreak'), tiers: [1800,2700,3600,4500] },
    { id: 18, icon: '😁', title: 'Dauergrinsen', desc: 'Halte die Laune ununterbrochen über 85%.', unit: 'Min.', fmt: 'mins', metric: p => bestStat(p,'bestStreak','happyStreak'), tiers: [7200,9000,10800,12600] },

    { id: 19, icon: '🚿', title: 'Blitzblank', desc: 'Bade dein Tamagotchi.', unit: 'Bäder', metric: p => sumStat(p,'bathed','countBathed'), tiers: [25,50,100,200] },
    { id: 20, icon: '🧼', title: 'Meister-Putzer', desc: 'Bade dein Tamagotchi.', unit: 'Bäder', metric: p => sumStat(p,'bathed','countBathed'), tiers: [100,200,400,800] },
    { id: 21, icon: '💩', title: 'Schmutzfink', desc: 'Lass es schmutzig werden.', unit: 'Mal', metric: p => sumStat(p,'dirty','countGotDirty'), tiers: [30,60,120,240] },
    { id: 22, icon: '💊', title: 'Gute Besserung', desc: 'Heile dein Tamagotchi beim Arzt.', unit: 'Heilungen', metric: p => sumStat(p,'doctor','countDoctor'), tiers: [10,20,40,80] },
    { id: 23, icon: '🩺', title: 'Chefarzt', desc: 'Heile dein Tamagotchi beim Arzt.', unit: 'Heilungen', metric: p => sumStat(p,'doctor','countDoctor'), tiers: [50,100,200,400] },

    { id: 24, icon: '💢', title: 'Streng aber fair', desc: 'Belehre dein Tamagotchi.', unit: 'Mal', metric: p => sumStat(p,'discipline','countDiscipline'), tiers: [10,20,40,80] },
    { id: 25, icon: '🎓', title: 'Hundeschule', desc: 'Belehre dein Tamagotchi.', unit: 'Mal', metric: p => sumStat(p,'discipline','countDiscipline'), tiers: [50,100,200,400] },

    { id: 26, icon: '🎮', title: 'Spielkind', desc: 'Gewinne Minispiele (L/R, SchnickSchnack, Hütchenspiel).', unit: 'Siege', metric: p => sumStat(p,'wonLR','countWonLR') + sumStat(p,'wonSSP','countWonSSP') + sumStat(p,'wonBox','countWonBox'), tiers: [20,40,80,160] },
    { id: 27, icon: '🕹️', title: 'Pro-Gamer', desc: 'Spiele Minispiele.', unit: 'Spiele', metric: p => sumStat(p,'played','countPlayed'), tiers: [250,500,1000,2000] },
    { id: 28, icon: '🔮', title: 'Hellseher', desc: 'Gewinne beim L/R Raten.', unit: 'Siege', metric: p => sumStat(p,'wonLR','countWonLR'), tiers: [25,50,100,200] },
    { id: 29, icon: '✂️', title: 'Schere-Stein-Profi', desc: 'Gewinne bei SchnickSchnack.', unit: 'Siege', metric: p => sumStat(p,'wonSSP','countWonSSP'), tiers: [25,50,100,200] },
    { id: 30, icon: '📦', title: 'Hütchen-Trickser', desc: 'Gewinne beim Hütchenspiel.', unit: 'Siege', metric: p => sumStat(p,'wonBox','countWonBox'), tiers: [25,50,100,200] },

    { id: 31, icon: '💤', title: 'Schlafmütze', desc: 'Lass dein Tamagotchi ausschlafen.', unit: 'Nächte', metric: p => sumStat(p,'sleeps','countSleeps'), tiers: [5,10,20,40] },
    { id: 32, icon: '🛌', title: 'Murmeltier', desc: 'Lass dein Tamagotchi ausschlafen.', unit: 'Nächte', metric: p => sumStat(p,'sleeps','countSleeps'), tiers: [25,50,100,200] },

    { id: 33, icon: '🌌', title: 'Methusalem', desc: 'Überlebte aktive Zeit eines Tamagotchis.', unit: 'Std.', fmt: 'hours', metric: p => bestStat(p,'bestActive','activeSeconds'), tiers: [86400,90000,93600,97200] },
    { id: 34, icon: '👑', title: 'Nirvana', desc: 'Halte die Laune ununterbrochen über 85%.', unit: 'Min.', fmt: 'mins', metric: p => bestStat(p,'bestStreak','happyStreak'), tiers: [18000,21600,25200,28800] },
    { id: 35, icon: '🍔', title: 'Fresskoma', desc: 'Füttere Burger.', unit: 'Burger', metric: p => sumStat(p,'burger','countFedBurger'), tiers: [500,1000,2000,4000] },
    { id: 36, icon: '🛁', title: 'Waschzwang', desc: 'Bade dein Tamagotchi.', unit: 'Bäder', metric: p => sumStat(p,'bathed','countBathed'), tiers: [300,600,1200,2400] },
    { id: 37, icon: '💖', title: 'Bedingungslose Liebe', desc: 'Schenke Liebe.', unit: 'Mal', metric: p => sumStat(p,'loved','countLoved'), tiers: [300,600,1200,2400] },
    { id: 38, icon: '🎰', title: 'Casino-Boss', desc: 'Gewinne beim knallharten Hütchenspiel.', unit: 'Siege', metric: p => sumStat(p,'wonBox','countWonBox'), tiers: [75,150,300,600] },
    { id: 39, icon: '🛌', title: 'Koma-Schläfer', desc: 'Lass dein Tamagotchi ausschlafen.', unit: 'Nächte', metric: p => sumStat(p,'sleeps','countSleeps'), tiers: [100,200,400,800] },
    { id: 40, icon: '🕹️', title: 'Esport-Legende', desc: 'Spiele Minispiele.', unit: 'Spiele', metric: p => sumStat(p,'played','countPlayed'), tiers: [500,1000,2000,4000] }
];

// Gespeicherter Stand: { medalId: erreichteStufe(1-4) }
let medalTiers = (() => {
    let raw = safeGetItem('tama_medals');
    if (!raw) return {};
    try {
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {           // Migration: alte Liste von IDs -> alle Bronze
            let obj = {}; parsed.forEach(id => obj[id] = 1);
            safeSetItem('tama_medals', JSON.stringify(obj)); // sofort im neuen Format sichern
            return obj;
        }
        return parsed || {};
    } catch(e) { return {}; }
})();
function saveMedals() { safeSetItem('tama_medals', JSON.stringify(medalTiers)); }
function getMedalTier(id) { return medalTiers[id] || 0; }
function getUnlockedMedalCount() { return Object.keys(medalTiers).length; }

// Höchste erreichte Stufe für den aktuellen Messwert
function tierForValue(ach, value) {
    let t = 0;
    for (let i = 0; i < ach.tiers.length; i++) {
        let reached = ach.lower ? (value <= ach.tiers[i]) : (value >= ach.tiers[i]);
        if (reached) t = i + 1; else break;
    }
    return t;
}
function fmtMedalValue(ach, v) {
    if (ach.fmt === 'hours') return (v / 3600).toFixed(1).replace('.0','') + ' Std.';
    if (ach.fmt === 'mins')  return Math.floor(v / 60) + ' Min.';
    return `${v}${ach.unit ? ' ' + ach.unit : ''}`;
}

function checkAchievements() {
    if(!state.isStarted || pet.isDead || pet.isDeparted) return;

    if (pet.happiness >= 85 && !pet.wantsToSleep && !pet.isSick && !pet.isDirty && !pet.misbehaving) { pet.happyStreak++; } 
    else { pet.happyStreak = 0; }

    ACHIEVEMENTS.forEach(ach => {
        let current = getMedalTier(ach.id);
        if (current >= 4) return;
        let reached = tierForValue(ach, ach.metric(pet));
        if (reached > current) {
            medalTiers[ach.id] = reached;
            saveMedals();
            let tier = MEDAL_TIERS[reached - 1];
            showAchievementBanner(ach.icon, `${tier.badge} ${t(tier.name)}: ${t(ach.title)}`, 'medal');
            // Höhere Stufen geben mehr Pfleger-XP
            let xp = [20, 35, 60, 100][reached - 1];
            setTimeout(() => addAccountXP(xp), 1800);
        }
    });
}

// ================================================================
// === FEATURE: GAME FEEL (Belohnungs-Animationen & -Töne) ========
// ================================================================
