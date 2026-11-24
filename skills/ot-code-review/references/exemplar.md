# Exemplar check: does a new piece look like generator output today?

Principle 2 (`exemplar-01`, `exemplar-02`, `exemplar-07` in the [catalog](catalog.md#2-exemplar-generated-code-is-the-shape-to-match)). This is a manual recipe, not a script: the comparison is a judgment over a handful of facts, and a script would mostly re-implement what the audits and lint rules already check. The normative generator mapping lives in [ot-generators](https://github.com/openthrottle/monorepo/blob/main/skills/ot-generators/SKILL.md) and [AGENT_USAGE § Rule → Generator Matrix](https://github.com/openthrottle/monorepo/blob/main/docs/tools/templates/AGENT_USAGE.md#rule--generator-matrix); this file only says how a reviewer picks the command.

Run the audits first (see [machine-checks.md](machine-checks.md)), and before filing a generator gap check the PR body and OT for one already stated or filed. Do the steps below only for files the diff **adds**; an edited file is judged against its own history.

## 1. Path to generator

| Added file                                                 | Generator and options                                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `applications/<app>/app/routing/<area>/components/X.tsx`   | `react-router --subGenerator=component --application=<app> --folder=routing/<area>/components --name=X`    |
| `applications/<app>/app/routes/<name>.tsx`                 | `react-router --subGenerator=route --application=<app> --name=<name>`                                      |
| `applications/<app>/app/routing/<area>/hooks/useX.tsx`     | `react-router --subGenerator=hook --application=<app> --folder=routing/<area> --name=useX`                 |
| `packages/<pkg>/src/components/X.tsx` (or `hooks/`)        | `react --subGenerator=component\|hook --destination=<project name> --name=X`                               |
| `applications/<app>/src/services/<name>/<name>.service.ts` | `nestjs --subGenerator=simple-service --application=<app> --name=<name>` (`graphql-service` if a resolver) |
| `applications/<app>/app/routes/resources.<name>.tsx`       | No fitting generator (see below)                                                                           |
| `packages/<pkg>/` (new `package.json`)                     | `package --type=<nestjs\|node\|react\|tools> --organization=@openthrottle --name=<pkg>`                    |

A `resources.*` route has no fitting generator: `route-api` is selected only for names starting with `api.` (`tools/generators/src/generators/react-router/generator.route.ts`, `name.startsWith('api.')`), so a `resources.*` name gets the UI template. Compare a new resource route against its existing `resources.*` siblings. That gap is a known reverse finding, already filed as OT plan `7a0b1f91-5393-4e9d-9c2c-3a6bc38a964a`; cite it, do not re-file.

Also `react-router` `form`, `modal` and `table` (the full `react-router` list is `application`, `component`, `form`, `hook`, `modal`, `route`, `table`; there is no `util`), `react` `util` for a package, and `nestjs` `module`, `queue`, `ai-agent`; `--list=...` and `--describe` (no files written) name the valid values. A new util in an application has no exemplar: check only its test placement (`__tests__/<stem>.test.ts`). A component under `packages/` is `react`, never `react-router` (`exemplar-02`). Names: `--name` for `nestjs` and `package` is a kebab slug; for `react-router` a PascalCase component or camelCase `useX` hook. If nothing fits, the finding is "say so before writing custom code", not "regenerate".

## 2. Get the exemplar headlessly

A dry-run prints only `CREATE <path>` lines, never file contents. So use both halves:

1. **File set and names** from a dry-run with a **probe name**. Always `pnpm nx g ...`, run from the repo root with Node 26 on `PATH`.

   ```bash
   pnpm nx g @tools/generators:react-router --subGenerator=component \
     --application=openthrottle-developer --folder=routing/rules/components \
     --name=ExemplarProbe --dry-run
   ```

   Never dry-run with the real name: the generator never clobbers, so for an existing file it prints `SKIPPED (already exists, left untouched)` and nothing else. The probe name goes into the real folder and proves the folder is valid and which siblings are emitted (`__tests__/`, `.tsx.graphql`, `.module.ts`).

If the dry-run rejects the real `--folder` (for example `routing/settings/repositories/components` is not in `--list=componentFolders`), probe the nearest valid parent folder instead and report "folder not generator-addressable" as an out-of-scope reverse finding (§ 4).

2. **Contents** by reading the template: `tools/generators/src/generators/<gen>/files/<sub>/` (`react-router/files/{component,route,hook}`, `react/files/{component,hook}`, `nestjs/files/simple-service/__name__/`, `package/files/{common,<type>}`). `<%= name %>` is the only templating; read past it.

Command forms tried in a headless session on 2026-11-24, all three exit 0 and print the same `CREATE` lines: plain `pnpm nx g ...`, inline `NX_ISOLATE_PLUGINS=false pnpm nx g ...` and `env NX_ISOLATE_PLUGINS=false pnpm nx g ...`. Nothing was denied this time, so use the plain form first; [ot-generators § Gotchas](https://github.com/openthrottle/monorepo/blob/main/skills/ot-generators/SKILL.md#gotchas) records sessions that deny the prefixed forms. Dry-run left `git status` clean every time. Two traps: `package` needs `--organization=@openthrottle` (with the `@`, or it fails schema validation) and prints its `UPDATE package.json` line; `simple-service` logs "GraphQL service created" though it emits no resolver.

If the dry-run errors (isolation, missing option), skip it and use the template tree alone; the file set is the template directory listing.

## 3. Structural checklist (what the audits miss)

Compare **structure, not bytes**. Skip anything in [machine-checks.md](machine-checks.md): markers, export surface, line caps, `pre-hooks-unpack`, return types, hook shape (`openthrottle/*-primitive-shape` lint, `audit:component-shape`, `audit:route-shape`, `audit:hook-shape`), default React import and default exports (`audit:templates-compliance`), stub specs (`audit:test-coverage`), package side effects and tags. The audits scan the whole repo and say nothing about NestJS services, sibling files or a package skeleton, so add:

- **Sibling files exist.** Each file the probe dry-run listed has a counterpart: component and hook have `__tests__/<Name>.test.tsx` next to them; a route has `routes/__tests__/<name>.test.tsx` and its `<name>.tsx.graphql` when it loads data; a service folder has `.module.ts` and `.service.test.ts`. Extra kind-named files (`.types.ts`, `.constants.ts`, `.utils.ts`) are fine.
- **Name and folder form.** Component, hook and route live where the table above says (`routing/<area>/components`, `.../hooks`, `app/routes`), a service in its own `services/<name>/` folder named `<name>.<kind>.ts`, a package under `packages/` with the tsconfig trio, `AGENTS.md`, README and `src/index.ts` barrel.
- **Wiring.** A route uses the template's export order (`handle`, `loader`, `links`, `meta`, `Component`, `action`, `ErrorBoundary`) and the `GlobalScreen` / `GlobalErrorBoundary` shell. A service ships its `@Module` (providers and exports) and registers it where used. A component takes its UI from `react-router-shadcn` and `react-router-ui-global`, not inline.
- **Test shape.** The spec starts from the template (`Test.createTestingModule` plus a mocked `LoggerService` for a service) and replaces the `should be defined` stub with real assertions.
- **Package.** Diff the new tree against a `package` dry-run listing: missing `AGENTS.md`, README, `tests/`, `tsconfig.test.json` or the `sideEffects` and tag fields are `exemplar-07`.

Severity follows the catalog: a missing sibling or the wrong generator is `fix before PR`; a naming or wiring nit is `suggestion`.

## 4. The reverse finding

When the hand-written piece is better than the template (the template's `const {} = props;` trips `no-empty-pattern`; the service template's `name` field and startup debug log are boilerplate nobody keeps; a route using `mergeRouteModuleMeta` where the template hand-builds `meta`), the finding is **"update the generator"**: file a follow-up OT plan against `tools/generators/src/generators/<gen>/files/` and do not ask the author to revert. Raise it only when the deviation recurs across the folder (check two or three siblings) or the lint config already prefers the new form; one author's taste is not a template change. Never mark the PR `fix before PR` for it.

The same finding applies when the diff hand-adds the same file to several pieces (the same `tests/setup.ts` in three packages, for instance): the template is missing it, so file one plan against the template, not three review comments. Before filing, check the PR body and OT for a gap already stated or filed, and cite that instead.

## 5. Trial results

Three files added on `main` in recent PRs, compared as above, audits run sequentially at the repo root (`pnpm run audit:component-shape`, `audit:route-shape`, `audit:hook-shape`, `audit:templates-compliance`, all exit 0, none listed any of the three).

| File                                                                                    | Exemplar command (dry-run, probe name)                                                                                                                                    | Findings                                                                                                                                                                                                                                                                                                                                     | Audits already caught it?                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `applications/openthrottle-developer/app/routing/rules/components/RuleDetailHeader.tsx` | `react-router --subGenerator=component --application=openthrottle-developer --folder=routing/rules/components --name=ExemplarProbe` gave `X.tsx` + `__tests__/X.test.tsx` | None. Both siblings present, six markers in order, named export, `Props` interface, `data-testid`. Optional `className?` matches the template's own commented example, so it is not drift.                                                                                                                                                   | Nothing to catch. Markers and exports are lint and the audits.                                         |
| `applications/openthrottle-developer/app/routes/rules.$ruleId._index.tsx`               | `react-router --subGenerator=route --application=openthrottle-developer --name=exemplar-probe` gave `X.tsx`, `X.tsx.graphql`, `__tests__/X.test.tsx`                      | No drift: `.tsx.graphql` and `routes/__tests__/rules.$ruleId._index.test.tsx` exist, export order and `GlobalErrorBoundary` match, `links` omitted (optional). One reverse candidate: `meta = mergeRouteModuleMeta(...)` where the template hand-builds `meta`; check sibling routes before filing it.                                       | Markers, exports and hoisting: yes (`audit:route-shape`, lint). The `meta` call and sibling files: no. |
| `applications/openthrottle-server/src/services/user-env-file/user-env-file.service.ts`  | `nestjs --subGenerator=simple-service --application=openthrottle-server --name=exemplar-probe` gave `.module.ts`, `.service.ts`, `.service.test.ts`                       | No drift: folder, `.module.ts` (`LoggerModule` import, provider and export) and spec exist, with extra `.types`, `.constants`, `.utils` kind files. Reverse candidate only: it drops the template's `name` field and `🧩` debug line and carries an `@description` JSDoc, which the repo prefers; weak evidence from one file, so not filed. | No. No audit looks at NestJS services; only the file-name lint rules apply.                            |

Not verified: `folders` and `react --subGenerator=hook` dry-runs were not run (`react-router` hook, `react` component and `package` were); no file in the trials needed regeneration.
