# Integration Guide and shadcn-ui Conventions

This document ties together the email app design, component structure, and code-comment conventions. Use it when wiring backend APIs, adding features, or onboarding. **Do not remove existing code comments (markers) in components or routes**—they support future iteration.

**Related docs:**

- [Architecture](../../../docs/openthrottle-email/architecture.md) — Route tree, layout strategy, generators
- [CORE_UI_DESIGN.md](./CORE_UI_DESIGN.md) — Inbox, reading pane, folders, search, component → shadcn map
- [TOOLBAR_DESIGN.md](./TOOLBAR_DESIGN.md) — Toolbar layout and sections

---

## 1. Component and file structure

| Area                | Location                                         | Purpose                                                                                                   |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Layout**          | `app/global/components/MailLayout.tsx`           | Sidebar + main chrome; wraps all mail routes with TooltipProvider and Toaster                             |
| **Sidebar**         | `app/global/components/MailSidebar.tsx`          | Folder nav (Inbox, Sent, Drafts, Trash, Compose, Settings); optional unread badges                        |
| **Toolbar**         | `app/global/components/MailToolbar.tsx`          | Search (→ `/mail/search?q=`), breadcrumb, Compose / Refresh / Archive / Delete; tooltips and Help popover |
| **Confirm modal**   | `app/global/components/ConfirmModal.tsx`         | Reusable AlertDialog for archive/delete confirmations; used in MessageDetail and MessageList              |
| **Move to folder**  | `app/global/components/MoveToFolderDropdown.tsx` | Submenu used in MessageDetail and MessageList bulk actions                                                |
| **Message list**    | `app/routing/inbox/components/MessageList.tsx`   | Table for inbox/sent/drafts/trash/search; loading, empty state, selection, bulk actions                   |
| **Message detail**  | `app/routing/inbox/components/MessageDetail.tsx` | Reading pane: header, actions bar, body, attachments placeholder                                          |
| **Compose form**    | `app/routing/compose/components/ComposeForm.tsx` | New message form (To, Subject, Body); supports reply/forward via query params                             |
| **Mail types**      | `app/types/mail.ts`                              | `MailFolderId`, `MailFolder`, `MailMessageSummary`, `MailMessageDetail`, `MailAttachment`                 |
| **Navigation data** | `app/global/data/data.navigation.ts`             | `mailNavigation` (paths and labels for sidebar/header)                                                    |
| **Mock data**       | `app/global/data/mock.mail.ts`                   | Replace with API in loaders/actions when backend is ready                                                 |

**Routes (flat, under `app/routes/`):**

- `_layout.mail.tsx` — Pathless layout; renders `MailLayout` and `<Outlet />`
- `_layout.mail._index.tsx` — Inbox at `/mail/`
- `_layout.mail.inbox.$id.tsx` — Reading pane at `/mail/inbox/:id`
- `_layout.mail.compose.tsx` — Compose at `/mail/compose`
- `_layout.mail.sent.tsx`, `_layout.mail.drafts.tsx`, `_layout.mail.trash.tsx` — Folder list views
- `_layout.mail.search.tsx` — Search results at `/mail/search?q=...`
- `settings._index.tsx` — Settings (outside mail layout if desired)

---

## 2. shadcn-ui usage guidelines

- **Package:** All UI must use **`@openthrottle/react-router-shadcn`** (monorepo package). No one-off custom primitives for buttons, forms, tables, cards, or layout.
- **Imports:** Import named components from `@openthrottle/react-router-shadcn` (e.g. `Button`, `Card`, `Table`, `SidebarProvider`, `Input`).
- **Consistency:** Use the same component set across the app so theming and behavior stay consistent (see CORE_UI_DESIGN.md § Component → shadcn-ui map).

**Quick reference by feature:**

| Feature        | Primary shadcn-ui components                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout/sidebar | `SidebarProvider`, `Sidebar`, `SidebarInset`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarMenuBadge`                 |
| Toolbar        | `Input`, `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `Button`, `Separator`                               |
| Message list   | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead`, `Skeleton`, `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `Button`, `DropdownMenu` |
| Reading pane   | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button`, `DropdownMenu`, `Skeleton`, `Badge`                                                        |
| Compose        | `Button`, `Input`, `Label`, `TextArea`                                                                                                                                    |
| Move to folder | `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuItem`                                                                                 |
| Tooltips       | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` (MailLayout provides provider; used on toolbar and message actions)                                      |
| Popovers       | `Popover`, `PopoverTrigger`, `PopoverContent` (e.g. toolbar Help)                                                                                                         |
| Feedback       | `Sonner` (Toaster, toast), `ConfirmModal` (AlertDialog) for archive/delete confirmations                                                                                  |

