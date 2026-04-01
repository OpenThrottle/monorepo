# OpenThrottle admin portal: architecture and phasing

This note defines the architecture for the OpenThrottle admin portal: app vs routes, auth, backend, and phased scope. It applies to all OpenThrottle products (developer, email, website, etc.).

**Plan-Id:** 39aeaefe-7d37-4906-950b-e63526006bb0

---

## 1. Admin app vs area within an existing app

**Decision: dedicated admin app (`openthrottle-admin`).**

- **openthrottle-admin** is a separate React Router application in the monorepo (`applications/openthrottle-admin`). It targets administrators only and will host all admin surfaces: users, roles/permissions, and (later) payments.
- **Alternative (rejected):** An admin area inside **openthrottle-developer** would mix end-user (developer) and admin concerns in one app, complicate routing and permission UX, and blur the boundary between “who uses the developer portal” vs “who can manage the platform.” A dedicated app keeps a clear separation and allows different branding, layout, and deployment if needed.
- Admin UI will use the **monorepo shadcn-ui package** (`@openthrottle/react-router-shadcn`) for all UI elements: tables, forms, dialogs, etc., consistent with openthrottle-developer.

---

## 2. Auth: who can access admin

- **Same identity and backend:** Admin uses the same **openthrottle-server** and same user store (Cortex `users` table). Auth is JWT-based (see [openthrottle-server-auth.md](./openthrottle-server-auth.md)). The admin app sends the same `Authorization: Bearer <accessToken>` header; users log in via the same `login` mutation (or a dedicated admin login route that calls it).
- **Who can access admin:** Access to admin-only GraphQL operations (and thus to the admin app’s features) is gated by **roles and permissions**. Only users with an “admin” role (or a dedicated permission such as `access_admin` / `admin:read`) may call admin resolvers. Implementation will use the existing NestJS auth stack (JWT guard) plus a **roles/permissions model** and guards (e.g. from `@openthrottle/nestjs-rbac` or custom) so that:
  - Unauthenticated requests are rejected (JWT required).
  - Authenticated users without the required role/permission are rejected (403) on admin-only resolvers.
- **Summary:** Same backend, same JWT; admin access is determined by role/permission checks on openthrottle-server.

---

## 3. Backend: single NestJS + GraphQL API

**openthrottle-server** is the **single NestJS + GraphQL backend** for all OpenThrottle products. All admin APIs live there; we do not introduce a separate admin API service.

- **Existing:** Auth (login, register), health, metrics, queues, plans, projects, GitHub stats, etc., are already implemented in openthrottle-server.
- **Admin scope:** User management (list, detail, create/update/disable), roles and permissions (model, CRUD, assign roles to users, permission checks), and later payments (subscriptions, billing) will be implemented as **GraphQL modules** (resolvers, services, and any new entities) inside openthrottle-server. The admin app is a client of this same GraphQL API; no separate “admin backend” is planned.

---

## 4. Phased scope

| Phase | Scope                           | When                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Users and roles/permissions** | First. View and manage users (list, detail, create/update/disable). Define roles and permissions (DB + GraphQL), assign roles to users, enforce permission checks on admin resolvers. Admin UI for users and for roles/permissions using shadcn-ui.                                                                                                                                                                               |
| **2** | **Payments**                    | After a **payments provider is chosen**. Provider choice and integration approach (Hybrid, recommended default Stripe) are documented in [payments-provider-choice-and-integration.md](./payments-provider-choice-and-integration.md). No implementation until provider is confirmed; then proceed with detailed spec and API integration in openthrottle-server per that doc and plan task 8eeeaba2 (Payments: API integration). |

---

## 5. Dashboard layout and main components

The admin app uses a **sidebar + main content** layout for dashboard and all admin routes (dashboard, plans, projects, roles, users).

- **Layout:** `AdminLayout` wraps content with shadcn-ui `SidebarProvider`, `Sidebar`, and `SidebarInset`. The sidebar is collapsible (icon-only on desktop; sheet on mobile). A top bar inside `SidebarInset` contains `SidebarTrigger` (keyboard: Cmd/Ctrl+B).
- **Navigation:** `GlobalNavigation` renders `data.navigation` (Dashboard, Plans, Projects, Roles, Users) as a `SidebarMenu` with `SidebarMenuButton` + `NavLink`. Active route is highlighted via `isActive`.
- **Dashboard page:** Uses a grid of shadcn-ui `Card` (Overview, Documentation, Charts) and embeds `GlobalMetrics` (server metrics with stat cards and a Recharts line chart via `ChartContainer`).
- **Charts:** Use `@openthrottle/react-router-shadcn` `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, and Recharts (`LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`) — see `GlobalMetrics.tsx`.
- **Tables:** Use shadcn-ui `DataTable` (TanStack Table) inside `Card` — see `UsersTable`, `RolesTable`, and `PermissionsTable`. Columns use `Badge`, `Button`, and `Link` as needed.
- **Modals / sheets:** Use shadcn-ui `Sheet` for slide-over forms (e.g. Create user, Edit user, Create role, Edit role). Use `AlertDialog` for destructive confirmations (e.g. Delete role, Disable user) so users must confirm before submitting.
- **Selects:** Use shadcn-ui `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` for dropdowns (e.g. Assign role to user, Add permission to role). When the value must be submitted via a form, use a controlled `Select` with a hidden `<input name="…" value={selectedId} />` and sync state on `onValueChange`.

Routes under `/dashboard`, `/plans`, `/projects`, `/roles`, `/users` are wrapped in `AdminLayout` (see `root.tsx`). The global header remains above the layout for branding and GitHub link.

---

## 6. File and doc references

| Topic                                     | Reference                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Admin shadcn-ui integration               | [admin-shadcn-ui-integration.md](./admin-shadcn-ui-integration.md)                           |
| Server auth (JWT, Passport, Cortex users) | [openthrottle-server-auth.md](./openthrottle-server-auth.md)                                 |
| Wiring auth and RBAC in NestJS            | [../nestjs/wiring-auth-rbac.md](../nestjs/wiring-auth-rbac.md)                               |
| Payments provider choice and integration  | [payments-provider-choice-and-integration.md](./payments-provider-choice-and-integration.md) |
| Payments research (providers, models)     | [payments-research-providers-and-models.md](./payments-research-providers-and-models.md)     |
| Admin app                                 | `applications/openthrottle-admin`                                                            |
| Backend                                   | `applications/openthrottle-server`                                                           |
| Shared UI                                 | `@openthrottle/react-router-shadcn` (monorepo package)                                        |
| shadcn-ui components                      | https://ui.shadcn.com/docs/components                                                        |
