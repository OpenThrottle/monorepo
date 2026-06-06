# Technology Tags Reference

This document defines all valid technology tag values and their usage across NX projects in the monorepo.

## Overview

Technology tags are used to categorize projects by their primary technology stack. They enable:

- Project filtering and organization
- Consistent project discovery
- Technology-specific tooling and workflows
- Release management and deployment strategies

## Tag Format

Technology tags follow the pattern: `technology:<value>`

Examples:

- `technology:react`
- `technology:typescript`
- `technology:nestjs`

## Valid Technology Tag Values

### Frontend Technologies

#### `technology:react`

**When to use:**

- Projects using React as the primary UI framework
- React component libraries
- Projects that depend on React but don't use React Router

**Examples:**

- `@openthrottle/react-router-ui` - React component library
- `@openthrottle/react-router-shadcn` - React + shadcn primitives

#### `technology:react-router`

**When to use:**

- Projects using React Router framework (formerly Remix)
- Full-stack React Router applications
- Packages that depend on React Router

**Note:** Projects using React Router should have BOTH `technology:react` AND `technology:react-router` tags

**Examples:**

- `openthrottle` - React Router application
- `openthrottle-cms` - React Router application
- `@openthrottle/react-router-utils` - React Router utilities package

#### `technology:react-native`

**When to use:**

- React Native mobile applications
- React Native component libraries
- Packages that depend on React Native

**Examples:**

- _(None in this workspace today.)_ When a React Native app or package exists, tag it with `technology:react-native` (and `technology:expo` if applicable).

#### `technology:expo`

**When to use:**

- Projects using Expo framework
- Expo-based React Native applications

**Note:** Projects using Expo should have BOTH `technology:expo` AND `technology:react-native` tags

**Examples:**

- _(None in this workspace today.)_ Expo apps should include both `technology:expo` and `technology:react-native`.

### Backend Technologies

#### `technology:nestjs`

**When to use:**

- NestJS applications and services
- NestJS modules and packages
- GraphQL services built with NestJS

**Examples:**

- `openthrottle-server` - NestJS GraphQL API application
- `@openthrottle/nestjs-graphql` - NestJS GraphQL package

#### `technology:nodejs`

**When to use:**

- Workspace root orchestration and scripts (`monorepo`)
- TypeScript libraries meant to run on **both** server and client (isomorphic / shared GraphQL clients, utilities consumed by apps and packages)

**When not to use:**

- Node-only tools, MCP servers, VS Code extensions, or workflow libraries — use `technology:typescript` instead
- Do **not** combine with `technology:typescript` on the same project (`pnpm nx:validate-tags` enforces this)

**Examples:**

- `monorepo` - Workspace root scripts and orchestration
- `@openthrottle/nodejs-graphql` - GraphQL client used from NestJS apps, MCP, and React Router loaders

#### `technology:python`

**When to use:**

- Python applications
- FastAPI services
- Python-based tools and scripts

**Examples:**

- _(Add examples when a Python `technology:python` project exists in this repo.)_

### Infrastructure & Services

#### `technology:supabase`

**When to use:**

- Packages that provide Supabase integration
- Supabase client libraries
- Supabase-specific utilities

**Examples:**

- _(Add examples when a Supabase-specific package is tagged in this repo.)_

### Language & Tooling

#### `technology:typescript`

**When to use:**

- TypeScript-only packages (no framework dependency)
- Build tools and generators written in TypeScript
- Utility packages that are framework-agnostic

**Note:** Do NOT use `technology:typescript` for projects that already have a framework tag (e.g., `technology:react`, `technology:nestjs`). Framework tags imply TypeScript usage. Do **not** combine with `technology:nodejs` on the same project.

**Examples:**

- `@tools/generators` - NX generator templates
- `@tools/dotfiles` - Configuration package
- `@tools/ollama-proxy` - Local OpenAI-compatible proxy for Ollama (`production:false`)
- `@openthrottle/openthrottle-mcp` - MCP server (Node-only TypeScript)
- `@tools/workflows` - Ralph and workflow CLI (`production:false` where applicable)

### Specialized Technologies

#### `technology:llm`

**When to use:**

- Projects focused on Large Language Model (LLM) processing
- AI/ML applications
- Should be used alongside other relevant technology tags

**Examples:**

- _(Add examples when an LLM-tagged project exists in this repo.)_

## Multiple Technology Tags

Projects can have multiple technology tags when they use multiple technologies:

**Examples:**

- `@openthrottle/react-router-utils` - Has `technology:react` and `technology:react-router`
- `openthrottle-server` - Has `technology:nestjs` (and may add more tags as needed)

## Tagging Rules

1. **Always tag by primary technology**: Use the most specific tag that applies
2. **Use multiple tags when appropriate**: If a project uses multiple technologies, tag it with all relevant tags
3. **Don't duplicate**: Don't use `technology:typescript` if the project already has a framework tag (React, NestJS, etc.)
4. **nodejs vs typescript**: Use `technology:nodejs` only for isomorphic shared libraries or the workspace root; use `technology:typescript` for Node-only TypeScript packages. Never apply both on one project.
5. **Be consistent**: Use the exact tag values listed in this document
6. **Tag all projects**: Every project should have at least one technology tag

## Production tags

Production tags follow `production:true` or `production:false` (exactly one per project). They are defined in [CONTRIBUTING.md](../../../CONTRIBUTING.md#project-tags); `pnpm nx:validate-tags` checks that every Nx project has a valid production tag alongside its technology tags.

- **`production:true`** — Libraries and apps that participate in release, codegen, or production build graphs (most packages and applications).
- **`production:false`** — Local-only or infrastructure tooling (for example `@tools/ollama-proxy`, `infra`) that is not shipped as a production artifact.

## Validation

All technology and production tags should be validated against this reference document and [CONTRIBUTING.md](../../../CONTRIBUTING.md#project-tags). Run `pnpm nx:validate-tags` for automated checking.

## Related Documentation

- [NX Project Tags Documentation](https://nx.dev/concepts/more-concepts/tags)
- [AGENTS.md](../../../AGENTS.md) (workspace conventions)
