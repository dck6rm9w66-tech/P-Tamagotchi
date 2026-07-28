// Achtsamkeits-Tamagotchi - Service Worker
// Strategie: cache-first. Die App ist komplett statisch, es gibt keinen Server
// und keine API. Alles wird bei der Installation gecacht und danach offline
// ausgeliefert. Spielstaende liegen ausschliesslich im localStorage.
const CACHE = 'pausentama-v2.65.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './fonts.css',
  './styles.css',
  './js/00-sprites.js',
  './js/01-storage-core.js',
  './js/02-data-shop.js',
  './js/03-backup.js',
  './js/04-i18n.js',
  './js/05-shop-logic.js',
  './js/06-gamefeel-level.js',
  './js/07-arena-endgame.js',
  './js/08-graves-ambient.js',
  './js/09-quests-village.js',
  './js/10-core-loop.js',
  './js/11-arcade.js',
  './js/12-extras.js',
  './js/13-boot.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './background_screen.jpg',
  // --- Tier-Sprites (alle Spezies x Lebensphasen x Zustände) ---
  './assets/sprites/affe_engel.png',
  './assets/sprites/affe_erwachsen.png',
  './assets/sprites/affe_erwachsen_schlaf.png',
  './assets/sprites/affe_erwachsen_wuetend.png',
  './assets/sprites/affe_kind.png',
  './assets/sprites/affe_kind_schlaf.png',
  './assets/sprites/affe_kind_wuetend.png',
  './assets/sprites/affe_senior.png',
  './assets/sprites/affe_senior_schlaf.png',
  './assets/sprites/affe_senior_wuetend.png',
  './assets/sprites/affe_teen.png',
  './assets/sprites/affe_teen_schlaf.png',
  './assets/sprites/affe_teen_wuetend.png',
  './assets/sprites/baerli_engel.png',
  './assets/sprites/baerli_erwachsen.png',
  './assets/sprites/baerli_erwachsen_schlaf.png',
  './assets/sprites/baerli_erwachsen_wuetend.png',
  './assets/sprites/baerli_kind.png',
  './assets/sprites/baerli_kind_schlaf.png',
  './assets/sprites/baerli_kind_wuetend.png',
  './assets/sprites/baerli_senior.png',
  './assets/sprites/baerli_senior_schlaf.png',
  './assets/sprites/baerli_senior_wuetend.png',
  './assets/sprites/baerli_teen.png',
  './assets/sprites/baerli_teen_schlaf.png',
  './assets/sprites/baerli_teen_wuetend.png',
  './assets/sprites/dino_engel.png',
  './assets/sprites/dino_erwachsen.png',
  './assets/sprites/dino_erwachsen_schlaf.png',
  './assets/sprites/dino_erwachsen_wuetend.png',
  './assets/sprites/dino_kind.png',
  './assets/sprites/dino_kind_schlaf.png',
  './assets/sprites/dino_kind_wuetend.png',
  './assets/sprites/dino_senior.png',
  './assets/sprites/dino_senior_schlaf.png',
  './assets/sprites/dino_senior_wuetend.png',
  './assets/sprites/dino_teen.png',
  './assets/sprites/dino_teen_schlaf.png',
  './assets/sprites/dino_teen_wuetend.png',
  './assets/sprites/ei.png',
  './assets/sprites/enzo_engel.png',
  './assets/sprites/enzo_erwachsen.png',
  './assets/sprites/enzo_erwachsen_schlaf.png',
  './assets/sprites/enzo_erwachsen_wuetend.png',
  './assets/sprites/enzo_kind.png',
  './assets/sprites/enzo_kind_schlaf.png',
  './assets/sprites/enzo_kind_wuetend.png',
  './assets/sprites/enzo_senior.png',
  './assets/sprites/enzo_senior_schlaf.png',
  './assets/sprites/enzo_senior_wuetend.png',
  './assets/sprites/enzo_teen.png',
  './assets/sprites/enzo_teen_schlaf.png',
  './assets/sprites/enzo_teen_wuetend.png',
  './assets/sprites/eule_engel.png',
  './assets/sprites/eule_erwachsen.png',
  './assets/sprites/eule_erwachsen_schlaf.png',
  './assets/sprites/eule_erwachsen_wuetend.png',
  './assets/sprites/eule_kind.png',
  './assets/sprites/eule_kind_schlaf.png',
  './assets/sprites/eule_kind_wuetend.png',
  './assets/sprites/eule_senior.png',
  './assets/sprites/eule_senior_schlaf.png',
  './assets/sprites/eule_senior_wuetend.png',
  './assets/sprites/eule_teen.png',
  './assets/sprites/eule_teen_schlaf.png',
  './assets/sprites/eule_teen_wuetend.png',
  './assets/sprites/fuxx_engel.png',
  './assets/sprites/fuxx_erwachsen.png',
  './assets/sprites/fuxx_erwachsen_schlaf.png',
  './assets/sprites/fuxx_erwachsen_wuetend.png',
  './assets/sprites/fuxx_kind.png',
  './assets/sprites/fuxx_kind_schlaf.png',
  './assets/sprites/fuxx_kind_wuetend.png',
  './assets/sprites/fuxx_senior.png',
  './assets/sprites/fuxx_senior_schlaf.png',
  './assets/sprites/fuxx_senior_wuetend.png',
  './assets/sprites/fuxx_teen.png',
  './assets/sprites/fuxx_teen_schlaf.png',
  './assets/sprites/fuxx_teen_wuetend.png',
  './assets/sprites/hamsti_engel.png',
  './assets/sprites/hamsti_erwachsen.png',
  './assets/sprites/hamsti_erwachsen_schlaf.png',
  './assets/sprites/hamsti_erwachsen_wuetend.png',
  './assets/sprites/hamsti_kind.png',
  './assets/sprites/hamsti_kind_schlaf.png',
  './assets/sprites/hamsti_kind_wuetend.png',
  './assets/sprites/hamsti_senior.png',
  './assets/sprites/hamsti_senior_schlaf.png',
  './assets/sprites/hamsti_senior_wuetend.png',
  './assets/sprites/hamsti_teen.png',
  './assets/sprites/hamsti_teen_schlaf.png',
  './assets/sprites/hamsti_teen_wuetend.png',
  './assets/sprites/hopsi_engel.png',
  './assets/sprites/hopsi_erwachsen.png',
  './assets/sprites/hopsi_erwachsen_schlaf.png',
  './assets/sprites/hopsi_erwachsen_wuetend.png',
  './assets/sprites/hopsi_kind.png',
  './assets/sprites/hopsi_kind_schlaf.png',
  './assets/sprites/hopsi_kind_wuetend.png',
  './assets/sprites/hopsi_senior.png',
  './assets/sprites/hopsi_senior_schlaf.png',
  './assets/sprites/hopsi_senior_wuetend.png',
  './assets/sprites/hopsi_teen.png',
  './assets/sprites/hopsi_teen_schlaf.png',
  './assets/sprites/hopsi_teen_wuetend.png',
  './assets/sprites/kristo_engel.png',
  './assets/sprites/kristo_erwachsen.png',
  './assets/sprites/kristo_erwachsen_schlaf.png',
  './assets/sprites/kristo_erwachsen_wuetend.png',
  './assets/sprites/kristo_kind.png',
  './assets/sprites/kristo_kind_schlaf.png',
  './assets/sprites/kristo_kind_wuetend.png',
  './assets/sprites/kristo_senior.png',
  './assets/sprites/kristo_senior_schlaf.png',
  './assets/sprites/kristo_senior_wuetend.png',
  './assets/sprites/kristo_teen.png',
  './assets/sprites/kristo_teen_schlaf.png',
  './assets/sprites/kristo_teen_wuetend.png',
  './assets/sprites/kueken.png',
  './assets/sprites/kueken_schlaf.png',
  './assets/sprites/kueken_wuetend.png',
  './assets/sprites/leo_engel.png',
  './assets/sprites/leo_erwachsen.png',
  './assets/sprites/leo_erwachsen_schlaf.png',
  './assets/sprites/leo_erwachsen_wuetend.png',
  './assets/sprites/leo_kind.png',
  './assets/sprites/leo_kind_schlaf.png',
  './assets/sprites/leo_kind_wuetend.png',
  './assets/sprites/leo_senior.png',
  './assets/sprites/leo_senior_schlaf.png',
  './assets/sprites/leo_senior_wuetend.png',
  './assets/sprites/leo_teen.png',
  './assets/sprites/leo_teen_schlaf.png',
  './assets/sprites/leo_teen_wuetend.png',
  './assets/sprites/maeusi_engel.png',
  './assets/sprites/maeusi_erwachsen.png',
  './assets/sprites/maeusi_erwachsen_schlaf.png',
  './assets/sprites/maeusi_erwachsen_wuetend.png',
  './assets/sprites/maeusi_kind.png',
  './assets/sprites/maeusi_kind_schlaf.png',
  './assets/sprites/maeusi_kind_wuetend.png',
  './assets/sprites/maeusi_senior.png',
  './assets/sprites/maeusi_senior_schlaf.png',
  './assets/sprites/maeusi_senior_wuetend.png',
  './assets/sprites/maeusi_teen.png',
  './assets/sprites/maeusi_teen_schlaf.png',
  './assets/sprites/maeusi_teen_wuetend.png',
  './assets/sprites/miezi_engel.png',
  './assets/sprites/miezi_erwachsen.png',
  './assets/sprites/miezi_erwachsen_schlaf.png',
  './assets/sprites/miezi_erwachsen_wuetend.png',
  './assets/sprites/miezi_kind.png',
  './assets/sprites/miezi_kind_schlaf.png',
  './assets/sprites/miezi_kind_wuetend.png',
  './assets/sprites/miezi_senior.png',
  './assets/sprites/miezi_senior_schlaf.png',
  './assets/sprites/miezi_senior_wuetend.png',
  './assets/sprites/miezi_teen.png',
  './assets/sprites/miezi_teen_schlaf.png',
  './assets/sprites/miezi_teen_wuetend.png',
  './assets/sprites/okto_engel.png',
  './assets/sprites/okto_erwachsen.png',
  './assets/sprites/okto_erwachsen_schlaf.png',
  './assets/sprites/okto_erwachsen_wuetend.png',
  './assets/sprites/okto_kind.png',
  './assets/sprites/okto_kind_schlaf.png',
  './assets/sprites/okto_kind_wuetend.png',
  './assets/sprites/okto_senior.png',
  './assets/sprites/okto_senior_schlaf.png',
  './assets/sprites/okto_senior_wuetend.png',
  './assets/sprites/okto_teen.png',
  './assets/sprites/okto_teen_schlaf.png',
  './assets/sprites/okto_teen_wuetend.png',
  './assets/sprites/pandoo_engel.png',
  './assets/sprites/pandoo_erwachsen.png',
  './assets/sprites/pandoo_erwachsen_schlaf.png',
  './assets/sprites/pandoo_erwachsen_wuetend.png',
  './assets/sprites/pandoo_kind.png',
  './assets/sprites/pandoo_kind_schlaf.png',
  './assets/sprites/pandoo_kind_wuetend.png',
  './assets/sprites/pandoo_senior.png',
  './assets/sprites/pandoo_senior_schlaf.png',
  './assets/sprites/pandoo_senior_wuetend.png',
  './assets/sprites/pandoo_teen.png',
  './assets/sprites/pandoo_teen_schlaf.png',
  './assets/sprites/pandoo_teen_wuetend.png',
  './assets/sprites/phoenix_engel.png',
  './assets/sprites/phoenix_erwachsen.png',
  './assets/sprites/phoenix_erwachsen_schlaf.png',
  './assets/sprites/phoenix_erwachsen_wuetend.png',
  './assets/sprites/phoenix_kind.png',
  './assets/sprites/phoenix_kind_schlaf.png',
  './assets/sprites/phoenix_kind_wuetend.png',
  './assets/sprites/phoenix_senior.png',
  './assets/sprites/phoenix_senior_schlaf.png',
  './assets/sprites/phoenix_senior_wuetend.png',
  './assets/sprites/phoenix_teen.png',
  './assets/sprites/phoenix_teen_schlaf.png',
  './assets/sprites/phoenix_teen_wuetend.png',
  './assets/sprites/quaxi_engel.png',
  './assets/sprites/quaxi_erwachsen.png',
  './assets/sprites/quaxi_erwachsen_schlaf.png',
  './assets/sprites/quaxi_erwachsen_wuetend.png',
  './assets/sprites/quaxi_kind.png',
  './assets/sprites/quaxi_kind_schlaf.png',
  './assets/sprites/quaxi_kind_wuetend.png',
  './assets/sprites/quaxi_senior.png',
  './assets/sprites/quaxi_senior_schlaf.png',
  './assets/sprites/quaxi_senior_wuetend.png',
  './assets/sprites/quaxi_teen.png',
  './assets/sprites/quaxi_teen_schlaf.png',
  './assets/sprites/quaxi_teen_wuetend.png',
  './assets/sprites/stella_engel.png',
  './assets/sprites/stella_erwachsen.png',
  './assets/sprites/stella_erwachsen_schlaf.png',
  './assets/sprites/stella_erwachsen_wuetend.png',
  './assets/sprites/stella_kind.png',
  './assets/sprites/stella_kind_schlaf.png',
  './assets/sprites/stella_kind_wuetend.png',
  './assets/sprites/stella_senior.png',
  './assets/sprites/stella_senior_schlaf.png',
  './assets/sprites/stella_senior_wuetend.png',
  './assets/sprites/stella_teen.png',
  './assets/sprites/stella_teen_schlaf.png',
  './assets/sprites/stella_teen_wuetend.png',
  './assets/sprites/tigri_engel.png',
  './assets/sprites/tigri_erwachsen.png',
  './assets/sprites/tigri_erwachsen_schlaf.png',
  './assets/sprites/tigri_erwachsen_wuetend.png',
  './assets/sprites/tigri_kind.png',
  './assets/sprites/tigri_kind_schlaf.png',
  './assets/sprites/tigri_kind_wuetend.png',
  './assets/sprites/tigri_senior.png',
  './assets/sprites/tigri_senior_schlaf.png',
  './assets/sprites/tigri_senior_wuetend.png',
  './assets/sprites/tigri_teen.png',
  './assets/sprites/tigri_teen_schlaf.png',
  './assets/sprites/tigri_teen_wuetend.png',
  './assets/sprites/wuffi_engel.png',
  './assets/sprites/wuffi_erwachsen.png',
  './assets/sprites/wuffi_erwachsen_schlaf.png',
  './assets/sprites/wuffi_erwachsen_wuetend.png',
  './assets/sprites/wuffi_kind.png',
  './assets/sprites/wuffi_kind_schlaf.png',
  './assets/sprites/wuffi_kind_wuetend.png',
  './assets/sprites/wuffi_senior.png',
  './assets/sprites/wuffi_senior_schlaf.png',
  './assets/sprites/wuffi_senior_wuetend.png',
  './assets/sprites/wuffi_teen.png',
  './assets/sprites/wuffi_teen_schlaf.png',
  './assets/sprites/wuffi_teen_wuetend.png'
];

