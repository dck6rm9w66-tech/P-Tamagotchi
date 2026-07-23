// ============================================================
//  Pausentamagotchi - Sprite-System
//  Ersetzt die bisherigen Emoji-Darstellungen durch handgezeichnete
//  64x64-PNGs (Pixel-Look, via image-rendering: pixelated skaliert). Muss VOR allen anderen Skripten geladen werden.
//
//  Dateischema:  assets/sprites/<spezies>_<phase>[_<stimmung>].png
//    spezies  : wuffi, miezi, maeusi, ... (Reihenfolge = speciesList)
//    phase    : kind | teen | erwachsen | senior   (Stage 2..5)
//    stimmung : (keine) | schlaf | wuetend
//  Sonderfälle: ei.png (Stage 0), kueken*.png (Stage 1),
//               <spezies>_engel.png (gestorben)
// ============================================================

const SPRITE_BASE = './assets/sprites/';

// Reihenfolge MUSS exakt speciesList aus 01-storage-core.js entsprechen
const SPRITE_SPECIES = [
    'wuffi',  'miezi', 'maeusi', 'hamsti',
    'hopsi',  'fuxx',  'baerli', 'pandoo',
    'leo',    'tigri', 'quaxi',  'affe',
    'enzo',   'okto',  'dino',   'eule',
    // --- geheime Spezies (sehr selten, Index 16-18) ---
    'phoenix', 'kristo', 'stella'
];

// Stage-Index -> Phasenname. Stage 0/1 sind speziesunabhängig.
const SPRITE_PHASES = ['ei', 'kueken', 'kind', 'teen', 'erwachsen', 'senior'];

// Anzeigenamen der Lebensphasen (für Info-Screen / Pokedex)
const SPRITE_PHASE_LABELS = {
    0: 'Ei', 1: 'Küken', 2: 'Kind', 3: 'Teenager', 4: 'Erwachsen', 5: 'Senior'
};

/** Ermittelt den Spezies-Slug für ein Pet (Fallback: wuffi). */
function spriteSpeciesSlug(p) {
    let i = (p && typeof p.speciesIndex === 'number') ? p.speciesIndex : 0;
    return SPRITE_SPECIES[i] || SPRITE_SPECIES[0];
}

/** Schläft das Pet gerade wirklich? (Licht aus + müde, oder System-Crash) */
function spriteIsSleeping(p) {
    if (!p) return false;
    if (p.wantsToSleep && p.lightOff) return true;
    if (p.isCrashedUntil && p.activeSeconds < p.isCrashedUntil) return true;
    return false;
}

/** Stimmungs-Suffix: '' | '_schlaf' | '_wuetend' */
function spriteMoodSuffix(p) {
    if (!p || p.isDead) return '';
    if (spriteIsSleeping(p)) return '_schlaf';
    // Wütend = Handlungsbedarf: Arzt (krank) oder Belehren (ungezogen)
    if (p.isSick || p.misbehaving) return '_wuetend';
    return '';
}

/**
 * Liefert den Dateinamen (ohne Pfad) für den aktuellen Zustand eines Pets.
 * Optional lassen sich Phase/Stimmung überschreiben (z.B. für Pokedex).
 */
function spriteKey(p, opts) {
    opts = opts || {};
    let dead    = (opts.dead    !== undefined) ? opts.dead    : !!(p && p.isDead);
    let stage   = (opts.stage   !== undefined) ? opts.stage   : (p ? p.stage : 0);
    let mood    = (opts.mood    !== undefined) ? opts.mood    : spriteMoodSuffix(p);
    let slug    = opts.species || spriteSpeciesSlug(p);

    if (dead) return slug + '_engel';                 // Engel hat keine Stimmungen
    if (stage <= 0) return 'ei';                      // Ei: nur ein Zustand
    if (stage === 1) return 'kueken' + mood;

    let phase = SPRITE_PHASES[Math.min(stage, 5)] || 'erwachsen';
    return slug + '_' + phase + mood;
}

/** Vollständiger Pfad zum Sprite. */
function spriteSrc(p, opts) {
    return SPRITE_BASE + spriteKey(p, opts) + '.png';
}

/**
 * Baut das <img>-Tag. `extraStyle` wird angehängt (z.B. Individualitäts-Filter).
 * `sizeEm` steuert die Größe relativ zur font-size des Containers, damit die
 * bestehende Skalierungslogik (sizeStyle) unverändert weiterfunktioniert.
 */
function spriteImg(p, opts) {
    opts = opts || {};
    let sizeEm = opts.sizeEm || 1.55;
    let extra  = opts.extraStyle || '';
    let cls    = opts.className || 'pet-sprite';
    let alt    = opts.alt || '';
    return `<img src="${spriteSrc(p, opts)}" class="${cls}" alt="${alt}" `
         + `draggable="false" style="width:${sizeEm}em;height:${sizeEm}em;`
         + `object-fit:contain;image-rendering:auto;${extra}">`;
}

// ------------------------------------------------------------
//  Vorladen + Canvas-Cache (für Arcade-Minispiele)
// ------------------------------------------------------------
const SPRITE_CACHE = Object.create(null);

/** Gibt ein (ggf. noch ladendes) Image-Objekt zurück - für ctx.drawImage. */
function spriteImageObject(src) {
    if (SPRITE_CACHE[src]) return SPRITE_CACHE[src];
    let img = new Image();
    img.decoding = 'async';
    img.src = src;
    SPRITE_CACHE[src] = img;
    return img;
}

/** Lädt die Sprites vor, die für das aktuelle Pet relevant sind. */
function preloadPetSprites(p) {
    if (!p) return;
    let slug = spriteSpeciesSlug(p);
    let keys = ['ei', 'kueken', 'kueken_schlaf', 'kueken_wuetend', slug + '_engel'];
    ['kind', 'teen', 'erwachsen', 'senior'].forEach(ph => {
        ['', '_schlaf', '_wuetend'].forEach(m => keys.push(slug + '_' + ph + m));
    });
    keys.forEach(k => spriteImageObject(SPRITE_BASE + k + '.png'));
}

/** Zeichnet das Pet-Sprite auf ein Canvas (Ersatz für ctx.fillText(emoji)). */
function spriteDrawOnCanvas(ctx, p, x, y, size, rot) {
    let img = spriteImageObject(spriteSrc(p, { mood: '' }));
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    try { ctx.filter = (p && p.hueShift) ? `hue-rotate(${p.hueShift}deg)` : 'none'; } catch (e) {}
    if (img.complete && img.naturalWidth > 0) {
        // Pixel-Look auch im Arcade-Canvas: keine Glaettung beim Hochskalieren
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
        // Fallback solange das Bild noch lädt
        ctx.font = size + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🥚', 0, 0);
    }
    ctx.restore();
}
