import { eslintConfig } from '@tools/dotfiles';

/**
 * We use a ".mts" extension to allow for the use of the "import" keyword.
 * This is necessary because the "eslintConfig NestJS uses CommonJS syntax and
 * we're trying to write all our code in ESM. This helps bridge that gap.
 */
export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,
];
