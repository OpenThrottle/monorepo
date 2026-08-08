# Commander and search entry points (openthrottle-developer)

This note traces how the OpenThrottle command palette and workspace search work today, so header search can reuse the same flows without duplicating commander logic in `@openthrottle/react-router-ui-global`.

## Shared UI: `OpenThrottleCommander`

**Package:** `@openthrottle/react-router-ui` (`packages/react-router-ui/src/components/OpenThrottleCommander.tsx`)

**Responsibilities**

- Renders a `CommandDialog` with `CommandInput`, grouped `CommandItem`s, empty-state extras, and optional “Search for …” escape row.
- **Open:** global `window` `keydown` listener — **⌘K** (macOS) or **Ctrl+K** (Windows/Linux) calls `setOpen(true)`. There is no separate “commander context”; open/close is internal unless the parent passes controlled `open` / `onOpenChange`.
- **Close:** choosing an item runs `onSelect` then `setOpen(false)`; **Escape** when open prevents default and closes; dialog `onOpenChange` propagates Radix dismissals.
- **Query:** local React state `search`; cleared whenever the dialog opens (`useEffect` on `open`).
- **Empty state:** when `onEmptyStateSearch` is set and the trimmed query is non-empty, shows a forced `CommandGroup` with `emptyStateExtras(query)` items plus a “Search for …” row that calls `onEmptyStateSearch(trimmed)` then closes.

**What should stay generic (shared package)**

- Dialog chrome, keyboard shortcut to open, filtering UX, empty/extras rendering contract (`emptyStateExtras`, `onEmptyStateSearch`).
- Types: `CommanderItem`, `CommanderGroup`, `OpenThrottleCommanderProps`.

**What must not be embedded in the shared package**

- Developer routes, GraphQL, `commander-search` intent, or `useNavigate` targets — those are app data.

## App shell: `applications/openthrottle-developer/app/root.tsx`

**Mounting**

- `OpenThrottleCommander` is a sibling under `GlobalLayout` with the same chrome as routes (`<Outlet />` is between header and commander in the tree; commander overlays visually).
- `GlobalLayoutHeader` is rendered without props when the header is shown (hidden on `/auth`, `/prompts/*`).

**Commander props wired from the app**

| Prop                                             | Source                  | Role                                                                                        |
| ------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------- |
| `groups`                                         | `useCommanderOptions()` | Navigation + Actions items (`useNavigate` per item).                                        |
| `onEmptyStateSearch`                             | `handleSearch`          | Trims query and calls `submitCommanderSearch({ q })`.                                       |
| `emptyStateExtras`                               | `commanderEmptyExtras`  | Delegates to `buildCommanderEmptyStateExtras` from `~/global/utils/commander-empty-extras`. |
| `emptyStateMessage`, `footerHint`, `placeholder` | Inline JSX / strings    | Product copy and hints (reference root `action` for POST behavior).                         |

**No controlled `open` / `onOpenChange`** — the single commander instance uses **uncontrolled** internal state (`defaultOpen` false). Any future header trigger must open this same instance (controlled state lifted to `App`, or an imperative/event bridge), not mount a second palette.

## App-specific data: `useCommanderOptions`

**File:** `app/global/hooks/useCommanderOptions.tsx`

- Returns static **Navigation** and **Actions** `CommanderGroup[]` with icons and `onSelect` handlers that call `navigate('/…')`.
- Entirely developer-app routing knowledge; other apps would supply their own hook or static groups.

## App-specific empty rows: `commander-empty-extras`

**File:** `app/global/utils/commander-empty-extras.tsx`

- **`CommanderSearchFields`** — shape for POST body fields (excluding `intent`): optional `jump`, `id`, `id2`, `q`.
- **`buildCommanderEmptyStateExtras(query, { submitCommanderSearch })`** — when the palette filter matches no static commands but the user typed something:
  - Two UUIDs (slash or space) → queue job + plan task jump rows.
  - Single UUID → plan, queue, generator detail rows + workspace search row (all via `submit`).
  - Non-UUID text → browse shortcuts (plans / queues / generators index).
- **`parseQueueAndJobIdsFromCommanderQuery`** — shared parsing for action fallback when `jump` is `queue-job` or `plan-task` but ids were omitted (derive from `q`).

