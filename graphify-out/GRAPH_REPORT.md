# Graph Report - /Users/matt/Development/openthrottle/docs (2026-05-02)

## Corpus Check

- 98 files · ~63,521 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 151 nodes · 177 edges · 29 communities detected
- Extraction: 68% EXTRACTED · 25% INFERRED · 7% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.77)
- Token cost: 31,620 input · 4,360 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Ralph Cortex Server Workflows|Ralph Cortex Server Workflows]]
- [[_COMMUNITY_Generator Templates Audit|Generator Templates Audit]]
- [[_COMMUNITY_Docker Admin Payments|Docker Admin Payments]]
- [[_COMMUNITY_Features Metadata PDFs|Features Metadata PDFs]]
- [[_COMMUNITY_Ollama Caddy Local Dev|Ollama Caddy Local Dev]]
- [[_COMMUNITY_Email React Router UI|Email React Router UI]]
- [[_COMMUNITY_VS Code Docs Metadata OSS|VS Code Docs Metadata OSS]]
- [[_COMMUNITY_GCP Docker Terraform|GCP Docker Terraform]]
- [[_COMMUNITY_GCS NX Cache Scripts|GCS NX Cache Scripts]]
- [[_COMMUNITY_Brand Typography Learning|Brand Typography Learning]]
- [[_COMMUNITY_Brag Sheet CI Ralph|Brag Sheet CI Ralph]]
- [[_COMMUNITY_Database Migrations Strategy|Database Migrations Strategy]]
- [[_COMMUNITY_Git Worktree Nx Cache|Git Worktree Nx Cache]]
- [[_COMMUNITY_Cursor Skills Nx|Cursor Skills Nx]]
- [[_COMMUNITY_Nx Dependency Graphs|Nx Dependency Graphs]]
- [[_COMMUNITY_Docker OpenClaw Local|Docker OpenClaw Local]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_Remix Forms Formik|Remix Forms Formik]]
- [[_COMMUNITY_Nx Tags Validation|Nx Tags Validation]]
- [[_COMMUNITY_OpenClaw Security|OpenClaw Security]]
- [[_COMMUNITY_Python Graphify|Python Graphify]]
- [[_COMMUNITY_Python pip Tooling|Python pip Tooling]]
- [[_COMMUNITY_CI PR Summaries Graphs|CI PR Summaries Graphs]]
- [[_COMMUNITY_Payments Matrix|Payments Matrix]]
- [[_COMMUNITY_OpenRouter Models|OpenRouter Models]]
- [[_COMMUNITY_gcloud Quota Project|gcloud Quota Project]]
- [[_COMMUNITY_DigitalOcean Registry|DigitalOcean Registry]]
- [[_COMMUNITY_Postgres Redis Local Ports|Postgres Redis Local Ports]]
- [[_COMMUNITY_Nx Release Publishing|Nx Release Publishing]]

## God Nodes (most connected - your core abstractions)

1. `Templates Agent Usage` - 11 edges
2. `openthrottle-server NestJS GraphQL WebSocket BullMQ` - 10 edges
3. `Templates Rules Generators Map` - 9 edges
4. `workflow-ralph CLI agentic loop` - 8 edges
5. `Templates Remix` - 7 edges
6. `Cortex Postgres plans tasks plan_output_stream` - 7 edges
7. `OpenThrottle (OT) — Product features` - 7 edges
8. `Templates React Native` - 6 edges
9. `Templates React` - 6 edges
10. `Templates Examples` - 5 edges

## Surprising Connections (you probably didn't know these)

- `The Technical Resume Guide (PDF; content not extracted)` --semantically_similar_to--> `VSCode Extension: Name and Display Name` [AMBIGUOUS] [semantically similar]
  docs/monorepo/downloads/The Technical Resume Guide.pdf → docs/openthrottle/vscode-extension-naming.md
