import { dirname } from 'node:path';
import {
  createNodesFromFiles,
  type CreateNodes,
  type CreateNodesResultArray,
} from '@nx/devkit';
import {
  resolveTypecheckCompiler,
  TYPECHECK_COMPILER_INPUTS,
  type TypecheckCompilerOptions,
} from './typecheck-compiler.ts';

/**
 * @description Local Nx inference plugin: gives every React Router application
 * (any project with a `react-router.config.ts`) the SAME real `typecheck`
 * target, so the policy lives here at the workspace root instead of drifting
 * per-app in package.json overrides.
 *
 * Why not the built-in plugins?
 * - `@nx/js/typescript` refuses RR apps ("disabled because … noEmit") and
 *   would otherwise infer the package-style `tsc --build --emitDeclarationOnly`.
 * - `@nx/react/router-plugin`'s typecheck also resolves to the package-style
 *   command under a TS-solution workspace and never runs `react-router typegen`.
 *
 * RR apps are source-first (no dist emit): route typegen must run first, then
 * a single `tsc --noEmit` pass over the whole project (source + tests)
 * replaces the lib/test split used by buildable packages.
 *
 * NOTE: `nx.json` targetDefaults.typecheck still layers `cache`/`dependsOn`
 * on top of what is inferred here (target defaults override inferred fields) —
 * keep `^typecheck` there so referenced packages emit their dist declarations
 * before this `tsc --noEmit` pass runs.
 */
const REACT_ROUTER_CONFIG_GLOB = `applications/*/react-router.config.ts`;

export const createNodesV2: CreateNodes<TypecheckCompilerOptions> = [
  REACT_ROUTER_CONFIG_GLOB,
  async (configFiles, options, context): Promise<CreateNodesResultArray> =>
    await createNodesFromFiles(
      (configFile) => {
        const projectRoot = dirname(configFile);

        // Which compiler binary runs is a knob, not a hardcode — see
        // ./typecheck-compiler.ts. Defaults to `tsc6` (TypeScript 6), because
        // TypeScript 7 owns the bare `tsc` bin once both are installed.
        const tsc = resolveTypecheckCompiler(projectRoot, options);

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
                    '{workspaceRoot}/tsconfig.react-router.json',
                    '{workspaceRoot}/tsconfig.base.json',
                    // Compiler identity. Without these the knob is invisible to
                    // the hash and Nx serves one compiler's cached result for
                    // the other's run. See ./typecheck-compiler.ts.
                    ...TYPECHECK_COMPILER_INPUTS,
                  ],
                  metadata: {
                    description: `Static type-check (source + tests) with tsc --noEmit after react-router typegen. Source-first RR app: no dist emit, so a single noEmit pass replaces the lib/test split used by buildable packages.`,
                    technologies: ['typescript'],
                  },
                  options: {
                    command: `react-router typegen && ${tsc} --noEmit -p tsconfig.json`,
                    cwd: projectRoot,
                  },
                  outputs: [],
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
