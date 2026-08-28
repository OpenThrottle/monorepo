# Child-repo hook overlay

**Siblings:** [foreign-workspace-skill-injection.md](./foreign-workspace-skill-injection.md) (the same
problem, for skills — read the two together), [agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md),
[child-repo-hook-telemetry-contract.md](./child-repo-hook-telemetry-contract.md).

## What the overlay does

`@openthrottle/agentic-hooks` authors a tool-neutral skill-usage core in TS and esbuild-bundles
per-tool adapters into committed, self-contained `.cjs` under each tool's hook folder. This repo's
`.claude/settings.json` and `.cursor/hooks.json` wire those bundles up, so on their own they fire
only inside the OpenThrottle monorepo.

The overlay carries the same hooks into **child repositories** — foreign checkouts OT drives agents
against, plus repos humans open directly — via one committed plugin payload delivered two ways
(§3): a marketplace plugin for humans, and `--plugin-dir` for orchestrated runs. It **never
overrides or clobbers a user's own hooks**, and it writes nothing into the target checkout.

Skills reach child repos by the opposite mechanism — materialization into the working tree — for the
reason §1 explains.

---

## 1. Why this is NOT the skills problem again

**This is the single most important section in this document.** Without it, the next person to look
at this will reasonably conclude that the skill materializer should simply have been extended to
hooks, and will rebuild the option we deliberately rejected.

Skill injection was _forced_ to materialize into the target working tree because §2 of the
skill-injection record established that **no agent CLI exposes an out-of-repo skills directory**.
There was nowhere else to put them.

Hooks are the exact opposite. Verified against Claude Code 2.1.232:

| escape hatch                    | effect                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `--settings <file-or-json>`     | loads **additional** settings for the session; merges with project/user settings |
| `--plugin-dir <path>`           | loads a plugin (hooks + skills + MCP) from a directory or `.zip`; repeatable     |
| `--plugin-url <url>`            | fetches a plugin `.zip` for that session only                                    |
| `/plugin install` (marketplace) | durable, per-machine; hooks merge additively                                     |

Claude Code merges hooks from user settings, project settings, local settings, and every installed
plugin. They are **additive by construction**, which is why the no-clobber requirement is satisfied
by _mechanism_ rather than by careful merge logic.