- `Building Ambient Agents with LangGraph — Building Agents / Evaluations (PDF; content not extracted)` --semantically*similar_to--> `Cortex metadata: data sources inventory` [AMBIGUOUS] [semantically similar]
  docs/monorepo/LangGraph/Building_Ambient_Agents_with_LangGraph*-\_Building_Agents\_\_\_Evaluations.pdf → docs/openthrottle/metadata-data-sources-inventory.md
- `Building Ambient Agents with LangGraph — LangGraph 101 (PDF; content not extracted)` --semantically*similar_to--> `Cortex metadata: data sources inventory` [AMBIGUOUS] [semantically similar]
  docs/monorepo/LangGraph/Building_Ambient_Agents_with_LangGraph*-\_LangGraph_101.pdf → docs/openthrottle/metadata-data-sources-inventory.md
- `Templates Audit Checklist` --references--> `Script Audit Templates Compliance` [EXTRACTED]
  docs/tools/templates/AUDIT_CHECKLIST.md → scripts/audit-templates-compliance.ts
- `The Technical Resume Guide (PDF; content not extracted)` --conceptually_related_to--> `OpenThrottle (OT) — Product features` [AMBIGUOUS]
  docs/monorepo/downloads/The Technical Resume Guide.pdf → docs/openthrottle/features.md

## Hyperedges (group relationships)

- **Local API UI and Ollama exposed via Caddy** — local_services_openthrottle_server, local_services_developer_ui, ollama_caddy_proxy [EXTRACTED 1.00]
- **Remix form configuration with Formik Yup and FocusError** — forms_remix_pattern, forms_formik_yup, forms_focus_error [EXTRACTED 1.00]
- **Nx monorepo docs tags graph and CI cache** — nx_monorepo_pnpm, nx_monorepo_tags_validate, nx_graph_commands [INFERRED 0.85]
- **hyperedge_audit_agent_docs** — [INFERRED 0.85]
- **hyperedge_generator_reference_cluster** — [INFERRED 0.75]
- **hyperedge_openclaw_local_docs** — [EXTRACTED 1.00]
- **he_ralph_cortex_loop** — workflow_ralph, ralph_design_v4, cortex_postgres, parse_ralph_task_signals [EXTRACTED 1.00]
- **he_plans_bullmq_worktree** — plans_processor, plans_queue, worktree_targets_tracker, run_worktree_workflow, workflow_ralph [EXTRACTED 1.00]
- **he_developer_server_realtime** — openthrottle_developer, openthrottle_server, openthrottle_notifications [EXTRACTED 1.00]
- **hyperedge_docker_docs** — docker_react_router_v2, docker_nestjs_v2_stage_audit, docker_image_build_strategy, run_build_and_docker_current_state [EXTRACTED 0.91]
- **hyperedge_payments_decision_chain** — payments_solution_sketches, payments_review_and_next_step, payments_provider_choice_and_integration [EXTRACTED 0.90]
- **hyperedge_admin_client_server** — admin_portal_architecture, admin_shadcn_ui_integration, openthrottle_server_auth [EXTRACTED 0.88]
- **Cortex documentation ingestion, embeddings inventory, and product feature list** — doc_ingestion_job_spec, metadata_data_sources_inventory, openthrottle_features [EXTRACTED 1.00]
- **Developer UI tokens, Primer typography/borders, and VS Code extension naming** — brand_palette, primer_typography_borders, vscode_extension_naming [INFERRED 0.75]
- **PostgreSQL-backed Cortex: doc ingestion state, metadata inventory, and Passport local auth tasks** — paper_postgresql_cheatsheet, doc_ingestion_job_spec, passport_local_strategy_tasks [INFERRED 0.65]

## Communities

### Community 0 - "Ralph Cortex Server Workflows"

Cohesion: 0.13
Nodes (25): Cortex Postgres plans tasks plan_output_stream, scripts/ingest-docs-to-cortex documentation ingestion, mcp-developer MCP GraphQL to server, run-mcp-developer.sh WORKTREE_ID server name, @openthrottle/nestjs-auth JWT Passport, nestjs-bullmq BullModule.forRoot defaultJobOptions, @openthrottle/nestjs-rbac CORS roles permissions guards, @openthrottle/nestjs-repositories TypeORM Cortex (+17 more)

