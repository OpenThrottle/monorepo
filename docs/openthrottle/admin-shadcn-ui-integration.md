# OpenThrottle Admin: shadcn-ui integration

This document describes how the **openthrottle-admin** application integrates and uses the monorepo shadcn-ui package (`@openthrottle/react-router-shadcn`). It covers setup, component usage patterns, and custom logic or styling. For high-level admin architecture (layout, routes, auth), see [admin-portal-architecture.md](./admin-portal-architecture.md).

---

## 1. Overview

- **Package:** `@openthrottle/react-router-shadcn` (monorepo package at `packages/mattscholta/shadcn-ui`).
- **Purpose:** All admin UI elements—layout, navigation, cards, tables, forms, dialogs, charts—use this package for consistency and accessibility.
- **References:**
  - Package README: `packages/mattscholta/shadcn-ui/README.md`
  - Official shadcn-ui docs: https://ui.shadcn.com/docs/components
  - Admin architecture: [admin-portal-architecture.md](./admin-portal-architecture.md)

---

## 2. Setup

### 2.1 CSS (Tailwind + theme)

The app is the single place that imports Tailwind. In `applications/openthrottle-admin/app/styles.css`:

1. **Tailwind and animate:** `@import 'tailwindcss'`, `@import 'tw-animate-css'`.
2. **shadcn theme:** `@import '@openthrottle/react-router-shadcn/src/theme.css'` (theme-only; no Tailwind from the package).
3. **Source for class names:** `@source "../../../packages/mattscholta/shadcn-ui/**/*.{css,ts,tsx}"` so Tailwind v4 scans the package for utility classes.
4. **App overrides:** `:root` (and optional dark mode) override semantic tokens (e.g. `--background`, `--foreground`, `--brand`, `--sidebar-*`, `--chart-*`). Define only what you need; the rest fall back to the package theme.

Do **not** import Tailwind from the shadcn-ui package; import it once from the app.

### 2.2 Theming and brand

- **Brand accent:** Set `--brand` in `:root` (e.g. `hsl(294, 100%, 50%)`). The app maps `--accent` to `var(--brand)` so navigation and highlights use the brand colour.
- **Light/dark:** Override semantic tokens under `:root` and `@media (prefers-color-scheme: dark)` (see `styles.css`). Sidebar and chart tokens (`--sidebar-*`, `--chart-1` … `--chart-5`) are overridden for dark mode.
- **Custom utility:** `@utility text-highlight` is defined in app CSS for gradient text (e.g. marketing copy).

---

## 3. Layout and navigation

### 3.1 Admin layout

- **Component:** `AdminLayout` (`app/global/components/AdminLayout.tsx`).
- **Behaviour:** Wraps admin content with a collapsible sidebar and main content. Sidebar is visible on `md+`; on smaller viewports it appears as a sheet. Top bar includes `SidebarTrigger` (keyboard: Cmd/Ctrl+B).
- **shadcn usage:** `SidebarProvider`, `Sidebar`, `SidebarInset`, `SidebarTrigger`. `Sidebar` uses `collapsible="icon"` and optional `className` (e.g. `border-r border-sidebar-border`).

### 3.2 Global navigation

- **Component:** `GlobalNavigation` (`app/global/components/GlobalNavigation.tsx`).
- **Data:** Navigation items come from `~/global/data/data.navigation.ts` (Dashboard, Plans, Projects, Permissions, Roles, Users).
- **shadcn usage:** `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`. Each item is a `NavLink` (React Router) with `SidebarMenuButton asChild={true}`, `isActive` derived from `pathname`, and `tooltip` for collapsed state.
- **Active state:** `isActive` is true when `pathname === toPath` or (for non-root) `pathname.startsWith(toPath)`.

---

## 4. Page and component patterns

### 4.1 Dashboard and cards

- **Dashboard:** `app/routes/dashboard.tsx` uses a grid of shadcn-ui `Card` (CardHeader, CardTitle, CardDescription, CardContent) for Overview, Documentation, and Charts. The “Server metrics” section embeds `GlobalMetrics`.
- **Cards:** Use `Card` as the outer container; put titles/descriptions in `CardHeader`, body in `CardContent`, optional actions in `CardFooter`.

### 4.2 Tables

