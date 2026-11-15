# Traceability

When the branch is OpenThrottle work, the PR body must carry its footers too. When it is not
(`PLAN_IDS=none`), skip this section: no trailer, and no OT calls. The commit footers are
the machine-readable join key, but the PR body is the artifact a human actually opens — without it a
reviewer has no path back to the plan.

**The set is defined in exactly one place:** [`github-squash` § Footers](https://github.com/openthrottle/monorepo/blob/main/skills/github-squash/references/footers.md)
— OT-sourced, cross-checked against git, with the same git-only fallback. Follow it; do not keep a
copy of its commands here. If the branch was already squashed, its commit already carries the
reconciled set — reuse it.

Put **one** `Plan-Id:` and **every** `Task-Id:` from that set in a trailer block at the **end** of the
body, after the testing steps. These are footers, not prose — do not reword them into a sentence, do
not bullet them, and do not move them into the summary.

**Why both, and not the `Plan-Id:` alone.** The plan id is what a human wants to click, so it is
tempting to stop there. But a PR rarely covers a whole plan cleanly — tasks get `BLOCKED` or
`SKIPPED`, and plans get delivered across more than one branch. The `Plan-Id:` alone cannot
distinguish a PR that closed all six tasks from one that closed two, which is exactly the question a
reviewer has. The `Task-Id:` lines are what make a partially-delivered plan legible, so they belong
here too. That only holds if the list includes tasks that shipped no commit — which is why the set
comes from OT, not from the branch's commits.

Worked example of the tail of a body:

```markdown
## Testing

- [ ] Pipelines should be passing
- [ ] Delete the build output and confirm `start` rebuilds:
      `rm -rf build && pnpm run start`

Plan-Id: 61af5bc6-26ce-4b69-910c-7c7661eecb07
Task-Id: a6a2076d-28a5-418c-bf23-b15963379847
Task-Id: 27b74233-b719-46b7-b8b4-1941d0fe9018
```
