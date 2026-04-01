# Cortex naming audit: env vars and settings

**Plan-Id:** d84f60df-abd9-4ca8-bcc3-a0928b4dc4a5
**Task-Id:** a6bef2a9-dc13-438e-bdc8-9aa98838b732
**Scope:** All `CORTEX_*` env vars and `cortex.*` (and related) settings. Audit only—no renames.

---

## 1. Root `.env.default`

| Variable                   | Purpose                                                        | Default / note                          |
| -------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| `CORTEX_GITHUB_USER`       | GitHub username for plan/task author and assignee (ai-mcp)     | `"visormatt"`                           |
| `CORTEX_POSTGRES_HOST`     | Postgres host for Cortex DB                                    | `"localhost"`                           |
| `CORTEX_POSTGRES_DB`       | Database name                                                  | `"cortex"`                              |
| `CORTEX_POSTGRES_PASSWORD` | DB password                                                    | `"cortex_password"`                     |
| `CORTEX_POSTGRES_PORT`     | DB port                                                        | `"5556"`                                |
| `CORTEX_POSTGRES_USER`     | DB user                                                        | `"cortex_user"`                         |
| `CORTEX_POSTGRES_URL`      | Optional full connection string (comment only in .env.default) | Built from the five vars above if unset |

Also referenced in comments: `USE_GLOBAL_NAVIGATION_V2` (Cortex app UI).

---

## 2. Cursor / VS Code settings

### `.cursor/settings.json`

| Setting             | Value (example)           | Purpose                                                      |
| ------------------- | ------------------------- | ------------------------------------------------------------ |
| `cortex.apiBaseUrl` | `"http://localhost:6010"` | Base URL for cortex-api GraphQL (extension and app use this) |

### `.vscode/settings.json.default`

| Setting             | Value (example)           | Purpose                                     |
| ------------------- | ------------------------- | ------------------------------------------- |
| `cortex.apiBaseUrl` | `"http://localhost:6010"` | Same as above; default template for VS Code |

### `.vscode/settings.json` (if present)

Same key `cortex.apiBaseUrl` (observed in repo as `"http://localhost:6010"`).

---

## 3. Applications `cortex` and `cortex-api` env files

- **applications/cortex** and **applications/cortex-api** do **not** exist in the repo. The plan’s “applications/cortex and cortex-api .env” refers to apps that may have been consolidated or renamed (e.g. openthrottle-developer uses `API_URI` for codegen; openthrottle-server may serve the Cortex GraphQL API).
- No dedicated `.env` or `.env.default` under an app named `cortex` or `cortex-api` was found.

---

## 4. VS Code extension config (`packages/openthrottle/vscode-openthrottle`)

### `package.json` → `contributes.configuration`

| Property            | Type   | Default                   | Description                                    |
| ------------------- | ------ | ------------------------- | ---------------------------------------------- |
| `cortex.apiBaseUrl` | string | `"http://localhost:6021"` | Base URL for cortex-api (GraphQL at /graphql). |

Configuration **title** is `"Cortex"`. No `cortex.defaultAuthor` is declared in `package.json`; the code in `src/config.ts` reads `cortex.defaultAuthor` via `getDefaultAuthor()` (CONFIG_SECTION `'cortex'`, CONFIG_DEFAULT_AUTHOR `'defaultAuthor'`). So the effective setting is **cortex.defaultAuthor** (documented in INTEGRATION.md) but not in the contribution schema—consider adding for clarity.

### Code / config files

- **src/config.ts**: `CONFIG_SECTION = 'cortex'`, `CONFIG_API_BASE_URL = 'apiBaseUrl'`, `CONFIG_DEFAULT_AUTHOR = 'defaultAuthor'`; `getApiBaseUrl()` and `getDefaultAuthor()` read from `vscode.workspace.getConfiguration('cortex')`. Defaults: API base `http://localhost:6021`, author `visormatt`.
- **apollo.config.mjs**: `CORTEX_API_URI` is **commented out**; schema URL is hardcoded in **codegen.ts** as `http://localhost:6021/graphql` (FIXME: MAKE IT DYNAMIC).

