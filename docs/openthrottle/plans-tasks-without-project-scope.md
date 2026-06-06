# Plans and tasks without project (scope for NX association)

**Generated:** Task "List plans and tasks without a project" (Plan: Associate plans and tasks with NX projects where appropriate).

## When to associate (criteria)

Canonical criteria are in [databases/README.md](../../databases/README.md) § **Project association (when to set project)**. Summary:

- **Set project when:** Plan or task is clearly scoped to **one** NX project (app or package), e.g. `openthrottle-developer`, `openthrottle-server`, `OpenThrottle`, `@openthrottle/ai-mcp`, `@openthrottle/react-router-shadcn`. Use the NX project name from the project graph.
- **Leave unset when:** Infrastructure (Caddy, Ollama, Docker, CI); documentation-only; cross-repo or multi-repo; multi-project work; ideas/backlog not scoped to a project; or when the association is ambiguous. Do not force an association.

When in doubt, leave `project_id` null.

## Scope

- **Plans without `project_id`:** 94
- **Tasks without `project_id`:** 847

To regenerate the list:

```bash
pnpm exec tsx ./scripts/list-cortex-plans-tasks-without-project.ts
```

## Candidate associations (from titles)

From the plan/task titles, these are **candidates** for associating with an NX project when criteria are defined (leave unset when cross-cutting or ambiguous):

| Inferred NX project / area                      | Examples (plan or task title)                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **openthrottle-developer**                      | Improve queue job cards in openthrottle-developer; queues index; PlansToolbar (openthrottle-developer); route page titles   |
| **openthrottle-server**                         | GraphQL search resolver; DataLoaders for Project.plans/tasks; ResolveField resolvers; queues GraphQL; doc-ingestion         |
| **cortex** (app)                                | PlansSidebar; PlansToolbar; PlansTable; PlanTasksTable; ProjectsTable; SearchCard; DashboardRecentActivity; cortex-api docs |
| **@openthrottle/ai-mcp** or **tools/workflows** | Ralph workflow; BullMQ job doc ingestion; process management; health check                                                  |
| **packages (shared-ui, style-guide)**           | shadcn-ui components; Tailwind migration; design tokens                                                                     |
| **Cross-cutting / leave unset**                 | Infrastructure (Caddy, Ollama, Docker); documentation; ideas; multi-repo; marketing; content                                |

Many plans are **cross-cutting** (infrastructure, workflows, documentation, ideas) and should remain without a project.
