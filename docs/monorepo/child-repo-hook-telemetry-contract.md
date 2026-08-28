# Child-repo hook telemetry — scoping and privacy contract

**Sibling of** [`child-repo-hook-overlay.md`](./child-repo-hook-overlay.md) (how the hooks get
there) and [`foreign-workspace-skill-injection.md`](./foreign-workspace-skill-injection.md).

This document is **delivery-mechanism independent**. It defines what a `@openthrottle/agentic-hooks`
hook is allowed to do when it runs in a repository that is **not** this monorepo, regardless of whether
it got there via the plugin (leg A), `--plugin-dir` (leg B), or anything built later.

## Why this is needed

Every resolution path in the hook core was written against exactly one repository — this one — and each
one silently assumes it. Running unchanged in a child repo, the core would:

| behavior                                  | code                                  | what it does in a foreign repo                                             |
| ----------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| read `<repoRoot>/.env` for the endpoint   | `config/env.ts` → `resolveGraphqlUrl` | reads a **stranger's** `.env`                                              |
| read `<repoRoot>/.env` for the auth token | `config/env.ts` → `resolveAuthToken`  | ditto, for credentials                                                     |
| classify a skill as ours vs third-party   | `utils/scope.ts` → `detectScope`      | `<repoRoot>/skills/<name>` never exists → **everything** is `third-party`  |
| buffer failed posts to JSONL              | `data/jsonl.ts` → `defaultJsonlPath`  | writes `<repoRoot>/.cache/skill-usage/…` **into the child's working tree** |

The last row is the serious one: leg B's headline property is _zero disk mutation in the target repo_,
and the JSONL fallback breaks it precisely when it matters most — a foreign repo is the case **most**
likely to have no reachable OT server, so the fallback is the normal path there, not the rare one.

The rules below are what the overlay must satisfy. Each is stated so it can be tested.

---

## 1. Repo classification — `home` vs `foreign`

Everything else keys off one binary decision made once per hook invocation.

A repo is **`home`** when its root contains OT's own marker (this monorepo, or a worktree of it).
Otherwise it is **`foreign`**. The check must be a filesystem test on the resolved repo root, not a
guess from the endpoint or the branch — the endpoint is exactly what we are trying to decide whether to
trust.

`home` keeps every behavior described above, unchanged. Nothing in this contract alters how hooks
behave inside the monorepo, and the existing tests must keep passing untouched. `foreign` gets the
restricted profile in §2–§5.

**Repo root resolution stays as it is** (`CLAUDE_PROJECT_DIR` → `OPEN_THROTTLE_REPO_ROOT` → `cwd`).
Under the plugin, `CLAUDE_PROJECT_DIR` is the _target_ repo, not the plugin dir — verified in the
spike — so the existing chain already resolves correctly and needs no change.

## 2. Endpoint discovery — never from a foreign checkout

In `foreign` repos the `<repoRoot>/.env` legs of `resolveGraphqlUrl` and `resolveAuthToken` are
**disabled**. Reading an arbitrary user's `.env` to find a server is both a privacy violation and a
correctness bug: their `OPENTHROTTLE_*` values, if any, belong to their OT, not the operator's.

The remaining, permitted sources, in precedence order:

1. `SKILL_USAGE_GRAPHQL_URL` / `SKILL_USAGE_AUTH_TOKEN` — explicit overrides, already highest.
2. Process env (`OPENTHROTTLE_GRAPHQL_URL`, `OPENTHROTTLE_SERVER_APP_URL`, …) — this is how **leg B**
   supplies the endpoint: the driver already controls the spawned process's environment, so no config
   needs to travel with the payload at all.
3. Machine-global operator config at `~/.openthrottle/hooks.json` — this is how **leg A** supplies it,
   since a marketplace-installed plugin has no spawning parent to inherit from. The user writes it once.

**Never** the plugin directory itself. The payload is generated, byte-stable, and drift-checked; baking
an endpoint into it would make the artifact operator-specific and break the one-artifact premise.

**Multiple OT servers** resolve by precedence, not by merge: the first source that yields a URL wins and
the rest are not consulted. An operator who runs several servers points each spawn at one of them via
(2); there is no fan-out and no "send to all".

## 3. Foreign-repo identity in the telemetry

A foreign repo's identity is its **git remote URL**, normalized (scheme/credentials/`.git` suffix
stripped, lowercased host) — not its absolute path. Paths are per-machine, differ between the host and
the container bridge, and leak the user's home directory layout into the telemetry. The remote is
stable, comparable across machines, and is already how a `WorkspaceLocalRepository` row identifies a
checkout, so an OT-registered repo and an ad-hoc one produce the same identity string.

A repo with no remote (a local scratch checkout) reports **no** repo identity rather than falling back
to its path.

`git_branch` continues to be sent for both classes — it is already collected, and it is not sensitive in
a way the remote URL is not.

### `detectScope` in a foreign repo

