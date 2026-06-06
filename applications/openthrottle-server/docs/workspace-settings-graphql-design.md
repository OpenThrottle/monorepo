# Workspace settings — data model and GraphQL API

Design for **Settings → Workspace** in openthrottle-developer. Implements plan `014a8202-4781-4307-8d11-7d44dbed78ba` (task: data model and GraphQL API).

## Scope

- **Workspace** = the authenticated user’s local developer machine configuration (not a separate multi-tenant workspace entity).
- All rows are scoped by `user_id` from JWT `sub` (`@CurrentUser('sub')`).
- **Backwards compatibility:** additive only — new tables and GraphQL types; no changes to existing plan/task/user/project fields.

## Persistence

Migration: `databases/migrations/042_create_workspace_settings_tables.sql`

| Table                          | Purpose                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `user_workspace_settings`      | One row per user: contact name/email, enabled editors (JSONB)                             |
| `workspace_local_repositories` | Many per user: absolute path, display label, optional git metadata, optional `project_id` |

TypeORM entities: `packages/nestjs-repositories/src/modules/workspace-settings/`.

### `user_workspace_settings`

| Column                     | Type                  | Notes                                                                   |
| -------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `user_id`                  | UUID PK, FK → `users` | Cascade delete                                                          |
| `contact_display_name`     | TEXT NULL             | Display name for notifications / attribution                            |
| `contact_email`            | TEXT NULL             | Distinct from `users.email` (auth); used for workspace profile defaults |
| `enabled_editors`          | JSONB                 | Array of editor ids, default `[]`                                       |
| `created_at`, `updated_at` | TIMESTAMPTZ           | Standard trigger                                                        |

### `workspace_local_repositories`

| Column                     | Type                      | Notes                                                   |
| -------------------------- | ------------------------- | ------------------------------------------------------- |
| `id`                       | UUID PK                   |                                                         |
| `user_id`                  | UUID FK → `users`         | Cascade delete                                          |
| `filesystem_path`          | TEXT NOT NULL             | Canonical absolute path (server-normalized)             |
| `display_name`             | TEXT NOT NULL             | User-facing label                                       |
| `git_remote_url`           | TEXT NULL                 | Optional origin URL                                     |
| `git_default_branch`       | TEXT NULL                 | Optional default branch name                            |
| `project_id`               | UUID NULL FK → `projects` | Optional Cortex project link (v1: one project per repo) |
| `created_at`, `updated_at` | TIMESTAMPTZ               |                                                         |

**Unique constraint:** `(user_id, filesystem_path)` — one registration per path per user.

**Project linkage (v1):** nullable `project_id` on the repo row. A join table for many projects per repo is deferred until product needs it.

## Supported editors

Enum `WorkspaceEditorId` (GraphQL) / `WorkspaceEditorId` (TS):

| Value    | Meaning            |
| -------- | ------------------ |
| `cursor` | Cursor IDE         |
| `vscode` | Visual Studio Code |

Stored in `enabled_editors` as a JSON array of strings (e.g. `["cursor","vscode"]`). Unknown values rejected on write.

## Validation rules

### Filesystem path (`filesystem_path`)

Reuse the same rules as plan Ralph `workingDirectory` (`validateWorkingDirectory` in `enqueue-plan-ralph-tuning.ts`):

1. Trim whitespace; empty is invalid on create.
2. Max length **4096** characters.
3. Must be **absolute** (`path.isAbsolute`).
4. Must **exist** on the server filesystem (`existsSync`).
5. Must be a **directory** (`statSync().isDirectory()`).
6. Reject paths containing **NUL** (`\0`).
7. Optional: if `OPENTHROTTLE_ALLOWED_WORKING_DIRS` is set (comma-separated absolute prefixes), path must equal or start with one prefix + `/`.

**Normalization before persist:** `path.resolve(trimmed)` so duplicates and `..` segments collapse consistently for the unique index.

**Uniqueness:** inserting or updating to a path that another row for the same `user_id` already has → conflict error.

### Display name

- Required on create; trimmed; max **256** characters.

### Git metadata

