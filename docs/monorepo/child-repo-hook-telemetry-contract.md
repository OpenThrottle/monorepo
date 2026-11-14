# Child-repo hook telemetry — scoping and privacy contract

**Sibling of** [`child-repo-hook-overlay.md`](./child-repo-hook-overlay.md) (how the hooks get
there) and [`foreign-workspace-skill-injection.md`](./foreign-workspace-skill-injection.md).

This document is **delivery-mechanism independent**. It defines what a `@openthrottle/agentic-hooks`
hook is allowed to do when it runs in a repository that is **not** this monorepo, regardless of whether
it got there via the plugin (leg A), `--plugin-dir` (leg B), or anything built later.

## Why this is needed

Every resolution path in the hook core was written against exactly one repository — this one — and each
one silently assumes it. Running unchanged in a child repo, the core would:

| behavior                                  | code                                  | what it does in a foreign repo                                            |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| read `<repoRoot>/.env` for the endpoint   | `config/env.ts` → `resolveGraphqlUrl` | reads a **stranger's** `.env`                                             |
| read `<repoRoot>/.env` for the auth token | `config/env.ts` → `resolveAuthToken`  | ditto, for credentials                                                    |
| classify a skill by scope                 | `utils/scope.ts` → `detectScope`      | `<repoRoot>/skills/<name>` never exists → **everything** is `third-party` |
| buffer failed posts to JSONL              | `data/jsonl.ts` → `defaultJsonlPath`  | wrote `<repoRoot>/.cache/skill-usage/…` **into the child's working tree** |

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

1. Process env (`OPENTHROTTLE_GRAPHQL_URL`, `OPENTHROTTLE_WORKER_GRAPHQL_URL`,
   `OPENTHROTTLE_SERVER_APP_URL`, …) — this is how **leg B** supplies the endpoint: the driver already
   controls the spawned process's environment, so no config needs to travel with the payload at all.
2. Machine-global operator config at `~/.openthrottle/.env` — this is how **leg A** supplies it, since
   a marketplace-installed plugin has no spawning parent to inherit from. The user writes it once.

**As shipped, two things differ from this section's original draft.** There are no
`SKILL_USAGE_GRAPHQL_URL` / `SKILL_USAGE_AUTH_TOKEN` overrides: a second name for the same value only
made the operator guess which layer he was configuring, so every layer now uses the `OPENTHROTTLE_*`
names and location alone decides precedence. And the machine-global file is `.env`, not `hooks.json` —
`hooks.json` was advertised in both plugin READMEs from the day they shipped and read by no code path,
so it was a documented fiction rather than a design. Reusing the `.env` parser means the line a user
writes in `~/.openthrottle/.env` is byte-identical to the one he would write in the monorepo.

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

### As shipped (OT plan `010012e9`)

Skill-usage events and token-usage rows carry `repoIdentity`, the checkout's `remote.origin.url` run
through `packages/agentic-hooks/src/utils/normalizeRemoteUrl.ts` before it leaves the machine, and
through the server's `normalizeRemoteUrl` again on arrival; anything that does not normalize — a path
included — is stored as `NULL`. It lands in `skill_usage_events.repo_identity` and
`agent_token_usage.repo_identity` (migration 161). The coverage heartbeat (§8) applied the same rule
first.

`cwd` is kept for the `home` class only. In a `foreign` repo every sender — skill starts, outcomes and
token-usage rows alike — sends `cwd: null`, decided by the same fail-closed `isOpenThrottleCheckout`
test as §2 (`resolveReportableCwd`). The column stays, deprecated in the schema rather than removed, and
rows written before this are never rewritten.

**Older servers keep receiving.** `repoIdentity` is omitted from the payload when it is unknown, and
when a server rejects it as an undefined input field the sender re-sends once without it, so a new
plugin talking to an old server delivers the record now, minus the identity. This is the one
exception to the schema-skew rule in §8: skew normally keeps a line buffered until the server is
upgraded, but `repoIdentity` is optional, and a foreign repo's operator may never upgrade the server
it posts to.

### `detectScope` in a foreign repo

`detectScope` currently answers "is this skill authored under `<repoRoot>/skills/`". In a foreign repo
that question is malformed: OT's own skills arrive there via injection (`d3a30314`) or via the plugin,
never as `<repoRoot>/skills/<name>`. Left alone it would misreport OT-authored skills as `third-party`,
quietly corrupting the exact metric the telemetry exists to produce.

