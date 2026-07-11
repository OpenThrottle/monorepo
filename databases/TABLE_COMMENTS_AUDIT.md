# OpenThrottle table comments audit

Permanent checklist for `COMMENT ON TABLE` coverage and the OpenThrottle rename backfill. **SSOT for backfill batches** — do not track in plan output stream or GitHub issues.

| Field                      | Value                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Last audited               | 2026-06-06                                                                                                                    |
| Method                     | `obj_description` on `pg_class` (public base tables) cross-checked against `COMMENT ON TABLE` in `databases/migrations/*.sql` |
| Migrations applied through | `050_comment_on_openthrottle_tables_batch_a.sql`                                                                              |

## Summary

| Metric                                            | Count |
| ------------------------------------------------- | ----- |
| Public base tables                                | 28    |
| With `COMMENT ON TABLE`                           | 28    |
| Missing `COMMENT ON TABLE`                        | 0     |
| OpenThrottle prose in existing comments (039–041) | 4     |

---

## 1. Tables missing `COMMENT ON TABLE`

Grouped for batched comment-only migrations (≤10 tables per file). Applied in `050_comment_on_openthrottle_tables_batch_a.sql`; do **not** edit applied migrations `042` / `044` in place.

### Batch A — backfill (5 tables, migration 042 + 044)

Proposed file: `050_comment_on_openthrottle_tables_batch_a.sql` (applied)

| Table                          | Introduced in                              | Backfill |
| ------------------------------ | ------------------------------------------ | -------- |
| `user_workspace_settings`      | `042_create_workspace_settings_tables.sql` | - [x]    |
| `workspace_local_repositories` | `042_create_workspace_settings_tables.sql` | - [x]    |
| `service_accounts`             | `044_create_service_accounts_tables.sql`   | - [x]    |
| `service_account_credentials`  | `044_create_service_accounts_tables.sql`   | - [x]    |
| `service_account_roles`        | `044_create_service_accounts_tables.sql`   | - [x]    |

**Batch A status:** - [x] Complete (all five tables commented; `pnpm run database:migrate` verified)

---

## 2. OpenThrottle rename backlog

Tables that already have `COMMENT ON TABLE` from `039`–`041` but prose still says **"OpenThrottle"**. Re-`COMMENT` with **OpenThrottle** wording in a **follow-up plan** (out of scope for task 3 backfill).

| Table          | Migration                                        | Current comment (excerpt)                     | Renamed |
| -------------- | ------------------------------------------------ | --------------------------------------------- | ------- |
| `commit_links` | `039_comment_on_openthrottle_tables_batch_a.sql` | …to **OpenThrottle** plans and optionally…    | - [ ]   |
| `daily_stats`  | `039_comment_on_openthrottle_tables_batch_a.sql` | …aggregated **OpenThrottle** activity counts… | - [ ]   |
| `notes`        | `039_comment_on_openthrottle_tables_batch_a.sql` | …from the **OpenThrottle MCP** for capture…   | - [ ]   |
| `plans`        | `040_comment_on_openthrottle_tables_batch_b.sql` | **OpenThrottle** plan records with title…     | - [ ]   |

**Rename batch status:** - [ ] Complete (follow-up plan)

---

## 3. Reference — all public tables (2026-06-06)

Tables with comments today (no action for task 3 unless listed above).

| Table                          | Comment source                    | Has comment              |
| ------------------------------ | --------------------------------- | ------------------------ |
| `commit_links`                 | 039                               | yes (OpenThrottle prose) |
| `custom_prompt_embeddings`     | 039                               | yes                      |
| `custom_prompts`               | 039                               | yes                      |
| `daily_stats`                  | 039                               | yes (OpenThrottle prose) |
| `doc_ingestion_state`          | 039                               | yes                      |
| `documentation`                | 039                               | yes                      |
| `documentation_embeddings`     | 039                               | yes                      |
| `notes`                        | 039                               | yes (OpenThrottle prose) |
| `permissions`                  | 039                               | yes                      |
| `plan_embeddings`              | 039                               | yes                      |
| `plan_output_stream`           | 040                               | yes                      |
| `plan_runs`                    | 038 (same file as `CREATE TABLE`) | yes                      |
| `plans`                        | 040                               | yes (OpenThrottle prose) |
| `projects`                     | 040                               | yes                      |
| `role_permissions`             | 040                               | yes                      |
| `roles`                        | 040                               | yes                      |
| `service_account_credentials`  | 050                               | yes                      |
| `service_account_roles`        | 050                               | yes                      |
| `service_accounts`             | 050                               | yes                      |
| `subscriptions`                | 040                               | yes                      |
| `task_embeddings`              | 040                               | yes                      |
| `tasks`                        | 040                               | yes                      |
| `user_roles`                   | 040                               | yes                      |
| `user_workspace_settings`      | 050                               | yes                      |
| `users`                        | 041                               | yes                      |
| `workspace_local_repositories` | 050                               | yes                      |
