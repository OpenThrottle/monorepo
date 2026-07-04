# @openthrottle/nestjs-express — agent notes

Placeholder package: `NestjsExpressModule` is an empty NestJS module (no providers, controllers,
or exports). Intended home for Express integration utilities; nothing is implemented yet.

**Consumed by:** nothing yet — no workspace package depends on it; tagged `production:false`.

## Invariants & gotchas

- Built package (real `build` target, `exports` → `dist/`) despite being a stub — see
  [../AGENTS.md](../AGENTS.md). The watch target is disabled (`__dev` placeholder key).
- Thin file — nothing else project-specific found.

## Pointers

- [README.md](./README.md)
