# Pausentamagotchi

Ein Tamagotchi für die Arbeitspause. Dein Wolkenwesen besucht dich jeden Tag
für 30 Minuten aktiver Bildschirmzeit — und erinnert dich nebenbei daran,
selbst mal aufzustehen.

Läuft vollständig im Browser, ohne Server und ohne Konto. Alle Spielstände
liegen im `localStorage` deines Geräts.

## Installation

1. Alle Dateien auf einen Webserver legen (Ordnerstruktur beibehalten!)
2. Seite im Browser öffnen
3. Über das Menü „Als App installieren" auf den Startbildschirm legen

Wichtig: Die App muss über **http(s)** ausgeliefert werden, nicht per
Doppelklick als `file://` — sonst blockiert der Browser Service Worker
und localStorage.

## Aufbau

```
index.html          Struktur der Oberfläche
css/
  styles.css        Gerät, Fenster, Animationen
  fonts.css         FontAwesome-Teilmenge (eingebettet, offlinefähig)
js/
  00-sprites        Sprite-System: Zustand des Tieres -> PNG-Datei
  01-storage-core   Speicher-Helfer, IDs, Grundkonstanten, Tastatursteuerung
  02-data-shop      Ei-Farben, Arten, Shop-Artikel, Multiplikatoren, Buff-Dauern
  03-backup         Backup-Format, Prüfsumme, Sichern & Laden
  04-i18n           Sprachumschaltung und Wörterbücher (Deutsch/Englisch)
  05-shop-logic     Kaufen, Benutzen, Inventar, Glücksrad
  06-gamefeel-level Belohnungs-Animationen, Töne, Pfleger-Level, Freischaltungen
  07-arena-endgame  Arena, PvP, Mini-Bosse, Fernrohr & Vermächtnis
  08-graves-ambient Ahnengalerie, Grabpflege, Hintergrund-Ambiente, Raid, Bewertung
  09-quests-village Geschichte, Tages-Quests, Ergonomie, Tagebuch, Wolkendorf, Pomodoro
  10-core-loop      Spiel-Logik, Zustand, Rendern, Individualität
  11-arcade         Arcade-Automaten: Space Invaders, Pong, Defender
  12-extras         Dock-Hinweise, Schrittzähler, 8-Ball, Sprüche
  13-boot           Start der App, Speicher-Anforderung, Service Worker
assets/
  sprites/          212 Tier-Sprites (256x256 PNG, transparent)
sw.js               Service Worker (Offline-Betrieb)
manifest.webmanifest
*.png               App-Symbole
```

### Zur Reihenfolge der Skripte

Die Dateien sind **klassische Skripte** (keine Module) und teilen sich einen
gemeinsamen Namensraum. Die Nummerierung ist deshalb keine Kosmetik, sondern
die Ladereihenfolge: Konstanten und Daten müssen vorhanden sein, bevor der
Code sie benutzt, und `13-boot.js` startet zuletzt die App.

Wer eine Datei hinzufügt, trägt sie an der passenden Stelle in `index.html`
**und** in der Liste `ASSETS` in `sw.js` ein — sonst fehlt sie offline.

### Nach Änderungen

Die Versionsnummer in `sw.js` (`const CACHE`) hochzählen. Sonst liefert der
Service Worker den alten Stand aus dem Cache aus.


## Die Tier-Sprites

Seit Version 2.46.0 werden die Tiere nicht mehr als Emoji dargestellt, sondern
als handgezeichnete PNGs unter `assets/sprites/`. Der Dateiname kodiert den
kompletten Zustand:

```
<spezies>_<phase>[_<stimmung>].png
```

**Spezies** — `wuffi`, `miezi`, `maeusi`, `hamsti`, `hopsi`, `fuxx`, `baerli`,
`pandoo`, `leo`, `tigri`, `quaxi`, `affe`, `enzo`, `okto`, `dino`, `eule` und die
drei geheimen `phoenix`, `kristo`, `stella`.
Die Reihenfolge ist identisch zu `speciesList` in `01-storage-core.js` — wer
dort etwas umsortiert, muss `SPRITE_SPECIES` in `00-sprites.js` mitziehen.

