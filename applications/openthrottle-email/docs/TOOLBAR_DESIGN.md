# Toolbar component design (email app)

Design for the mail-area Toolbar: layout, sections, and shadcn-ui usage. No wiring or behavior yet—visual structure only.

## Placement

- **Where:** Inside the main content area of the mail layout (`SidebarInset`), above the route outlet (e.g. above `MessageList` or `MessageDetail`).
- **Scope:** Rendered once in `MailLayout`, so it appears on all mail views (inbox, sent, drafts, trash, compose).

## Layout

Single horizontal row, full width, with three logical sections:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [ Search input ]  │  Navigation (breadcrumb / context)  │  [ Actions ]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Left:** Search section (fixed or min width).
- **Center (or left-after-search):** Navigation / context (e.g. current folder or breadcrumb).
- **Right:** Action buttons (Compose + secondary actions), flex-shrink-0 so they don’t collapse.

Use flexbox: `flex items-center gap-2` (or similar) with appropriate `flex-1` / `min-w-0` so the center can shrink and the right stays visible.

## Sections and shadcn-ui components

### 1. Search

- **Component:** `Input` from `@openthrottle/react-router-shadcn`.
- **Placeholder:** e.g. “Search mail”.
- **Role:** `role="search"` on a wrapper form or div for accessibility.
- **Optional:** Leading icon (e.g. search icon from `lucide-react`) inside the input or as a sibling—decide in implementation. No behavior yet (no `onSubmit` or URL wiring).

### 2. Navigation

- **Purpose:** Show current context (e.g. “Inbox”, “Sent”, “Trash”) or a short breadcrumb.
- **Component:** Prefer `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator` from shadcn-ui for consistency. Alternatively a single text label or link if only one level.
- **Content (static for now):** e.g. “Inbox” or “Mail / Inbox”. No need to drive from route yet—placeholder text is fine.

### 3. Action buttons

- **Component:** `Button` from `@openthrottle/react-router-shadcn`.
- **Primary action:** “Compose” (or “New message”) — use `variant="default"` and `Link` to `/mail/compose` (visual only; link can be wired in layout).
- **Secondary actions (optional for initial UI):** e.g. “Refresh”, “Archive”, “Delete” — use `variant="outline"` or `variant="ghost"`. Icons from `lucide-react` (e.g. RefreshCw, Archive, Trash2) are optional; add if they improve clarity without extra wiring.

Use a small gap between buttons (e.g. `gap-1` or `gap-2`).

## Styling and accessibility

- **Container:** Semantic wrapper (e.g. `<header>` or `<div role="toolbar">`). Include `data-testid="MailToolbar"` for tests.
- **Spacing:** Consistent vertical padding (e.g. `py-2` or `py-3`) and horizontal padding to align with the content below (e.g. `px-4` to match `MessageList`).
- **Separators:** Optional `Separator` (vertical) between search and navigation, or navigation and actions, if it improves clarity.
- **Responsiveness:** Prefer a single row that wraps only when necessary (e.g. `flex-wrap` and `gap-2`), or keep actions in a single row and allow the search/navigation area to shrink with `min-w-0` and truncation. Exact breakpoints can be refined in implementation and testing.

## Summary

| Section    | shadcn-ui components | Notes                                    |
| ---------- | -------------------- | ---------------------------------------- |
| Search     | `Input`              | Placeholder “Search mail”, optional icon |
| Navigation | `Breadcrumb`\*       | Static “Inbox” or “Mail / Inbox” for now |
| Actions    | `Button`             | Compose (primary) + optional secondary   |
| Layout     | —                    | Flex row, optional `Separator` between   |

\* Or plain text/link if a single segment is enough.

This gives the implementer a clear layout and component list for the next task (Implement Toolbar UI using shadcn-ui).
