# Deploying changes to WikiTrail

## tl;dr

Changed any file in this directory? Bump the cache version in `sw.js` before
you push:

```js
// sw.js
const CACHE_NAME = "wikirace-v6";   // <-- bump this, e.g. to "wikirace-v7"
```

That's the only "version number" involved. GitHub Pages itself needs no
version bump of any kind — it just serves whatever's in the repo. The
version string exists purely for the service worker (`sw.js`), explained
below.

## Why this is necessary

`sw.js` caches the entire app shell — `index.html`, `app.js`, `ui.js`,
`styles.css`, `manifest.json`, both icons (see the `SHELL` array in
`sw.js`) — and serves it **cache-first**:

```js
event.respondWith(
  caches.match(event.request).then(cached => cached || fetch(event.request))
);
```

Once a browser has loaded the app and the service worker has installed,
every one of those files is served from the cache, full stop — the browser
won't even check the network for a newer version. Pushing new code to
GitHub Pages changes what's on the *server*, but anyone who already has the
app open or installed keeps getting the *old* cached files forever, until
something tells the service worker to throw its cache away.

That "something" is `CACHE_NAME`. The install/activate lifecycle in
`sw.js` deletes any cache whose name doesn't match the current
`CACHE_NAME` and re-fetches everything fresh:

```js
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
```

So bumping the string (`wikirace-v6` → `wikirace-v7`, any change works —
it's just a cache key, not a semver) is what actually makes a deploy
"count." Skip it and your change is live on the server but invisible to
anyone who's already used the app.

`skipWaiting()` + `clients.claim()` are already in place, so once a device
*does* notice the new service worker, it takes over immediately — no
waiting for every tab to close first. The remaining friction is just
getting the device to notice in the first place (see Troubleshooting).

## Deploy checklist

1. **Test locally first.** From this directory:
   ```bash
   python3 -m http.server 8731
   ```
   Open `http://localhost:8731` and check your change actually works —
   service workers won't register here (plain HTTP, non-localhost origins
   aren't a secure context), so this step only verifies app logic, not
   caching behavior.

2. **Did you change any file in this directory?** If yes, bump
   `CACHE_NAME` in `sw.js`. There's no file that's exempt — `index.html`,
   `app.js`, `ui.js`, `styles.css`, `manifest.json`, and the icons are all
   in `SHELL`, so a change to any one of them needs the bump. When in
   doubt, bump it — there's no downside beyond one extra fetch of
   already-current files.

3. Commit and push to `main` as usual. GitHub Pages rebuilds automatically,
   usually within a minute or so.

4. **Give it a few minutes**, then reload on a device that's used the app
   before. If the change doesn't appear, see Troubleshooting below before
   assuming the deploy failed.

## Verifying it actually landed

On a device/browser where you can open developer tools (not needed for
iOS Safari testing — see below):

- **Application → Service Workers**: confirms a worker is registered and
  which one is active.
- **Application → Cache Storage**: should show exactly one cache named
  after your current `CACHE_NAME` — if you see an old version's name
  still sitting there, the new worker hasn't activated yet.

On iOS Safari (no devtools without a Mac to inspect from), just reload and
check the behavior itself, using Troubleshooting below if it looks stale.

## Troubleshooting a device that still shows old behavior

Roughly in order of how often each one is actually the culprit:

1. **You forgot to bump `CACHE_NAME`.** By far the most common cause —
   double check `sw.js` before anything else.
2. **Give it a moment.** The browser checks for a new service worker
   script on navigation, but not instantly on every single load — a
   reload or two is sometimes needed before it notices.
3. **Fully close and reopen.** On an installed PWA (Added to Home Screen),
   swipe it away in the app switcher, don't just background it, then
   reopen. A browser tab just needs a normal reload.
4. **Nuclear option — clear site data.** iOS: Settings → Safari →
   Advanced → Website Data → find the site → delete. This wipes the
   service worker *and* local storage for the site, so game history goes
   with it (see below) — use this only if 1–3 don't resolve it.

## Your game data is safe across all of this

The player-data storage key (`wikirace-data` in `localStorage`) is
completely independent of `CACHE_NAME` — bumping the cache version never
touches it, and it survives every deploy. The only thing that clears it is
the "nuclear option" above (clearing all site data) or using the app's own
"Clear history" button.
