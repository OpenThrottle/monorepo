/**
 * @description Guards the half of the package-entrypoint contract that
 * `check-package-entrypoints` cannot see: whether a NodeNext project can
 * actually *resolve* the workspace dependencies it declares.
 *
 * A NodeNext consumer reads a dependency's `exports` map and lands on its
 * emitted `.d.ts`. That declaration is only usable if its own relative
 * re-exports resolve, and under `node16`/`nodenext` an extensionless relative
 * specifier does not. The failure is `TS2305` — "has no exported member" —
 * pointing at a symbol that plainly exists.
 *
 * There are exactly **two** sufficient conditions, and a dependency needs only
 * one of them:
 *
 * 1. The consumer holds a tsconfig project reference to the dependency. A
 *    reference redirects a resolved `.d.ts` in the referenced project's
 *    `outDir` back to its **source**, where that project's own resolution mode
 *    applies — so extensionless specifiers resolve after all.
 * 2. The dependency's `src/` has zero extensionless relative specifiers, so the
 *    `.d.ts` it emits is self-resolvable with no help from the consumer.
 *
 * Checking only the first would hard-fail working code: `@openthrottle/nodejs-graphql`
 * is NodeNext, depends on `@openthrottle/nodejs-utils`, holds no reference to
 * it, and typechecks green — because `nodejs-utils` satisfies condition 2.
 *
 * Condition 2 is re-measured on every run, which is what makes this gate catch
 * the regression nothing else guards: **someone adding a single extensionless
 * re-export to a package that is importable today**, silently breaking every
 * reference-free NodeNext consumer of it.
 *
 * Scope is deliberately limited to projects whose *effective* `moduleResolution`
 * is `nodenext`/`node16`. `bundler` and `node` ignore `exports` and resolve
 * `main` → `src`, so a missing reference there is genuinely harmless; flagging
 * those would report non-problems and force this gate into warn-mode for no
 * benefit.
 *
 * Deliberately file-based. The `check:tsconfig-refs` approach on the unmerged
 * `openthrottle/squash-nx-typescript-sync-gate` branch runs the Nx sync
 * generator in a throwaway auto-reverted pass and then filters phantom app→app
 * edges — machinery built to work around nrwl/nx#36297, which reading the files
 * directly sidesteps entirely.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { createLogger, hasFlag } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();
const WORKSPACE_DIRS = ['applications', 'packages', 'tools'] as const;

/**
 * @description Resolution modes that read a dependency's `exports` map and so
 * land on its emitted declarations
 */
const NODENEXT_RESOLUTIONS = ['node16', 'nodenext'] as const;

/**
 * @description A relative specifier carrying no extension TypeScript can map
 * onto a sibling declaration. Single-quoted only: a looser pattern that also
 * matched double quotes reported phantom hits.
 */
const RELATIVE_SPECIFIER = /from '(\.[^']*)'/g;

const RESOLVABLE_EXTENSIONS = ['.js', '.json', '.ts', '.tsx'] as const;

/**
 * @description The configs that can carry a project's `references` — a library
 * declares them in `tsconfig.lib.json`, an application in `tsconfig.app.json`,
 * and `tsconfig.json` points at whichever it has
 */
const PROJECT_CONFIG_NAMES = [
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.lib.json',
] as const;

/**
 * @description Test sources are excluded from a project's emitted declarations,
 * so a specifier in one can never reach a consumer
 */
const TEST_FILE = /(\.(spec|test)\.tsx?$|[\\/]__tests__[\\/])/;

interface ProjectInfo {
  readonly directory: string;
  /** Effective `moduleResolution`, lowercased, from the `extends` chain */
  readonly moduleResolution: string | undefined;
  readonly name: string;
  /** Absolute paths named by `references` in `tsconfig.lib.json` */
  readonly referencePaths: readonly string[];
  readonly workspaceDependencies: readonly string[];
}

