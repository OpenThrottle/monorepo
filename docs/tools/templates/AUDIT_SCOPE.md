# Audit Scope: Component Code and Generator Template Usage

This document defines the scope for auditing component code for rules compliance and generator template usage (Plan-Id: `d8ec2e70-8a7a-4717-997f-7c890a70147e`). **Planning only**—no implementation.

---

## 1. Codebases in scope

### 1.1 Applications (`applications/`)

| Application                    | Type           | Tags / stack                                                      | In scope for audit             |
| ------------------------------ | -------------- | ----------------------------------------------------------------- | ------------------------------ |
| **React Router / Remix-style** | Web UI         | `type:application`, `technology:react`, `technology:react-router` | Yes                            |
| rocketcms                      | Remix-style    | ✓                                                                 | Yes                            |
| barguide                       | Remix-style    | ✓                                                                 | Yes                            |
| mattscholta                    | Remix-style    | ✓                                                                 | Yes                            |
| openthrottle-developer         | Remix-style    | ✓                                                                 | Yes                            |
| openthrottle-website           | Remix-style    | ✓                                                                 | Yes                            |
| openthrottle-cms               | Remix-style    | ✓                                                                 | Yes                            |
| carlsbad-pipelines             | Remix-style    | ✓                                                                 | Yes                            |
| charlizescholta                | Remix-style    | ✓                                                                 | Yes                            |
| jaxscholta                     | Remix-style    | ✓                                                                 | Yes                            |
| kellischolta                   | Remix-style    | ✓                                                                 | Yes                            |
| iron-sights                    | Remix-style    | ✓                                                                 | Yes                            |
| **React Native / Expo**        | Mobile app     | `type:application`, `technology:expo`, `technology:react-native`  | Yes                            |
| intouch                        | Expo app       | ✓                                                                 | Yes                            |
| barguide-app                   | Expo app       | ✓                                                                 | Yes                            |
| **NestJS**                     | API / server   | `type:application`, `technology:nestjs`                           | Yes (services/modules)         |
| openthrottle-server            | NestJS         | ✓                                                                 | Yes                            |
| nestjs-rest-api                | NestJS         | ✓                                                                 | Yes                            |
| barguide-api                   | NestJS         | ✓                                                                 | Yes                            |
| intouch-api                    | NestJS         | ✓                                                                 | Yes                            |
| **Other**                      | —              | —                                                                 | Out of scope or lower priority |
| openthrottle                   | Docker / infra | —                                                                 | No (no UI components)          |
| barguide-llm                   | Python / LLM   | —                                                                 | No (not JS/TS component code)  |

### 1.2 Packages (`packages/`)

| Package group         | Examples                                                                                                                    | Component types auditable       | In scope     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------ |
| **Shared UI (React)** | `@rocketcms/shared-ui`, `@rocketcms/tailwind-ui`, `@rocketcms/editor`, `@rocketcms/library`                                 | Components, hooks, utils        | Yes          |
| **React**             | `@barguide/react-router`, `@openthrottle/react-router-shadcn`, `@openthrottle/react-router-*`                               | Components, hooks               | Yes          |
| **React Native UI**   | `@intouch/react-native-ui`, `@barguide/react-native-ui`, `@intouch/react-native-style-guide`, `@intouch/react-native-icons` | Components, hooks               | Yes          |
| **NestJS**            | `@openthrottle/nestjs-repositories`, `@openthrottle/nestjs-*`                                                               | Services, modules, GraphQL      | Yes          |
| **Other packages**    | `@barguide/common`, `@rocketcms/supabase`, tools, MCP, etc.                                                                 | Only if they contain components | Case-by-case |

---

## 2. Component and artifact types in scope

Align with **@tools/generators** generators:

| Generator        | Sub-types / types                                    | Typical locations                             | Audit checks                                                            |
| ---------------- | ---------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| **remix**        | component, form, modal, route, table                 | `applications/<app>/app/**/*.tsx`             | Naming (PascalCase, *Form, *Modal, \*Table), structure, generator usage |
| **react**        | component, hook, util                                | `packages/*/src/components`, `hooks`, `utils` | Naming, default exports, generator usage                                |
| **react-native** | component, route, package                            | `packages/*/src/components`, app routes       | Naming, generator usage, `--type` vs `--subGenerator`                   |
| **nestjs**       | graphql-service, simple-service, module, application | `applications/*-api/**`, `packages/*/src`     | Naming (kebab-case), ListResult/Result patterns                         |
| **folders**      | folder set                                           | Under app or package route/service            | Structure matches generator                                             |
| **package**      | react, nestjs, node, tools                           | New packages                                  | Only when auditing “was this scaffolded?”                               |

---

## 3. Full audit vs sample-first

**Recommendation: sample-first, then expand.**

- **Sample-first**
  - Pick **2–3 applications** (e.g. **rocketcms**, **barguide**, **openthrottle-developer**) and **2–3 packages** (e.g. **@rocketcms/shared-ui**, **@intouch/react-native-ui**, **@barguide/react-native-ui**).
  - Audit for: (1) use of generator templates where applicable, (2) alignment with `.cursor/rules` (naming, default exports, return types, etc.).
  - Produce a short report: gaps, recurring violations, and whether templates were used at creation time.
- **Full audit**
  - After sample findings are reviewed, extend to all applications and packages listed in §1 and §2.
  - Optionally drive by Nx tags (`technology:react`, `technology:react-router`, `technology:react-native`, `technology:nestjs`) for automation.

**Out of scope for this planning phase:** changing code; only defining scope and approach.

---

## 4. Summary

- **In scope:** All **Remix/React Router** and **React Native/Expo** applications; **NestJS** applications; **React** and **React Native** shared-ui and library packages. Focus artifact types: **components, hooks, utils, routes, forms, modals, tables**, and **NestJS services/modules**.
- **Approach:** **Sample-first** (2–3 apps + 2–3 packages), then expand to full codebase if useful.
- **Out of scope (for this audit):** Non–component code (e.g. openthrottle Docker), Python/LLM apps, and packages that don’t contain UI or API surface components.

This scope is the single reference for the “Define audit scope” task and for downstream tasks (mapping rules to generators, agent workflow docs, and optional checklist/script).
