# Work as history: who did what, when

**Positioning:** The work you do in OpenThrottle—plans, tasks, commits, and output—forms a history of who did what and when. It complements Git and can replace traditional tools like Jira.

Use this doc for README, website, or pitch copy.

---

## Key message

**Work done is a history of changes, by whom, and when.** Plans, tasks, commits, and output form an audit trail that complements Git and can replace traditional issue/project tools: one place to see what was planned, what was done, who did it, and how it links to code and PRs.

---

## What “work as history” means

| Element     | Role                                                                   |
| ----------- | ---------------------------------------------------------------------- |
| **Plans**   | What you decided to do; status (pending, in progress, completed).      |
| **Tasks**   | Steps within a plan; who’s responsible; status and updates.            |
| **Commits** | Linked to plans/tasks so you can see which code landed for which work. |
| **Output**  | Plan iteration output and logs—what the system did and when.           |

Together these give you:

- **Audit trail:** Who did what, when, and in what order.
- **Traceability:** From idea → task → commit → PR, without leaving your flow.
- **Context for AI and humans:** Semantic search over plans and docs; activity by date; “what’s in progress” and “what was shipped.”

---

## Complements Git

Git is the history of **code**. OpenThrottle is the history of **work**: intent, tasks, and outcomes.

- Git: commits, branches, diffs, merge history.
- OpenThrottle: plans, task status, who did what, links to commits and PRs.

Use both: Git for version control and code review; OpenThrottle for planning, execution tracking, and linking that work to commits and PRs.

---

## Replaces or reduces Jira (and similar tools)

You can use OpenThrottle instead of (or alongside) Jira, Linear, Asana, etc.:

- **Plans and tasks** replace epics and tickets: stored in your own Postgres (OpenThrottle), queryable and linkable.
- **Commit links** tie work to code; no manual “ticket → commit” copy-paste.
- **Activity by date** answers “what did we ship last week?” from plans, tasks, and linked commits.
- **No separate SaaS** for core flows: run locally, own your data, keep everything in one loop with your repo.

Positioning line: _Replace traditional issue trackers with a single history of work that stays in sync with your code._

---

## References in this repo

- **OpenThrottle (plans, tasks, embeddings):** `databases/README.md` — schema, migrations, commit links, activity.
- **Ralph / workflow CLI:** `tools/workflows/README.md` — run plans and tasks; link commits after PR merge (`workflow-link-merge`).
- **Commit linking:** `databases/README.md` § Commit links — link the squash commit after merge; include `Plan-Id` and `Task-Id` in commit messages for traceability.