**Phase** — `kind` (Stage 2), `teen` (3), `erwachsen` (4), `senior` (5).

**Stimmung** — ohne Suffix ist das Tier wach und zufrieden, `_schlaf` zeigt es
schlafend mit Zzz, `_wuetend` signalisiert Handlungsbedarf: krank (Arzt) oder
ungezogen (Belehren).

Dazu kommen die Sonderfaelle:

| Datei | Bedeutung |
|---|---|
| `ei.png` | Stage 0, noch nicht geschluepft |
| `kueken.png`, `kueken_schlaf.png`, `kueken_wuetend.png` | Stage 1, artunabhaengig |
| `<spezies>_engel.png` | verstorben: Heiligenschein, Fluegel, Wolke |

Macht `1 + 3 + 19 x (4 x 3 + 1)` = **251 Dateien** (64x64, transparent).

### Geheime Spezies

Drei Arten sind bewusst versteckt: **Phoenix**, **Kristo** und **Stella**
(Index 16-18). Sie schluepfen zusammen nur in 2 % aller Faelle, also je rund
0,7 %. Im Pokedex bleiben sie bis zum Fund als `???` verborgen und werden
danach golden mit einem Stern markiert. Gesteuert wird das ueber
`SECRET_SPECIES_START` und `SECRET_SPECIES_CHANCE` in `01-storage-core.js`.

Aufgeloest wird das in `00-sprites.js`:

```js
spriteKey(pet)   // 'eule_senior_schlaf'
spriteSrc(pet)   // './assets/sprites/eule_senior_schlaf.png'
spriteImg(pet)   // '<img src="..." class="pet-sprite" ...>'
```

Die Reihenfolge der Pruefung ist **tot -> schlafend -> wuetend -> normal**. Ein
verstorbenes Tier zeigt also immer den Engel, egal wie es ihm vorher ging.

### Ein Sprite austauschen

PNG unter `assets/sprites/` ersetzen (gleicher Name, gleiche Groesse) und
danach `const CACHE` in `sw.js` hochzaehlen — sonst bleibt die alte Grafik im
Cache haengen.

## Lebensphasen

| Stage | Phase | Uebergang |
|---:|---|---|
| 0 | Ei | Start |
| 1 | Kueken | nach 15 aktiven Sekunden |
| 2 | Kind | nach 1 Stunde aktiver Spielzeit |
| 3 | Teenager | nach 4 Stunden |
| 4 | Erwachsen | nach 8 Stunden, schaltet den Pokedex-Eintrag frei |
| 5 | Senior | ab 85 % der individuellen Lebenszeit |

Die Seniorenphase haengt bewusst an `maxLifetime` statt an einer festen
Stundenzahl. Die Lebenserwartung wird pro Tier ausgewuerfelt und liegt
manchmal unter der Erwachsenen-Schwelle — ueber den Prozentsatz erreicht
trotzdem **jedes** Tamagotchi das Greisenalter, bevor es stirbt.

## Auf GitHub veroeffentlichen

Das Repository bringt einen fertigen Workflow mit
(`.github/workflows/deploy.yml`), der die App bei jedem Push auf `main` nach
GitHub Pages ausliefert.

```bash
git init
git add .
git commit -m "Pausentamagotchi 2.46.0"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/pausentamagotchi.git
git push -u origin main
```

Danach im Repository unter **Settings -> Pages** bei *Source* den Eintrag
**GitHub Actions** auswaehlen. Die App laeuft anschliessend unter
`https://DEIN-NAME.github.io/pausentamagotchi/` und laesst sich von dort aus
auf dem Smartphone installieren.

Zum lokalen Testen reicht:

```bash
python3 -m http.server 8000
```

## Datenschutz

Es werden keinerlei Daten übertragen. Kein Tracking, keine Konten, keine
Server-Kommunikation. Der Austausch von Spielständen für Highscores und
Kämpfe läuft ausschließlich über Dateien, die du selbst weitergibst.

© Basti

## Lizenz

GNU General Public License v3.0 - siehe [LICENSE](LICENSE).
