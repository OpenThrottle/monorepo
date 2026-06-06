# openthrottle-email: Web Email Client Architecture

High-level architecture for the web-based email client in **openthrottle-email** (React Router, flat routes). All new routes and components must be scaffolded via **@tools/generators**; all UI must use the monorepo **shadcn-ui** package (`@openthrottle/react-router-shadcn`).

**Caveat:** Do not remove code comments (markers) in generated or existing files when implementing functionality—leave them in place to support future iteration.

---

## 1. Route tree (flat routes)

The app uses **React Router v7** with **flat file-based routes** (`@react-router/fs-routes`). Route files live under `applications/openthrottle-email/app/routes/`.

| Route file(s)         | Path         | Purpose                                                         |
| --------------------- | ------------ | --------------------------------------------------------------- |
| `_index.tsx`          | `/`          | Inbox (default view). May be renamed or kept as index.          |
| `inbox._index.tsx`    | `/inbox`     | Optional explicit inbox index (if `/` is reserved for landing). |
| `inbox.$id.tsx`       | `/inbox/:id` | Single message/thread detail.                                   |
| `compose.tsx`         | `/compose`   | New message form.                                               |
| `sent._index.tsx`     | `/sent`      | Sent folder list.                                               |
| `drafts._index.tsx`   | `/drafts`    | Drafts folder list.                                             |
| `trash._index.tsx`    | `/trash`     | Trash folder list.                                              |
| `settings._index.tsx` | `/settings`  | Settings (already exists).                                      |

**Generator:** Use **@tools/generators:remix** with `--subGenerator=route`, `--application=openthrottle-email`, and `--name=<routeName>` (e.g. `inbox._index`, `inbox.$id`, `compose`, `sent._index`, `drafts._index`, `trash._index`). Run one invocation per route or comma-separated names where the generator allows. Skip or adjust if a route already exists (e.g. `_index` for inbox).

---

## 2. Layout strategy

- **Mail chrome:** A **mail-area layout** wraps all mail routes (inbox, compose, sent, drafts, trash) and provides:
  - A **sidebar** for folder/navigation (Inbox, Sent, Drafts, Trash, Compose, Settings).
  - A **main content area** that renders the current route via React Router’s **`<Outlet />`**.

- **Implementation options:**
  1. **Layout component (recommended):** A **MailLayout** component (sidebar + `<Outlet />`) is used by each mail route page. No layout route file is required; each route renders `<MailLayout><Outlet /></MailLayout>` or the route component itself includes `<MailLayout>` and renders its content in the main area. Easiest to adopt with existing flat routes.
  2. **Layout route:** A pathless layout route (e.g. `_layout.mail.tsx`) with `<Outlet />` and child route files (e.g. `_layout.mail.inbox._index.tsx`) under the same layout. Requires organizing route file names to match the flat route convention.

- **Recommendation:** Use the **layout component** approach: **MailLayout** (and **MailSidebar**) are built with **@tools/generators:remix** (`--subGenerator=component`). Mail routes then wrap their content with `<MailLayout>` so the sidebar and chrome appear on inbox, compose, sent, drafts, and trash. Settings can use the same layout or the existing root layout, as desired.

- **Implementation (chosen):** A **pathless layout route** `_layout.mail.tsx` renders **MailLayout** with `<Outlet />`. Child routes are named `_layout.mail._index.tsx` (inbox at `/`), `_layout.mail.compose.tsx`, and so on. This way all mail routes automatically render inside the mail chrome (sidebar + main) without each route wrapping itself. The root `_index.tsx` was removed so `/` is served only by the mail layout’s index (inbox).

- **UI:** Sidebar and layout chrome use components from **@openthrottle/react-router-shadcn** (e.g. `SidebarProvider`, `Sidebar`, `SidebarInset`, `SidebarMenu`, `SidebarMenuButton`).

---

## 3. Routing folder structure (organize route-specific code)

