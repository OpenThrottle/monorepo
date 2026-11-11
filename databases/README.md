# databases

The Postgres databases this repository owns. They share one Postgres server, and each has its own
migrations and its own `schema_migrations` ledger.

| Database       | Reference                                          | Used by                                      |
| -------------- | -------------------------------------------------- | -------------------------------------------- |
| `openthrottle` | [openthrottle/README.md](./openthrottle/README.md) | `openthrottle-server`: plans, tasks, runs, … |
| `cms`          | [cms/README.md](./cms/README.md)                   | `openthrottle-cms` (no server reader yet)    |

```bash
pnpm run database:start                    # Postgres + Redis (docker compose)
pnpm run database:migrate                  # migrate every database, creating any that are missing
pnpm run database:migrate -- --database cms
pnpm run database:backup                   # one archive per database under databases/<db>/backups/
```

How the databases share one runner, and the checklist for adding one:
[AGENTS.md](./AGENTS.md).