self.addEventListener('install', (e) => {
  // Robustes Vorladen: Statt cache.addAll() (atomar - EINE fehlgeschlagene
  // Datei laesst die GESAMTE Installation scheitern und nichts wird gecacht)
  // werden die Dateien EINZELN geladen. So bleibt die App auch dann offline
  // nutzbar, wenn mal eine Ressource kurz nicht erreichbar war. Der Fortschritt
  // wird an alle offenen Seiten gemeldet, damit der Preloader ihn anzeigen kann.
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const total = ASSETS.length;
    let done = 0;

    async function postProgress() {
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'cache-progress', done, total });
      }
    }

    // In kleinen Gruppen parallel laden - schneller als seriell, aber schonend.
    const BATCH = 12;
    for (let i = 0; i < total; i += BATCH) {
      const slice = ASSETS.slice(i, i + BATCH);
      await Promise.all(slice.map(async (url) => {
        try {
          // cache: 'reload' erzwingt frische Kopien statt evtl. veralteter
          // Browser-HTTP-Cache-Eintraege.
          const res = await fetch(new Request(url, { cache: 'reload' }));
          if (res && (res.ok || res.type === 'opaque')) {
            await cache.put(url, res);
          }
        } catch (err) {
          // Einzelne Fehlschlaege werden toleriert - die Datei wird spaeter
          // beim ersten Zugriff nachgeladen (siehe fetch-Handler).
        }
        done++;
      }));
      await postProgress();
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Die Seite kann fragen, wie viele der ASSETS bereits im Cache liegen.
// Damit weiss der Preloader auch bei einem schon halb gefuellten Cache
// (z.B. zweiter Start waehrend der Installation) den echten Stand.
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'query-cache') return;
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    const port = e.ports && e.ports[0];
    const payload = { type: 'cache-status', done: keys.length, total: ASSETS.length };
    if (port) port.postMessage(payload);
    else {
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of clients) client.postMessage(payload);
    }
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Seitenaufrufe: erst Netz (fuer Updates), sonst Cache. So bleibt die App
  // offline startfaehig, holt online aber neue Versionen.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
