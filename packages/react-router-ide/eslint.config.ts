import { eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,

  /**
   * Engine boundary guard.
   *
   * `@openthrottle/openthrottle-ide` is a source-first, server-only Node library:
   * its `package.json` `main`/`module` point at `./src/index.ts` and it exports
   * runtime values (`searchText`, `chunkFile`, `createEmbeddingsProvider`, …) that
   * pull Node-only deps (`@vscode/ripgrep`, `chokidar`, `ts-morph`). This package is
   * presentational and client-safe, so it may import the engine's TYPES only —
   * a value import would drag those Node deps into the client bundle.
   *
   * `allowTypeImports: true` permits `import type { … }` / `export type { … }`
   * (erased at compile time) while making any value import a CI lint error. This
   * lint rule IS the boundary enforcement: the package has no `*.server.ts` files,
   * so the seam rests entirely on type-only imports.
   */
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              allowTypeImports: true,
              message:
                'Import only TYPES from @openthrottle/openthrottle-ide (use `import type`). It is a server-only Node library; a value import drags @vscode/ripgrep, chokidar and ts-morph into the client bundle.',
              name: '@openthrottle/openthrottle-ide',
            },
          ],
        },
      ],
    },
  },
];
