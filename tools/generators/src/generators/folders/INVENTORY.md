# Inventory: Nx apps with `app/routing/` vs canonical folders subtree

Companion to [CANONICAL_ROUTING_SUBTREE.md](./CANONICAL_ROUTING_SUBTREE.md). Inventory snapshot for plan **9dda659b-0495-4cf6-9199-10e8a61ae726**, task **8ac585d7-dbfc-465e-8d2a-6df44d09bca0**.

## Scope

`@tools/generators:folders --list=applications` returns **6** Nx applications:

- `openthrottle-admin`
- `openthrottle-cms`
- `openthrottle-developer`
- `openthrottle-email`
- `openthrottle-server`
- `openthrottle-website`

Of those, only the **4 React Router UI apps** below currently use the `app/routing/<slug>/` convention this plan audits.

## Apps NOT in scope

- **`openthrottle-cms`** — Has `app/` but **no `app/routing/`**. Uses the Remix flat-file `app/routes/` convention (`_index.tsx`). Only an empty `app/services/` (`.gitkeep`) exists. **No route slug dirs to audit.** Skip in task 56874e0b.
- **`openthrottle-server`** — NestJS API. **No `app/` directory** (uses `src/`). N/A for this audit.

## In-scope apps and route-slug checklist

Each route slug `<name>` should contain all 10 canonical directories (see CANONICAL_ROUTING_SUBTREE.md):

```text
components, components/__tests__, config, config/__tests__, data, data/__tests__,
hooks, hooks/__tests__, utils, utils/__tests__
```

Existing non-placeholder files (`types.ts`, `config/defaults.ts`, `utils/formatters.ts`, `utils/parsers.ts`) are **not modified** by this audit.

### `openthrottle-admin` (4 route slugs)

- [x] `home` — complete (10/10)
- [ ] `permissions` — missing **1/10**: `components/__tests__`
- [x] `roles` — complete (10/10)
- [ ] `users` — missing **1/10**: `components/__tests__`

### `openthrottle-developer` (16 route slugs)

- [ ] `agents` — missing **7/10**: `config`, `config/__tests__`, `data/__tests__`, `hooks`, `hooks/__tests__`, `utils`, `utils/__tests__`
- [x] `dashboard` — complete (10/10)
- [x] `generators` — complete (10/10)
- [x] `home` — complete (10/10)
- [ ] `navigation` — missing **7/10**: `config`, `config/__tests__`, `data/__tests__`, `hooks`, `hooks/__tests__`, `utils`, `utils/__tests__`
- [x] `notes` — complete (10/10)
- [x] `plans` — complete (10/10)
- [x] `profile` — complete (10/10)
- [x] `projects` — complete (10/10)
- [x] `prompts` — complete (10/10)
- [x] `pull-requests` — complete (10/10)
- [x] `queues` — complete (10/10)
- [x] `search` — complete (10/10)
- [x] `settings` — complete (10/10)
- [x] `skills` — complete (10/10)
- [x] `usage` — complete (10/10)

### `openthrottle-email` (7 route slugs)

- [x] `compose` — complete (10/10)
- [x] `drafts` — complete (10/10)
- [x] `home` — complete (10/10)
- [x] `inbox` — complete (10/10)
- [x] `search` — complete (10/10)
- [x] `sent` — complete (10/10)
- [x] `trash` — complete (10/10)

### `openthrottle-website` (5 route slugs)

- [x] `case-studies` — complete (10/10)
- [x] `checkout` — complete (10/10)
- [x] `contact` — complete (10/10)
- [x] `home` — complete (10/10)
- [x] `pricing` — complete (10/10)

## Summary of remediation for task `56874e0b-33df-4e52-a44a-f48906338096`

**4 route slugs** need additive work; **16 directories** total to create (each containing only `.gitkeep`):

| App                      | Slug          | Dirs to create | Paths (relative to `app/routing/<slug>/`)                                                              |
| ------------------------ | ------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| `openthrottle-admin`     | `permissions` | 1              | `components/__tests__`                                                                                 |
| `openthrottle-admin`     | `users`       | 1              | `components/__tests__`                                                                                 |
| `openthrottle-developer` | `agents`      | 7              | `config`, `config/__tests__`, `data/__tests__`, `hooks`, `hooks/__tests__`, `utils`, `utils/__tests__` |
| `openthrottle-developer` | `navigation`  | 7              | `config`, `config/__tests__`, `data/__tests__`, `hooks`, `hooks/__tests__`, `utils`, `utils/__tests__` |

**Method recommendation:** Manual `mkdir -p` + `touch .gitkeep` is safer than re-running the `folders` generator, because the generator also writes non-placeholder files (`types.ts`, `config/defaults.ts`, `utils/formatters.ts`, `utils/parsers.ts`) which already exist for completed slugs and would risk overwrite/conflict. Net change must remain additive (new dirs + `.gitkeep` only).

**Note on `agents` and `navigation` in `openthrottle-developer`:** These slugs are missing `config/`, `hooks/`, and `utils/` entirely (along with their `__tests__/` siblings). They currently lack the generator's non-placeholder files (`config/defaults.ts`, `utils/formatters.ts`, `utils/parsers.ts`). Task 56874e0b is **additive only**: create the 7 dirs + `.gitkeep`. Do NOT create the canonical `.ts` source files — that is out of scope for this plan.