- `git_remote_url`: optional; max **2048**; if present, must parse as `http:`, `https:`, `git:`, or `ssh:` URL (basic validation).
- `git_default_branch`: optional; max **256**; no path separators.

### Contact email

- Optional; max **320** characters.
- If non-empty after trim: match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (practical subset; not full RFC 5322).

### Contact display name

- Optional; max **256** characters after trim.

### `project_id`

- When set, `projects` row must exist (`ProjectsService.findById` or FK violation).
- Clearing link: set `null`.

### Enabled editors

- Each entry must be in `WORKSPACE_EDITOR_IDS` (`cursor`, `vscode`).
- Deduplicate on write; order preserved as submitted.

## Authorization

| Operation                            | Permission       | Scope                   |
| ------------------------------------ | ---------------- | ----------------------- |
| Read workspace settings / list repos | `settings:read`  | Only rows for JWT `sub` |
| Mutations                            | `settings:write` | Only rows for JWT `sub` |

**Follow-up:** `ROLES.USER` currently has `settings:read` but not `settings:write`. Before shipping the settings UI, grant `settings:write` to `USER` (or add a dedicated `workspace:write` permission) so non-admin users can edit their own workspace. Admins already have `settings:write`.

## GraphQL API (additive)

Module: `applications/openthrottle-server/src/graphql/workspace-settings/` (types registered in follow-up tasks; resolver implementation split across backend tasks).

### Types

```graphql
enum WorkspaceEditorId {
  CURSOR
  VSCODE
}

type UserWorkspaceProfile {
  userId: ID!
  contactDisplayName: String
  contactEmail: String
  enabledEditors: [WorkspaceEditorId!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type WorkspaceLocalRepository {
  id: ID!
  userId: ID!
  filesystemPath: String!
  displayName: String!
  gitRemoteUrl: String
  gitDefaultBranch: String
  projectId: ID
  project: Project
  createdAt: DateTime!
  updatedAt: DateTime!
}

"""
Aggregate for Settings → Workspace loader.
"""
type WorkspaceSettings {
  profile: UserWorkspaceProfile!
  localRepositories: [WorkspaceLocalRepository!]!
}
```

### Queries

| Field                        | Args      | Returns                        | Notes                                                  |
| ---------------------------- | --------- | ------------------------------ | ------------------------------------------------------ |
| `workspaceSettings`          | —         | `WorkspaceSettings!`           | Lazy-create empty `user_workspace_settings` if missing |
| `workspaceLocalRepository`   | `id: ID!` | `WorkspaceLocalRepository`     | 404/null if not owned by caller                        |
| `workspaceLocalRepositories` | —         | `[WorkspaceLocalRepository!]!` | Ordered by `created_at` DESC                           |

### Mutations

| Field                                | Input                                 | Returns                     |
| ------------------------------------ | ------------------------------------- | --------------------------- |
| `updateWorkspaceProfile`             | `UpdateWorkspaceProfileInput`         | `UserWorkspaceProfile!`     |
| `createWorkspaceLocalRepository`     | `CreateWorkspaceLocalRepositoryInput` | `WorkspaceLocalRepository!` |
| `updateWorkspaceLocalRepository`     | `UpdateWorkspaceLocalRepositoryInput` | `WorkspaceLocalRepository!` |
| `deleteWorkspaceLocalRepository`     | `id: ID!`                             | `Boolean!`                  |
| `setWorkspaceLocalRepositoryProject` | `id`, `projectId` (nullable)          | `WorkspaceLocalRepository!` |

**Input sketches:**

```graphql
input UpdateWorkspaceProfileInput {
  contactDisplayName: String
  contactEmail: String
  enabledEditors: [WorkspaceEditorId!]
}

input CreateWorkspaceLocalRepositoryInput {
  filesystemPath: String!
  displayName: String!
  gitRemoteUrl: String
  gitDefaultBranch: String
  projectId: ID
}

input UpdateWorkspaceLocalRepositoryInput {
  id: ID!
  displayName: String
  gitRemoteUrl: String
  gitDefaultBranch: String
  projectId: ID
}
```

`UpdateWorkspaceLocalRepositoryInput` does not allow changing `filesystem_path` in v1 (delete + recreate). Optional follow-up: `updateWorkspaceLocalRepositoryPath` with re-validation and unique constraint check.

