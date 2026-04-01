# Page title (meta title) pattern

All route modules should set `meta` with a `title` that ends with `| ${SITE_TITLE}` (except the home root). Import `SITE_TITLE` from `~/global/config/settings`.

## Pattern

| Route type      | Title format                                                                 | Example                                                                   |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Root** (home) | `SITE_TITLE` only                                                            | `OpenThrottle \| AI for Developers`                                       |
| **List**        | `<Entity> \| ${SITE_TITLE}`                                                  | `Plans \| ${SITE_TITLE}`                                                  |
| **Detail**      | `<Name> \| <Entity> \| ${SITE_TITLE}` or `<Entity> Details \| ${SITE_TITLE}` | `My Plan \| Plans \| ${SITE_TITLE}` or `Project Details \| ${SITE_TITLE}` |
| **Create**      | `Create <entity> \| ${SITE_TITLE}`                                           | `Create queue \| ${SITE_TITLE}`                                           |

- **Root**: The home route (`_index`) uses `SITE_TITLE` only (no prefix). The root layout may default to `Welcome | ${SITE_TITLE}`; child routes override.
- **List**: Index routes for an entity use the plural entity name, e.g. `Queues`, `Plans`, `Notes`, `Projects`, `Pull Requests`, `Generators`.
- **Detail**: Use the resource name when available (e.g. plan title, project name); otherwise use `<Entity> Details`.
- **Create**: Use the phrase `Create <entity>` (singular, lowercase entity in the phrase). Do not use a generic title like `Explore`.

---

## Audit (2026-02-10)

| Route                     | Current meta title                                                                   | Status    |
| ------------------------- | ------------------------------------------------------------------------------------ | --------- |
| `_index`                  | `SITE_TITLE` only                                                                    | OK (root) |
| `dashboard._index`        | `Dashboard \| ${SITE_TITLE}`                                                         | OK        |
| `search._index`           | `Search \| ${SITE_TITLE}`                                                            | OK        |
| `queues._index`           | `Queues \| ${SITE_TITLE}`                                                            | OK        |
| `queues.create`           | `Create queue \| ${SITE_TITLE}`                                                      | OK        |
| `queues.$queueId`         | `${queueName} \| Queues \| ${SITE_TITLE}`                                            | OK        |
| `queues.$queueId.$jobId`  | `${queueName} \| Queues \| ${SITE_TITLE}`                                            | OK        |
| `pull-requests._index`    | `Pull Requests \| ${SITE_TITLE}`                                                     | OK        |
| `pull-requests.$prId`     | `Pull Request Details \| ${SITE_TITLE}`                                              | OK        |
| `projects._index`         | `Projects \| ${SITE_TITLE}`                                                          | OK        |
| `projects.create`         | `Create project \| ${SITE_TITLE}`                                                    | OK        |
| `projects.$projectId`     | `${project.name} \| Projects \| ${SITE_TITLE}` or `Project Details \| ${SITE_TITLE}` | OK        |
| `plans._index`            | `Plans \| ${SITE_TITLE}`                                                             | OK        |
| `plans.$planId.create`    | `Create plan \| ${SITE_TITLE}`                                                       | OK        |
| `plans.$planId`           | `${plan.title} \| Plans \| ${SITE_TITLE}` or `Plan Details \| ${SITE_TITLE}`         | OK        |
| `notes._index`            | `Notes \| ${SITE_TITLE}`                                                             | OK        |
| `notes.create`            | `Create note \| ${SITE_TITLE}`                                                       | OK        |
| `notes.$noteId`           | `Note Details \| ${SITE_TITLE}`                                                      | OK        |
| `generators._index`       | `Generators \| ${SITE_TITLE}`                                                        | OK        |
| `generators.$generatorId` | `Generator Details \| ${SITE_TITLE}`                                                 | OK        |

**Summary:** All routes now follow the pattern. Root layout (`root.tsx`) uses `Welcome | ${SITE_TITLE}` as default; child routes override.
