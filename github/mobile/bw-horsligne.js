/* BlueWavea — fonctionnement hors connexion.
   L'application est servie par GitHub Pages : sans ce fichier, aucun réseau = page
   impossible à ouvrir. Ici, tout le nécessaire est mis en cache au premier lancement,
   puis servi depuis l'appareil. Les données restent enregistrées en local et
   remontent au cloud dès le retour du réseau. */
var CACHE = 'bluewavea-v3';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(['./', './index.html', './manifest.json']).catch(function () {});
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (noms) {
    return Promise.all(noms.map(function (n) { return n === CACHE ? null : caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var url = new URL(r.url);
  /* Le cloud et les services d'envoi passent toujours par le réseau :
     jamais de réponse en cache pour eux. */
  if (/supabase|brevo|googleapis|gstatic/.test(url.hostname)) return;

  /* Page : réseau d'abord (pour avoir la dernière version), cache en secours. */
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(function (rep) {
        var copie = rep.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copie); });
        return rep;
      }).catch(function () {
        return caches.match('./index.html').then(function (m) { return m || caches.match('./'); });
      })
    );
    return;
  }

  /* Ressources : RÉSEAU d'abord, cache en secours. Le cache ne doit jamais figer une
     version périmée de l'application ; il ne sert que hors connexion. */
  e.respondWith(
    fetch(r).then(function (rep) {
      /* les bibliothèques chargées depuis un CDN (réponses « opaques ») sont aussi gardées :
         sans elles, l'application ne démarre pas hors connexion */
      if (rep && (rep.status === 200 || rep.type === 'opaque')) {
        var copie = rep.clone();
        caches.open(CACHE).then(function (c) { c.put(r, copie); });
      }
      return rep;
    }).catch(function () { return caches.match(r); })
  );
});