### Community 1 - "Generator Templates Audit"

Cohesion: 0.36
Nodes (15): Script Audit Templates Compliance, Templates Agent Inputs, Templates Agent Usage, Templates Audit Checklist, Templates Audit Scope, Templates Examples, Templates Folders, Templates Nestjs (+7 more)

### Community 2 - "Docker Admin Payments"

Cohesion: 0.19
Nodes (13): Admin Portal Architecture, Admin Shadcn Ui Integration, Docker Image Build Strategy, Docker Nestjs V2 Stage Audit, Docker React Router V2, Gray Mapping, License Key Docker Machine Identification, Openthrottle Server Auth (+5 more)

### Community 3 - "Features Metadata PDFs"

Cohesion: 0.31
Nodes (11): BullMQ doc ingestion job: input schema and diff strategy, Audit: docs/openthrottle/features.md vs codebase, Cortex metadata: data sources inventory, OpenThrottle (OT) — Product features, Building Ambient Agents with LangGraph — Building Agents / Evaluations (PDF; content not extracted), Building Ambient Agents with LangGraph — LangGraph 101 (PDF; content not extracted), PostgreSQL cheatsheet (PDF; content not extracted), The Technical Resume Guide (PDF; content not extracted) (+3 more)

### Community 4 - "Ollama Caddy Local Dev"

Cohesion: 0.22
Nodes (9): LangGraph Studio quick start and local server prerequisites, Caddy Option A localhost paths Option B api.local developer.local, openthrottle-developer Vite port 6020 template, openthrottle-server port 6021 GraphQL Socket.IO BullMQ, technology:nestjs openthrottle-server examples, OLLAMA_BASE_URL for cortex import and LangChain, Ollama behind Caddy Option A path Option B ollama.local, OLLAMA_ORIGINS CORS with Caddy forwarded requests (+1 more)

### Community 5 - "Email React Router UI"

Cohesion: 0.32
Nodes (8): openthrottle-developer styles.css theme.css tailwind, MailLayout pathless layout _layout.mail.tsx with Outlet, openthrottle-email web mail client (React Router flat routes), @openthrottle/react-router-shadcn UI package, @openthrottle/react-router-utils APP_\* env types, shadcn OKLCH CSS variables Tailwind v4, Replace DOM snapshots with Testing Library queries, @tools/generators remix route and component scaffolding

### Community 6 - "VS Code Docs Metadata OSS"

Cohesion: 0.38
Nodes (7): Audit Docs And Cursor Vscode, Metadata Model Minimal, Packages Naming, Run Locally Oss, Story Over Time Surfacing, Vscode Cursor Extension Compatibility, Work As History

### Community 7 - "GCP Docker Terraform"

Cohesion: 0.4
Nodes (5): gcs-docker-upload.sh dry run for publishing images, gcloud config configurations list activate create, gcloud auth configure-docker us-west2-docker.pkg.dev, Terraform ideas for staging local docker drift checks, OAuth credentials openthrottle-staging

### Community 8 - "GCS NX Cache Scripts"

Cohesion: 0.4
Nodes (5): Gcloud Two Profiles, Gcs Nx Cache Verify, Infra Notes, Script Gcs Nx Cache Verify, Script Setup Gcs Nx Cache

### Community 9 - "Brand Typography Learning"

Cohesion: 0.5
Nodes (5): OpenThrottle developer UI: brand palette, Case studies content model (openthrottle-website), 50 Projects for React and the Static Web (PDF; content not extracted), Refactoring UI — Start with too much white space (PDF; content not extracted), GitHub/Primer typography and border patterns

### Community 10 - "Brag Sheet CI Ralph"

Cohesion: 0.5
Nodes (4): GraphQL codegen drift guard for openthrottle-agentic-ralph, OpenThrottle monorepo port from visormatt/monorepo, Merged PRs #2 #3 #4 (GCS CI, workflows, Ralph contracts), Agentic Ralph orchestration (nestjs-agentic-workflow)

