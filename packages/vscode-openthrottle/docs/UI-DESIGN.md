# OpenThrottle extension UI design

This document defines the basic UI for viewing plans and tasks in the VS Code / Cursor extension. It is the source of truth for the "Design extension UI for viewing plans and tasks" task.

## Overview

- **Sidebar:** A dedicated view container in the Activity Bar (primary sidebar) labeled **OpenThrottle**.
- **Tree view:** A single tree, **Plans**, that lists plans grouped by status; each plan expands to show its tasks.
- **Detail view:** When a plan or task is selected, show its details in a **webview** (or, alternatively, a simple panel in the secondary area). No editing in this phase; read-only.

Data source is OpenThrottle (plans/tasks). How the extension talks to OpenThrottle (MCP client, direct API, or existing backend) is defined in a separate task; this design assumes the extension can read plans and tasks and refresh on demand.

## 1. View container (sidebar)

- **Location:** Activity Bar (left), same area as Explorer / Search / Source Control.
- **Contribution:** `contributes.viewsContainers.activitybar` with id `openthrottle` and title `OpenThrottle`.
- **Icon:** Use a product icon (e.g. `$(project)` or `$(list-flat)`) or a small custom icon; must work in both light and dark themes.
- **Behavior:** Clicking the icon opens the sidebar and shows the OpenThrottle views (the Plans tree and, when implemented, any welcome or empty state).

## 2. Tree view: Plans

- **Contribution:** `contributes.views` under the `openthrottle` view container. One view with id `openthrottle.plans` and name `Plans`.
- **Structure:**
  - **Top level:** Groups by plan status. Order: **In progress** → **Pending** → **Completed** → **Blocked** → **Skipped** (or collapsed/hidden if empty). Status values align with OpenThrottle: `IN_PROGRESS`, `PENDING`, `COMPLETED`, `BLOCKED`, `SKIPPED`.
  - **Second level:** Plan nodes under each status group. Each plan shows: title (and optionally status icon or badge). Plan node is expandable.
  - **Third level:** Task nodes under a plan. Each task shows: title and status (icon or text). Task nodes are leaves (no nested children).
- **Selection:** Single selection. Selecting a plan or task is the trigger for showing the detail view.
- **Refresh:** A toolbar action or command **Refresh** that reloads plans and tasks from OpenThrottle and updates the tree.
- **Empty state:** When there are no plans, show a single node or welcome content (e.g. "No plans" with a short message or link to create one when that flow exists).

## 3. Detail view (plan or task details)

- **Trigger:** When the user selects a plan or a task in the Plans tree, show details.
- **Implementation option A — Webview:** A webview in the sidebar (or in the secondary area) that renders:
  - **For a plan:** Title, description (markdown or plain), status, optional summary, and a list of tasks (title + status per task). Read-only.
  - **For a task:** Title, description, status, optional summary, and requirements (if any). Read-only.
- **Implementation option B — Simple panel:** Use a `TextDocument` or a custom editor in the secondary area to show the same content in a simple formatted view. Read-only.
- **Recommendation:** Prefer **webview** for better formatting (markdown, links) and future extensibility; use a minimal, secure HTML template and avoid user-provided script.
- **No selection:** When nothing is selected (or selection is cleared), show placeholder text (e.g. "Select a plan or task to view details") or hide the detail view.

## 4. Commands (this phase)

- **Refresh:** `openthrottle.refresh` — Reloads plans and tasks from OpenThrottle and refreshes the tree. Available in the tree toolbar and in the Command Palette under a "OpenThrottle" category.
- **Create plan (future):** Not in scope for this design; see task "Implement create-plan-from-text flow in extension".

## 5. Data and state

- **Read path:** Extension obtains plans (e.g. by status or all) and tasks per plan from OpenThrottle. Exact API (MCP, HTTP, etc.) is defined in the integration task.
- **Caching:** Optional in-memory cache with a manual Refresh to avoid excessive calls; no automatic polling required for v1.
- **Errors:** If loading fails, show a clear message in the tree (e.g. "Failed to load plans") and optionally in the detail view; do not leave the tree blank without explanation.

## 6. Accessibility and UX

- **Keyboard:** Tree is focusable and navigable with keyboard; Enter or single click selects and shows details.
- **Theming:** Use VS Code theme colors (e.g. `foreground`, `descriptionForeground`) so the UI respects light/dark/high contrast.
- **Labels:** All icons and buttons have accessible names for screen readers.

## 7. Summary (contribution points)

For `package.json` when the extension is implemented:

- `viewsContainers.activitybar`: one container `openthrottle` (OpenThrottle).
- `views`: under `openthrottle`, one view `openthrottle.plans` (Plans).
- `commands`: at least `openthrottle.refresh` (Refresh).
- Activation: `onView:openthrottle.plans` (or `*` if preferred) so the extension activates when the user opens the OpenThrottle sidebar.

This design does not specify the exact OpenThrottle client (MCP vs API); that is covered by the "Integrate extension with OpenThrottle" task.
