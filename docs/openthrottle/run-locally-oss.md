# Run OpenThrottle entirely locally on OSS

**Positioning:** OpenThrottle can run entirely locally with Open Source models and software. No required SaaS or proprietary APIs for core flows.

Use this doc for README, website, or pitch copy.

---

## Key message

**Run entirely locally on Open Source models and software.** The stack can be run locally with OSS models (e.g. Ollama) and OSS tooling; no required SaaS or proprietary APIs for core flows.

---

## What runs locally (OSS)

| Component                      | Role                                                    | OSS / local                                  |
| ------------------------------ | ------------------------------------------------------- | -------------------------------------------- |
| **Postgres** (with pgvector)   | OpenThrottle app DB + Cortex (plans, tasks, embeddings) | OSS, runs locally (Docker or native)         |
| **Redis**                      | Queues, caching                                         | OSS, runs locally                            |
| **OpenThrottle server**        | API, GraphQL, queues, notifications                     | OSS (NestJS), runs locally                   |
| **OpenThrottle developer app** | Dashboard for plans, queues, PRs                        | OSS (React Router), runs locally             |
| **Cortex / mcp-developer**     | Plans knowledge base, semantic search, MCP tools        | OSS, runs locally; connects to same Postgres |
| **Ollama**                     | Local LLM and embedding models                          | OSS, runs locally; optional for embeddings   |

All of the above are Open Source and can run on your machine or your own infrastructure. No vendor lock-in for core workflows.

---

## Optional vs required for local-only

### Required for local-only

- **Postgres** (OpenThrottle + Cortex).
- **Redis** (queues).
- **Ollama** (if you want semantic search / embeddings without any cloud API): set `OLLAMA_BASE_URL` (default `http://localhost:11434`) and optionally `OLLAMA_EMBEDDING_MODEL` (e.g. `nomic-embed-text`). The MCP server and Cortex ingest then use Ollama for embeddings; no API key needed. Note: Cortex currently stores 1536-dim vectors; if the Ollama model returns a different dimension, embeddings are skipped (see `databases/README.md` § Embedding dimension strategy). See also `docs/monorepo/Ollama.md`.

### Optional (not required for local-only)

- **OpenAI:** Set `OPENAI_API_KEY` (and leave Ollama env unset) to use OpenAI for embeddings (e.g. `text-embedding-3-small`). Use this if you prefer cloud embeddings; the rest of the stack still runs locally.

---

## References in this repo

- **Cortex (plans, embeddings):** `databases/README.md` — schema, migrations, embedding dimension strategy (OpenAI vs Ollama).
- **mcp-developer (MCP server):** `packages/openthrottle/mcp-developer/README.md` — Cortex via GraphQL; auth token and API URL.
- **Ollama setup:** `docs/monorepo/Ollama.md`, `scripts/ollama.sh`, root `.env.default`.
- **Local services and ports:** `docs/monorepo/local-services-and-ports.md`.
- **OpenThrottle app env:** `applications/openthrottle/.env.default` (Postgres, Redis).
