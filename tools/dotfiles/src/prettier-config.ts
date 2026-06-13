import type { Config } from 'prettier';

/**
 * Shared Prettier configuration for the monorepo — the single source of truth.
 *
 * Every `.prettierrc.mjs` in the workspace imports this instead of redefining
 * the options object, so formatting stays identical everywhere.
 *
 * Notes:
 * - The base options match the historical settings every `.prettierrc.mjs`
 *   used to inline (`arrowParens`, `printWidth`, `singleQuote`, `tabWidth`,
 *   `trailingComma`).
 * - `prettier-plugin-tailwindcss` sorts Tailwind class lists deterministically.
 * - The `*.{yml,yaml}` override pins YAML to single quotes. Prettier only
 *   re-quotes YAML when `.editorconfig` declares a `quote_type`; pinning the
 *   style here (and matching `quote_type = single` in `.editorconfig`) stops
 *   the single/double-quote churn that used to re-flip on every reformat.
 * @publicApi
 */
export const prettierConfig: Config = {
  arrowParens: 'always',
  overrides: [
    {
      files: ['*.yaml', '*.yml'],
      options: {
        singleQuote: true,
      },
    },
  ],
  plugins: ['prettier-plugin-tailwindcss'],
  printWidth: 80,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
};
