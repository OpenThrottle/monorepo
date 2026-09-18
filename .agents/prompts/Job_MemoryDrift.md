# Memory drift

Reconcile the agent memory index (`MEMORY.md`) against the world, and fix only what the machine can prove wrong.

## Cadence

Weekly. Memory is injected into every session, so a stale claim does not merely sit there being wrong — it is read as current fact by every agent that starts up, and it degrades judgement silently. One pass on 2026-09-08 found 20 of 57 PR references claiming "(unmerged)" for PRs that had merged, 5 entries reading "DONE draft PR" for PRs closed without merging, and 3 naming blockers that had already cleared. Nothing had checked them because nothing was checking them.

## The tool does the checking

Do **not** hand-audit the index. There is a CLI:

```bash
pnpm exec workflow-memory-reconcile --index <path/to/MEMORY.md> --repo OpenThrottle/monorepo
```

It extracts every PR reference and OT plan id from the index, resolves PR state via `gh` and plan status via OT GraphQL, and prints **only** the disagreements. Exit 0 = none, exit 1 = disagreements found.

The memory index for this repo lives under `~/.claude/projects/<encoded-repo-path>/memory/MEMORY.md`. There is more than one such directory on a typical machine — pick the one matching the repo you are running for, and say which you used.

## Read the report the way it is written

The tool is deliberately narrow, and the report says so at the bottom. Respect those boundaries:

- **A disagreement is a proven fact.** "Index says UNMERGED, actually MERGED" is checkable and checked. Fix those.
- **"Could not be resolved" is NOT drift.** A PR or plan the tool could not find may well be correct in the index — the reference may simply predate what `gh` returns, or name a plan in another workspace. Never edit an entry on this basis alone.
- **Coverage is not a clean bill of health.** The report states what it did not check: every prose hook, and every reference carrying no explicit state word. A run with zero disagreements means the machine-checkable claims agree. It does not mean the index is accurate, and the plan description must not say that it does.
- **A skipped half is not an empty half.** If OT GraphQL is unreachable the tool skips plan reconciliation entirely and says so, rather than reporting every plan as missing. If you see that line, the plan half did not run — do not report it as clean.

## What to do with findings

Fix the index directly. This is the one job that edits rather than only files, because the fixes are mechanical and proven: change the stale state word to the observed one, and nothing else.

Two hard limits on that licence:

- **Only the disputed words.** Do not rewrite hooks, reorder entries, or tidy prose in passing. A reconcile that also edits is how a guard starts introducing the drift it was meant to remove.
- **Never delete an entry.** If an entry looks obsolete, that is a judgement call for the archive-on-land pass, not for this one.

After editing, **re-run the tool** and confirm it exits 0. Then re-run it once more against the written file to confirm the memory-index budget guard did not flag a truncation (see `packages/agentic-hooks/src/memory/index-budget.ts`) — an index that no longer fits is a separate, worse problem than a stale word.

File an OT plan only for what you could **not** fix mechanically: entries whose correct state is ambiguous, references that consistently fail to resolve, or a pattern suggesting the index needs restructuring rather than correcting.

## Archive-on-land

The same run keeps the index from growing without bound. The index's size problem is entry **count**, not verbosity, and the arithmetic settles it: ~184 entries × ~68 characters of irreducible link syntax is 12.5KB before a single word of hook. At the target budget that leaves ~27 characters each, and `OT 6d0c1431 PENDING` is already 19 — so a shortening pass ends with a list that can no longer tell you which file to open. **Do not try to fix size by shortening hooks.** It does not work and it destroys the index's only job.

The lever that works is demotion. The tool prints two sections:

- **Archive candidates** — every plan COMPLETED, every PR merged or closed, nothing owed. Move these to `landed-plans-archive.md`: delete the index line, add a link inside the archive. The file itself stays on disk with full detail. This is what collapsed 57 memories into one index line and bought ~6KB.
- **Held back** — entries that looked landed and were kept, each with the reason. Read this list; do not act on it. The reasons are the rule working. In particular an entry held because _its durable value is the gotcha_ must stay in the index however finished its plan is — `Vite emits NO warning` is the memory, the plan is incidental.

**The tool proposes; you decide.** Demotion removes an entry from what every future session is shown, so a candidate is a suggestion, not an instruction. When in doubt, leave it in the index.

### Grouping a workstream

Some workstreams fan out into many files each holding one line of index — roughly ten video/showroom entries and twelve chat entries at last count. Consolidating one workstream into a single topic file trades N index lines for 1 and loses nothing **provided the topic file keeps the detail**. Do this only when the entries genuinely belong to one workstream, and only when you are writing the merged file in the same pass. A group whose detail is summarised away is a deletion wearing a consolidation's clothes.

### Deleting

Demotion moves volume; only deletion reduces it. Delete a memory only when it is genuinely **re-derivable on demand** — obtainable from `gh`, the database, or the repo at the moment it is needed. A PR's merge state is re-derivable. A plan's status is re-derivable. A gotcha someone learned the hard way is not, and neither is a decision's rationale. When unsure, demote instead: an archived memory costs one line, and a deleted one costs the next person the whole investigation.

### Finish with the both-directions check

**Always re-run the tool after any move, group, or delete**, and confirm the integrity section reads `orphans: none` and `broken links: none`. This is not optional politeness — a bulk index rewrite once silently dropped four entries: the files stayed on disk, nothing errored, and they simply stopped being reachable from anywhere. A links-only check would have passed that cleanly. The failure mode of tidying memory is losing it, and this check is the only thing standing between the two.

## Hard rules

- Never open a pull request, never commit, never push. The memory directory is not version-controlled by this repo.
- Never write a plan or task as a Markdown file — plans and tasks live in OpenThrottle only. If `openthrottle-mcp` is unavailable, **fail loudly** and stop.
- Author and assignee fields expect the GitHub username `visormatt`.
- Do not "fix" an entry the tool did not flag. Your own reading of a hook is not evidence; the tool's disagreement is.

## Output

State plainly, in the final message:

- which index file was reconciled,
- how many disagreements were found and corrected, quoting each before/after,
- whether the plan half ran or was skipped,
- what the report said it did not check.

If the tool exits 0 and nothing needed correcting, say exactly that and file nothing. An empty run is a valid outcome and the common one once the index is healthy.
