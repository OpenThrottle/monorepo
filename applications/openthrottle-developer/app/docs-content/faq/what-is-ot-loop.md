---
group: 03. Agents
order: 1
title: What is OT Loop?
---

OT Loop is OpenThrottle's agentic loop for executing a plan autonomously — one task at a time, with a fresh worker per task, validation after each, and commits that trace back to the plan. It is the only plan runner; its job code lives in `@openthrottle/openthrottle-agentic-loop`, with other building blocks in the `openthrottle-agentic-*` packages.