When adding new UI (e.g. confirmations, toasts), prefer these components rather than raw HTML or ad-hoc styling.

---

## 3. Code comment conventions

Comments in this codebase are intentional guides for future integration. **Leave them in place** when editing.

### 3.1 Section markers in components

Many components use a consistent structure with comment markers:

- `// Hooks`
- `// Setup`
- `// Handlers`
- `// Markup`
- `// Life Cycle`
- `// 🔌 Short Circuit` — Early returns (loading, empty state, no selection)

These help readers and tools find where to add logic (e.g. new handlers under Handlers, new short circuits under Short Circuit).

### 3.2 Integration and wiring comments

- **`// TODO: wire to ...`** — Placeholder for API or route wiring (e.g. mark-read, delete, archive).
- **`// Wire to API when ...`** / **`// Replace with API when backend is wired`** — Loaders and actions currently use mock data; swap for real calls here.
- **`// Future: ...`** — Planned behavior (e.g. user folders, breadcrumb from route, live search from any page).
- **JSDoc `@description`** — Brief purpose of the component or type; often mentions shadcn-ui and integration points.

### 3.3 Where to add new comments

When adding or changing behavior:

- **Loaders:** Comment that the loader can be replaced with an API call and what it should return (e.g. `messages`, `message`).
- **Actions:** Comment that the action will call which API (e.g. move to trash, send message).
- **Callbacks (e.g. `onArchive`, `onMoveToFolder`):** Document in the component’s JSDoc or prop type that they are for API wiring.
- **Query params:** Document in the route or component that use (e.g. `?q=`, `?replyTo=`, `?forward=`) for shareable URLs and compose prefill.

---

## 4. Integration points (backend wiring)

Use this as a checklist when connecting a real mail API.

| Location                   | Current behavior                                                                             | Wire to                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Inbox / folder loaders** | `_layout.mail._index.tsx`, `sent`, `drafts`, `trash` loaders return mock `messages`          | API: list messages for folder; support pagination if needed                                                    |
| **Reading pane loader**    | `_layout.mail.inbox.$id.tsx` loader uses `getMockMessageById(id)`                            | API: get message by id; return `MailMessageDetail`                                                             |
| **Search loader**          | `_layout.mail.search.tsx` uses `getMockSearchResults(q)`                                     | API: search messages by query; return list; consider debounced request and Skeleton                            |
| **Compose action**         | Compose route form POST                                                                      | API: send message; handle reply/forward prefilling via `replyTo` / `forward` query params                      |
| **MessageDetail**          | `onArchive`, `onDelete`, `onMoveToFolder` callbacks                                          | API: move to archive/trash/folder; then refresh list or navigate                                               |
| **MessageList**            | Bulk actions (Mark read, Delete, Move to folder) call `onSelectionChange` / `onMoveToFolder` | API: bulk mark-read, bulk move/delete                                                                          |
| **MailSidebar**            | `folderUnreadCounts` optional prop; default from mock                                        | API: unread counts per folder for badges                                                                       |
| **MailToolbar**            | Refresh / Archive / Delete buttons                                                           | API: refresh list; archive/delete selected (if selection is lifted to layout) or document as context-dependent |

Types in `app/types/mail.ts` (`MailMessageSummary`, `MailMessageDetail`, etc.) should stay the contract for API responses; extend with new fields (e.g. `threadId`) only when needed.

---

## 5. Testing and accessibility

- **data-testid:** Preserve and extend `data-testid` on main containers and key controls (e.g. `MessageList`, `MessageDetail`, `MessageDetail-action-reply`, `MailToolbar`) for tests.
- **ARIA:** Use `aria-label` on icon-only buttons and `role="search"` / `role="toolbar"` where defined; keep these when changing layout.
- **Empty and loading:** Tests should cover empty state and loading state where components support them (MessageList, MessageDetail, MailSearchRoute).

---

## 6. Summary

- **Design and structure:** See CORE_UI_DESIGN.md and architecture.md.
- **UI:** Use only `@openthrottle/react-router-shadcn`; follow the component map in CORE_UI_DESIGN.md.
- **Comments:** Keep section markers and wiring/TODO/Future comments; add similar comments when introducing new integration points.
- **Integration:** Replace mock data in loaders/actions with API calls; wire callbacks in MessageDetail and MessageList to those APIs; use types in `app/types/mail.ts` as the contract.