`detectScope` currently answers "is this skill authored under `<repoRoot>/skills/`". In a foreign repo
that question is malformed: OT's own skills arrive there via injection (`d3a30314`) or via the plugin,
never as `<repoRoot>/skills/<name>`. Left alone it would misreport OT-authored skills as `third-party`,
quietly corrupting the exact metric the telemetry exists to produce.

In `foreign` repos, scope resolves against the **injected/plugin skill set** — the skills OT actually
put there — and falls back to `third-party` only when the skill is in neither. Fail-open is preserved:
any error still yields `third-party`.

## 4. Buffering — nothing is written into a foreign working tree

In `foreign` repos the JSONL buffer, the outcomes buffer, and the starts directory all relocate out of
the repo, under a machine-global root (`~/.openthrottle/skill-usage/`), partitioned by the repo
identity from §3.

This is a **hard requirement, not an optimization**. Without it:

- leg B's zero-mutation claim is false, and false in the common case;
- the user gets an untracked `.cache/` directory appearing in a repo they never configured;
- worse, in a repo whose `.gitignore` does not cover `.cache/`, it shows up in their `git status` and
  can be committed by accident.

The overlay writes **nothing** inside a foreign checkout, under any code path, including error paths.
That is the property to assert in tests: run the whole capture→persist→drain cycle against an
unreachable endpoint with `repoRoot` pointed at a scratch repo, and assert the scratch repo is
byte-identical afterwards.

## 5. Unreachable server — silent, bounded, fail-open

The core is already fail-open and this contract does not relax it. Two specific behaviors are
**confirmed** correct as written, and must stay that way:

- **No endpoint at all** → `persistUsageEvent` takes the `missing graphql url` branch, buffers, and
  logs **nothing**. A user with the plugin installed and no OT server therefore sees no output at all.
  This is the single most common foreign-repo state and it must stay silent.
- **Bounded cost** → `DEFAULT_POST_TIMEOUT_MS` is 750ms with `AbortSignal.timeout`, and the drain is
  time-boxed via `budgetMs`. A dead-but-resolvable endpoint cannot stall a Skill call indefinitely.

One behavior **must change**. When an endpoint _is_ resolvable but unreachable, every failed post calls
`logHookError`, which writes to stderr. In headless `-p` that stderr lands in the run's captured output,
so a single misconfigured endpoint produces a warning on every hook of every prompt. In `foreign` repos
this is **rate-limited to one warning per session**; subsequent failures buffer silently.

The hook must never affect the exit status or the tool result. `capture.ts` already ends with
`process.exit(0)` in a `finally`; that guarantee extends to every adapter in the payload.

## 6. Privacy default for a repo the operator does not own

Aligned with `91679bbf` rather than re-decided:

- `foreign` repos default to **`name-only`** — skill name, scope, timestamps, outcome, duration,
  session id, branch, and the §3 repo identity. **No `args`.** `home` keeps today's `truncated` default
  (args redacted and capped at 256 chars).

  The reasoning is the asymmetry of consent, not a difference in the redactor's quality: in this repo
  the operator owns the code the args are drawn from; in someone else's repo they do not, and skill args
  routinely quote file contents, paths, and prompt text belonging to a third party. `name-only` is also
  what makes the plugin defensible to install — "it records which skills ran, never what you typed" is a
  claim a user can verify by reading the payload's README.

- Raising a foreign repo to `truncated`/`full` requires an explicit opt-in in the operator's own
  machine-global config. It is never inferable from the repo, and never the default.

- The secret redactor in `utils/privacy.ts` applies regardless of level. It is a backstop, not the
  control — `name-only` is the control.

## 7. Kill switch

Three layers, each independently sufficient, in precedence order:

1. `SKILL_USAGE_DISABLE_SERVER=1` — already implemented: buffers locally, never posts.
2. A total off switch that disables capture entirely (no post, no buffer, no start files).
3. Leg B's injection gate — the driver omits `--plugin-dir` altogether, so nothing loads. This is the
   only one that costs zero process time, and it is the right lever for repos the operator does not own.

Leg A users additionally have `/plugin uninstall`, which is why the payload README must say plainly
what is collected and how to turn it off.

---

## Summary — the foreign profile

| axis                              | `home`                                | `foreign`                                              |
| --------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| endpoint from `<repoRoot>/.env`   | yes                                   | **no**                                                 |
| auth token from `<repoRoot>/.env` | yes                                   | **no**                                                 |
| endpoint sources                  | overrides → repo `.env` → process env | overrides → process env → `~/.openthrottle/hooks.json` |
| repo identity                     | monorepo                              | normalized git remote URL, or none                     |
| scope detection                   | `<repoRoot>/skills/<name>`            | injected/plugin skill set                              |
| buffer location                   | `<repoRoot>/.cache/skill-usage/`      | `~/.openthrottle/skill-usage/<repo-id>/`               |
| privacy default                   | `truncated` (args redacted, 256 cap)  | **`name-only`** (no args)                              |
| warning on unreachable endpoint   | per failure                           | one per session                                        |
| writes inside the checkout        | yes (gitignored)                      | **never**                                              |
