# Mail Toolbar — UI setup and custom logic

Documentation for the Mail Toolbar component: where it lives, how it’s integrated, customization options, and implementation details. For layout and design rationale, see [TOOLBAR_DESIGN.md](./TOOLBAR_DESIGN.md).

## Quick reference

| Item               | Location                                                   |
| ------------------ | ---------------------------------------------------------- |
| Component          | `app/global/components/MailToolbar.tsx`                    |
| Props interface    | `MailToolbarProps` (optional `className`)                  |
| Layout integration | `MailLayout.tsx` → `SidebarInset` → `MailToolbar` + outlet |
| Tests              | `app/global/components/__tests__/MailToolbar.test.tsx`     |
| Design rationale   | [TOOLBAR_DESIGN.md](./TOOLBAR_DESIGN.md)                   |

## Setup

### Location and integration

- **Component:** `MailToolbar` in `app/global/components/MailToolbar.tsx`.
- **Usage:** Rendered once in `MailLayout` inside `SidebarInset`, above the route outlet. It appears on all mail views (inbox, sent, drafts, trash, compose).
- **Layout:** `MailLayout` → `SidebarProvider` → `MailSidebar` + `SidebarInset` → `MailToolbar` + `{children}`.

### Dependencies

- **UI:** `@openthrottle/react-router-shadcn` — `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbList`, `BreadcrumbPage`, `BreadcrumbSeparator`, `Button`, `Input`, `Separator`.
- **Icons:** `@phosphor-icons/react` (SSR) — `MagnifyingGlassIcon`, `ArrowsClockwiseIcon`, `ArchiveIcon`, `TrashIcon`, `PencilSimpleLineIcon`.
- **Routing:** `react-router` — `Link` for Compose and breadcrumb.
- **Styling:** `classnames` for conditional classes; Tailwind utility classes for layout and spacing.

## Customization options

### Props

| Prop        | Type                | Description                                                                                                   |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `className` | `string` (optional) | Applied to the toolbar `<header>`. Use for layout overrides (e.g. padding, borders) or theme-specific tweaks. |

Example:

```tsx
<MailToolbar className="border-t border-border" />
```

### Extending the component

- **Search:** The search input is presentational only (no `onChange`/`onSubmit`). To wire behavior, add optional props (e.g. `searchValue`, `onSearchChange`, `onSearchSubmit`) and pass them into the existing `Input`.
- **Breadcrumb:** Currently static (“Mail” → “Inbox”). To make it route-driven, accept props such as `breadcrumbItems: { label: string; to?: string }[]` and map them to `BreadcrumbItem` / `BreadcrumbLink` / `BreadcrumbPage`.
- **Actions:** Compose is a `Link` to `/mail/compose`; Refresh, Archive, and Delete are icon `Button`s with no `onClick`. Add optional callback props (e.g. `onRefresh`, `onArchive`, `onDelete`) and pass them when you implement behavior.
- **Conditional actions:** You can add optional props to show/hide or disable actions (e.g. `showArchive`, `disabledDelete`) and render buttons conditionally.

## Implementation details and logic

### Visual-only, no behavior

- No form submission or search API is wired. The toolbar is built so the UI is in place; behavior can be added later via props or context.
- **Compose:** The only wired navigation — React Router `Link` to `/mail/compose` with `viewTransition` for animated transitions. No other action handlers are attached.

### Accessibility

- **Role:** The root element is `<header role="toolbar">` and has `data-testid="MailToolbar"` for tests.
- **Search:** Wrapper has `role="search"`; the input has `aria-label="Search mail"` and `type="search"`.
- **Navigation:** Breadcrumb is in a `<nav aria-label="Breadcrumb">`; current page uses `BreadcrumbPage`, links use `BreadcrumbLink` + `Link`.
- **Actions:** Icon-only buttons use `aria-label` (e.g. “Refresh”, “Archive”, “Delete”). Decorative icons use `aria-hidden`.

### Layout and styling

- **Structure:** Single horizontal row with `flex flex-wrap items-center gap-2`, `min-w-0` on flexible areas so they can shrink without overflow.
- **Sections:** Search (flex, `min-w-0 flex-1 basis-48`), vertical `Separator`, breadcrumb nav, `Separator`, action buttons (`shrink-0`, `gap-1`).
- **Spacing:** `px-4 py-2`; border via `border-b border-border`.
- **Responsiveness:** Row can wrap (`flex-wrap`); search has `max-w-sm`; actions stay in one group. No custom breakpoints; refinements can be added in testing.

### Component choices

- **Breadcrumb:** shadcn `Breadcrumb*` for consistency and accessibility; “Mail” is a link, “Inbox” is current page.
- **Buttons:** Compose uses `variant="default"` and `asChild` with `Link`; secondary actions use `variant="outline" size="icon"`.
- **Icons:** Phosphor SSR icons for alignment with the rest of the app; size `size-4`; search icon is `pointer-events-none` and absolutely positioned inside the input container.

## Testing

- **Location:** `app/global/components/__tests__/MailToolbar.test.tsx`.
- **Coverage:** Renders with route stub; checks `data-testid`, `role="toolbar"`; search section and `searchbox` with placeholder; breadcrumb with “Mail” link and “Inbox”; Compose link to `/mail/compose`; Refresh, Archive, Delete buttons with accessible names. Snapshot covers full markup.

When changing the toolbar (e.g. adding props or new sections), update tests and this doc as needed.

## Related documentation

- **[TOOLBAR_DESIGN.md](./TOOLBAR_DESIGN.md)** — Layout sketch, section breakdown, and shadcn-ui component choices (design phase).
- **MailLayout** — Parent layout that renders `MailToolbar`; see `app/global/components/MailLayout.tsx`.
- **shadcn-ui** — Component API and theming: `@openthrottle/react-router-shadcn` (Breadcrumb, Button, Input, Separator).