### ResolveField

- `WorkspaceLocalRepository.project` → `ProjectsLoaders` / `ProjectsService` when `projectId` is set.

## Developer app integration

Route: `applications/openthrottle-developer/app/routes/settings.workspace.tsx`

- **Loader:** `workspaceSettings` query (profile + repos); projects list for project picker (`projects` query).
- **Actions:** intent-based forms calling the mutations above.
- **Client path hints:** reuse `validateWorkspacePathClient` from `~/routing/plans/utils/workspace-path` (non-authoritative).

GraphQL document: `settings.workspace.tsx.graphql` (to be filled in UI task).

## MCP / attribution

`contact_display_name` and `contact_email` are intended as defaults where the platform needs a human-facing identity (notifications, optional MCP author hints). They do **not** replace `users.github_username` for Git attribution rules.

## Implementation map (plan tasks)

| Task                                     | Delivers                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Design (this doc) + migration + entities | ✅                                                                                            |
| Backend: CRUD local repos                | `WorkspaceLocalRepositoriesService`, create/list/update/delete mutations                      |
| Backend: project link                    | `setWorkspaceLocalRepositoryProject`, FK checks                                               |
| Backend: profile                         | ✅ `UserWorkspaceSettingsService`, `updateWorkspaceProfile`, `workspaceSettings`              |
| Backend: editors                         | ✅ `validateEnabledEditors`, `updateProfile` / `enabled_editors` via `updateWorkspaceProfile` |
| Developer UI                             | Forms, loader/action, tests                                                                   |
| Apply editor config                      | ✅ `applyWorkspaceEditorConfiguration`, `WorkspaceEditorConfigService`                        |

## Apply editor configuration

Mutation: `applyWorkspaceEditorConfiguration(input: ApplyWorkspaceEditorConfigurationInput): ApplyWorkspaceEditorConfigurationResultObject!`

- Loads the user’s `enabled_editors` and linked `workspace_local_repositories`.
- Optional `repositoryIds` limits which repos are updated; omit to apply to all.
- For each enabled editor and target repo:
  - **MCP:** merges `openthrottle-mcp` into `.cursor/mcp.json` or `.vscode/mcp.json` when `scripts/run-openthrottle-mcp.sh` exists (OpenThrottle monorepo checkout). Uses `API_URL_INTERNAL` for `API_URL` / `API_URL_INTERNAL` env vars. Does **not** write auth tokens; set `OPENTHROTTLE_MCP_AUTH_TOKEN` in the editor MCP env separately.
  - **Skills paths:** ensures parent directories exist for skill paths from `OPENTHROTTLE_REPO_SKILL_PATHS` (keep aligned with `repo-skills-registry.ts`).
  - **Rules:** ensures `.cursor/rules` or `.vscode` directory exists.
  - **Manifest:** writes `.openthrottle/workspace-editors.json` with applied paths and timestamp.

Service: `packages/nestjs-repositories/src/modules/workspace-settings/workspace-editor-config.service.ts`

Developer UI: Settings → Workspace → **Apply editor configuration** (after enabling editors and linking repos).

### Adding a new editor

1. Add id to `WORKSPACE_EDITOR_IDS` / `WorkspaceEditorId` enum (DB JSON + GraphQL).
2. Add paths in `workspace-editor-config-paths.ts` (`mcpConfigRelativePath`, `rulesDirectoryRelativePath`).
3. Map layout in `layoutForEditor` if skills use a new directory convention.
4. Add option to `WORKSPACE_EDITOR_OPTIONS` in the developer app.

## Related code

- Path validation (Ralph): `applications/openthrottle-server/src/graphql/plans/enqueue-plan-ralph-tuning.ts` — `validateWorkingDirectory`
- Client path validation: `applications/openthrottle-developer/app/routing/plans/utils/workspace-path.ts`
- Skill registry (UI): `applications/openthrottle-developer/app/routing/agents/data/repo-skills-registry.ts`
- Skill paths (apply): `packages/nestjs-repositories/.../openthrottle-repo-skill-paths.ts`