And this is not a Claude-only quirk. The [capability matrix](./agent-cli-hook-capability-matrix.md)
probed all six CLIs OT drives and found that **every one of them** has an out-of-repo hook config
path — four via a home-directory config layer (gemini's is user-scope `~/.gemini/settings.json`),
two via a per-invocation directory flag.

> **The rule to remember:** skills had to go _into_ the repo because there was no alternative. Hooks
> never have to, for any CLI we support. If you are about to write into a child repo to deliver a
> hook, stop and re-read this.

## 2. Why option C was rejected

Option C was "extend foreign-skill-injection to hooks" — reuse the shipped materializer, ledger, and
`.git/info/exclude` machinery to write hook config into the target repo.

Rejected. The asymmetry that kills it: **skills are one directory per skill**, so collision handling
is trivial and ownership is self-evident. **Hooks live in a single user-owned JSON file** with no
fragment-include mechanism. Anything writing into it inherits merge, restore, and corruption risk
that the skill materializer never had — all to reach somewhere the CLI already offers a first-class
out-of-repo flag for.

**The narrow condition for revisiting it:** some CLI has _no_ out-of-repo hook config **and**
multi-CLI parity becomes a v1 requirement. The capability matrix has since established that the first
half is false for all six CLIs, so C is closed rather than merely deferred.

Option **D** (server-side transcript derivation) was not chosen as the mechanism but is retained as
the fallback for CLIs whose hooks we cannot reach — currently grok, opencode, and gemini (whose
settings-gated hooks system has not yet been exercised end-to-end).

## 3. The design — one artifact, two delivery paths

The payload is built **once**, by the existing `bundle-hooks` target in
`@openthrottle/agentic-hooks`, and committed to `plugins/openthrottle/`:

```
plugins/openthrottle/
  .claude-plugin/plugin.json     # name, version (derived), description, author
  hooks/hooks.json               # event → matcher → ${CLAUDE_PLUGIN_ROOT}/hooks/*.cjs
  hooks/skill-usage-capture.cjs  # bundled, zero runtime deps
  hooks/skill-usage-complete.cjs
  README.md                      # what it collects, and how to turn it off
```

- **Leg A — plugin + marketplace.** `.claude-plugin/marketplace.json` at the repo root lists the
  payload with `source: "./plugins/openthrottle"`. A user runs `/plugin marketplace add
OpenThrottle/monorepo` then `/plugin install openthrottle@openthrottle` **once**, and it applies in
  every repo they open. This repo is public, so it hosts the marketplace itself — no second repo, no
  sync, no drift gate between repos, and no separate LICENSE.
- **Leg B — spawn-time.** `resolveHookPluginDirs`
  (`packages/openthrottle-agentic-utils/src/utils/hook-plugin-injection.ts`) locates the payload and
  hands it to the driver, which appends `--plugin-dir <path>` via `appendPluginDirShellFlags`. OT
  runs never depend on the user having installed anything.

The payload is a **real committed directory, not gitignored build output**, because leg B points a
running server at it in a plain checkout with nothing built. It is drift-gated by
`bundle-hooks-check` and excluded from prettier (two formatters over one generated file means every
reformat reads as drift).

### Why the split lands where it does

`openthrottle-drivers` is a dep-free leaf of pure descriptors that never touches the filesystem, and
`agentic-utils` already depends on it. So the pure string-building half (`pluginDir` capability,
`pluginDirs` config, `appendPluginDirShellFlags`) lives in the leaf, and the impure resolution half
(existence, gating, warnings) lives in agentic-utils. Putting resolution in the driver would have
been a dependency cycle.

**The container path bridge does not apply here.** `toContainerPath` exists for host-recorded paths
read out of the database. The payload path is derived from this process's own filesystem via
`getOpenThrottleRoot`, so it is already in the same view the CLI is spawned into — translating it
would break the containerized case rather than fix it.

## 4. Which events actually survive headless `-p`

Established empirically in a scratch repo outside the monorepo, using the driver's exact invocation.
All five survive, but two runs were needed to see them:

| event                          | fires headless | note                                                            |
| ------------------------------ | -------------- | --------------------------------------------------------------- |
| `SessionStart`                 | yes            | both runs                                                       |
| `PreToolUse` (matcher `Skill`) | yes            | only when the model invoked the skill **as a tool**             |
| `PostToolUse`                  | yes            | same run as above                                               |
| `UserPromptExpansion`          | yes            | only when the prompt actually needed expansion (`/probe-skill`) |
| `Stop`                         | yes            | both runs                                                       |
| `SessionEnd`                   | yes            | both runs                                                       |

**The non-obvious result:** `UserPromptExpansion` is gated on the prompt _needing expansion_, not on
headless-vs-interactive. A natural-language prompt raised `PreToolUse`/`PostToolUse` and no
`UserPromptExpansion`; a slash-command prompt raised `UserPromptExpansion` and neither of the others.

So `PreToolUse(Skill)` and `UserPromptExpansion` are **complementary capture paths, not redundant
ones** — a session hits one or the other depending on how the skill was reached. Both ship. Anyone
tempted to drop one as duplication should re-read this row.

The payload ships **two** adapters, not all five. `drain`, `outcome`, and `scope` are manual CLIs
wired to no event, and would be dead weight in someone else's repo. The buffer still flushes, because
`complete` drains opportunistically on `Stop`.

### `--bare` skips hooks, LSP, and plugins

Nothing in the real spawn path emits it — `packages/openthrottle-drivers/src/drivers/claude.ts`
builds `claude -p --permission-mode acceptEdits "<prompt>"`, and a test pins that `--bare` never
appears. Some older `claude --bare -p` strings survived in `tools/workflows` help text and docs after
that package moved to the driver registry; those have been corrected, since they now describe a
command that would silently disable this entire feature.

## 5. The no-clobber guarantee — verified, not asserted

The scratch repo used for the spike ships its **own** `.claude/settings.json` with competing hooks on
the same events. On every shared event, **both** ran, target first:

```
target-SessionStart      → plugin-SessionStart
target-PreToolUse-Skill  → plugin-PreToolUse-Skill
target-Stop              → plugin-Stop
```

`${CLAUDE_PLUGIN_ROOT}` resolved to the absolute plugin directory while `cwd` stayed the target repo.

Both legs were then verified against the **real generated payload**, not a probe: leg B by passing
`--plugin-dir`, and leg A by adding the marketplace, installing the plugin, and running with **no
flag at all**. Both captured a skill event and a correlated `success` outcome with a duration.

## 6. Non-mutation — one caveat that is not yet closed

Leg B writes nothing into the target checkout: no ledger, no teardown, no `.git/info/exclude` block.
That is a genuine improvement over skill injection, which needs all three.

**But the hook core itself is not yet foreign-repo-safe.** When the OT server is unreachable, the
JSONL buffer falls back to `<repoRoot>/.cache/skill-usage/`, which is _inside the target repo_. The
live verification run reproduced this exactly — `?? .cache/` appeared in the scratch repo's
`git status`. A foreign repo is the case _most_ likely to have no reachable server, so this is the
normal path there rather than a rare one.

§4 of the [telemetry contract](./child-repo-hook-telemetry-contract.md) makes relocating the buffer to
a machine-global root a hard requirement, along with the other foreign-repo behaviors (no reading a
stranger's `.env`, `name-only` privacy, scope detection against the injected skill set). **Until that
lands, leg B's zero-mutation property holds for the flag but not for the core.**

---

## Summary

> Hooks reach child repositories through mechanisms the CLIs already provide for out-of-repo config —
> a marketplace plugin for humans, `--plugin-dir` for orchestrated runs — built from one committed,
> drift-gated payload. Nothing is written into a target checkout to deliver them, and the no-clobber
> guarantee is a property of the CLI's additive merge, verified by running competing hooks side by
> side rather than by trusting the docs. This is why the skill materializer was not extended: skills
> had no out-of-repo option, and hooks have several.