## Root route `action`: `intent === 'commander-search'`

**File:** `app/root.tsx` (`export const action`)

- **Transport:** `App` uses `useFetcher()`; `submitCommanderSearch` builds `FormData`-like body `{ intent: 'commander-search', … }` and `fetcher.submit(body, { method: 'post' })` (no `?index` — targets root action).
- **Behavior:** interprets `jump` + `id` / `id2` / `q` and returns `redirect(...)` to app paths (`/plans`, `/queues`, `/generators`, detail URLs, `queueJobDetailPath`, `/search?q=…`).
- **Default path:** plain search submits end as `redirect(\`/search?q=${encodeURIComponent(query)}\`)` when no jump branch matches.

This is the **single server-side switch** for “commander drove navigation or full-text search”; the search **page** does not POST here for normal GET search.

## Search route: `/search`

**Route module:** `app/routes/search._index.tsx`

- **Loader:** reads `q`, pagination, and `details` from URL (`parseSearchParams`), runs `GetSearchResultsDocument` when `q` is non-empty, returns chunks + metadata.
- **UI:** `SearchForm` (GET `action="/search"`, `method="get"`, input `name="q"`) and `SearchFilters`; results via `SearchCard` and `OpenThrottlePagination` with `basePath="/search"`.

**File:** `app/routing/search/components/SearchForm.tsx`

- Client-controlled input synced from `defaultQuery` prop (URL-derived on the page).

**Relationship to commander**

- Commander’s `onEmptyStateSearch` and many `emptyStateExtras` rows ultimately hit the same **`/search?q=…`** destination** as submitting `SearchForm`, but via **root POST\*\* + redirect instead of GET navigation.
- Equivalence for “run search with query string Q”: `GET /search?q=Q` vs POST `intent=commander-search` with `q=Q` (plus optional `jump` / ids for other redirects).

## Global header search (current gap)

**Package:** `@openthrottle/react-router-ui-global` — `GlobalLayoutHeader.tsx`

- Renders a bare `<Input placeholder="Search" type="search" />` with **no** `value`, handlers, or `form` — **inert** for all consumers (e.g. `openthrottle-admin` uses the same component).

**Not used for search today:** `GlobalSearch.tsx` is a stub placeholder (“GlobalSearch” heading only).

## Boundaries for the header work (next tasks)

| Concern                       | Recommended home                                                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open commander / seed query   | Developer `App` (or thin provider), same instance as `OpenThrottleCommander` — avoid a second cmdk tree.                                                                                                    |
| Navigate to `/search`         | React Router `useNavigate` / `<Link>` / GET form from the app or header callback — no new commander logic in `react-router-ui-global`.                                                                      |
| POST `commander-search`       | Stay in developer `root` action + `submitCommanderSearch`; shared header should not import GraphQL or intent strings.                                                                                       |
| Visual search field in chrome | Extend `GlobalLayoutHeader` (or a thin wrapper export) with **optional** props only: e.g. `onSearchIntent`, `searchPlaceholder`, controlled `searchValue` — **no** commander imports in the global package. |

## API design decision: GlobalLayoutHeader search (plan task)

**Options considered**

- **(a)** Optional app callback / context only — opens commander (with optional seed) from chrome; no route involvement on focus.
- **(b)** Navigate to `/search` on submit (or focus-with-intent) — keeps all query handling on the search route; no palette on focus.
- **(c) Hybrid** — chrome delegates **engage** vs **submit** to the app; app chooses commander open, GET search, or POST `commander-search`.

**Decision: (c) Hybrid**, implemented as **neutral, optional props** on `GlobalLayoutHeader` (no commander types, no `commander-search`, no routes in `@openthrottle/react-router-ui-global`).

**Recommended contract (shared package)**

- Add an optional discriminated callback, e.g. `onSearchChromeEvent?: (event: GlobalLayoutHeaderSearchEvent) => void` with:
  - `{ type: 'engage' }` — user moved into the chrome search control (e.g. focus or click; exact mapping is an implementation detail in the next task) so the **app** can open the single `OpenThrottleCommander` instance (`open` / `onOpenChange` lifted to `App` where needed).
  - `{ type: 'submit'; query: string }` — user committed a non-empty query (e.g. Enter on a wrapped field or form submit). The **app** decides: `navigate('/search?q=…')` for “defer to search route directly”, or `submitCommanderSearch({ q })` for parity with commander’s empty-state / “Search for …” POST + redirect (including future `jump` / id behavior if you ever thread it from chrome).
