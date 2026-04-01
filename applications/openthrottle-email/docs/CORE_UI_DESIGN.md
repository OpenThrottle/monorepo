# Core UI Design: Web-Based Email Application

Design outline for the remaining core UI elements in **openthrottle-email**. All UI must use **@openthrottle/react-router-shadcn** for consistent styling and behavior. This document guides implementation of inbox management, reading pane, folder management, search, and related features.

**Reference:** See `architecture.md` for route tree, layout strategy, and generator usage. See `TOOLBAR_DESIGN.md` for toolbar layout and sections. Do not remove code comments (markers) in generated or existing files.

---

## Design summary (core UI elements)

| Element              | Purpose                                              | Primary shadcn-ui components                                                 | Implementation status                                                    |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Inbox management** | List messages; filtering, selection, pagination      | Table, Skeleton, Card/Empty, Button, DropdownMenu, Pagination                | MessageList exists; extend with loading, empty state, optional selection |
| **Reading pane**     | Single message view; reply, forward, archive, delete | Card, Button, DropdownMenu, Skeleton, Badge                                  | MessageDetail exists; add actions bar, optional toolbar                  |
| **Folders**          | Navigate Inbox/Sent/Drafts/Trash; optional badges    | Sidebar, SidebarMenu, SidebarMenuButton, SidebarMenuBadge                    | MailSidebar exists; optional unread badges                               |
| **Search**           | Query messages; shareable URL; results in same list  | Input, Popover/Command (optional), Skeleton                                  | MailToolbar has input; wire to route/loader, reuse MessageList           |
| **Compose**          | New message form                                     | Button, Input, Label, TextArea                                               | ComposeForm done                                                         |
| **Layout/chrome**    | Sidebar + main + toolbar                             | SidebarProvider, SidebarInset, Sidebar, Breadcrumb, Button, Input, Separator | MailLayout, MailToolbar, MailSidebar done                                |
| **Feedback**         | Toasts, confirmations                                | Sonner (Toaster, toast), AlertDialog                                         | Add when wiring actions                                                  |

---

## 1. Inbox management UI

### Purpose

- List messages for the current folder (inbox, sent, drafts, trash) with consistent layout and interaction.
- Support filtering (e.g. unread), selection (single/multi for bulk actions), and dynamic loading (pagination or infinite scroll) when backend is wired.

### Existing pieces

- **MessageList** (`routing/inbox/components/MessageList.tsx`): Table of `MailMessageSummary` (Subject, From, Date, Read) with links to `/mail/inbox/:id`. Uses shadcn-ui `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead`.
- **Types:** `MailMessageSummary`, `MailFolderId`, `MailFolder` in `app/types/mail.ts`.
- **Routes:** `_layout.mail._index.tsx` (inbox), `_layout.mail.sent.tsx`, `_layout.mail.drafts.tsx`, `_layout.mail.trash.tsx` load folder-specific mock data and render `MessageList`.

### Design decisions

| Area               | Recommendation                                                                      | shadcn-ui                                                     |
| ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **List container** | Keep table-based list; optional alternate view (e.g. compact list) later.           | `Table`, or `Card` per row if switching to card list.         |
| **Empty state**    | Dedicated empty state when `messages.length === 0` (folder-specific copy).          | `Empty` (if present), or custom block with `Card`/typography. |
| **Row state**      | Visual distinction for unread (e.g. `font-medium`), selected row (e.g. `bg-muted`). | Table row `className` + optional `Checkbox` for multi-select. |
| **Loading**        | Skeleton rows while loading.                                                        | `Skeleton` for table rows.                                    |
| **Pagination**     | When API supports it, add pagination below table.                                   | `Pagination` from shadcn-ui.                                  |
| **Bulk actions**   | Toolbar or bar above table when 1+ rows selected (Archive, Delete, Mark read).      | `Button`, `DropdownMenu` for overflow actions.                |

### Implementation notes

- Reuse `MessageList` for sent/drafts/trash by passing `messages` and optional `folderId` for empty-state copy and future behavior.
- Preserve existing `data-testid="MessageList"` and structure; extend with optional `selectedIds`, `onSelectionChange`, and loading prop for future integration.

---

## 2. Reading pane (message detail)

### Purpose

- Display a single message (or thread) with full metadata and body; support actions (reply, forward, archive, delete).

### Existing pieces

- **MessageDetail** (`routing/inbox/components/MessageDetail.tsx`): Renders `MailMessageDetail` in a `Card` (CardHeader: subject; CardDescription: from, to, date; CardContent: body). Placeholder “Select a message” when `message == null`.
- **Route:** `_layout.mail.inbox.$id.tsx` loads message by `id` and passes to `MessageDetail`.

### Design decisions