- **Pattern:** shadcn-ui `DataTable` (TanStack Table) inside a `Card`. Column definitions use `ColumnDef<T, ...>` from `@tanstack/react-table`.
- **Examples:** `UsersTable`, `RolesTable`, `PermissionsTable` in `app/routing/*/components/`.
- **Cell content:** Use `Badge` for status (e.g. Active/Disabled), `Button asChild` with `Link` for “View” actions, and `Link` with `viewTransition={true}` for primary links. Format dates with `date-fns` (e.g. `formatDate(..., 'MMM d, yyyy')`).

### 4.3 Forms and Select with Remix/React Router

- **Select in forms:** shadcn-ui `Select` is controlled (state in React). To submit the value via a Remix/React Router form, use a **hidden input** and keep it in sync with the Select:
  - `<input name="roleId" type="hidden" value={selectedRoleId} />`
  - `Select` with `value={selectedRoleId || undefined}` and `onValueChange={setSelectedRoleId}`.
- **Examples:** Assign role to user (`users.$userId.tsx`), Add permission to role (`roles.$roleId.tsx`). Intent is passed as a separate hidden field (e.g. `name="intent" value="assignRole"`).
- **Other form controls:** Use `Input`, `Label` from the package where applicable.

### 4.4 Sheets (slide-over panels)

- **Use case:** Create/Edit user, Create/Edit role, or any slide-over form.
- **shadcn usage:** `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetTrigger`. Control open state with `open` and `onOpenChange` (e.g. from route search params or local state).
- **Example:** Index route uses `Sheet` + `SheetContent side="right"` for sign-in; user/role routes use Sheet for create/edit forms.

### 4.5 AlertDialog (destructive actions)

- **Use case:** Confirm before destructive actions (e.g. Disable user, Delete role).
- **shadcn usage:** `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`. Put the form (or submit trigger) inside the dialog so the user must confirm before submitting.

### 4.6 Charts (metrics)

- **Package:** Charts use `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, and types like `ChartConfig` from `@openthrottle/react-router-shadcn`, plus **Recharts** (e.g. `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`). Recharts is a dependency of the shadcn-ui package.
- **GlobalMetrics:** Fetches server metrics via GraphQL and displays stat cards (using `@openthrottle/react-router-ui` `OpenThrottleStatCard`) and a time-series line chart. Chart config is defined in the component (e.g. `METRICS_CHART_CONFIG` with `color` and `label` per series). Use `ChartContainer` with `config` and `className="min-h-[...] w-full"`; series use `stroke="var(--color-<key>)"` so theme tokens apply.
- **Theme:** Override `--chart-1` … `--chart-5` in app CSS if you want global chart colours; per-chart config can still override with explicit `color` values.

---

## 5. Custom logic and styling

- **Brand and theme:** See §2.2. Only override the CSS variables you need; the package supplies defaults.
- **Chart config:** Components that use charts define a `ChartConfig` object (keys match data keys) with `label` and optional `color`. Use `satisfies ChartConfig` for type safety.
- **Poll interval (GlobalMetrics):** Poll interval is stored in `localStorage` and restored on load; the dropdown uses a native `<select>` styled with Tailwind (border, ring) rather than shadcn Select, so the form is a simple controlled select.
- **Text utility:** `@utility text-highlight` in app CSS for gradient text; use where needed for marketing or emphasis.
- **Testing:** In `tests/setup.ts`, `window.matchMedia` is mocked so shadcn-ui Sidebar (and any component using `use-mobile` or similar) works in jsdom. `ResizeObserver` is mocked for Recharts.

---

## 6. Adding new components

- Prefer components from `@openthrottle/react-router-shadcn`. If a component is not yet in the package, check https://ui.shadcn.com/docs/components for the pattern and add it to the package (or contribute upstream), then use it in the admin app.
- Use the existing patterns: DataTable inside Card, Sheet for slide-overs, AlertDialog for destructive confirmations, controlled Select + hidden input for form submission.
- Keep layout in `AdminLayout` and navigation in `GlobalNavigation`/`data.navigation.ts` so new routes automatically appear in the sidebar when added to the layout and data.

---

## 7. References

| Topic                    | Reference                                                      |
| ------------------------ | -------------------------------------------------------------- |
| Package README and usage | `packages/mattscholta/shadcn-ui/README.md`                     |
| Theming (package)        | Package README § Theming; THEMING.md if present in repo        |
| shadcn-ui components     | https://ui.shadcn.com/docs/components                          |
| Admin architecture       | [admin-portal-architecture.md](./admin-portal-architecture.md) |
| Admin app                | `applications/openthrottle-admin`                              |
