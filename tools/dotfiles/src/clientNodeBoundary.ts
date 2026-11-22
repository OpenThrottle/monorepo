/**
 * @description Dependency-free (beyond Vite's types) so an app's `vite.config.ts` can load it
 * without pulling in the ESLint plugins behind the package root. Exposed as the
 * `@tools/dotfiles/client-node-boundary` subpath.
 */

import { isBuiltin } from 'node:module';
import { relative } from 'node:path';

import type { Plugin } from 'vite';

/** Vite resolves a Node builtin reached from browser code to an id with this prefix. */
const BROWSER_EXTERNAL_PREFIX = '__vite-browser-external';

export interface ClientNodeBoundaryViolation {
  readonly importer: string;
  readonly specifier: string;
}

/**
 * @description The build error listing every Node builtin a client module imported and the
 * module that imported it, plus the three ways out this repo already uses.
 * @public
 */
export const formatClientNodeBoundaryError = (
  violations: readonly ClientNodeBoundaryViolation[],
  root: string,
): string => {
  const lines = violations.map(({ importer, specifier }) => {
    return `  ${specifier} ← ${relative(root, importer) || importer}`;
  });

  return [
    'Node builtins reached the client bundle:',
    '',
    ...lines,
    '',
    'Vite replaces each one with an empty stub, so the page breaks when it is used.',
    'Move the code server-side, import it with `import type`, or put it behind a',
    '`*.server.ts` module. One `node:*` import in a package barrel reaches every',
    'client module that imports anything from that package.',
  ].join('\n');
};

/**
 * @description Fails an app's CLIENT build when a Node builtin is reachable from browser code.
 * Vite does not error on that: it externalizes the builtin and ships `module.exports = {}`
 * in its place, so typecheck, lint and build all pass and the break only shows at runtime.
 * This resolves every builtin specifier the client graph imports, records the ones Vite
 * externalized, and errors at `buildEnd` with the exact specifier and importer. It applies
 * to `build` only (the dev server's stub already warns in the console) and to the `client`
 * environment only (the SSR build legitimately imports Node).
 * @public
 */
export const clientNodeBoundary = (): Plugin => {
  // Keyed by specifier + importer: Vite can resolve the same import more than once.
  const violations = new Map<string, ClientNodeBoundaryViolation>();
  let root = process.cwd();

  return {
    apply: 'build',
    applyToEnvironment: (environment) => environment.name === 'client',
    buildEnd() {
      if (violations.size > 0) {
        this.error(
          formatClientNodeBoundaryError([...violations.values()], root),
        );
      }
    },
    buildStart() {
      violations.clear();
    },
    configResolved(config) {
      root = config.root;
    },
    enforce: 'pre',
    name: 'openthrottle:client-node-boundary',
    async resolveId(source, importer, options) {
      if (importer === undefined || !isBuiltin(source)) {
        return null;
      }

      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });

      if (resolved?.id.startsWith(BROWSER_EXTERNAL_PREFIX)) {
        violations.set(`${source}\u0000${importer}`, {
          importer,
          specifier: source,
        });
      }

      return resolved;
    },
  };
};