interface Violation {
  readonly consumer: string;
  readonly dependency: string;
  readonly extensionlessCount: number;
  readonly samples: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @description Strips `//` and comment blocks, then trailing commas, so a tsconfig
 * can be read with `JSON.parse`. `tsconfig.nestjs-package.json` carries an inline
 * `//` comment that would otherwise throw.
 */
const stripJsonComments = (text: string): string => {
  let result = '';
  let index = 0;
  let inString = false;

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (inString) {
      result += char;
      if (char === '\\') {
        result += next ?? '';
        index += 2;
        continue;
      }
      if (char === '"') inString = false;
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (
        index < text.length &&
        !(text[index] === '*' && text[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }

    result += char;
    index += 1;
  }

  return result.replace(/,(\s*[}\]])/g, '$1');
};

const readTsconfig = (
  absolutePath: string,
): Record<string, unknown> | undefined => {
  if (!existsSync(absolutePath)) return undefined;

  try {
    const parsed: unknown = JSON.parse(
      stripJsonComments(readFileSync(absolutePath, 'utf8')),
    );

    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * @description Walks the `extends` chain — nearest definition wins, and for an
 * array-valued `extends` the last entry wins, matching TypeScript
 */
const resolveModuleResolution = (
  tsconfigPath: string,
  seen: ReadonlySet<string> = new Set(),
): string | undefined => {
  if (seen.has(tsconfigPath)) return undefined;

  const config = readTsconfig(tsconfigPath);

  if (config === undefined) return undefined;

  const compilerOptions = isRecord(config.compilerOptions)
    ? config.compilerOptions
    : undefined;
  const own = compilerOptions?.moduleResolution;

  if (typeof own === 'string') return own.toLowerCase();

  const extendsValue = config.extends;
  const parents = (
    typeof extendsValue === 'string'
      ? [extendsValue]
      : Array.isArray(extendsValue)
        ? extendsValue.filter(
            (entry): entry is string => typeof entry === 'string',
          )
        : []
  ).filter((entry) => entry.startsWith('.'));

  const nextSeen = new Set([...seen, tsconfigPath]);

  for (const parent of [...parents].reverse()) {
    const resolved = resolveModuleResolution(
      path.resolve(path.dirname(tsconfigPath), parent),
      nextSeen,
    );

    if (resolved !== undefined) return resolved;
  }

  return undefined;
};

/**
 * @description Every out-of-project path named by `references`, walking the
 * project's own tsconfig graph.
 *
 * A library keeps its references in `tsconfig.lib.json`; an application keeps
 * them in `tsconfig.app.json`; both are reached from the project's
 * `tsconfig.json` by an intra-project reference. Reading only one of those
 * shapes reports every dependency of the other as a violation.
 */
const readReferencePaths = (directory: string): readonly string[] => {
  const external = new Set<string>();
  const visited = new Set<string>();
  const queue = PROJECT_CONFIG_NAMES.map((name) => path.join(directory, name));

  while (queue.length > 0) {
    const current = queue.pop();

    if (current === undefined || visited.has(current)) continue;

    visited.add(current);

    const references = readTsconfig(current)?.references;

    if (!Array.isArray(references)) continue;

    for (const entry of references) {
      if (!isRecord(entry) || typeof entry.path !== 'string') continue;

      const resolved = path.resolve(path.dirname(current), entry.path);

      // A reference into this project (tsconfig.json → tsconfig.app.json) is a
      // hop to follow; anything else is a real dependency edge.
      if (resolved.startsWith(`${directory}${path.sep}`)) {
        queue.push(resolved);
      } else {
        external.add(resolved);
      }
    }
  }

  return [...external];
};

const readProjectInfo = (directory: string): ProjectInfo | undefined => {
  const manifestPath = path.join(directory, 'package.json');

  if (!existsSync(manifestPath)) return undefined;

  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!isRecord(parsed) || typeof parsed.name !== 'string') return undefined;

  const declared = [parsed.dependencies, parsed.peerDependencies].flatMap(
    (block) => (isRecord(block) ? Object.entries(block) : []),
  );

  // Resolve the mode from the config that actually compiles the project —
  // `tsconfig.lib.json` for a library, `tsconfig.app.json` for an application —
  // falling back to the project root config.
  const tsconfigPath =
    [
      path.join(directory, 'tsconfig.lib.json'),
      path.join(directory, 'tsconfig.app.json'),
    ].find((candidate) => existsSync(candidate)) ??
    path.join(directory, 'tsconfig.json');

  return {
    directory,
    moduleResolution: resolveModuleResolution(tsconfigPath),
    name: parsed.name,
    referencePaths: readReferencePaths(directory),
    workspaceDependencies: declared
      .filter(
        ([, version]) =>
          typeof version === 'string' && version.startsWith('workspace:'),
      )
      .map(([dependencyName]) => dependencyName),
  };
};

const listProjects = (): readonly ProjectInfo[] =>
  WORKSPACE_DIRS.flatMap((workspaceDir) => {
    const absolute = path.join(ROOT, workspaceDir);

    if (!existsSync(absolute)) return [];

    return readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readProjectInfo(path.join(absolute, entry.name)))
      .filter((info): info is ProjectInfo => info !== undefined);
  });

const listSourceFiles = (directory: string): readonly string[] => {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) return listSourceFiles(absolute);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (TEST_FILE.test(absolute)) return [];

