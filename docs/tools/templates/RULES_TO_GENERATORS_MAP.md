# Mapping: Coding Rules ↔ Generator Templates

This document maps `.cursor/rules` (and related conventions) to `@tools/generators` generators and lists gaps. It supports the audit plan **Audit component code for rules compliance and generator template usage** (Plan-Id: `d8ec2e70-8a7a-4717-997f-7c890a70147e`). **Planning only**—no implementation.

---

## 1. Rule → Generator matrix

Which rules apply to code produced by (or that should be produced by) each generator.

| Rule / convention                                                                      | remix | react                          | react-native | nestjs | package | folders |
| -------------------------------------------------------------------------------------- | ----- | ------------------------------ | ------------ | ------ | ------- | ------- |
| **personal-generators.mdc** (generator-first)                                          | ✓     | ✓                              | ✓            | ✓      | ✓       | ✓       |
| **personal-general.mdc** (UI: Remix/React, create via generator)                       | ✓     | ✓                              | —            | ✓      | —       | ✓       |
| **personal-general.mdc** (API: NestJS, create via generator)                           | —     | —                              | —            | ✓      | —       | —       |
| **personal-general.mdc** (testing: component, userEvent, waitFor, describe per branch) | ✓     | ✓                              | ✓            | ✓      | —       | —       |
| **personal-general.mdc** (shared-ui usage)                                             | ✓     | ✓ (shared-ui is a destination) | —            | —      | —       | —       |
| **cursor-commands.mdc** (PNPM, NX, `import * as React`)                                | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/default-exports.mdc** (no default except framework pages)                     | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/return-types.mdc** (declare return types; components excepted)                | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/naming-conventions.mdc** (kebab files, PascalCase components, etc.)           | ✓     | ✓                              | ✓            | ✓      | ✓       | ✓       |
| **coding/import-type.mdc** (use `import type` for types)                               | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/interface-extends.mdc** (prefer interface extends over `&`)                   | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/readonly-properties.mdc** (readonly by default)                               | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/optional-properties.mdc** (sparing use)                                       | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/discriminated-unions.mdc** (model variants with type field)                   | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/throwing.mdc** (prefer result types over throw)                               | —     | —                              | —            | ✓      | ✓       | —       |
| **coding/enums.mdc** (no new enums; use `as const`)                                    | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/jsdoc-comments.mdc** (JSDoc when not self-evident)                            | ✓     | ✓                              | ✓            | ✓      | ✓       | —       |
| **coding/installing-libraries.mdc** (pnpm -w, latest)                                  | —     | —                              | —            | —      | —       | —       |
| **personal-general.mdc** (NestJS: ListResult/Result, deprecate not remove)             | —     | —                              | —            | ✓      | —       | —       |

- **remix**: component, form, modal, route, table, application
- **react**: component, hook, util
- **react-native**: component, package (--type)
- **nestjs**: application, graphql-service, simple-service, module, queue, ai-agent
- **package**: react, nestjs, node, tools
- **folders**: routing, services folder sets

---

## 2. Generator → rules (what each generator’s output should satisfy)

### 2.1 remix

- **Workflow:** personal-generators.mdc (use generator first); personal-general.mdc for Remix/React creation and testing.
- **Naming:** naming-conventions.mdc + AGENT_USAGE/remix.md: PascalCase components; forms end with `Form`, modals with `Modal`, tables with `Table`; routes any valid name.
- **Exports:** default-exports.mdc — components/forms/modals/tables use **named exports**; route files may use **default export** (framework requirement).
- **Types:** return-types.mdc (except JSX components), import-type.mdc, interface-extends.mdc, readonly-properties.mdc, optional-properties.mdc.
- **React:** cursor-commands.mdc: `import * as React from 'react'`.
- **Testing:** personal-general.mdc: component, userEvent, waitFor, describe per branch, edge cases; mocks from mocks.ts.

### 2.2 react

- **Workflow:** personal-generators.mdc; personal-general.mdc for React creation and testing.
- **Naming:** naming-conventions.mdc + react.md: PascalCase components/hooks, camelCase utils; kebab-case file names with PascalCase exception for React components.
- **Exports:** default-exports.mdc — all generated components/hooks/utils use **named exports** (templates already do).
- **Types:** return-types.mdc (except JSX), import-type.mdc, interface-extends.mdc, readonly-properties.mdc.
- **React:** cursor-commands.mdc: `import * as React from 'react'`.
- **Testing:** Same as Remix; component, userEvent, waitFor, describe per branch.

### 2.3 react-native

- **Workflow:** personal-generators.mdc; use `--type` not `--subGenerator` (see personal-generators.mdc).
- **Naming:** naming-conventions.mdc + react-native.md: PascalCase components; feature-_ / react-native-_ for packages.
- **Exports:** default-exports.mdc — generated components use **named exports**; route/layout files may use **default export** (framework).
- **Types:** return-types.mdc, import-type.mdc, interface-extends.mdc, readonly-properties.mdc.
- **Testing:** personal-general.mdc (component, userEvent, waitFor, describe per branch) where tests exist.

### 2.4 nestjs

- **Workflow:** personal-generators.mdc; personal-general.mdc for API creation and testing.
- **Naming:** naming-conventions.mdc + nestjs.md: **kebab-case** for services, modules, applications.
- **Exports:** default-exports.mdc (named exports for services/modules).
- **Types:** return-types.mdc, import-type.mdc, interface-extends.mdc, throwing.mdc (prefer result types where applicable).
- **API conventions:** personal-general.mdc — resolvers return ListResult/PaginatedResult/Result; entity changes backwards compatible, deprecate rather than remove.
- **Testing:** personal-general.mdc: mock providers in beforeEach; model/entity factories; describe per branch, edge cases.