| Area             | Recommendation                                                                                      | shadcn-ui                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Layout**       | Keep Card-based header + content; optional two-column (metadata left, body right) for wide screens. | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`. |
| **Actions bar**  | Bar below header or above body: Reply, Reply all, Forward, Archive, Delete, More.                   | `Button` (primary/outline/ghost), `DropdownMenu` for “More”.         |
| **Body content** | Safe HTML or plain text with `whitespace-pre-wrap`; preserve existing behavior.                     | Existing div; optional `Blockquote` for quoted reply regions later.  |
| **Empty state**  | “Select a message” when no message (e.g. inbox index without `:id`).                                | Keep current text or use `Empty` for consistency.                    |
| **Loading**      | Skeleton for header + body while loading.                                                           | `Skeleton`.                                                          |
| **Attachments**  | Placeholder area for attachment list (icons/names); behavior when API exists.                       | `Badge`, list with `Button` or links.                                |

### Implementation notes

- Add an optional **MessageDetailToolbar** (or inline buttons) with Reply/Forward/Archive/Delete; wire handlers later (e.g. `onReply`, `onForward`).
- Keep `data-testid="MessageDetail"`; add `data-testid` on action buttons for tests.
- Code comments in component: “Reply/Forward handlers to be wired to compose route and API.”

---

## 3. Folder management UI

### Purpose

- Expose folders (Inbox, Sent, Drafts, Trash) and allow navigation; optional: user-created folders and drag-and-drop or “Move to folder” later.

### Existing pieces

- **MailSidebar** (`global/components/MailSidebar.tsx`): Renders `mailNavigation` (Inbox, Sent, Drafts, Trash, Compose, Settings) via shadcn-ui `Sidebar`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`.
- **data.navigation:** `mailNavigation` in `global/data/data.navigation.ts` defines links and labels.
- **Types:** `MailFolderId`, `MailFolder` in `app/types/mail.ts`.

### Design decisions

