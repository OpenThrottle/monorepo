# Navigation structure evaluation

Evaluation of the openthrottle-email navigation structure: whether a **unified** (single primary nav) or **separate/dual** (e.g. header + sidebar) approach is more effective. See `docs/openthrottle-email/architecture.md` for layout and route context.

---

## 1. Current state

- **GlobalHeader** (root layout): Rendered on every page. Contains:
  - Brand + “Email” label (links to inbox)
  - Horizontal nav: Inbox, Sent, Drafts, Trash, Search, Compose, Settings (same as sidebar)
  - GitHub link
- **MailSidebar** (mail layout only): Vertical sidebar for mail routes. Contains:
  - “Mail” group: Inbox, Sent, Drafts, Trash, Search, Compose, Settings (icons, labels, unread badges)
  - “Folders” group: placeholder for custom folders
  - Collapsible to icon-only via `SidebarRail`; state persisted via cookie
- **MailToolbar**: Contextual toolbar (breadcrumb, search, actions). Complements navigation but is not the primary way to switch folders.

So **primary navigation** (switching between inbox, sent, drafts, trash, search, compose, settings) is currently **dual**: same links in both header and sidebar when the user is in the mail area.

Data is shared via `app/global/data/data.navigation.ts`: `mailNavigation` drives the sidebar; `dataNavigation` is derived from it for the header so both stay in sync.

---

## 2. Options

### A. Unified navigation (single primary surface)

- **Definition:** One primary place for mail destinations (folders, Compose, Settings). The other surface is reduced or removed.
- **Variants:**
  - **Sidebar-only:** Remove mail links from GlobalHeader; header = brand + minimal global actions (e.g. Settings, GitHub, account). Sidebar is the only primary nav in the mail area.
  - **Header-only:** Remove MailSidebar; put all mail links in the header. Simpler layout but no room for unread badges, custom folders, or collapse.

### B. Separate / dual navigation (current)

- **Definition:** Both GlobalHeader and MailSidebar show the same mail links when in the mail area.
- **Effect:** Redundancy: two ways to reach the same destinations.

---

## 3. Findings

| Criterion           | Unified (sidebar primary)                                                 | Dual (header + sidebar)                                                     |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Clarity**         | One obvious place to switch folders.                                      | Two places; can cause “where do I click?”.                                  |
| **Scalability**     | Sidebar can grow (custom folders, labels) and already has icons + badges. | Header would get crowded with many folders; sidebar already handles growth. |
| **Collapsibility**  | Sidebar can stay collapsible; more horizontal space for content.          | Same; header doesn’t collapse.                                              |
| **Unread badges**   | Natural in sidebar; hard to fit in a slim header.                         | Sidebar keeps badges; header duplicates links without them.                 |
| **Mobile / narrow** | Single nav (e.g. sidebar or sheet) is easier to design.                   | Two navs increase complexity for responsive behavior.                       |
| **Consistency**     | Header role is clear: brand + app-level actions.                          | Header and sidebar overlap in purpose.                                      |

- **Header-only unified:** Would simplify chrome but loses badges, custom folders, and collapsible vertical nav; not recommended for a mail app.
- **Sidebar-only unified:** Keeps all current sidebar benefits; header becomes lighter and non-duplicative.

---

## 4. Recommendation

**Use a unified navigation with the sidebar as the single primary surface for mail destinations.**

- **Primary nav:** MailSidebar only (Inbox, Sent, Drafts, Trash, Search, Compose, Settings + future custom folders).
- **GlobalHeader:** Retain for brand, “Email” context, and global actions only:
  - Brand (link to inbox)
  - Optional: Settings and/or account (if not in sidebar) and GitHub
  - Do **not** repeat folder/compose links in the header.

Rationale:

1. **Single source of truth** for “where do I go for mail?” → the sidebar.
2. **Sidebar scales** (icons, badges, custom folders, collapse); header does not.
3. **Less redundancy** and simpler mental model.
4. **Future-proof:** If non-mail routes appear (e.g. landing, help), header can switch to “Email” vs “Help” etc.; within the email area, only the sidebar drives folder/compose/settings.

---

## 5. Implementation notes

- **Data:** Keep `mailNavigation` as the single list for mail nav. `dataNavigation` can be reduced to items that belong in the header only (e.g. Settings, GitHub), or removed if the header no longer shows mail links.
- **GlobalHeader:** Remove mail folder/compose links from the header; leave brand and non-mail actions. Optional: add a “Settings” or “Account” link in the header if desired.
- **MailSidebar:** No structural change; it remains the primary nav. Ensure “Settings” stays in the sidebar so users don’t lose access when header links are trimmed.
- **Tests / docs:** Update GlobalHeader tests and any docs that assume header contains the full mail nav. Architecture doc should state that primary mail navigation lives in the sidebar only.

---

## 6. Summary

| Question             | Answer                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Unified or separate? | **Unified.** One primary navigation surface for mail.                                                                                          |
| Which surface?       | **Sidebar.** Header should not duplicate folder/compose links.                                                                                 |
| Next steps           | (1) Remove mail links from GlobalHeader. (2) Restrict `dataNavigation` to header-only items or drop it. (3) Update tests and architecture doc. |