### Community 11 - "Database Migrations Strategy"

Cohesion: 0.5
Nodes (4): databases/cortex/README.md cortex:migrate, Rationale: Postgres-first pgvector and portability, SQL files as source of truth with custom runner, TypeORM migration:generate and migration:run

### Community 12 - "Git Worktree Nx Cache"

Cohesion: 0.5
Nodes (4): Copy node_modules then scripts/setup.sh timing, Nx remote cache during worktree builds, setup_worktree.sh pnpm install and pnpm build faster, @nx/gcs-cache two bucket staging production

### Community 13 - "Cursor Skills Nx"

Cohesion: 0.5
Nodes (4): Cursor commands rules agent planning mode docs, Nx with pnpm workspace preinstall, npx nx configure-ai-agents, skills.sh reusable agent capabilities

### Community 14 - "Nx Dependency Graphs"

Cohesion: 0.5
Nodes (4): nx graph focus affected watch task graph, Nx dep-graph documentation external, GitHub Actions scheduled dependency graph Monday UTC, nx-dependency-graph.ts static HTML under docs/nx

### Community 15 - "Docker OpenClaw Local"

Cohesion: 0.67
Nodes (3): docker compose up openthrottle-server and openthrottle-developer, OpenClaw docker compose up in services/openclaw, gog auth for Gmail and Calendar in gateway container

### Community 16 - "PWA Manifest"

Cohesion: 0.67
Nodes (3): npx pwa-asset-generator for splash and manifest, Progressive Web App capabilities and installability, Web app manifest shortcuts JSON

### Community 17 - "Remix Forms Formik"

Cohesion: 1.0
Nodes (3): FocusError from focus-formik-error, Formik with Yup schema client and server, Remix forms three-part pattern config component server

### Community 18 - "Nx Tags Validation"

Cohesion: 0.67
Nodes (3): technology type name tags nx:validate-tags, technology:react and technology:react-router, Tag validation script against this reference

### Community 19 - "OpenClaw Security"

Cohesion: 1.0
Nodes (3): Openclaw Docker Setup, Openclaw Readme, Openclaw Security Baseline

### Community 20 - "Python Graphify"

Cohesion: 1.0
Nodes (2): pip install graphifyy and graphify ., Python venv create and activate

### Community 21 - "Python pip Tooling"

Cohesion: 1.0
Nodes (2): packaging.python.org pip and virtual environments, pip upgrade freeze via python3 -m pip

### Community 22 - "CI PR Summaries Graphs"

Cohesion: 1.0
Nodes (2): GitHub Actions daily merged PRs summary (schedule disabled), CI dependency-graph-scheduled HTML snapshots

### Community 23 - "Payments Matrix"

Cohesion: 1.0
Nodes (2): OpenThrottle payments: providers and integration models, OpenThrottle payments: trade-off matrix

### Community 24 - "OpenRouter Models"

Cohesion: 1.0
Nodes (1): OpenRouter free models scanning (OpenClaw docs)

### Community 25 - "gcloud Quota Project"

Cohesion: 1.0
Nodes (1): gcloud auth application-default set-quota-project

### Community 26 - "DigitalOcean Registry"

Cohesion: 1.0
Nodes (1): DigitalOcean container registry docker tag push

### Community 27 - "Postgres Redis Local Ports"

Cohesion: 1.0
Nodes (1): Postgres 6010 Redis 6011 local databases

### Community 28 - "Nx Release Publishing"

Cohesion: 1.0
Nodes (1): nx release publish GitHub packages Husky hooks

## Ambiguous Edges - Review These

- `skills.sh reusable agent capabilities` → `Cursor commands rules agent planning mode docs` [AMBIGUOUS]
  docs/monorepo/Cursor.md · relation: conceptually_related_to
- `OLLAMA_BASE_URL for cortex import and LangChain` → `LangGraph Studio quick start and local server prerequisites` [AMBIGUOUS]
  docs/monorepo/LangGraph/LangGraph.md · relation: conceptually_related_to
- `Gcloud Two Profiles` → `Infra Notes` [AMBIGUOUS]
  · relation: conceptually_related_to
