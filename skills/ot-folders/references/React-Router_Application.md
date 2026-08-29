# React Router Applications

Reproduce with `tree -L 2 -I 'node_modules|dist|build|__generated__' applications/openthrottle-developer`.

The four React Router applications — `openthrottle-developer`, `openthrottle-admin`,
`openthrottle-email`, `openthrottle-website` — all share this shape.

```bash
applications/openthrottle-developer
├── app                       # All application source lives here
│   ├── docs-content            # Authored markdown served by the app
│   ├── entry.client.tsx        # Client hydration entrypoint — rarely edited
│   ├── entry.server.tsx        # SSR entrypoint — rarely edited
│   ├── global                  # Code used by 2+ route areas in THIS app
│   ├── root.tsx                # Root layout, providers, <html> shell
│   ├── root.tsx.graphql        # Root-level GraphQL document
│   ├── routes                  # Route modules ONLY — see the export surface below
│   ├── routes.ts               # The route table; every route module is registered here
│   ├── routing                 # One folder per route area — where most code goes
│   ├── services                # App-level clients and side-effectful singletons
│   ├── styles.css              # Global stylesheet
│   ├── testing                 # App-wide test helpers and fixtures
│   └── types                   # App-wide shared types
├── apollo.config.mjs         # Apollo tooling config
├── codegen.ts                # GraphQL codegen config (defineCodegen)
├── docs                      # Design notes for this app
├── eslint.config.ts          # Per-app lint config — where a rule ratchets to `error`
├── package.json
├── postcss.config.mjs
├── public                    # Served statically from the root
│   ├── favicon.ico
│   ├── manifest.json           # Every React Router app here is a PWA
│   └── worker.js               # Service worker
├── react-router.config.ts    # Framework config
├── tests
│   ├── e2e                     # Maestro end-to-end flows
│   └── setup.ts                # ONE setupReactRouterTest() call — do not re-add shims
├── tsconfig.json
├── vercel.json
├── vite.config.ts
└── vitest.config.ts
```

## `app/routing/<area>/` — the part that matters

Most code you write lands here. Each area carries the same eight folders; the
generator creates them all, and empty ones keep a `.gitkeep`.

```bash
app/routing/plans
├── actions       # React Router actions for this area
├── components    # Components used by this area only
├── config        # Defaults, constants, service config
├── data          # Mock or hard-coded data
├── hooks         # Composed state + logic
├── testing       # Test helpers and fixtures for this area
├── types         # Types for this area
├── types.ts      # ...or a single sibling file when there is little to say
└── utils         # Pure functions, bucketed by theme
```

Areas are flat and named for the product surface, not the URL:
`agent-search agents auth calendar dashboard docs faq generators home ide legal
navigation notes personas plans profile projects prompts pull-requests queues
rules schedule search settings skills usage`.

## `app/global/` — promoted, not pre-emptive

```bash
app/global
├── components
├── config
├── data
├── hooks
└── utils
```

Only five folders. There is **no** `app/global/actions/`, `testing/`, or `types/` —
actions belong to an area, app-wide test helpers live in `app/testing/`, and
app-wide types in `app/types/`.

Code moves here when a **second** route area needs it, never in anticipation.

## `app/routes/` — route modules only

A file under `app/routes/` may export only the React Router surface
(`loader`, `action`, `meta`, `links`, `ErrorBoundary`, …) plus its default
component. Anything else — a helper, a constant, a schema — must hoist to
`~/routing/<area>/{utils,config,data,hooks}`. See `references/Enforcement.md`
for the full allowed-export list and the rule that enforces it.