In `foreign` repos, scope resolves against the **injected/plugin skill set** — the skills OT actually
put there — and falls back to `third-party` only when the skill is in neither. Fail-open is preserved:
any error still yields `third-party`.

#### The scope vocabulary grows; senders are never required to catch up

Scope is `ours | personal | third-party` as of OT plan `a5f2ce0b`. It was
`ours | third-party` before that, and the server **keeps accepting the two-member set
indefinitely** — a child repo running an older overlay simply never emits `personal`, which is
correct for it rather than a degraded state.

Two consequences this contract commits to:

- **Adding a member is additive, never breaking.** Validation messages and the by-day aggregate are
  generated from the scope const rather than hand-written, so widening the set cannot orphan an older
  sender. The `recordSkillUsageOutcome` mutation's `scope` default of `ours` exists precisely for
  senders that predate the field, and is retained for that reason.
- **Rows are never retroactively reclassified.** A personal skills root is per-user and lives outside
  any repo, so the server cannot resolve another machine's, and therefore cannot tell which historical
  `third-party` rows were really personal. Pre-widening invocations stay as captured, forever.

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

**Implemented** in `utils/privacy.ts` → `resolvePrivacyLevel`, which keys off the same
`isOpenThrottleCheckout` test that gates the `.env` layer in §2, so a repo is ours for both purposes or
neither. Adapters no longer pin a level, so passing the `home` default cannot accidentally opt a foreign
repo back into arg collection. Covered by `utils/__tests__/privacy.test.ts`, including the path through
`buildUsageEvent`.

### The per-repo opt-in (OT plan `d8d53c85`)

The second bullet is one line in `~/.openthrottle/.env`:

```dotenv
OPENTHROTTLE_TELEMETRY_TRUNCATED_REPOS=git@github.com:acme/widgets.git, https://gitlab.com/me/tool
```

A foreign repo whose normalized remote appears in that list resolves to `truncated`; every other
foreign repo stays `name-only`. Each decision, and why:

- **Key: the normalized `remote.origin.url`, exact match.** It is the identity §3 already computes and
  sends, so the opt-in names a repo the same way the telemetry does. Each list entry is passed through
  the same `normalizeRemoteUrl`, so the ssh, `ssh://`, `http://` and credentialed forms of one remote
  all match, and an operator can paste whatever `git remote -v` prints. Matching is exact — no
  wildcards, no prefix or org-level match — because a pattern is how one line quietly opts in a
  hundred repos the operator never thought about. An entry that does not normalize matches nothing.
- **A repo without a remote is never opted in.** Its identity is null, and null equals no entry. The
  alternative key, the checkout path, was rejected for the reason §3 rejects it as an identity: it is
  machine-specific, and it is exactly what moves when someone clones the same repo twice.
- **Place: the user-global file only — not the process environment, not the repo.** This is the
  load-bearing rule, and it is why the opt-in is _not_ read through `resolveOtEnv`. A foreign repo
  controls the environment of the shell it is opened in more often than it looks — `direnv`'s
  `.envrc`, `mise`, a devcontainer, a `Makefile` that exports — so a value honoured from
  `process.env` is a value the repo can set on itself. Reading only `~/.openthrottle/.env` makes the
  opt-in something only the operator's own home directory can say. The repo `.env` layer is moot
  either way: it is read only in an OpenThrottle checkout, which is already `truncated`.
- **A line in `~/.openthrottle/.env`, not a separate file.** It is the one machine-global file this
  package already reads, documents and parses (§2); a second file would be a second path to advertise,
  and the `hooks.json` episode in §2 is what an advertised-but-unread path costs. The trade-off is
  readability of a long list on one line, which a comma-separated, whitespace-tolerant value keeps
  tolerable.
- **`truncated` only, never `full`.** The goal is to let skill args back in at the size the home
  profile already ships. The variable name carries the level so a later `full` opt-in would be a
  second, separately-argued key rather than a value that silently widens this one.
- **The secret redactor still runs.** An opted-in repo goes through `applyPrivacy` like a home repo:
  redacted, then capped at 256 characters.
