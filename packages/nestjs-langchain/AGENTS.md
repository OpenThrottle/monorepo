# @openthrottle/nestjs-langchain — agent notes

Factory library for LangChain providers: chat models (Ollama, VertexAI), embedding models,
a PGVector vector store, and document loaders (markdown, PDF, URL, YouTube). Despite the
`nestjs-` name there is no NestJS module, decorator, or `@nestjs/*` dependency — it is a
plain TypeScript library of factory functions.

**Consumed by:** nothing yet — no workspace `package.json` depends on it. The
`@tools/generators` nestjs `ai-agent` template
(`tools/generators/src/generators/nestjs/files/ai-agent/`) imports it, so generated
AI-agent services become consumers.

## Layout

- `src/config/resilience.ts` — shared `maxRetries`/`maxConcurrency` defaults applied to
  every provider factory; read its header comment before touching provider construction.
- `src/models/index.ts` — chat model factories, `chatModelProviders` union.
- `src/embeddings/index.ts` — embedding factories + model-dimensions helper.
- `src/stores/index.ts` — PGVector store factory; the store is always PGVector, the
  "provider" only selects which embedding backend fills it.
- `src/loaders/` — markdown/pdf/url/youtube loaders plus `url-guard.ts` for the URL loader.

## Invariants & gotchas

- Built package: real `build` (`@nx/js:tsc`), `exports` → `dist/`. Its `nx.targets` has a
  `__dev` placeholder, so unlike sibling nestjs packages there is no `dev` watch target —
  see [../AGENTS.md](../AGENTS.md) for the placeholder convention.
- Zero `process.env` reads anywhere in `src/` — providers are configured entirely through
  factory arguments; keep config ownership with callers.
- Every provider factory applies `resolveResilienceConfig` to bound retries/concurrency
  (cost control for VertexAI/Ollama); new providers must do the same.
- Provider unions are `as const` arrays (`chatModelProviders`, `embeddingModelProviders`,
  `vectorStoreProviders`) — extend those arrays, per the no-new-enums rule.

## Pointers

- [README.md](./README.md)