| Area               | Recommendation                                                                                            | shadcn-ui                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Folder list**    | Keep sidebar as single “Mail” group; folders = nav links. No structural change required for core folders. | `Sidebar`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`. |
| **Active state**   | Current route drives active state (existing logic: path match or prefix).                                 | `SidebarMenuButton` `isActive`.                                                                        |
| **Badges**         | Optional unread count per folder (e.g. Inbox).                                                            | `Badge` next to label or inside `SidebarMenuButton`.                                                   |
| **User folders**   | Future: second group “Folders” with add/edit/delete.                                                      | `SidebarGroup`, `DropdownMenu` on folder item for “Rename”/“Delete”.                                   |
| **Move to folder** | Future: “Move to folder” in reading pane or list bulk actions.                                            | `DropdownMenu` or `Select` listing folders.                                                            |

### Implementation notes

- Folder management “UI” for the current plan = sidebar navigation + optional badge. No new route required for core folders.
- If adding “Settings” sub-page for folder management, use existing `settings._index.tsx` or a child route; document in architecture when added.
- Code comment in sidebar: “Unread counts and user folders to be wired to API.”

---

## 4. Search

### Purpose

- Single search entry point; filter or query messages (subject, from, body) and show results in the same list layout as inbox/folders.

### Existing pieces

- **MailToolbar** (`global/components/MailToolbar.tsx`): Contains search `Input` (placeholder “Search mail”), breadcrumb, and action buttons. Search is visual-only (no `onSubmit` or URL wiring).

### Design decisions

| Area                     | Recommendation                                                                                                                       | shadcn-ui                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **Input**                | Keep toolbar search input; add `aria-label` and optional `role="search"` (already present).                                          | `Input` (existing).                                |
| **URL/state**            | Drive search from URL query (e.g. `?q=...`) so results are shareable and back/forward work.                                          | —                                                  |
| **Results view**         | Reuse `MessageList` with search results; same columns and row behavior.                                                              | Same as inbox: `Table` (or shared list component). |
| **Route**                | Optional dedicated route (e.g. `/mail/search?q=`) or same inbox route with `searchParams`; prefer same layout (MailLayout) and list. | —                                                  |
| **Suggestions / recent** | Optional: `Popover` or `Command` below input for recent searches or suggestions.                                                     | `Popover`, `Command` (combobox-style).             |
| **Loading**              | Show skeleton or spinner while search in flight.                                                                                     | `Skeleton`, `Spinner`.                             |

### Implementation notes

- Wire toolbar search: on submit (or debounced change), navigate to `/mail/search?q=...` or update inbox route to read `searchParams.q` and pass to loader.
- Loader returns filtered mock (or API) list; render with same `MessageList` and optional “Search results for ‘x’” heading (e.g. `Breadcrumb` or text).
- Code comment in MailToolbar: “Search submit to be wired to search route or inbox query.”

---

## 5. Additional features (essential for email app)

### 5.1 Compose (existing)

- **ComposeForm** and route already exist; uses `Button`, `Input`, `Label`, `TextArea`. No design change for core UI task; ensure styling stays shadcn-ui-only.

### 5.2 Toolbar and layout (existing)

- **MailToolbar:** Search, breadcrumb, Compose + Refresh/Archive/Delete. Breadcrumb can be made dynamic from route (e.g. “Inbox” vs “Sent” vs “Search results”).
- **MailLayout:** Sidebar + SidebarInset + toolbar + children. Keep as-is; ensure new views render inside this layout.

### 5.3 Notifications and feedback

- **Toasts:** For “Message sent”, “Moved to trash”, “Error sending”. | `Sonner` (`Toaster` + `toast`) from shadcn-ui.
- **Destructive actions:** Confirm before delete/archive (e.g. “Move to trash?”). | `AlertDialog` for confirmation.

### 5.4 Responsiveness

- **Sidebar:** Collapsible on small screens (shadcn-ui Sidebar supports this); keep toolbar wrapping or truncation as in TOOLBAR_DESIGN.md.
- **Reading pane:** On narrow viewports, consider stack (list then detail) or sheet/drawer for message detail. | `Sheet` or `Drawer` optional.

### 5.5 Accessibility

- Landmarks: `role="search"`, `aria-label` on toolbar and buttons (already started).
- Keyboard: Ensure list and detail focus order and shortcuts (e.g. j/k) are documented for future implementation; not required for “design” task.

---

## 6. Summary: component vs feature matrix (detailed)

| Feature          | Primary components                             | shadcn-ui primitives                                                         | Status / next step                                   |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| Inbox management | MessageList (shared for folders)               | Table, Skeleton, Empty, Button, DropdownMenu, Pagination                     | Extend with loading, empty state, optional selection |
| Reading pane     | MessageDetail, (optional) MessageDetailToolbar | Card, Button, DropdownMenu, Skeleton, Badge                                  | Add action bar; optional skeleton/attachments        |
| Folders          | MailSidebar, mailNavigation                    | Sidebar\*, Badge                                                             | Optional badge; document future user folders         |
| Search           | MailToolbar (input), same MessageList          | Input, Popover/Command (optional), Skeleton                                  | Wire query to route and loader; reuse MessageList    |
| Compose          | ComposeForm                                    | Button, Input, Label, TextArea                                               | Done                                                 |
| Layout/chrome    | MailLayout, MailToolbar, MailSidebar           | SidebarProvider, SidebarInset, Sidebar, Breadcrumb, Button, Input, Separator | Done; breadcrumb dynamic by route                    |
| Feedback         | —                                              | Sonner (toast), AlertDialog                                                  | Add when wiring actions                              |

\* Sidebar group/menu/menu button already in use.

---

## 7. Component → shadcn-ui map (quick reference)

| Component / area | Use these from @openthrottle/react-router-shadcn                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MessageList      | Table, TableHeader, TableBody, TableRow, TableCell, TableHead; Skeleton (loading); Empty / EmptyTitle / EmptyDescription (empty state); optional Checkbox, Button, DropdownMenu, Pagination |
| MessageDetail    | Card, CardHeader, CardTitle, CardDescription, CardContent; Button, DropdownMenu; Skeleton; Badge (attachments); Blockquote (optional quoted reply)                                          |
| MailSidebar      | Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem; SidebarMenuBadge (unread count)                             |
| MailToolbar      | Input (search), Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, Button, Separator                                                          |
| ComposeForm      | Button, Input, Label, TextArea                                                                                                                                                              |
| Feedback         | Sonner (Toaster, toast); AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel              |
| Search UI        | Input; optional Popover, Command (suggestions); Skeleton or Spinner (loading)                                                                                                               |

---

## 8. Guidelines for implementation

- **Consistency:** Use only **@openthrottle/react-router-shadcn** for buttons, forms, tables, cards, navigation, dialogs, and layout. No one-off custom UI primitives.
- **Code comments:** Leave and add comments as guides for future integration (e.g. “Wire to API”, “Reply opens compose with pre-filled to/subject”).
- **Tests:** Preserve and extend `data-testid`; test empty states, loading, and key actions (navigation, open message, submit search).
- **Types:** Keep using `MailMessageSummary`, `MailMessageDetail`, `MailFolderId`, `MailFolder`; extend only when needed (e.g. `attachments` on detail).

This document should be used by the tasks “Build and style the inbox management UI”, “Implement reading pane with dynamic content”, “Setup folder management UI”, and “Add search functionality with UI integration” to ensure a consistent, shadcn-ui–based design.

---

## Design phase complete

The above sections define the core UI components and features for the email app. All elements use **@openthrottle/react-router-shadcn**; existing components (MessageList, MessageDetail, MailSidebar, MailToolbar, MailLayout, ComposeForm) are documented with extension points. Downstream implementation tasks should follow this design and the referenced docs (`architecture.md`, `TOOLBAR_DESIGN.md`).
