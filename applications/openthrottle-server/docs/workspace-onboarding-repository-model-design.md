# Workspace onboarding: repository/checkout identity model — design

Design for OT plan `8c1944b5-389f-4d5b-a575-909c8e649e59` ("Cursor-style workspace onboarding: add a
folder / clone a repo as the primary gesture"), task `f4f9bd3d-609d-44db-a2f3-6196373fecdc`
(design doc + human sign-off gate).

Supersedes the identity portions of
[`workspace-settings-graphql-design.md`](./workspace-settings-graphql-design.md) (plan
`014a8202-4781-4307-8d11-7d44dbed78ba`). That doc's `user_workspace_settings`, editor list,
validation-rule shapes, authorization table, and "Apply editor configuration" mechanics are
unchanged and still authoritative — only `workspace_local_repositories` and the mutations built
directly on it are replaced.

**Status: SIGNED OFF (Matt, 2026-07-24).** Sections marked 🔒 restate decisions locked in the
plan description on 2026-07-24. The formerly-open questions (§§4–7) were reviewed and signed off
by Matt on 2026-07-24: §§4–6 confirmed as drafted, §7 amended — the old table is **dropped
immediately** in the migration, not renamed. Implementation tasks are unblocked.

## 1. Identity model 🔒

Split the current single `workspace_local_repositories` table into two:

- **`repositories`** — identity, keyed by normalized remote URL. One row per distinct remote
  across all users. Owns `name`, `default_branch`, and the `project_id` link (moved off the
  per-user row — a repo's OT project is a property of the repo, not of any one user's checkout).
  Local-only folders with no detected remote get a **provisional** row (`normalized_remote_url
IS NULL`) that merges into a canonical row if a remote later appears (§4).
- **`repository_checkouts`** — per-user path instances, migrated 1:1 from today's
  `workspace_local_repositories` rows. Keeps the existing unique `(user_id, filesystem_path)`
  constraint. Adds `managed` (bool, OT-cloned vs. user-registered) and `kind`
  (`'primary' | 'worktree'`, default `'primary'`) so workflow-ralph's worktree pool can unify
  onto this table later without another migration (out of scope here — `kind` is forward-looking
  plumbing only, no worktree-pool behavior changes in this plan).

Why split now rather than defer: `project_id` and git identity are properties of the _repo_, not
of any one user's local path to it. Two teammates registering the same remote at different paths
today produce two disconnected rows with independent (and possibly conflicting) `project_id`
values; that's the bug this plan exists to close. Deferring the split would mean a second
migration once multi-user usage exposes it.

### DDL

```sql
-- databases/migrations/<NNN>_create_repositories_and_checkouts.sql

CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_remote_url TEXT NULL,
    name TEXT NOT NULL,
    default_branch TEXT NULL,
    project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE repositories IS 'OpenThrottle repository identity, keyed by normalized git remote URL; provisional (NULL remote) rows exist for local-only folders until a remote is detected.';
COMMENT ON COLUMN repositories.normalized_remote_url IS 'Canonical form from normalizeRemoteUrl() (see §2); NULL for provisional local-only repositories.';
COMMENT ON COLUMN repositories.project_id IS 'OpenThrottle project link, owned at the repository level (not per-checkout) so all users sharing a remote share one project link.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_repositories_normalized_remote_url
    ON repositories (normalized_remote_url)
    WHERE normalized_remote_url IS NOT NULL;

DROP TRIGGER IF EXISTS update_repositories_updated_at ON repositories;
CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS repository_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filesystem_path TEXT NOT NULL,
    display_name TEXT NOT NULL,
    managed BOOLEAN NOT NULL DEFAULT FALSE,
    kind TEXT NOT NULL DEFAULT 'primary' CHECK (kind IN ('primary', 'worktree')),
    inspection JSONB NULL,
    scanned_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, filesystem_path)
);

COMMENT ON TABLE repository_checkouts IS 'Per-user on-disk instances of an OpenThrottle repository; the DB row is a cache over the manifest + git state actually on disk.';
COMMENT ON COLUMN repository_checkouts.managed IS 'True when OT cloned this checkout (into OPENTHROTTLE_CHECKOUT_ROOT); false for user-registered existing folders.';
COMMENT ON COLUMN repository_checkouts.kind IS 'primary = the user''s main checkout; worktree = reserved for future workflow-ralph worktree-pool unification, not used by this plan.';
COMMENT ON COLUMN repository_checkouts.inspection IS 'Cached RepositoryInspectionService snapshot (git/stack/agent-config detection); disk is the source of truth, this is a refreshable cache keyed by scanned_at.';

CREATE INDEX IF NOT EXISTS idx_repository_checkouts_repository_id ON repository_checkouts (repository_id);

DROP TRIGGER IF EXISTS update_repository_checkouts_updated_at ON repository_checkouts;
CREATE TRIGGER update_repository_checkouts_updated_at
  BEFORE UPDATE ON repository_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Remote URL normalization rules 🔒

`normalizeRemoteUrl(raw: string): string`:

1. Lowercase the host segment only (paths on some hosts are case-sensitive; hosts are not).
2. Convert SSH shorthand (`git@github.com:org/repo.git`) and `ssh://` forms to the same
   canonical shape as HTTPS: `https://<host>/<path>`.
3. Strip a trailing `.git` suffix.
4. Strip a trailing `/`.
5. No host-alias table in v1 (e.g. treating a self-hosted mirror as equivalent to
   `github.com`) — out of scope; two different hosts never normalize to the same identity even
   if they mirror the same content.

This is a pure function in `packages/nestjs-repositories` (or a shared util if
`openthrottle-agentic-utils` is more appropriate at implementation time — schema task decides),
unit-tested against the SSH/HTTPS/`.git`-suffix/case matrix directly.

## 2. Disk-as-source-of-truth 🔒

DB rows are an index/cache, never the authority:

- `repository_checkouts.inspection` + `scanned_at` is a snapshot, re-derived on access per the
  refresh cadence in §5.
- Identity is anchored on disk via an OT manifest (extending the existing
  `.openthrottle/workspace-editors.json` written by `workspace-editor-config.service.ts` — see
  task `db6ad0a7…`) carrying `repositoryId` + `checkoutId`. A moved or re-added folder is
  reconciled to its existing rows by reading this manifest first, before falling back to
  path or normalized-remote matching. This is the OT analog of `.git` anchoring identity in
  Cursor's model.

## 3. Folder-first, clone designed now 🔒

Both flows converge on one pipeline; only the clone mutation's implementation is phase-gated
(task `ecc53cce…`):

```
materialize                    inspect                    reconcile                        finalize
──────────────                 ───────                    ─────────                         ────────
add-folder: validate    ──┐                          ┌──▶ 1. manifest ids present?     ┌──▶ create/update
  path against            ├──▶ RepositoryInspection ──┤      → reuse that repo/checkout │    checkout row
  workspace-roots          │   Service scan (§ ot-      │   2. else normalized remote     │    (managed=false
  allowlist                │   postgres inspection      │      matches existing repo?    │    for add-folder,
clone: normalize URL,      │   task 29b4f86e)           │      → attach to that repo      │    managed=true
  find-or-create repo,     │                            │   3. else create provisional    │    for clone)
  git clone into           │                            │      repo (no remote) or        │
  OPENTHROTTLE_CHECKOUT_   ─┘                            └──     canonical repo (remote)   └──▶ auto-link
  ROOT                                                                                          project (108bca14…)
                                                                                                 → offer editor
                                                                                                   config (db6ad0a7…)
```

Auth v1 for clone: ambient host credentials only (SSH agent / `gh auth`). OT never stores git
credentials in the database or anywhere else.

## 4. Provisional → canonical merge semantics 🔒

Triggered when a `refreshCheckout` or re-inspection on a provisional repository (`repositories.
normalized_remote_url IS NULL`) detects a remote that didn't exist before (e.g. user ran
`git remote add origin ...` after the folder was added).

