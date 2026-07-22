import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  createNodesFromFiles,
  type CreateNodesResultV2,
  type CreateNodesV2,
} from '@nx/devkit';

/**
 * @description Local Nx inference plugin: gives every buildable project — the
 * packages and the NestJS server, i.e. any project with a `tsconfig.lib.json`
 * or `tsconfig.app.json` — a SINGLE `typecheck` target that type-checks BOTH
 * source and test files, replacing the old `typecheck` + `typecheck-tests`
 * split.
 *
 * Why a dedicated plugin instead of the `@nx/js/typescript`-inferred target?
 * - `@nx/js`'s `typecheck` is source-only: it emits declarations from
 *   `tsconfig.lib.json`/`tsconfig.app.json` and deliberately EXCLUDES
 *   `*.test.ts`/`*.spec.ts` from both its compile and its cache inputs. A
 *   separate `typecheck-tests` ran `tsc --noEmit -p tsconfig.test.json` for the
 *   test side.
 * - Overriding only the command per-project (package.json) keeps `@nx/js`'s
 *   inputs, which exclude test files — so a test-only type error would be
 *   missed on a cache hit. Overriding `inputs` per-project REPLACES the list
 *   (losing the transitive dependent-`.d.ts` inputs). Both are wrong, so we own
 *   the whole target here and define correct inputs once, centrally.
 *
 * `@nx/js`'s own typecheck is disabled in `nx.json`
 * (`typecheck.targetName` set to an unused name), so this plugin is the sole
 * provider — symmetric with how the React Router apps are handled by
 * `react-router-typecheck.ts` (which pairs with `@nx/react/router-plugin`'s
 * `typecheckTargetName: "__NOT_USED__typecheck"`).
 *
 * The target runs, in a single pass:
 *   tsc --build tsconfig.json --emitDeclarationOnly   (source; emits dist .d.ts)
 *   && tsc --noEmit -p tsconfig.test.json             (tests; only when present)
 *
 * `syncGenerators: ['@nx/js:typescript-sync']` is re-attached so tsconfig
 * project-reference sync keeps running (it was previously attached by
 * `@nx/js`).
 *
 * NOTE: `nx.json` targetDefaults.typecheck still layers `cache`/`dependsOn` on
 * top of what is inferred here (target defaults override inferred fields) — keep
 * `^typecheck`/`^build` there so referenced packages emit their dist
 * declarations before this pass runs.
 *
 */
const SOURCE_CONFIG_GLOB = `{applications,packages,tools}/*/tsconfig.{lib,app}.json`;

export const createNodesV2: CreateNodesV2 = [
  SOURCE_CONFIG_GLOB,
  async (configFiles, options, context): Promise<CreateNodesResultV2> =>
    await createNodesFromFiles(
      (configFile) => {
        const projectRoot = dirname(configFile);
        const hasTests = existsSync(
          join(context.workspaceRoot, projectRoot, 'tsconfig.test.json'),
        );

        const sourcePass = `tsc --build tsconfig.json --emitDeclarationOnly`;
        const testPass = `tsc --noEmit -p tsconfig.test.json`;
        const command = hasTests ? `${sourcePass} && ${testPass}` : sourcePass;

        return {
          projects: {
            [projectRoot]: {
              targets: {
                typecheck: {
                  cache: true,
                  executor: 'nx:run-commands',
                  inputs: [
                    'default',
                    '^default',
                    '{projectRoot}/tsconfig.json',
                    '{projectRoot}/tsconfig.lib.json',
                    '{projectRoot}/tsconfig.app.json',
                    '{projectRoot}/tsconfig.test.json',
                    {
                      dependentTasksOutputFiles:
                        '**/*.{d.ts,d.cts,d.mts,tsbuildinfo}',
                      transitive: true,
                    },
                    // Generated GraphQL sources this project type-checks live under
                    // `__generated__/` and are gitignored, so Nx's git-derived file
                    // map never hashes them as project inputs. Without this, a
                    // `codegen-graphql` re-run that changes the generated `.ts`
                    // does NOT change the `typecheck` hash — so a stale cached
                    // `dist/*.d.ts` is restored and dependents' typechecks break on
                    // content that no longer matches the schema/documents. Keying on
                    // the codegen output files (read from disk, not git) forces a
                    // re-emit whenever the generated source changes. Non-transitive:
                    // only THIS project's `codegen-graphql` output (a direct
                    // dependsOn) is relevant.
                    {
                      dependentTasksOutputFiles:
                        '**/__generated__/**/*.{ts,tsx}',
                    },
                  ],
                  metadata: {
                    description: `Static type-check of source + tests: tsc --build (emits dist .d.ts) then tsc --noEmit on tsconfig.test.json.`,
                    technologies: ['typescript'],
                  },
                  options: {
                    command,
                    cwd: projectRoot,
                  },
                  outputs: [
                    '{projectRoot}/dist/**/*.d.ts',
                    '{projectRoot}/dist/**/*.d.ts.map',
                    // The incremental `tsc --build` state MUST be cached
                    // atomically with the `.d.ts` it describes. `tsc --build`
                    // trusts this buildinfo to decide whether to re-emit; if Nx
                    // restores cached declarations while the on-disk buildinfo is
                    // out of sync (or vice-versa), the next `tsc --build` sees
                    // "up to date" and skips emitting — leaving STALE `.d.ts` that
                    // silently break dependents' typechecks on a cache hit. The
                    // source pass writes it next to outDir
                    // (`dist/tsconfig.lib.tsbuildinfo`, or `dist/tsconfig.tsbuildinfo`
                    // for a few packages); the test pass writes
                    // `{projectRoot}/tsconfig.test.tsbuildinfo`. (The prior
                    // `{projectRoot}/tsconfig.tsbuildinfo` matched neither and
                    // captured nothing.)
                    '{projectRoot}/dist/**/*.tsbuildinfo',
                    '{projectRoot}/tsconfig.test.tsbuildinfo',
                  ],
                  syncGenerators: ['@nx/js:typescript-sync'],
                },
              },
            },
          },
        };
      },
      configFiles,
      options,
      context,
    ),
];
