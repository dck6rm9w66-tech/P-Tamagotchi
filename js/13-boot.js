/* Pausentamagotchi - Start der App, Speicher-Anforderung, Service Worker */
init();

// --- Startdiagnose: passen alle Dateien zusammen? ---
// Haeufigster Fehler beim Deployen: es wurden nur EINIGE Dateien ersetzt.
// Fehlt js/00-sprites.js (weil eine alte index.html ohne den Script-Tag
// ausgeliefert wird), laeuft die App dank Rueckfall zwar weiter, zeigt aber
// Emojis statt Sprites. Diese Meldung sagt genau, was zu tun ist.
if (typeof spriteImg !== 'function') {
    console.error(
        '[Pausentamagotchi] js/00-sprites.js wurde NICHT geladen.\n' +
        'Die index.html auf dem Server ist veraltet - ihr fehlt die Zeile:\n' +
        '  <script src="./js/00-sprites.js"><\/script>\n' +
        'Bitte ALLE Dateien der Version 2.46.0 hochladen, nicht nur einzelne.'
    );
} else {
    // Sprites fuer das aktuelle Pet vorladen - verhindert Flackern beim
    // Wechsel zwischen Wach-, Schlaf- und Wut-Darstellung.
    try { preloadPetSprites(typeof pet !== 'undefined' ? pet : null); } catch (e) {}
}

// --- Dauerhafter Speicher (Android/Chrome & Desktop) ---
// Ohne dies darf der Browser den localStorage bei Speicherdruck raeumen.
// Ist die App installiert, gewaehrt Chrome die Anfrage meist automatisch.
// Safari/iOS kennt die API nicht -> wird still uebersprungen.
async function requestPersistentStorage() {
    try {
        if (!navigator.storage || !navigator.storage.persist) return;
        if (await navigator.storage.persisted()) return;
        await navigator.storage.persist();
    } catch (e) { /* nicht unterstuetzt - kein Problem */ }
}
requestPersistentStorage();

// --- PWA: Service Worker fuer den Offline-Betrieb registrieren ---
// Nur ueber http(s) moeglich; beim Oeffnen als lokale Datei still ignorieren.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.warn('Service Worker nicht registriert:', err);
        });
    });
}
// Aktive Ergonomie-Erinnerungen alle ~12 Minuten (Echtzeit) – funktioniert auch nach Abfahrt ins Wolkendorf
setInterval(() => { try { showErgoReminder(); } catch(e){} }, 1000 * 60 * 12);
