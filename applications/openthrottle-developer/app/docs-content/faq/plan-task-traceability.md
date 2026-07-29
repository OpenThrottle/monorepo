---
group: 02. Plans & Tasks
order: 3
title: What are Plan-Id and Task-Id in commits?
---

They are conventional-commit footers that tie a commit back to the OpenThrottle plan and task it implements, e.g. `Plan-Id: <uuid>` / `Task-Id: <uuid>`. They are the only attribution allowed — never add `Co-authored-by` lines. After a PR merges, the squash commit is recorded on the work ledger.
