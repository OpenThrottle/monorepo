# VSCode Extension: Name and Display Name

**Plan:** OpenThrottle rebrand: naming exploration (OpenThrottle plan `55515309-02bd-4264-8326-c5b8efd614cb`).  
**Task:** VSCode Extension: name and display name.  
**Criteria:** See [naming-criteria.md](./naming-criteria.md).  
**Context:** Marketing site ([marketing-website-naming.md](./marketing-website-naming.md)): `openthrottle.ai`. Developer Portal ([developer-portal-naming.md](./developer-portal-naming.md)): `developers.openthrottle.ai`, display name "OpenThrottle Developer Portal". API ([developer-api-naming.md](./developer-api-naming.md)): `api.openthrottle.ai`, display name "OpenThrottle API".

---

## 1. Scope: Extension ID and display name

The VSCode extension needs:

- **Extension ID:** Unique on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/) (format `publisher.extensionName`). Shown in URLs and in `extension.id`; cannot be changed after first publish.
- **Display name:** Shown in the Marketplace listing, Extensions view, and in-IDE UI (e.g. activity bar, command palette). Should be recognizable and consistent with the rest of the brand.

**Constraint (from naming criteria):** Same root everywhere; use the OpenThrottle brand. Extension ID publisher should align with org/product (e.g. `openthrottle`); display name should clearly be OpenThrottle.

---

## 2. Extension ID options

| Option                           | Extension ID                        | Pros                                                                                                   | Cons / notes                                                                                              |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **A. openthrottle.openthrottle** | `openthrottle.openthrottle`         | Matches brand exactly; one word repeated (common pattern, e.g. `ms-vscode.vscode`).                    | Redundant; some tooling shortens to "openthrottle" in UI.                                                 |
| **B. openthrottle.vscode**       | `openthrottle.vscode`               | Clearly "the OpenThrottle VS Code extension"; aligns with possible npm package `@openthrottle/vscode`. | "vscode" is generic; other editors (Cursor) also use VS Code extension host.                              |
| **C. openthrottle.extension**    | `openthrottle.extension`            | Generic "extension" suffix.                                                                            | Less specific than "vscode"; "extension" is very generic.                                                 |
| **D. OpenThrottle.openthrottle** | N/A (Marketplace IDs are lowercase) | —                                                                                                      | Publisher and name are normalized to lowercase; use `openthrottle.openthrottle` or `openthrottle.vscode`. |

**Note:** Marketplace extension IDs are case-insensitive and stored lowercase. Publisher must be registered (e.g. create publisher `openthrottle` on the Marketplace) before first publish.

---

## 3. Display name options

| Option                              | Display name                 | Pros                                                                                       | Cons / notes                                                                                             |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **A. OpenThrottle**                 | OpenThrottle                 | Short; matches brand; consistent with "OpenThrottle API", "OpenThrottle Developer Portal". | In Extensions view, "OpenThrottle" alone may be ambiguous (e.g. other products could use similar names). |
| **B. OpenThrottle for VS Code**     | OpenThrottle for VS Code     | Explicit "for VS Code"; good for Marketplace search and clarity.                           | Slightly longer; Cursor also runs VS Code extensions, so "for VS Code" is still accurate.                |
| **C. OpenThrottle for Cursor**      | OpenThrottle for Cursor      | If primary audience is Cursor users.                                                       | Narrows to one editor; extension runs in any VS Code–compatible host (VS Code, Cursor, etc.).            |
| **D. OpenThrottle – Plans & Tasks** | OpenThrottle – Plans & Tasks | Describes function (plans/tasks).                                                          | Longer; function may change over time; other docs use "OpenThrottle" + product (API, Portal).            |

---

## 4. Recommendation

**Extension ID: `openthrottle.openthrottle`**

- **Rationale:**
  - Matches the OpenThrottle brand exactly; same root as org (GitHub OpenThrottle), domain (openthrottle.ai), and other surfaces.
  - Publisher `openthrottle` and extension name `openthrottle` are simple and memorable; common pattern for single-product publishers (e.g. `publisher.product`).
  - If we later publish a second extension (e.g. theme or snippet pack), we can use `openthrottle.theme` or similar under the same publisher.
  - **Availability:** Confirm on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/) that publisher `openthrottle` and extension ID `openthrottle.openthrottle` are available (or claim publisher before first publish).

**Display name: OpenThrottle for VS Code**

- **Rationale:**
  - Clearly identifies the product (OpenThrottle) and the surface (VS Code); aligns with naming criteria (recognizable, consistent).
  - "For VS Code" is accurate for both VS Code and Cursor (and any VS Code–compatible host); avoids over-specifying one editor.
  - Good for Marketplace search ("OpenThrottle" + "VS Code") and in-IDE discovery.
  - Consistent with the pattern used for other surfaces (e.g. "OpenThrottle API", "OpenThrottle Developer Portal") while adding the context "for VS Code".

**In-IDE shortcuts:** In activity bar, views, and command palette we can shorten to **"OpenThrottle"** when context is clear (e.g. "OpenThrottle" view container, "OpenThrottle: Refresh"); the full "OpenThrottle for VS Code" remains the canonical display name for the extension listing and docs.

---

## 5. Availability and next steps

- **Marketplace:** Before first publish, register the publisher `openthrottle` (or confirm it is available) and ensure no existing extension uses `openthrottle.openthrottle`. Extension ID cannot be changed after publish.
- **Codebase:** When implementing the rebrand, update the extension’s `package.json`: `name` (npm package name can stay or become `@openthrottle/vscode`), Marketplace publisher and extension identifier to `openthrottle.openthrottle`, and display name to "OpenThrottle for VS Code". Update all user-facing strings (views, commands, configuration title) from "OpenThrottle" to "OpenThrottle" per the final naming matrix.