### 2.5 package

- **Workflow:** personal-generators.mdc when creating new packages.
- **Naming:** naming-conventions.mdc + package.md: **kebab-case** package names.
- **Types:** return-types.mdc, import-type.mdc, interface-extends.mdc; throwing.mdc for node/nestjs/tools where relevant.

### 2.6 folders

- **Workflow:** personal-generators.mdc when creating routing/services folder sets.
- **Naming:** naming-conventions.mdc + folders.md: **kebab-case** folder names.
- No code files generated; structure-only.

---

## 3. Template alignment with rules (verified)

- **default-exports:** React/Remix component templates use **named** `export const <%= name %>`. Remix route and React Native route/layout templates use `export default` only where the framework requires it (allowed by rule). **Aligned.**
- **naming:** Generator docs (react.md, remix.md, nestjs.md, react-native.md, package.md, folders.md) match naming-conventions.mdc (PascalCase components, kebab-case files/services/packages). **Aligned.**
- **React import:** Generator source uses `import * as React from 'react'` in component templates. **Aligned** with cursor-commands.mdc.

---

## 4. Gaps and inconsistencies

### 4.1 Documentation / workflow

- **personal-general.mdc** still documents **yarn** and old generator CLI:
  - `yarn generate:remix --generator=... --name=... --project=... --folder=...`
  - `yarn generate:nestjs --generator=... --name=... --project=...`
  - **Gap:** Agents and humans following personal-general.mdc may use the wrong entrypoint. **Recommendation:** Update personal-general.mdc to point to @tools/generators and AGENT_USAGE.md (e.g. “Use Nx generators: see personal-generators.mdc and docs/tools/generators/AGENT_USAGE.md”).
- **personal-generators.mdc** example uses `--type`, `--target`, `--name` generically; React uses `--subGenerator` and `--destination`, React Native uses `--type` and `--target`. **Gap:** One example doesn’t fit all. **Recommendation:** Keep one canonical “discover then generate” flow in personal-generators.mdc and link to AGENT_USAGE.md (and generator docs) for exact flags per generator.

### 4.2 Generator coverage

- **Remix route-api:** AGENT_USAGE and remix generator source mention route-api; remix.md doc doesn’t list it in the Sub-Generators table. **Gap:** Doc vs implementation mismatch; clarify in remix.md if route-api is supported and list params.
- **React Native:** Only `component` and `package` types documented; route generators exist in source (flat/nested). **Gap:** react-native.md doesn’t list route sub-types; agents may not discover them. **Recommendation:** Document route generation in react-native.md or confirm routes are out of scope for the generator.
- **core-repository:** personal-general.mdc mentions “core-repository” for NestJS; nestjs generator has graphql-service, simple-service, module, queue, ai-agent, application but no “core-repository” subGenerator. **Gap:** Rule references an artifact type that may not exist in @tools/generators. **Recommendation:** Either add core-repository to nestjs generator or update personal-general.mdc to match actual subGenerators.

### 4.3 Rules not enforced by generators

- **return-types.mdc:** Templates don’t add explicit return types to every function; agents/humans must add when editing. **Gap:** No automatic compliance from generation.
- **import-type.mdc, readonly-properties.mdc, optional-properties.mdc, jsdoc-comments.mdc:** Not encoded in template files; compliance is by review and agent adherence. **Gap:** Audit may find inconsistent application.
- **personal-general.mdc (alphabetize arrays/object keys, const over let, async/await):** Purely behavioral; not in templates. **Gap:** Same as above.

### 4.4 Cross-references

- **AGENTS.md / AGENT_USAGE.md:** AGENT_USAGE.md is the canonical generator-first guide; AGENTS.md references Nx and templates at a high level. **Recommendation:** Ensure AGENTS.md explicitly points to docs/tools/generators/AGENT_USAGE.md and personal-generators.mdc so “generator-first” is discoverable in one place.

---

## 5. Summary table: rules ↔ generators

| Rule source                | Primary generators                          | Notes                                                                        |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| personal-generators.mdc    | All                                         | Generator-first workflow; NX_ISOLATE_PLUGINS=false; React Native uses --type |
| personal-general.mdc (UI)  | remix, react                                | Creation, testing, shared-ui; update to Nx generator commands                |
| personal-general.mdc (API) | nestjs                                      | ListResult/Result, deprecate not remove, testing                             |
| cursor-commands.mdc        | remix, react, react-native, package         | PNPM, NX, import \* as React                                                 |
| coding/\* (style)          | remix, react, react-native, nestjs, package | default-exports, return-types, naming, import-type, etc.                     |
| folders                    | folders                                     | Structure only; kebab-case names                                             |

---

## 6. Recommended next steps (for downstream tasks)

- **Document generator-first workflow for agents (task 8a9832fd):** Use this map and AGENT_USAGE.md; make personal-general.mdc and AGENTS.md point to the same workflow and generator list.
- **Define agent inputs (task 746ba239):** Provide agents with: (1) personal-generators.mdc + AGENT_USAGE.md, (2) this map, (3) generator docs (react.md, remix.md, nestjs.md, react-native.md, package.md, folders.md), (4) coding/\* rules.
- **Audit checklist (task a5a13afe):** When building a checklist, use §2 (generator → rules) to define per-artifact checks (e.g. “Remix component: named export, PascalCase, Form/Modal/Table suffix if applicable, import \* as React”).

This mapping is the single reference for the “Map coding rules to generator templates” task and for downstream agent workflow and audit checklist work.
