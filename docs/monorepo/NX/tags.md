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

- `@rocketcms/shared-ui` - React component library
- `@rocketcms/core` - React-based core package

#### `technology:react-router`

**When to use:**

- Projects using React Router framework (formerly Remix)
- Full-stack React Router applications
- Packages that depend on React Router

**Note:** Projects using React Router should have BOTH `technology:react` AND `technology:react-router` tags

**Examples:**

- `barguide` - React Router application
- `@barguide/react-router` - React Router package

#### `technology:react-native`

**When to use:**

- React Native mobile applications
- React Native component libraries
- Packages that depend on React Native

**Examples:**

- `@barguide/react-native-ui` - React Native component library
- `barguide-app` - React Native application

#### `technology:expo`

**When to use:**

- Projects using Expo framework
- Expo-based React Native applications

**Note:** Projects using Expo should have BOTH `technology:expo` AND `technology:react-native` tags

**Examples:**

- `barguide-app` - Expo-based React Native app
- `@barguide/react-native` - Expo package

### Backend Technologies

#### `technology:nestjs`

**When to use:**

- NestJS applications and services
- NestJS modules and packages
- GraphQL services built with NestJS

**Examples:**

- `barguide-api` - NestJS API application
- `@openthrottle/nestjs-graphql` - NestJS GraphQL package

#### `technology:python`

**When to use:**

- Python applications
- FastAPI services
- Python-based tools and scripts

**Examples:**

- `barguide-llm` - Python FastAPI application

### Infrastructure & Services

#### `technology:supabase`

**When to use:**

- Packages that provide Supabase integration
- Supabase client libraries
- Supabase-specific utilities

**Examples:**

- `@barguide/supabase` - Supabase integration package

### Language & Tooling

#### `technology:typescript`

**When to use:**

- TypeScript-only packages (no framework dependency)
- Build tools and generators written in TypeScript
- Utility packages that are framework-agnostic

**Note:** Do NOT use `technology:typescript` for projects that already have a framework tag (e.g., `technology:react`, `technology:nestjs`). Framework tags imply TypeScript usage.

**Examples:**

- `@tools/generators` - NX generator templates
- `@tools/dotfiles` - Configuration package

### Specialized Technologies

#### `technology:llm`

**When to use:**

- Projects focused on Large Language Model (LLM) processing
- AI/ML applications
- Should be used alongside other relevant technology tags

**Examples:**

- `barguide-llm` - Has both `technology:python` and `technology:llm`

## Multiple Technology Tags

Projects can have multiple technology tags when they use multiple technologies:

**Examples:**

- `@openthrottle/react-router-utils` - Has `technology:react` and `technology:react-router`
- `barguide-app` - Has `technology:expo` and `technology:react-native`
- `barguide-llm` - Has `technology:python` and `technology:llm`

## Tagging Rules

1. **Always tag by primary technology**: Use the most specific tag that applies
2. **Use multiple tags when appropriate**: If a project uses multiple technologies, tag it with all relevant tags
3. **Don't duplicate**: Don't use `technology:typescript` if the project already has a framework tag (React, NestJS, etc.)
4. **Be consistent**: Use the exact tag values listed in this document
5. **Tag all projects**: Every project should have at least one technology tag

## Validation

All technology tags should be validated against this reference document. See the tag validation script for automated checking.

## Related Documentation

- [NX Project Tags Documentation](https://nx.dev/concepts/more-concepts/tags)
- [Monorepo Contribution Guidelines](../CONTRIBUTING.md)
