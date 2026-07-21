# Audit Scope: Component Code and Generator Template Usage

This document defines the scope for auditing component code for rules compliance and generator template usage (Plan-Id: `d8ec2e70-8a7a-4717-997f-7c890a70147e`). **Planning only**—no implementation.

Ground truth for project names: `nx show projects` and `nx graph` in this repository.

---

## 1. Codebases in scope

### 1.1 Applications (`applications/`)

| Application                               | Type         | Tags / stack                                                      | In scope for audit     |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------- | ---------------------- |
| **React Router (react-router generator)** | Web UI       | `type:application`, `technology:react`, `technology:react-router` | Yes                    |
| openthrottle                              | React Router | ✓                                                                 | Yes                    |
| openthrottle-admin                        | React Router | ✓                                                                 | Yes                    |
| openthrottle-developer                    | React Router | ✓                                                                 | Yes                    |
| openthrottle-email                        | React Router | ✓                                                                 | Yes                    |
| openthrottle-website                      | React Router | ✓                                                                 | Yes                    |
| openthrottle-server                       | NestJS API   | `type:application`, `technology:nestjs`                           | Yes (services/modules) |

### 1.2 Packages (`packages/`)

| Package group      | Examples                                                                                             | Component types auditable              | In scope     |
| ------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------ |
| **React / UI**     | `@openthrottle/react-router-ui`, `@openthrottle/react-router-shadcn`, `@openthrottle/react-router-*` | Components, hooks, utils               | Yes          |
| **NestJS**         | `@openthrottle/nestjs-repositories`, `@openthrottle/nestjs-*`                                        | Services, modules, GraphQL             | Yes          |
| **Other packages** | `graphql-codegen`, MCP, tools                                                                        | Only if they contain UI or API surface | Case-by-case |

**React Native:** There is no registered `react-native` generator in `tools/generators/generators.json` and no React Native application in `nx show projects` at the time of this audit scope. Skip unless that changes.

---

## 2. Component and artifact types in scope

Align with **@tools/generators** generators:

| Generator        | Sub-types / types                                    | Typical locations                                       | Audit checks                                                            |
| ---------------- | ---------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| **react-router** | component, form, modal, route, table                 | `applications/<app>/app/**/*.tsx`                       | Naming (PascalCase, *Form, *Modal, \*Table), structure, generator usage |
| **react**        | component, hook, util                                | `packages/*/src/components`, `hooks`, `utils`           | Naming, default exports, generator usage                                |
| **nestjs**       | graphql-service, simple-service, module, application | `applications/openthrottle-server/**`, `packages/*/src` | Naming (kebab-case), ListResult/Result patterns                         |
| **folders**      | folder set                                           | Under app route/service                                 | Structure matches generator                                             |
| **package**      | react, nestjs, node, tools                           | New packages                                            | Only when auditing “was this scaffolded?”                               |

---

## 3. Full audit vs sample-first

**Recommendation: sample-first, then expand.**

- **Sample-first**
  - Pick **2–3 applications** (e.g. **openthrottle**, **openthrottle-developer**) and **2–3 packages** (e.g. **@openthrottle/react-router-ui**, **@openthrottle/react-router-shadcn**).
  - Audit for: (1) use of generator templates where applicable, (2) alignment with `.cursor/rules` (naming, default exports, return types, etc.).
  - Produce a short report: gaps, recurring violations, and whether templates were used at creation time.
- **Full audit**
  - After sample findings are reviewed, extend to all applications and packages listed in §1 and §2.
  - Optionally drive by Nx tags (`technology:react`, `technology:react-router`, `technology:nestjs`) for automation.

**Out of scope for this planning phase:** changing code; only defining scope and approach.

---

## 4. Summary

- **In scope:** **React Router** applications under `applications/`; **NestJS** `openthrottle-server`; **React** and **NestJS** packages under `packages/openthrottle/*`. Focus artifact types: **components, hooks, utils, routes, forms, modals, tables**, and **NestJS services/modules**.
- **Approach:** **Sample-first** (2–3 apps + 2–3 packages), then expand to full codebase if useful.
- **Out of scope (for this audit):** Non–component-only infra, and packages that don’t contain UI or API surface components.

This scope is the single reference for the “Define audit scope” task and for downstream tasks (mapping rules to generators, agent workflow docs, and optional checklist/script).
