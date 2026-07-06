# @openthrottle/nestjs-postgres — agent notes

Generator-scaffolded stub, not a real package yet: `NestjsPostgresModule` is a no-op
(imports `LoggerModule`, exports nothing), the scaffold folders (`config/`, `controllers/`,
`graphql/`, `services/`) hold only `.gitkeep`, and the package description is still "TODO".

**Consumed by:** nothing yet — zero workspace dependents.

## Invariants & gotchas

- Undeclared dependency: `src/modules/nestjs-postgres.module.ts` imports
  `@openthrottle/nestjs-modules` but `package.json` `dependencies` is empty — it resolves
  via pnpm hoisting today. Declare it (`workspace:^`) before building anything real here.
- Built-mode scaffold (real `build` target alongside a `__build-package` placeholder key —
  see [../AGENTS.md](../AGENTS.md)).

## Pointers

- [README.md](./README.md) (also a stub).