Use **@tools/generators:folders** to create routing folders under `app/routing/` for organizing route-specific components and assets:

- **Folders to create:** `inbox`, `compose`, `sent`, `drafts`, `trash`.

**Generator command pattern:**

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:folders \
  --application=openthrottle-email \
  --folder=routing \
  --name=<slug>
```

Run once per slug: `inbox`, `compose`, `sent`, `drafts`, `trash`. This creates `app/routing/<name>/` under openthrottle-email for route-specific components (e.g. `routing/inbox/components/MessageList.tsx`).

---

## 4. Components to generate (remix generator)

All components must be scaffolded with **@tools/generators:remix** (`--subGenerator=component`), then customized. Use **@openthrottle/react-router-shadcn** for all UI (tables, cards, forms, navigation, etc.).

**Generator command pattern:**

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:remix \
  --subGenerator=component \
  --application=openthrottle-email \
  --folder=<folder> \
  --name=<ComponentName>
```

Discover valid `--folder` values:

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:remix \
  --list=componentFolders \
  --application=openthrottle-email
```

After creating new `app/routing/<name>/` folders (via the folders generator), re-run `--list=componentFolders` to get updated folders (e.g. `routing/inbox/components`).

| Component                | Suggested folder                                            | Purpose                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **MailLayout**           | `global/components` or `routing`                            | Layout wrapper: MailSidebar + main area with `<Outlet />`.                                                                                |
| **MailSidebar**          | `global/components` or `routing`                            | Sidebar nav (Inbox, Sent, Drafts, Trash, Compose, Settings); optional folder unread badges; "Folders" group placeholder for user folders. |
| **MoveToFolderDropdown** | `global/components`                                         | "Move to folder" submenu for reading pane and list bulk actions; lists folders, calls onSelect for API wiring.                            |
| **MessageList**          | `routing/inbox/components`                                  | List of messages/threads for inbox (and optionally sent/drafts/trash).                                                                    |
| **MessageDetail**        | `routing/inbox/components`                                  | Single message/thread view.                                                                                                               |
| **ComposeForm**          | `routing/compose/components` (or use `--subGenerator=form`) | New-message form. Use remix **form** generator if preferred: `--subGenerator=form`, `--name=ComposeForm`.                                 |

**Forms/tables:** For ComposeForm, use either `--subGenerator=form` or `--subGenerator=component`; for list UIs (e.g. message list table), use **@tools/generators:remix** `--subGenerator=table` if a table generator exists and fits, or a **component** (e.g. MessageList) built with shadcn-ui Table/Card primitives.

---

## 5. Navigation data and wiring

- **Navigation links:** **`app/global/data/data.navigation.ts`** defines **mailNavigation** with **Inbox**, **Sent**, **Drafts**, **Trash**, **Compose**, **Settings** (paths: `/`, `/sent`, `/drafts`, `/trash`, `/compose`, `/settings`). **dataNavigation** (used by **GlobalHeader**) is derived from **mailNavigation** so header and sidebar stay in sync. **Navigation structure:** Primary mail navigation is the sidebar only; see **`applications/openthrottle-email/docs/NAVIGATION_STRUCTURE.md`** for the evaluation (unified vs dual) and recommendations.
- **Layout wiring:** **MailLayout** and **MailSidebar** are wired via the pathless layout route **`_layout.mail.tsx`**: it renders **MailLayout** with **`<Outlet />`**. All mail routes are children of this layout (`_layout.mail._index.tsx`, `_layout.mail.compose.tsx`, `_layout.mail.sent.tsx`, `_layout.mail.drafts.tsx`, `_layout.mail.trash.tsx`, `_layout.mail.inbox.$id.tsx`), so they automatically render inside the mail chrome (sidebar + main). **MailSidebar** uses **mailNavigation** and shadcn-ui **Sidebar** / **SidebarMenu** / **SidebarMenuButton** for navigation.

---

## 6. Generator reference summary

| Generator                               | Purpose                               | Key options                                                                                          |
| --------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **@tools/generators:folders**           | Create `app/routing/<name>/`          | `--application=openthrottle-email`, `--folder=routing`, `--name=<slug>`                              |
| **@tools/generators:remix** (route)     | Create route modules in `app/routes/` | `--subGenerator=route`, `--application=openthrottle-email`, `--name=<routeName>`                     |
| **@tools/generators:remix** (component) | Create components                     | `--subGenerator=component`, `--application=openthrottle-email`, `--folder=<folder>`, `--name=<Name>` |
| **@tools/generators:remix** (form)      | Create forms                          | `--subGenerator=form`, `--application=openthrottle-email`, `--folder=<folder>`, `--name=<FormName>`  |
| **@tools/generators:remix** (table)     | Create tables                         | `--subGenerator=table`, same application/folder/name pattern if supported                            |

Always prefix with **`NX_ISOLATE_PLUGINS=false`**. Discover schemas and dynamic values with `--describe` and `--list=<key>` (e.g. `--list=applications`, `--list=componentFolders --application=openthrottle-email`). See **docs/tools/templates/AGENT_USAGE.md** for full workflow.

---

## 7. UI dependency

- **All UI:** Use the monorepo package **`@openthrottle/react-router-shadcn`** for buttons, forms, tables, cards, navigation, and layout. Add this dependency to **openthrottle-email** if not already present.

---

## 8. Environment variables and URLs (`APP_*`)

Use **`@openthrottle/react-router-utils`** as the single source of truth for names and runtime access. Production apps resolve values from **`process.env`** on the server and from **`window.env`** in the browser (injected in **`app/root.tsx`** as serialized JSON).

### Canonical names (align with the package)

The **`OpenThrottleEnv`** / **`OpenThrottleClientEnv`** types in **`packages/openthrottle/react-router-utils/src/types.ts`** define the full shape. Shared constants such as **`APP_URL`**, **`APP_NAME`**, **`APP_ENV`**, **`APP_VERSION`**, and sibling-app URLs are exported from **`packages/openthrottle/react-router-utils/src/config/application.ts`** (backed by **`ENV_SOURCE`** in **`config/environment.ts`**).

| Category                  | Variables (names only)                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| This app                  | `APP_ENV`, `APP_NAME`, `APP_URL`, `APP_VERSION`                                                           |
| Sibling OpenThrottle apps | `APP_URL_ADMIN`, `APP_URL_CMS`, `APP_URL_DEVELOPER`, `APP_URL_EMAIL`, `APP_URL_SERVER`, `APP_URL_WEBSITE` |
| API / infra               | `API_URL`, `NODE_ENV`, `ROLLBAR_TOKEN`                                                                    |

In TypeScript, prefer **`import { APP_URL, … } from '@openthrottle/react-router-utils'`** (or **`IS_PRODUCTION`**, **`OPEN_THROTTLE_*`**, etc.) instead of hardcoding URLs or inventing new `APP_*` names.

### openthrottle-email locally

Example values for this app live in **`applications/openthrottle-email/.env.default`**. For local dev, **`APP_URL`** and **`APP_URL_EMAIL`** both point at the email app origin (same port as **`APP_URL`** in that file).

### What the root route exposes to the client

**`app/root.tsx`** loader passes a **subset** of `process.env` into the client `window.env` object (see the `env` object in the loader). Anything added there is public to the browser—keep parity with security expectations and with fields client code reads via **`@openthrottle/react-router-utils`**.

### Pure documentation (this file)

These docs are Markdown only: they cannot **`import`** TypeScript. When copying names into examples or runbooks, use the same identifiers as **`application.ts`** and **`types.ts`** in **`@openthrottle/react-router-utils`** so guidance matches **`applications/openthrottle-email`** and other production apps.
