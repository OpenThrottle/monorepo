---
group: 02. Plans & Tasks
order: 2
title: How do I create a plan or task?
---

Create them through the `openthrottle-mcp` MCP tools (`create_plan`, `create_task`, and the atomic batch variants `create_plans` / `create_tasks`) — never as Markdown files. Move a task through its lifecycle by updating its `status`, and re-sequence with `reorder_plan_tasks` rather than delete-and-recreate.
