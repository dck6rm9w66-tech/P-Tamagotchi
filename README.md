# Pausentamagotchi — als App aufs iPhone

Diese Version ist eine **Progressive Web App (PWA)**: Du installierst sie über Safari auf den Home-Bildschirm, sie startet im Vollbild mit eigenem Icon, und sie läuft **komplett ohne Internet**. Dein Spielstand bleibt nach dem Schliessen erhalten.

---

## Das Paket

| Datei | Zweck |
|---|---|
| `index.html` | Das komplette Spiel (Font Awesome ist eingebettet — keine externen Abhängigkeiten) |
| `manifest.webmanifest` | Name, Icon, Farben, Vollbild-Modus |
| `sw.js` | Service Worker — cacht alles für den Offline-Betrieb |
| `apple-touch-icon.png` | Icon für den iPhone-Home-Bildschirm (180×180) |
| `icon-192.png`, `icon-512.png` | Icons für Android / das Manifest |
| `icon-maskable-512.png` | Adaptives Icon für Android |

Alle Dateien müssen **zusammen im selben Ordner** liegen.

---

## Schritt 1: Hochladen (einmalig, ~10 Minuten, kostenlos)

Die Dateien müssen über eine `https://`-Adresse erreichbar sein. Aus der „Dateien"-App geöffnet funktioniert die Installation **nicht**.

### Mit GitHub Pages

1. Auf [github.com](https://github.com) einloggen → **New repository** → Name z. B. `pausentamagotchi` → **Public** → **Create**.
2. **Add file → Upload files** → alle Dateien aus diesem Ordner hineinziehen → **Commit changes**.
3. **Settings → Pages** → unter *Branch* `main` und `/ (root)` wählen → **Save**.
4. Nach 1–2 Minuten ist die App erreichbar unter:
   `https://DEINNAME.github.io/pausentamagotchi/`

> **Public heisst nur, dass der Programmcode öffentlich ist — deine Spielstände nicht.** Die liegen ausschliesslich im `localStorage` deines iPhones. Es gibt keinen Server, keine Datenbank, kein Konto. Wenn dir das trotzdem zu offen ist: Netlify Drop ([app.netlify.com/drop](https://app.netlify.com/drop)) erzeugt per Drag-and-drop eine private URL ohne Konto-Zwang.

---

## Schritt 2: Auf dem iPhone installieren

1. Die URL **in Safari** öffnen (nicht Chrome — nur Safari kann installieren).
2. Auf **Teilen** (Quadrat mit Pfeil nach oben) tippen.
3. **„Zum Home-Bildschirm"** wählen → **Hinzufügen**.
4. Fertig — das Icon liegt auf dem Home-Bildschirm und startet ohne Browser-Leiste.

Ab jetzt läuft alles offline. Du kannst im Flugmodus spielen.

---

## Bleibt der Fortschritt erhalten?

**Ja.** Safari löscht bei normalen Webseiten nach 7 Tagen ohne Besuch den gesamten Speicher — **Home-Bildschirm-Apps sind davon ausgenommen**. Apple: Web-Apps auf dem Home-Bildschirm sind nicht Teil von Safari und haben ihren eigenen Nutzungszähler.

**Trotzdem kann der Spielstand verschwinden**, wenn du:

- das App-Icon vom Home-Bildschirm löschst,
- in *Einstellungen → Safari* **„Verlauf und Websitedaten löschen"** wählst,
- oder das iPhone extrem wenig freien Speicher hat (iOS räumt dann auf).

**Deshalb: Nutze die eingebaute Sicherung.** Über den 💾-Knopf oben links bekommst du eine JSON-Datei mit dem kompletten Fortschritt (Tamagotchi, Coins, Tickets, Level, Medaillen, Inventar, Wolkendorf, Arena, Arcade-Highscores, Friedhof). Die kannst du jederzeit wieder laden — auch auf einem anderen Gerät. Nach grösseren Fortschritten lohnt sich das.

---

## Android: Spielstand langfristig sichern

Android hat ein direktes Pendant zu iOS' „Zum Home-Bildschirm":

1. Die URL in **Chrome** öffnen.
2. Menü (⋮) → **„App installieren"** bzw. **„Zum Startbildschirm zufügen"**.

Chrome zeigt oft von selbst einen Installations-Banner an. Danach liegt die App wie eine normale App im App-Drawer und läuft im Vollbild.

**Der entscheidende Unterschied zu iOS:** Android/Chrome kennt die `navigator.storage.persist()`-API. Die App fordert damit beim Start automatisch **dauerhaften Speicher** an. Ist die App installiert, gewährt Chrome das in der Regel ohne Nachfrage — der Spielstand wird dann auch bei Speicherdruck **nicht** mehr automatisch geräumt. Das ist sogar verlässlicher als unter iOS.

Gelöscht wird der Stand dann nur noch, wenn du ihn selbst entfernst (App deinstallieren oder Browserdaten löschen).

## Updates einspielen

Neue Version? Einfach die geänderten Dateien im Repository ersetzen. Die App holt sich beim nächsten Start mit Internet automatisch die neue Fassung (der Service Worker lädt `index.html` bevorzugt aus dem Netz).

Wenn du auch Icons oder das Manifest änderst, erhöhe zusätzlich die Version oben in `sw.js`:

```js
const CACHE = 'pausentama-v2.11.0';   // -> v2.11.1
```

Damit wirft der Service Worker den alten Cache weg und lädt alles neu.

---

## Gut zu wissen

- **Offline vollständig**: Der Font ist auf die 25 tatsächlich genutzten Icons zugeschnitten (3,7 KB statt 147 KB) und direkt in `index.html` eingebettet.
- **Als lokale Datei weiterhin nutzbar**: Öffnest du `index.html` per Doppelklick am Rechner, läuft das Spiel normal — nur die Service-Worker-Registrierung wird still übersprungen.
- **Notch & Home-Indikator**: Die Leisten oben und unten berücksichtigen die iPhone-Safe-Areas.
- **Kein Hochkant/Querformat-Problem**: Die App ist auf Portrait festgelegt.
