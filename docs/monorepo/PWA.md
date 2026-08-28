# 📱 Progressive Web App (PWA)

**Every React Router app in this repo is already a PWA.** All four —
`openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`,
`openthrottle-website` — ship a web app manifest and a service worker, and the
`react-router` **application** generator template ships both, so any app scaffolded
from it is installable by default. There is no `vite-plugin-pwa` and no build-time
PWA plugin: the wiring is three plain files you can read.

---

## 1. What each app ships

| File                   | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `public/manifest.json` | Web app manifest — name, icons, `display: standalone`, theme colors     |
| `public/worker.js`     | Service worker — a small cache-first shim for static assets             |
| `app/root.tsx`         | Emits `<link rel="manifest" href="/manifest.json" />` in `<head>`       |
| `app/entry.client.tsx` | Registers `/worker.js` on `window.load`; swallows `beforeinstallprompt` |

Reference implementation:
[`applications/openthrottle-developer/app/entry.client.tsx`](../../applications/openthrottle-developer/app/entry.client.tsx) —
registration lives at the bottom of the file, guarded by `'serviceWorker' in navigator`.

The `beforeinstallprompt` handler calls `preventDefault()` so the browser's own
mini-infobar never appears. Nothing stores the deferred event today, so **there is
currently no in-app install button** — the prompt is suppressed, not re-surfaced. If
you want an install affordance, stash the event there and trigger it from your own UI.

## 2. Where the generator template lives

```bash
tools/generators/src/generators/react-router/files/application/
├── app/entry.client.tsx            # service-worker registration
└── public/
    ├── branding/icon-{48,96,144,192,256,384,512}.png
    ├── manifest.json               # <%= name %> interpolated
    └── worker.js
```

Scaffolding a new app with
`NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --subGenerator=application …`
copies all of it, so a new app is installable with no extra work. See
[AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md) and
[react-router.md](../tools/templates/react-router.md).

## 3. Icons: template-local vs CDN

The template (and `openthrottle-admin`) point at repo-local
`/branding/icon-<size>.png` under `public/branding/`. `openthrottle-developer`,
`openthrottle-email`, and `openthrottle-website` instead point at absolute GCS URLs
under `monorepo-production-assets/OpenThrottle/branding/icons/<color>/` — blue for
developer, yellow for email, red for website — so the per-app accent color comes from
the CDN rather than from checked-in assets.

Both are valid. Prefer the CDN set for a branded app; keep the local set if the app
must install while offline or you do not want a CDN dependency in the manifest.

Each manifest declares `purpose: "any"` at every size plus `any maskable` at 256 and
512, which is what Android needs for adaptive icons.

## 4. `shortcuts: []`

Every manifest carries an empty `shortcuts` array. It is a deliberate placeholder —
app shortcuts are the long-press / right-click jump list on an installed PWA. Fill it
in per app when there is a route worth jumping straight to:

```json
"shortcuts": [
  {
    "description": "View your profile",
    "icons": [{ "sizes": "192x192", "src": "/branding/icon-192.png" }],
    "name": "Profile",
    "short_name": "Profile",
    "url": "/profile"
  }
]
```

## 5. What the service worker actually does

`public/worker.js` is byte-identical across all four apps and the generator template.
It intercepts `fetch`, ignores everything that is not a `GET`, and for a small set of
path prefixes serves from a `caches.open('assets')` cache, falling back to the network
and populating the cache on a miss. Everything else falls through to the network
untouched — there is **no offline shell and no navigation caching**.

> ⚠️ The cached prefixes are `/favicons/`, `/fonts/`, and `/build/` — inherited from the
> Remix-era article the worker is adapted from. Confirm those still match this app's
> emitted asset paths before relying on the cache; if the build emits elsewhere, the
> worker is effectively a no-op pass-through. Widening it is a one-line change, but
> think about cache invalidation first: entries are keyed by request with no version
> or expiry, so only content-hashed filenames are safe to cache this way.

Because the worker is a static file in `public/`, an updated `worker.js` only reaches
users on the browser's own update check. There is no skip-waiting or update-prompt
logic wired up.

## 6. Regenerating icons and splash screens

Android derives splash screens from the manifest automatically; iOS and iPadOS do not
and need static `<link>` images. `pwa-asset-generator` produces both from one source
image:

```bash
npx pwa-asset-generator ./public/branding/logo-large.png ./public/branding/splash/ \
  --background "#ffffff" \
  --manifest ./public/manifest.json \
  --padding "calc(40vh - 5%) calc(40vw - 10%)" \
  --path-override "/branding/splash" \
  --quality 85
```

Note that no app currently checks in a `public/branding/splash/` directory, so this is
the command to reach for **when adding** splash screens, not one to re-run to refresh
existing output.

## 7. Further reading

- [Installation prompt](https://web.dev/learn/pwa/installation-prompt)
- [Updating a PWA](https://web.dev/learn/pwa/update)
- [App shortcuts](https://web.dev/learn/pwa/enhancements/#app-shortcuts)
- [Protocol handlers](https://developer.chrome.com/articles/url-protocol-handler)
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [Using service workers with Remix](https://sergiodxa.com/articles/using-service-workers-with-remix) — the source `worker.js` is adapted from