- **Visible.** `skill-usage-doctor` reports the repos the line opts in, and flags entries that do not
  normalize, so an opt-in is never something an operator has forgotten they made.

## 7. Kill switch

Three layers, each independently sufficient, in precedence order:

1. `OPENTHROTTLE_TELEMETRY_OFFLINE=1` — already implemented: buffers locally, never posts.
2. A total off switch that disables capture entirely (no post, no buffer, no start files).
3. Leg B's injection gate — the driver omits `--plugin-dir` altogether, so nothing loads. This is the
   only one that costs zero process time, and it is the right lever for repos the operator does not own.

Leg A users additionally have `/plugin uninstall`, which is why the payload README must say plainly
what is collected and how to turn it off.

## 8. Coverage heartbeat

OT plan `c4ece7fe`. Telemetry used to fail **silently**: a machine with `~/.openthrottle/.env`
configured correctly but no leg A plugin installed recorded nothing for any session started by
hand outside this repo. `/usage` showed a quiet week, and nothing distinguished "nobody ran a skill"
from "nobody was listening". Records stuck in the buffer behind an unreachable server were just as
invisible. `captureHealth` could not catch either case, because it is keyed by `source`
(`claude-code`, `cursor`): it knows _that_ Claude stopped reporting, never _which machine or repo_
did, or that manual sessions were never covered at all.

The heartbeat is the fix: one small record per session start that says which machine, through which
delivery leg, in which repo, with what sitting in the buffer.

### Cadence and storage

- **`SessionStart` only.** It fires headless and interactive (overlay doc §4), once per session, so
  it costs one POST per session rather than one per skill.
- **Upserted, latest-wins**, on `(user, machine_id, repo_identity, delivery_leg, source)`. A machine
  that opens the same repo through the same leg a thousand times is one row with a moving
  `last_seen_at`, so the table stays small without a pruning job.
- **Never buffered.** A heartbeat that cannot be delivered describes a moment that is already
  stale. It is written to `~/.openthrottle/skill-usage/last-heartbeat.json` instead, so the doctor
  can report the last attempt and its result. It does not join the JSONL drain, and it is never
  replayed.
- Every §5 rule applies unchanged: fail-open, exit 0, the 750ms post timeout, **silent** when no
  endpoint resolves, and `OPENTHROTTLE_TELEMETRY_OFFLINE=1` posts nothing. The repo copy shadows
  the plugin copy exactly as the capture hook does (`isShadowedByRepoHooks`), so the monorepo never
  sends two.
- **Cursor** sends its heartbeat on `sessionStart`, the once-per-session event that fires headless
  (`agent-cli-hook-capability-matrix.md` § Session-start event). Its plugin copy stands down when the
  repository's `.cursor/hooks.json` registers the heartbeat too. Its leg is decided by where the
  running script lives, not by `CURSOR_PLUGIN_ROOT` alone: Cursor can hand a project hook another
  plugin's root. A plugin root under `~/.cursor/plugins/cache/` is `marketplace`.
- **Codex and Antigravity** have no plugin-root variable a hook can rely on, so their leg is read
  from where the running script lives (`detectDeliveryLegFromScript`): inside the session's
  repository is `repo`, under the tool's marketplace directory (codex
  `$CODEX_HOME/plugins/cache/`, agy `~/.gemini/config/plugins/`) is `marketplace`, anywhere else —
  codex's `~/.codex/config.toml` pointing at a checkout's `.codex/hooks/` — is `plugin-dir`, and
  the driver stamp still wins. Antigravity's heartbeat ships in the generated workspace plugin
  `.agents/plugins/openthrottle/`, so it is `repo` there; codex's is delivered by the home-config
  block in `packages/agentic-hooks/README.md`.