### Extension IDs / commands (for rename strategy)

All under the `cortex` namespace:

- **View container:** `cortex` (activity bar)
- **Views:** `cortex.plans`, `cortex.welcome`, `cortex.docs`
- **Commands:** `cortex.refresh`, `cortex.createPlanFromText`, `cortex.openIntegrationDoc`, `cortex.openDoc`
- **Submenu:** `cortex.submenu`
- **Package output:** `openthrottle.vsix`; install path references `openthrottle.vsix`

---

## 5. `CORTEX_API_URI`

- **Documented** in:
  - `docs/monorepo/local-services-and-ports.md` (with `cortex.apiBaseUrl`)
- **Not read in code** in this repo: no `process.env.CORTEX_API_URI` in uncommented code. openthrottle-developer (and similar apps) use **`API_URI`** for codegen, not `CORTEX_API_URI`.
- **Commented:** `packages/openthrottle/vscode-openthrottle/apollo.config.mjs` (cortexAPIURI / CORTEX_API_URI).

So for a future rename, either introduce and use `CORTEX_API_URI` consistently or standardize on a single name (e.g. `API_URI` or a new product-prefixed var).

---

## 6. Other `CORTEX_*` usages (code and docs)

- **ai-mcp** (`packages/mattscholta/ai-mcp/src/config.ts`): Reads `CORTEX_POSTGRES_URL`, `CORTEX_POSTGRES_DB`, `CORTEX_POSTGRES_HOST`, `CORTEX_POSTGRES_PASSWORD`, `CORTEX_POSTGRES_USER`, `CORTEX_POSTGRES_PORT`; and `GITHUB_USER` or `CORTEX_GITHUB_USER` for author/assignee.
- **docs-mcp** (`packages/mattscholta/docs-mcp/src/config.ts`): **JSDoc** says `CORTEX_POSTGRES_*` / `DOCS_MCP_*`, but **implementation** uses `POSTGRES_URL`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_PORT` (no CORTEX* or DOCS_MCP* prefix). Defaults include `'cortex'` as DB name and `'cortex_password'` / `'cortex_user'`. Discrepancy to fix in a future pass.
- **Workflows / scripts**: Many scripts and `tools/workflows` reference `CORTEX_POSTGRES_URL` or `CORTEX_POSTGRES_*` in error messages and docs (see scripts audit for full list).
- **Docker:** `docker-compose-databases.yml` uses `CORTEX_POSTGRES_DB`, `CORTEX_POSTGRES_PASSWORD`, `CORTEX_POSTGRES_PORT`, `CORTEX_POSTGRES_USER` (and healthcheck references same).

---

## 7. Summary table for future rename

| Location                                  | Identifier                                                                                        | Notes                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| .env.default                              | CORTEX*GITHUB_USER, CORTEX_POSTGRES*\*                                                            | 6 vars + optional CORTEX_POSTGRES_URL                            |
| .cursor/settings.json                     | cortex.apiBaseUrl                                                                                 | Cursor-specific                                                  |
| .vscode/settings.json.default             | cortex.apiBaseUrl                                                                                 | Template                                                         |
| .vscode/settings.json                     | cortex.apiBaseUrl                                                                                 | Workspace                                                        |
| packages/openthrottle/vscode-openthrottle | cortex.apiBaseUrl, cortex.defaultAuthor (code), config title "Cortex", view/command IDs cortex.\* | One setting in schema; defaultAuthor in code only                |
| packages/openthrottle/vscode-openthrottle | openthrottle.vsix                                                                                 | Output filename                                                  |
| packages/mattscholta/ai-mcp               | CORTEX*POSTGRES*\*, CORTEX_GITHUB_USER                                                            | Env only                                                         |
| packages/mattscholta/docs-mcp             | JSDoc: CORTEX*\* / DOCS_MCP*\_; code: POSTGRES\_\_                                                | Align code vs docs and naming                                    |
| Docs / scripts                            | CORTEX_API_URI                                                                                    | Documented; not used in code (use API_URI or add CORTEX_API_URI) |

---

_Audit completed for task a6bef2a9-dc13-438e-bdc8-9aa98838b732. No code or config changes._