Proposed rule:

1. Normalize the newly detected remote URL.
2. Look up an existing **canonical** (non-provisional) repository with that
   `normalized_remote_url`.
   - **If found:** re-point every `repository_checkouts.repository_id` currently pointing at the
     provisional row onto the canonical row, then delete the now-empty provisional row. The
     canonical row's `project_id` wins — if the provisional row had its own manual `project_id`
     link, it is **dropped** and the canonical link takes over (surfaced to the caller as a merge
     result, not silently). Rationale: once two folders are known to be the same remote, they
     must resolve to the same project; letting the provisional link "win" would let a stale or
     accidental link outlive the merge.
   - **If not found:** the provisional row is promoted in place — set its
     `normalized_remote_url`, keep its existing `project_id` and checkouts unchanged.
3. This runs inside a single transaction; concurrent `refreshCheckout` calls on checkouts of the
   same provisional repo are serialized by locking the `repositories` row (`SELECT ... FOR
UPDATE`) for the duration of the merge.

`addWorkspaceFolder` / `cloneRepository` mutation payloads include a `merged: boolean` and, when
true, the ids of the repository/project that were superseded, so the UI can show "This folder
turned out to be the same repo as X — linked to the existing project."

## 5. Inspection refresh cadence 🔒 (TTL-on-view + manual refresh)

