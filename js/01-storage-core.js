/* Pausentamagotchi - Speicher-Helfer, IDs, Grundkonstanten, Tastatursteuerung */
let memoryStorage = {};
function safeGetItem(key) { try { return localStorage.getItem(key); } catch(e) { return memoryStorage[key] || null; } }
function safeSetItem(key, val) { try { localStorage.setItem(key, val); } catch(e) { memoryStorage[key] = val; } }
function safeRemoveItem(key) { try { localStorage.removeItem(key); } catch(e) {} delete memoryStorage[key]; }

// --- ANTI-CHEAT HASH FUNKTION ---
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
// Signatur v2 deckt auch Kampf- und Arcade-Werte ab, damit sie nicht
// nachtraeglich gefaelscht werden koennen. Alte Dateien (nur Stunden +
// Medaillen) werden beim Import weiterhin mit createHash() geprueft.
function createHashV2(d) {
    const salt = "Wolkendorf_Secure_Hash_v2!";
    const str = [d.id, d.name, d.ownerName, d.hours, d.medals,
                 d.pvpWins || 0, d.bossWins || 0, d.bossTotal || 0,
                 d.arcadeBest || 0, d.arcadeTotal || 0, salt].join("_");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function createHash(data) {
    const salt = "Wolkendorf_Secure_Hash_2024!";
    const str = data.id + "_" + data.name + "_" + data.hours + "_" + data.medals + "_" + salt;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return Math.abs(hash).toString(16);
}

// --- SOUND LOGIK ---
let audioCtx;
let isMuted = safeGetItem('tama_muted') === 'true';

function toggleSound() {
    isMuted = !isMuted;
    safeSetItem('tama_muted', isMuted);
    document.getElementById('soundIcon').className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    if(!isMuted) playSound('beep');
}

function playSound(type) {
    if(isMuted) return;
    try {
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if(audioCtx.state === 'suspended') audioCtx.resume();

        if (type === 'achievement') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gn = audioCtx.createGain();
                osc.connect(gn); gn.connect(audioCtx.destination);
                osc.type = 'square'; osc.frequency.value = freq;
                gn.gain.setValueAtTime(0.03, audioCtx.currentTime + (i*0.1));
                gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (i*0.1) + 0.2);
                osc.start(audioCtx.currentTime + (i*0.1)); osc.stop(audioCtx.currentTime + (i*0.1) + 0.2);
            });
            return;
        }
        if (type === 'coin') {
            const osc = audioCtx.createOscillator();
            const gn = audioCtx.createGain();
            osc.connect(gn); gn.connect(audioCtx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(1500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2500, audioCtx.currentTime + 0.1);
            gn.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.1);
            return;
        }
        if (type === 'gacha') {
            let osc = audioCtx.createOscillator(); let gn = audioCtx.createGain();
            osc.connect(gn); gn.connect(audioCtx.destination);
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
            gn.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.4);
            return;
        }
        if (type === 'tick') {
            let osc = audioCtx.createOscillator(); let gn = audioCtx.createGain();
            osc.connect(gn); gn.connect(audioCtx.destination);
            osc.type = 'triangle'; osc.frequency.setValueAtTime(1500, audioCtx.currentTime);
            gn.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.05);
            return;
        }
        if (type === 'ticket') {
            [880, 1318.5].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gn = audioCtx.createGain();
                osc.connect(gn); gn.connect(audioCtx.destination);
                osc.type = 'sine'; osc.frequency.value = freq;
                gn.gain.setValueAtTime(0.045, audioCtx.currentTime + (i * 0.09));
                gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (i * 0.09) + 0.16);
                osc.start(audioCtx.currentTime + (i * 0.09)); osc.stop(audioCtx.currentTime + (i * 0.09) + 0.16);
            });
            return;
        }
        if (type === 'xp') {
            const osc = audioCtx.createOscillator();
            const gn = audioCtx.createGain();
            osc.connect(gn); gn.connect(audioCtx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(950, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1450, audioCtx.currentTime + 0.12);
            gn.gain.setValueAtTime(0.025, audioCtx.currentTime);
            gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.12);
            return;
        }
        if (type === 'sparkle') {
            [1200, 1600, 2000].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gn = audioCtx.createGain();
                osc.connect(gn); gn.connect(audioCtx.destination);
                osc.type = 'triangle'; osc.frequency.value = freq;
                gn.gain.setValueAtTime(0.025, audioCtx.currentTime + (i * 0.06));
                gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (i * 0.06) + 0.1);
                osc.start(audioCtx.currentTime + (i * 0.06)); osc.stop(audioCtx.currentTime + (i * 0.06) + 0.1);
            });
            return;
        }
        if (type === 'alarm') {
            // Klassischer Wecker: schnelle, abwechselnde Doppel-Pieptöne
            for (let r = 0; r < 6; r++) {
                const t0 = audioCtx.currentTime + r * 0.16;
                const osc = audioCtx.createOscillator();
                const gn = audioCtx.createGain();
                osc.connect(gn); gn.connect(audioCtx.destination);
                osc.type = 'square';
                osc.frequency.value = (r % 2 === 0) ? 880 : 1108;
                gn.gain.setValueAtTime(0.0001, t0);
                gn.gain.linearRampToValueAtTime(0.05, t0 + 0.01);
                gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
                osc.start(t0); osc.stop(t0 + 0.13);
            }
            return;
        }
        if (type === 'ergo') {
            // Sanfter, beruhigender Zwei-Ton-Klang als Belohnung für gesunde Büro-Gewohnheiten
            [660, 880].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gn = audioCtx.createGain();
                osc.connect(gn); gn.connect(audioCtx.destination);
                osc.type = 'sine'; osc.frequency.value = freq;
                gn.gain.setValueAtTime(0.001, audioCtx.currentTime + (i * 0.14));
                gn.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + (i * 0.14) + 0.05);
                gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (i * 0.14) + 0.35);
                osc.start(audioCtx.currentTime + (i * 0.14)); osc.stop(audioCtx.currentTime + (i * 0.14) + 0.35);
            });
            return;
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'square'; 
        let freq = 1000, duration = 0.1;
        switch(type) {
            case 'beep': freq = 1200; duration = 0.1; break; 
            case 'select': freq = 1800; duration = 0.1; break; 
            case 'cancel': freq = 600; duration = 0.15; break; 
            case 'win': freq = 2200; duration = 0.2; osc.type = 'triangle'; break; 
            case 'lose': freq = 300; duration = 0.3; osc.type = 'sawtooth'; break; 
        }
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

// --- TASTATURSTEUERUNG ---
document.addEventListener('keydown', function(e) {
    if (e.target.tagName.toLowerCase() === 'input') return;
    if (!state.isStarted || pet.isDead) return; 
    if (e.key === 'ArrowLeft') btnA();
    else if (e.key === 'ArrowDown') btnB();
    else if (e.key === 'ArrowRight') btnC();
});

// --- OPTIK LOGIK ---
// Index 16-18 sind geheime Spezies: sie erscheinen nur sehr selten und
// werden im Pokedex erst nach dem Fund benannt.
const speciesList = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🦁','🐯','🐸','🐵','🦄','🐙','🦖','🦉','🔥','💎','🌟'];
const SECRET_SPECIES_START = 16;   // ab hier geheim
const SECRET_SPECIES_CHANCE = 0.02; // 2 % Gesamtchance auf ein Geheimtier
const shellColors = ['#ff9ff3', '#48dbfb', '#ff6b6b', '#9b59b6', '#ffb8b8', '#55efc4', '#feca57'];

// === SELTENE EI-FARBEN (Pfleger-Level-Freischaltungen) ===
// Diese Farben werden erst ab dem jeweiligen Pfleger-Level für neue Eier möglich.