- Optional `searchPlaceholder`, and optional controlled or uncontrolled **draft** value props for the visible `<Input>` so the header can show typing before submit without the package knowing why.
- **Default:** when `onSearchChromeEvent` (or the chosen prop name) is omitted, behavior stays **inert** — `openthrottle-admin` and other consumers unchanged.

**Why not (a) or (b) alone**

- **(a) alone** does not satisfy “defer to the search route directly” for Enter/submit without bolting navigation into the shared package.
- **(b) alone** forces every product to use `/search` semantics and does not launch the existing palette from chrome on engage, which conflicts with “same flow as root / search route” interpreted as **same commander + search system**, not only GET navigation.

**Boundaries**

| Layer                                     | Responsibility                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-router-ui-global`                  | Present chrome input + optional `onSearchChromeEvent` / placeholder / value props only.                                                                                                                                                                                                                                                           |
| `openthrottle-developer` `App`            | Wire events to **one** `OpenThrottleCommander` (`open` state) and/or `useNavigate` / `submitCommanderSearch`.                                                                                                                                                                                                                                     |
| `react-router-ui` `OpenThrottleCommander` | Palette UX and ⌘K; today it **clears** internal `search` whenever `open` becomes `true`. Carrying a **seed query** from the header into the dialog likely needs a small follow-up there (e.g. optional initial query when opening from outside, or parent-controlled query) — track in the implementation task, not in the global header package. |

---

_Last updated for plan “Trigger commander from GlobalLayoutHeader search” (documentation + API design tasks)._

---

## Short-UUID plan detection (⌘K quick redirect)

Typing a short leading hex fragment of a plan id (e.g. `f5e40886`) into the
palette resolves it to the real plan and offers a confident one-keystroke
redirect to `/plans/<full-id>`. Full UUIDs, `queueId/jobId` pairs, and
plan-task pairs keep their existing behavior.

**How it is wired in `openthrottle-developer`**

1. Server: `resolvePlanRef(prefix: String!): [PlanRefObject!]!` (openthrottle-server
   `PlansResolver`) normalizes the prefix (trim/lowercase/strip hyphens),
   short-circuits to `[]` below 6 hex chars or on non-hex input, and matches
   `REPLACE(id::text,'-','') ILIKE :pattern` (bounded, `updatedAt DESC`, top 6).
2. Client transport: `/resources/resolve-plan-ref?prefix=<hex>` — a loader-only
   resource route that calls `resolvePlanRef` via `executeGraphqlWithAuth`
   (client GraphQL is server-only) and echoes the normalized prefix.
3. `root.tsx` observes the palette query via `OpenThrottleCommander`'s
   `onSearchChange`, feeds it to the debounced `usePlanRefResolver`
   (`@openthrottle/react-router-ui`), and passes matches to
   `buildCommanderEmptyStateExtras`.

**Reusing in another app (e.g. `openthrottle-admin`)**

The recognition + resolution logic is factored into shared packages so any app
that hosts `OpenThrottleCommander` can adopt it without re-implementing a
full-UUID gate:

- `@openthrottle/react-router-utils` — `classifyIdInput` / `isShortIdFragment` /
  `normalizeIdFragment` / `REGEX_UUID` / `MIN_ID_FRAGMENT_LENGTH`.
- `@openthrottle/react-router-ui` — `usePlanRefResolver` hook +
  `PlanRefMatch` / `PlanRefResolverData` types, and the `onSearchChange` prop.

To adopt: author a `resolvePlanRef` GraphQL document + a
`/resources/resolve-plan-ref` loader in that app (copy the developer app's
route), then wire `onSearchChange` → `usePlanRefResolver` → the app's commander
empty-state builder. As of this plan, **`openthrottle-developer` is the only
app that renders `OpenThrottleCommander`**; `openthrottle-admin` has no command
palette yet, so there is nothing to wire there until it gains one — the shared
pieces above are the entire adoption surface when it does.

_Short-UUID detection added by plan “Commander: short-UUID plan detection + quick redirect”._