- **TTL-on-view (recommended default):** when a checkout's `scanned_at` is older than
  **15 minutes**, the GraphQL read path (`workspaceSettings` / checkout resolvers) triggers a
  synchronous re-scan before returning that checkout's fields. 15 minutes balances staleness
  (branch/dirty-state drift matters for onboarding decisions) against re-scanning on every
  keystroke-adjacent request; it is a constant, not user-configurable, in v1.
- **Manual refresh:** `refreshCheckout(id)` always re-scans regardless of TTL and is the only way
  to force a re-scan of a healthy (non-stale) checkout — e.g. right after the user pulls a branch
  change on disk.
- Both paths go through the same `RepositoryInspectionService.scan()` call (task `29b4f86e…`);
  TTL is enforced by the resolver/service layer, not duplicated inside the inspection service
  itself.
- Drift flags (path missing, remote changed, branch moved) are computed by diffing the new scan
  against the previous `inspection` snapshot at write time, not stored as a separate column.

## 6. Security posture for fs inspection/browse 🔒

- **Allowlist:** a new **workspace-roots config** (`OPENTHROTTLE_WORKSPACE_ROOTS`, comma-separated
  absolute paths, e.g. `~/Development`) is the allowlist for `discoveredFolders` (shallow scan)
  and `browseDirectory` (subdirectory listing). This is **separate** from
  `OPENTHROTTLE_ALLOWED_WORKING_DIRS` (used by `validateWorkingDirectory` in
  `enqueue-plan-ralph-tuning.ts`) because the two serve different trust boundaries: working-
  directory validation gates _executing Ralph_ in a path a user already explicitly typed, while
  workspace-roots gates the _server proactively walking the filesystem and listing what it
  finds_ — a broader capability that needs a narrower, purpose-configured allowlist. When
  `OPENTHROTTLE_WORKSPACE_ROOTS` is unset, `discoveredFolders`/`browseDirectory` return empty
  rather than falling back to "anything exists" (unlike `validateWorkingDirectory`'s permissive
  host-run default) — proactive scanning is opt-in, targeted enqueue validation is not.
- **`addWorkspaceFolder(path)`** (explicit single-path add, not a scan) reuses the existing
  `validateWorkingDirectory`-style checks (absolute, exists, is a directory, NUL rejection, max
  length) — it does not require the path to be under a workspace root, matching today's
  behavior for `createWorkspaceLocalRepository`. Workspace-roots scope only the _discovery_
  surface (browse/scan), not the add-a-known-path escape hatch.
- **Symlinks:** `discoveredFolders`'s shallow scan does not follow symlinked directories (avoids
  loops and escaping the allowlist via a symlink pointing outside it). `browseDirectory` resolves
  the requested path with `fs.realpathSync` and re-checks the resolved path against the allowlist
  before listing, so a symlink cannot be used to browse outside the configured roots.
  `RepositoryInspectionService` itself does not need symlink-following since it operates on an
  already-validated, already-resolved checkout path.
- **`toContainerPath` translation:** all path validation in the new services translates through
  `toContainerPath` exactly like `validateWorkingDirectory` does today, so the workspace-roots
  allowlist is configured in host-view paths and compared in this-process view when the Docker
  workspace bridge is active.

## 7. Migration mechanics for `workspace_local_repositories` 🔒