- `Templates Nestjs` → `Templates Remix` [AMBIGUOUS]
  · relation: conceptually_related_to
- `openthrottle-email web mail client (React Router flat routes)` → `Replace DOM snapshots with Testing Library queries` [AMBIGUOUS]
  docs/testing/snapshot-replacement-patterns.md · relation: conceptually_related_to
- `GitHub Actions daily merged PRs summary (schedule disabled)` → `CI dependency-graph-scheduled HTML snapshots` [AMBIGUOUS]
  docs/workflows/daily-merged-prs-summary.md · relation: semantically_similar_to
- `Vscode Cursor Extension Compatibility` → `Packages Naming` [AMBIGUOUS]
  · relation: conceptually_related_to
- `Gray Mapping` → `Admin Shadcn Ui Integration` [AMBIGUOUS]
  · relation: conceptually_related_to
- `OpenThrottle (OT) — Product features` → `The Technical Resume Guide (PDF; content not extracted)` [AMBIGUOUS]
  docs/monorepo/downloads/The Technical Resume Guide.pdf · relation: conceptually_related_to
- `VSCode Extension: Name and Display Name` → `The Technical Resume Guide (PDF; content not extracted)` [AMBIGUOUS]
  docs/monorepo/downloads/The Technical Resume Guide.pdf · relation: semantically_similar_to
- `Cortex metadata: data sources inventory` → `Building Ambient Agents with LangGraph — Building Agents / Evaluations (PDF; content not extracted)` [AMBIGUOUS]
  docs/monorepo/LangGraph/Building*Ambient_Agents_with_LangGraph*-\_Building_Agents\_\_\_Evaluations.pdf · relation: semantically_similar_to
- `Cortex metadata: data sources inventory` → `Building Ambient Agents with LangGraph — LangGraph 101 (PDF; content not extracted)` [AMBIGUOUS]
  docs/monorepo/LangGraph/Building*Ambient_Agents_with_LangGraph*-\_LangGraph_101.pdf · relation: semantically_similar_to

## Knowledge Gaps

- **55 isolated node(s):** `OpenThrottle monorepo port from visormatt/monorepo`, `GraphQL codegen drift guard for openthrottle-agentic-ralph`, `Python venv create and activate`, `pip install graphifyy and graphify .`, `OAuth credentials openthrottle-staging` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Python Graphify`** (2 nodes): `pip install graphifyy and graphify .`, `Python venv create and activate`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Python pip Tooling`** (2 nodes): `packaging.python.org pip and virtual environments`, `pip upgrade freeze via python3 -m pip`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CI PR Summaries Graphs`** (2 nodes): `GitHub Actions daily merged PRs summary (schedule disabled)`, `CI dependency-graph-scheduled HTML snapshots`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Payments Matrix`** (2 nodes): `OpenThrottle payments: providers and integration models`, `OpenThrottle payments: trade-off matrix`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OpenRouter Models`** (1 nodes): `OpenRouter free models scanning (OpenClaw docs)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `gcloud Quota Project`** (1 nodes): `gcloud auth application-default set-quota-project`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DigitalOcean Registry`** (1 nodes): `DigitalOcean container registry docker tag push`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Postgres Redis Local Ports`** (1 nodes): `Postgres 6010 Redis 6011 local databases`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Nx Release Publishing`** (1 nodes): `nx release publish GitHub packages Husky hooks`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `skills.sh reusable agent capabilities` and `Cursor commands rules agent planning mode docs`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `OLLAMA_BASE_URL for cortex import and LangChain` and `LangGraph Studio quick start and local server prerequisites`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Gcloud Two Profiles` and `Infra Notes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Templates Nestjs` and `Templates Remix`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `openthrottle-email web mail client (React Router flat routes)` and `Replace DOM snapshots with Testing Library queries`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GitHub Actions daily merged PRs summary (schedule disabled)` and `CI dependency-graph-scheduled HTML snapshots`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Vscode Cursor Extension Compatibility` and `Packages Naming`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
