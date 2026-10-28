/* Achtsamkeits-Tamagotchi - Dynamischer 3D-Hüllen-Lichteffekt
 *
 * Eine bewegliche Reflexion/Lichtquelle wandert über die Ei-Hülle, dazu ein
 * gegenläufiger Schlagschatten. Die Position kommt:
 *   - am Desktop  : von der Uhrzeit (Sonnenbogen ueber den Tag)
 *   - auf Mobil   : von der Geräteneigung (DeviceOrientation), dazu ein
 *                   Parallax-Versatz des Hintergrundmusters (#parallaxBg)
 *
 * Gesetzt werden CSS-Variablen auf .device (--light-x/-y in %, --shadow-x/-y in px)
 * und auf #parallaxBg (--parallax-x/-y in px). Alles rein visuell; ohne Sensor
 * bleibt am Handy das Standard-Glanzlicht.
 */
(function () {
    'use strict';

    // Zielwerte (0..100 % für die Reflexion) und geglättete Ist-Werte.
    // Start oben links – das entspricht dem bisherigen statischen Glanz.
    let targetX = 28, targetY = 20;
    let curX = 28, curY = 20;
    // Parallax-Verschiebung des Hintergrundmusters (px), ebenfalls geglättet.
    let parallaxTargetX = 0, parallaxTargetY = 0;
    let parallaxCurX = 0, parallaxCurY = 0;
    let rafPending = false;
    let motionActive = false;   // sobald Neigungsdaten kommen, hat Sensor Vorrang

    function el() { return document.getElementById('device'); }
    function parallaxEl() { return document.getElementById('parallaxBg'); }

    // Weiche Annäherung der Ist- an die Zielwerte (Trägheit -> realistischer).
    function animate() {
        rafPending = false;
        const d = el();
        if (!d) return;

        curX += (targetX - curX) * 0.18;
        curY += (targetY - curY) * 0.18;

        // Reflexion in %
        d.style.setProperty('--light-x', curX.toFixed(1) + '%');
        d.style.setProperty('--light-y', curY.toFixed(1) + '%');

        // Schlagschatten gegenläufig: helles Licht oben-links -> Schatten
        // unten-rechts. Basis 15px nach unten, Auslenkung je ±10px.
        const sx = ((50 - curX) / 50) * 10;          // -10..+10
        const sy = 15 + ((50 - curY) / 50) * 8;      //  7..23
        d.style.setProperty('--shadow-x', sx.toFixed(1) + 'px');
        d.style.setProperty('--shadow-y', sy.toFixed(1) + 'px');

        // Parallax-Muster ebenfalls sanft nachfuehren.
        parallaxCurX += (parallaxTargetX - parallaxCurX) * 0.18;
        parallaxCurY += (parallaxTargetY - parallaxCurY) * 0.18;
        const pb = parallaxEl();
        if (pb) {
            pb.style.setProperty('--parallax-x', parallaxCurX.toFixed(1) + 'px');
            pb.style.setProperty('--parallax-y', parallaxCurY.toFixed(1) + 'px');
        }

        // Weiterlaufen, solange Ist spürbar vom Ziel abweicht.
        if (Math.abs(targetX - curX) > 0.2 || Math.abs(targetY - curY) > 0.2 ||
            Math.abs(parallaxTargetX - parallaxCurX) > 0.2 ||
            Math.abs(parallaxTargetY - parallaxCurY) > 0.2) {
            requestAnimationFrame(animate);
            rafPending = true;
        }
    }

    function schedule() {
        if (!rafPending) { rafPending = true; requestAnimationFrame(animate); }
    }

    function setTarget(x, y) {
        targetX = Math.max(0, Math.min(100, x));
        targetY = Math.max(0, Math.min(100, y));
        schedule();
    }

    // --- Desktop: Uhrzeit ---
    // Statt dem Mauszeiger zu folgen (zu hektisch), wandert die Lichtquelle wie
    // die Sonne ueber den Tag: Sie beschreibt einen ruhigen Bogen von links
    // (Morgen) ueber oben (Mittag) nach rechts (Abend). Nachts sinkt sie tiefer
    // und wird flacher. Die Position leitet sich aus der aktuellen Uhrzeit ab
    // und aktualisiert sich sanft im Minutentakt - ein beruhigender, achtsamer
    // Effekt, der zum Thema passt.
    function timeToLight() {
        const now = new Date();
        // Sekundengenauer Tagesfortschritt fuer eine fliessende Bewegung.
        const secondsOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const dayFrac = secondsOfDay / 86400;               // 0 = Mitternacht

        // Sonnenbogen wie in der Natur: morgens links, mittags mittig & hoch,
        // abends rechts, nachts tief. Wir bilden 6-18 Uhr auf einen Halbkreis
        // ab (Ost -> Sued -> West), die Nacht ruht flach am jeweiligen Rand.
        // phase: 0 um 6 Uhr, 1 um 18 Uhr.
        const phase = (dayFrac - 0.25) * 2;                 // -0.5 .. 1.5 ueber den Tag
        // x: linear von links (10%) nach rechts (90%) ueber den ganzen Tag,
        // damit die Bewegung nie springt.
        const x = 10 + dayFrac * 80;                        // 10..90
        // Hoehe folgt der Sonne: sin-Kurve mit Hochpunkt um 12 Uhr.
        const elevation = Math.sin((dayFrac - 0.25) * 2 * Math.PI); // -1 (0 Uhr) .. +1 (12 Uhr)
        const y = 30 - elevation * 22;                      // 8 (Mittag) .. 52 (Mitternacht)
        return { x: x, y: y };
    }

    function updateFromTime() {
        if (motionActive) return;   // Sensor (Mobil) hat Vorrang, falls vorhanden
        const p = timeToLight();
        setTarget(p.x, p.y);
    }

    // --- Mobil: Geräteneigung ---
    // gamma: Links/Rechts-Neigung (-90..90), beta: Vor/Zurück (-180..180).
    // Neigt man das Gerät nach rechts, "läuft" das Licht nach links usw.
    function onOrientation(e) {
        // Nur reagieren, wenn wenigstens ein Wert echte Daten liefert.
        if ((e.gamma === null || e.gamma === undefined) &&
            (e.beta === null || e.beta === undefined)) return;
        motionActive = true;   // ab jetzt hat der Sensor Vorrang vor der Uhrzeit
        const g = Math.max(-45, Math.min(45, e.gamma || 0));   // links/rechts
        const b = Math.max(-45, Math.min(45, (e.beta || 0) - 35)); // vor/zurück, 35° Halte-Ruhelage
        // In %-Position umrechnen: Ruhelage = Mitte-oben.
        const x = 50 - (g / 45) * 42;   // 8..92
        const y = 24 - (b / 45) * 22;   // 2..46 (Licht bleibt eher oben)
        setTarget(x, y);

        // Parallax: Das Hintergrundmuster verschiebt sich GEGENLAEUFIG zur
        // Neigung (max. ~14px), sodass es tiefer zu liegen scheint als die
        // Huelle. Dezent gehalten, damit es nur unterschwellig Tiefe erzeugt.
        parallaxTargetX = (g / 45) * 14;
        parallaxTargetY = (b / 45) * 10;
        schedule();
    }

    // iOS 13+ verlangt eine ausdrückliche Freigabe des Bewegungssensors, die
    // nur aus einer echten Nutzergeste heraus erfragt werden darf. Wir hängen
    // die Anfrage an den ersten Tap IRGENDWO auf die Seite (nicht nur auf die
    // Hülle - die kann von Onboarding/Modals verdeckt sein). Schlägt sie fehl
    // oder gibt es keinen Sensor, bleibt es beim Uhrzeit-/Standardverhalten.
    let motionRequested = false;
    let orientationBound = false;

    function bindOrientation() {
        if (orientationBound) return;
        orientationBound = true;
        window.addEventListener('deviceorientation', onOrientation, true);
    }

    function requestMotionPermission() {
        if (motionRequested) return;
        motionRequested = true;
        try {
            if (typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                // iOS 13+
                DeviceOrientationEvent.requestPermission().then(function (state) {
                    if (state === 'granted') {
                        bindOrientation();
                    } else {
                        motionRequested = false;   // Ablehnung -> spaeterer Tap darf erneut fragen
                    }
                }).catch(function () {
                    motionRequested = false;
                });
            } else {
                // Android / ältere iOS: kein Prompt nötig, direkt lauschen.
                bindOrientation();
            }
        } catch (err) {
            motionRequested = false;
        }
    }

    function init() {
        const d = el();
        if (!d) return;

        // Geräteklasse bestimmen. Touch-Fähigkeit + grober Zeiger deutet auf
        // Smartphone/Tablet -> Neigungssensor. Sonst Desktop -> Uhrzeit.
        // (Reines pointer:fine war unzuverlässig: Tablets mit Trackpad melden
        // fine, echte Touch-Geräte manchmal beides.)
        const hasTouch = ('ontouchstart' in window) ||
                         (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const hasOrientation = ('DeviceOrientationEvent' in window);
        const isMobile = hasOrientation && (hasTouch || coarse);

        if (isMobile) {
            // --- Mobil: Geräteneigung ---
            const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function';

            if (needsPermission) {
                // iOS 13+: Freigabe nur aus einer Nutzergeste heraus. An den
                // ersten Tap/Klick IRGENDWO auf der Seite hängen, damit es auch
                // klappt, wenn die Hülle gerade verdeckt ist.
                const askOnce = function () {
                    requestMotionPermission();
                };
                window.addEventListener('touchend', askOnce, { passive: true });
                window.addEventListener('click', askOnce);
                // Zusätzlich direkt auf der Hülle (falls sie frei liegt).
                d.addEventListener('touchstart', askOnce, { passive: true });
            } else {
                // Android / ältere iOS: sofort lauschen, kein Prompt nötig.
                bindOrientation();
            }
        } else {
            // --- Desktop: uhrzeitgesteuerter Sonnenbogen ---
            updateFromTime();                       // sofort passend zur aktuellen Zeit
            setInterval(updateFromTime, 30000);     // alle 30 s sanft nachführen
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden) updateFromTime();
            });
        }

        // Startwerte setzen.
        schedule();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
