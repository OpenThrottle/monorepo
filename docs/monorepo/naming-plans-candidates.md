# Candidate Names for ex-Cortex (plans / knowledge base)

Brainstorm for the plans/knowledge-base side of the monorepo rename. Names should evoke **planning**, **tasks**, **knowledge base**, or **tooling/APIs (e.g. MCP)** per [naming-criteria-and-availability.md](./naming-criteria-and-availability.md). Availability checks are done in a separate task.

## Candidates (with brief rationale)

| Candidate        | Rationale |
|------------------|-----------|
| **PlanKit**      | Directly signals “plans”; “kit” suggests a product/toolkit. Easy to say and remember; aligns with ContentKit/PublishKit if we use “-kit” for both products. |
| **TaskForge**   | “Task” = work items; “forge” = building/making. Strong product feel; aligns with PageForge/ContentForge pattern on CMS side. |
| **KnowledgeKit**| Evokes knowledge base and tooling. “Kit” pattern; slightly long. |
| **Agenda**       | Evokes plans and scheduled work. Short; may have availability/confusion with calendar apps. |
| **Blueprint**    | Plans and structure. Very clear for “planning”; might sound construction-heavy. |
| **Scaffold**     | Suggests structure, templates, and building. Good for plans/tasks that scaffold work. |
| **Lattice**      | Structure and connections (e.g. knowledge graph). Distinct; less literal than “plan”. |
| **Roster**       | Evokes lists and assignments (tasks, people). Short; might sound HR-specific. |
| **Docket**       | Evokes task lists and items to do. Short; legal connotation in some regions. |
| **MCPKit**       | Directly references MCP (Model Context Protocol). Very on-the-nose for the stack; “kit” pattern. Risk: ties to one protocol. |
| **ContextKit**   | “Context” aligns with MCP and knowledge context. “Kit” pattern; clear for devs. |
| **SchemaKit**    | Evokes structure and data (plans/tasks as schema). “Kit” pattern. |
| **GraphForge**  | Knowledge graph + building. Good if we emphasize graph/vector search. |
| **VectorKit**   | Evokes embeddings/vector search (pgvector). Niche but accurate for the stack. |
| **FlowKit**      | Plans and tasks as flow. Short; “kit” pattern. May overlap with workflow tools. |

## Notes

- **Availability:** Not checked here; see the “Check availability for shortlisted names” task.
- **Pattern:** Prefer one root across X, GitHub, and NPM (e.g. `plankit` everywhere). Suffixes like `-plans` or `-hq` can be used if the bare root is taken.
- **Shortlist:** After availability checks, we’ll pick one (or one umbrella + product name) and document in “Document final naming convention and choices”.

## References

- Plan: *Ideate new names for RocketCMS and Cortex* (Cortex plan).
- Criteria: [naming-criteria-and-availability.md](./naming-criteria-and-availability.md).