- **Each tool reads its own marketplace record** (measured 2026-11-14, OT plan `6b0fb4c4`;
  `agent-cli-hook-capability-matrix.md` § Marketplace install records), always for the plugin
  `openthrottle` from the marketplace `openthrottle`:

  | source        | installed when                                                                                                       | version from                          | unknown (null) when                              |
  | ------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
  | `claude-code` | `installed_plugins.json` has `openthrottle@openthrottle`                                                             | that entry's `version`                | the file is unreadable or unrecognized           |
  | `cursor`      | `~/.cursor/plugins/cache/openthrottle/openthrottle/<sha>/` carries `.cache-complete`                                 | the newest such unpack's manifest     | neither the cache nor `~/.cursor/plugins/` lists |
  | `codex`       | `$CODEX_HOME/config.toml` has `[plugins."openthrottle@openthrottle"]` without `enabled = false`                      | the newest cache directory's manifest | `config.toml` is unreadable                      |
  | `antigravity` | `~/.gemini/config/plugins/openthrottle/` exists and `config.json` does not set `plugins.openthrottle.enabled: false` | its `plugin.json`                     | neither that directory nor its parent lists      |

  Cursor's real install record is the IDE's sqlite store, which a hook cannot read; its cache is a
  proxy, and whether an IDE uninstall prunes it is unmeasured, so a stale cache can read as
  installed. A disabled install reads as not installed everywhere it is recorded, because it runs
  nothing.

  **Known gap:** the marketplace plugin's hooks are the Claude bundles, and cursor-agent, codex and
  agy all run them — measured for cursor-agent, which ran the Claude-installed plugin's heartbeat in
  a plain `cursor-agent -p`. That heartbeat reports `source: claude-code`, so a marketplace install
  reached through another tool is counted as a Claude Code session, and the per-tool adapters above
  run only from a repo or `--plugin-dir` registration.

### Fields — and why each one is allowed

| field                          | value                                                                   | why it is acceptable                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `machine_id`                   | random UUID, generated once into `~/.openthrottle/machine-id`           | Carries no information about the machine. A hostname hash was rejected: hostnames come from a tiny, guessable space (`<first-name>s-MacBook-Pro.local`), so an unsalted hash is a hostname with extra steps, and a salt stored beside it buys nothing.                                                                                                                               |
| `machine_label`                | `OPENTHROTTLE_MACHINE_LABEL` from env / `~/.openthrottle/.env`, or null | Opt-in and typed by the operator, so the UI can say "work laptop" instead of `3f2a…`. Never defaulted from the hostname.                                                                                                                                                                                                                                                             |
| `source`                       | `claude-code`, `cursor`, `codex` or `antigravity`                       | Already sent on every event.                                                                                                                                                                                                                                                                                                                                                         |
| `delivery_leg`                 | `repo` \| `plugin-dir` \| `marketplace`, per the table below            | A fact about the install, not about the user's work.                                                                                                                                                                                                                                                                                                                                 |
| `repo_identity`                | normalized git remote (§3), or null                                     | §3's rule, applied for the first time: no raw paths, no remote means no identity. Normalized **client-side** with a zero-dep twin of the server's `normalizeRemoteUrl`, because a raw remote can carry `https://user:token@…`. The server normalizes again and drops anything that does not survive.                                                                                 |
| `plugin_version`               | the running payload's `plugin.json` version, or null for `repo`         | Lets `/usage` flag an outdated install. Local file, no identity.                                                                                                                                                                                                                                                                                                                     |
| `marketplace_plugin_installed` | boolean, plus `marketplace_plugin_version` when installed               | Read from each tool's own install record (table above); for Claude Code, `<claude config dir>/plugins/installed_plugins.json`, key `openthrottle@openthrottle`. **This is the signal that answers the original failure directly**: a `plugin-dir` or `repo` heartbeat from a machine without the plugin says so outright, so the warning does not have to be inferred from absences. |
| buffer stats                   | per file: line count, oldest record time, dead-letter count             | Counts and one timestamp per file. No record content.                                                                                                                                                                                                                                                                                                                                |
| `occurred_at`                  | timestamp                                                               | —                                                                                                                                                                                                                                                                                                                                                                                    |

**Never sent:** email, hostname, username, `cwd` or any other absolute path, the token, skill names,
or args. The heartbeat adds no per-skill data, so the §6 `name-only` default is untouched.

### Delivery-leg detection

Checked in order. The first match wins.