    return [absolute];
  });
};

/**
 * @description Every extensionless relative specifier that would survive into
 * the package's emitted declarations, as `file:specifier` for reporting
 */
const findExtensionlessSpecifiers = (directory: string): readonly string[] => {
  const sourceDir = path.join(directory, 'src');

  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) return [];

  return listSourceFiles(sourceDir).flatMap((file) => {
    const contents = readFileSync(file, 'utf8');

    return [...contents.matchAll(RELATIVE_SPECIFIER)]
      .map(([, specifier]) => specifier)
      .filter(
        (specifier): specifier is string =>
          specifier !== undefined &&
          !RESOLVABLE_EXTENSIONS.some((extension) =>
            specifier.endsWith(extension),
          ),
      )
      .map((specifier) => `${path.relative(ROOT, file)}: ${specifier}`);
  });
};

const run = (): void => {
  const projects = listProjects();
  const byName = new Map(projects.map((project) => [project.name, project]));

  const exposed = projects.filter((project) =>
    NODENEXT_RESOLUTIONS.some(
      (resolution) => resolution === project.moduleResolution,
    ),
  );

  // Measured once per dependency, not once per edge — several consumers share one.
  const extensionlessCache = new Map<string, readonly string[]>();

  const extensionlessFor = (project: ProjectInfo): readonly string[] => {
    const cached = extensionlessCache.get(project.name);

    if (cached !== undefined) return cached;

    const found = findExtensionlessSpecifiers(project.directory);

    extensionlessCache.set(project.name, found);

    return found;
  };

  const violations: Violation[] = exposed.flatMap((consumer) =>
    consumer.workspaceDependencies.flatMap((dependencyName) => {
      const dependency = byName.get(dependencyName);

      // Not a project under applications/packages/tools — nothing to assert.
      if (dependency === undefined) return [];

      const hasReference = consumer.referencePaths.some(
        (referencePath) =>
          referencePath === dependency.directory ||
          referencePath.startsWith(`${dependency.directory}${path.sep}`),
      );

      if (hasReference) return [];

      const extensionless = extensionlessFor(dependency);

      if (extensionless.length === 0) return [];

      return [
        {
          consumer: consumer.name,
          dependency: dependencyName,
          extensionlessCount: extensionless.length,
          samples: extensionless.slice(0, 3),
        },
      ];
    }),
  );

  const verbose = hasFlag('verbose');

  if (violations.length > 0) {
    for (const violation of violations) {
      const dependency = byName.get(violation.dependency);
      const relativeDependency =
        dependency === undefined
          ? violation.dependency
          : path.relative(ROOT, dependency.directory);

      logger.fail(
        `check-nodenext-references: ${violation.consumer} → ${violation.dependency}: ` +
          `the consumer resolves NodeNext, holds no tsconfig project reference to this dependency, ` +
          `and the dependency has ${violation.extensionlessCount} extensionless relative specifier(s) in src/ — ` +
          `so the .d.ts it emits cannot resolve itself and importing it by name fails with TS2305. ` +
          `Fix it EITHER way: (a) add { "path": "../../${relativeDependency}/tsconfig.lib.json" } to the consumer's tsconfig.lib.json references, ` +
          `OR (b) give every relative specifier in ${violation.dependency}'s src/ an explicit .ts extension. ` +
          `(a) is one line; (b) is permanent and fixes it for every consumer at once.`,
      );

      if (verbose) {
        for (const sample of violation.samples) {
          logger.warn(`check-nodenext-references:   e.g. ${sample}`);
        }
      }
    }

    logger.fail(
      `check-nodenext-references: ${violations.length} violation(s) across ${exposed.length} NodeNext project(s). Re-run with --verbose to see offending specifiers.`,
    );
    process.exit(1);
  }

  logger.success(
    `check-nodenext-references: OK (${exposed.length} NodeNext project(s) of ${projects.length} workspace project(s))`,
  );
};

run();
