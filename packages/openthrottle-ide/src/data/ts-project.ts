import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { ProjectOptions } from 'ts-morph';
import { Project, ts } from 'ts-morph';

import type { WorkspaceConfig } from '../config/workspace-config.ts';
import { resolveWorkspaceConfig } from '../config/workspace-config.ts';

/** Options that tune how {@link loadProject} builds its ts-morph project. */
export interface LoadProjectOptions {
  /**
   * Build a fresh project, ignoring (and replacing) the cached one for this
   * workspace root. Defaults to `false`.
   */
  fresh?: boolean;
}

/**
 * Compiler options used when a workspace has no `tsconfig.json`. Deliberately
 * permissive so the symbol layer can reason about loosely-configured or
 * mixed JS/TS trees without a project file.
 */
const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  allowJs: true,
  esModuleInterop: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  target: ts.ScriptTarget.Latest,
};

const projectCache = new Map<string, Project>();

/**
 * Build (or reuse) a ts-morph {@link Project} for a workspace. Resolves the
 * workspace `tsconfig.json` when present so the symbol layer honors the same
 * compiler options as the project itself, falling back to permissive defaults
 * otherwise.
 *
 * Files are loaded lazily: the project starts empty and source files are added
 * on demand (and their imports resolved) by the symbol functions, rather than
 * eagerly reading the whole tree. Projects are cached per resolved workspace
 * root; pass `{ fresh: true }` to rebuild.
 *
 * @public
 */
export function loadProject(
  config: WorkspaceConfig,
  options: LoadProjectOptions = {},
): Project {
  const resolved = resolveWorkspaceConfig(config);

  if (!options.fresh) {
    const cached = projectCache.get(resolved.root);

    if (cached !== undefined) {
      return cached;
    }
  }

  const tsConfigFilePath = join(resolved.root, 'tsconfig.json');
  const projectOptions: ProjectOptions = existsSync(tsConfigFilePath)
    ? { skipAddingFilesFromTsConfig: true, tsConfigFilePath }
    : { compilerOptions: DEFAULT_COMPILER_OPTIONS };
  const project = new Project(projectOptions);

  projectCache.set(resolved.root, project);

  return project;
}

/**
 * Drop every cached {@link Project}. Primarily useful in tests that reuse a
 * workspace root across cases, or to release memory after a batch of analysis.
 *
 * @public
 */
export function resetProjectCache(): void {
  projectCache.clear();
}