- Migration runs in the same file as the `CREATE TABLE IF NOT EXISTS` statements above (idempotent
  re-run safe), as a data-migration block after DDL:
  1. For each distinct non-null, non-empty `git_remote_url` in `workspace_local_repositories`,
     normalize it and `INSERT ... ON CONFLICT (normalized_remote_url) DO NOTHING` into
     `repositories`, taking `name` from the first row's `display_name` and `default_branch` from
     `git_default_branch`.
  2. For each **distinct `project_id`** among rows sharing a `normalized_remote_url`: if more than
     one non-null `project_id` value exists for the same normalized remote (today's exact bug —
     two users' rows disagree), the migration picks the **earliest-created** row's `project_id`
     as the winner and logs the discarded ones via `RAISE NOTICE` for manual follow-up. This is
     expected to be rare (single-tenant OT deployments today) but must not silently pick an
     arbitrary one.
  3. Rows with no remote get one **provisional** repository row each (1:1, not deduped — there is
     no identity signal to merge distinct local-only folders on).
  4. Every original row becomes one `repository_checkouts` row: `filesystem_path`, `display_name`,
     `user_id` carried over unchanged, `repository_id` pointing at the row created/matched in
     steps 1–3, `managed = false`, `kind = 'primary'`, `inspection = NULL`, `scanned_at = NULL`
     (first read triggers the TTL-on-view scan from §5).
- **Old table:** `workspace_local_repositories` is **dropped** in the same migration, immediately
  after the data-lift block (decision: Matt, 2026-07-24 — amended from this doc's drafted
  rename-then-drop proposal). The DDL, data lift, and `DROP TABLE IF EXISTS` run in one
  transaction, so a failed lift rolls back whole rather than leaving a half-migrated state;
  recovery from a lift that succeeds but is later found wrong is via database backup, not a
  retained copy of the old table. There is no dual-schema window: the service layer is re-backed
  by the new tables in the same change (schema task `1c6b9500…`), so no code path reads the old
  table after the migration runs.
- `WorkspaceLocalRepositoriesService` and its GraphQL surface
  (`createWorkspaceLocalRepository`, `updateWorkspaceLocalRepository`,
  `deleteWorkspaceLocalRepository`, `setWorkspaceLocalRepositoryProject`) are marked
  `@deprecated(reason: "replaced by addWorkspaceFolder / repository checkouts")` per the schema
  deprecation policy, not removed — existing developer-app code paths and any external consumers
  keep working until the UI task (`8c4adf5d…`) removes the calling code, at which point a later
  cleanup can drop the fields entirely.

## 8. Picker = discovered folders, not a text box 🔒

- `discoveredFolders` query: for each configured workspace root, shallow-scan (bounded depth,
  no unbounded recursive walk — same "read-only, bounded, timeboxed" constraint as
  `RepositoryInspectionService`) for immediate child directories containing a `.git` entry.
  Each candidate is annotated `alreadyRegistered: boolean` by checking both the OT manifest (if
  present in the candidate folder) and a path match against existing `repository_checkouts` for
  the calling user.
- `browseDirectory(path)`: lists immediate subdirectories of `path`, which must resolve (after
  symlink resolution, §6) under a configured workspace root. Powers the fallback "I know it's
  under here somewhere" navigation when a repo isn't surfaced by the shallow scan (e.g. nested
  deeper than one level).
- UI copy is explicit that these are paths **on the server host**, not the browser's machine —
  carried into the UI task (`8c4adf5d…`) as a non-negotiable copy requirement, not a nice-to-have.

## 9. `run_config` v2 shape (for plan `388a9046…`, lands first) 🔒

**Sequencing:** plan `388a9046` (extract isomorphic plan-run-config into
`@openthrottle/plan-run-config` or equivalent shared source-first package) must merge before task
`90a9a16d…` in this plan touches the run-config shape. This section documents the target shape so
that extraction work already has the destination in view; it does not implement it.

```ts
interface WorkspaceRunConfigV2 {
  /** Explicit checkout — highest priority in resolution. */
  checkoutId?: string;
  /** Portable intent — resolved to the enqueuing user's checkout for that repository. */
  repositoryId?: string;
  /** Escape hatch — raw path, validated by validateWorkingDirectory exactly as today. */
  workingDirectory?: string;
}
```

Resolution order at enqueue (`checkoutId` → `repositoryId` → `workingDirectory`), re-validation,
and `plan_runs` snapshotting of both the id and resolved path are already locked (plan decision 6)
and unchanged by this doc — restated here only for completeness since it's the piece that
depends on §1's tables existing.

## Implementation map (plan tasks)

| Task                           | Depends on this doc's §§                             |
| ------------------------------ | ---------------------------------------------------- |
| `1c6b9500…` Schema             | §1 (DDL), §7 (migration mechanics)                   |
| `29b4f86e…` Inspection service | §5 (refresh cadence), §6 (allowlist/symlink policy)  |
| `e3c86149…` GraphQL surface    | §3 (pipeline), §6 (browse/discover), §8 (picker)     |
| `108bca14…` Project auto-link  | §4 (merge semantics)                                 |
| `90a9a16d…` run_config         | §9 — **blocked on plan `388a9046` merging first**    |
| `8c4adf5d…` Developer UI       | §8 (copy), §9 (selector)                             |
| `db6ad0a7…` Editor config      | §2 (manifest anchor)                                 |
| `ecc53cce…` Clone              | §3 (converged pipeline), auth v1 per plan decision 3 |

## Sign-off record

- Decisions 1–6 (plan description, §§1–3, 8, 9 here): **locked with Matt, 2026-07-24.**
- §§4–6 (provisional merge — canonical project link wins; refresh cadence — 15-min TTL-on-view +
  manual refresh; security — separate `OPENTHROTTLE_WORKSPACE_ROOTS` allowlist, empty-by-default):
  **confirmed as drafted by Matt, 2026-07-24.**
- §7 (migration mechanics): **amended by Matt, 2026-07-24** — the old table is dropped
  immediately in the same migration rather than renamed; §7 above reflects the amended decision.
- The human sign-off gate is **satisfied**; downstream implementation tasks (`1c6b9500…` onward)
  are unblocked.