| condition                                                            | leg           | why                                                                                                                                                                                       |
| -------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENTHROTTLE_HOOK_DELIVERY=plugin-dir` in the process env           | `plugin-dir`  | Set by the driver wherever it appends `--plugin-dir`. The env describes the **session**, so if a marketplace copy also loaded in that run, it reports `plugin-dir` too, which is correct. |
| `CLAUDE_PLUGIN_ROOT` lies under `<claude config dir>/plugins/cache/` | `marketplace` | Verified against a real install: `installPath` is `~/.claude/plugins/cache/openthrottle/openthrottle/<version>`. `<claude config dir>` honours `CLAUDE_CONFIG_DIR`.                       |
| `CLAUDE_PLUGIN_ROOT` set anywhere else                               | `plugin-dir`  | A hand-passed `--plugin-dir` without the env stamp is still leg B in shape.                                                                                                               |
| no `CLAUDE_PLUGIN_ROOT`                                              | `repo`        | Only a repository's own settings run the bundle without a plugin root.                                                                                                                    |

### Coverage warnings (`telemetryCoverage`)

Thresholds reuse `CAPTURE_HEALTH_STALE_AFTER_HOURS` (24h), so `/usage` has one definition of stale.

| warning                     | fires when                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `MANUAL_SESSIONS_UNCOVERED` | the machine's newest heartbeat reports `marketplace_plugin_installed = false`. Sessions started by hand outside this repo record nothing. |
| `PLUGIN_OUTDATED`           | `marketplace_plugin_version` is lower than the payload version the server ships.                                                          |
| `BUFFER_STALE`              | the newest heartbeat's oldest buffered record is older than 24h.                                                                          |
| `BUFFER_GROWING`            | buffered line count rose across the machine's last three heartbeats while the server was reachable enough to receive them.                |
| `DEAD_LETTERED`             | the newest heartbeat's `dead_letter_count` is above zero: records the server rejected outright, missing from usage until replayed.        |
| `MACHINE_SILENT`            | the machine has heartbeats, but none within the query window.                                                                             |

`BUFFER_GROWING` is the one that matters most: a heartbeat that _arrives_ while its own buffer
grows proves the endpoint is reachable for small posts and the drain is failing anyway, which
usually means the server is rejecting records into the dead-letter files.

Schema skew is not a rejection. When the hooks are newer than the server they post to — a field,
argument, type or enum value the running server does not define yet — the drain keeps the line
buffered instead of dead-lettering it, so restarting the server onto the newer commit delivers it.
Until then it shows as `BUFFER_STALE` / `BUFFER_GROWING`. On 2026-11-13 the old behavior
dead-lettered 930 token rows in the three hours between #748 landing and the server restarting.
An optional field a sender can drop is the exception: see `repoIdentity` in §3, which is re-sent
without the field rather than held.

---

## Summary — the foreign profile

| axis                              | `home`                                             | `foreign`                                                    |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| endpoint from `<repoRoot>/.env`   | yes                                                | **no**                                                       |
| auth token from `<repoRoot>/.env` | yes                                                | **no**                                                       |
| endpoint sources                  | repo `.env` → process env → `~/.openthrottle/.env` | process env → `~/.openthrottle/.env`                         |
| repo identity                     | normalized git remote URL, or none                 | normalized git remote URL, or none                           |
| working directory (`cwd`)         | sent                                               | **never**                                                    |
| scope detection                   | `<repoRoot>/skills/<name>`                         | injected/plugin skill set                                    |
| buffer location                   | `~/.openthrottle/skill-usage/`                     | `~/.openthrottle/skill-usage/` (same)                        |
| privacy default                   | `truncated` (args redacted, 256 cap)               | **`name-only`** (no args); `truncated` only by the §6 opt-in |
| warning on unreachable endpoint   | per failure                                        | one per session                                              |
| writes inside the checkout        | **never**                                          | **never**                                                    |
| coverage heartbeat (§8)           | `repo` leg, from the repo's own hooks              | `marketplace` or `plugin-dir` leg                            |

**Three rows that the draft split by profile are now identical for both.** The buffer is one flat
`~/.openthrottle/skill-usage/` rather than `<repoRoot>/.cache/` at home and a `<repo-id>` subdirectory
away: repository identity already travels in every record's `repoIdentity` and `git_branch`, so encoding it in
a path duplicated it, and a single directory gives the drain hook exactly one place to look regardless
of where a session ran. The endpoint sources differ only in that the repo `.env` layer is _absent_ in
a foreign repo — it is gated on `isOpenThrottleCheckout`, which fails closed, so the same code answers
both profiles rather than branching on a mode. And nothing is written inside any checkout now, home
included; the gitignored `.cache/` directory is gone.
