import { eslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: [
      '!**/*',
      '.agents/skills/**/*',
      '.opencode/plugins/**/*',
      '.opencode/skills/**/*',
      // Minified Nx graph bundles committed by dependency-graph-scheduled.yml.
      // Linting them is meaningless and runs the pre-commit hook out of heap.
      'docs/nx/dependency-graphs/**/*',
      'skills/**/*',
    ],
  },

  ...eslintConfig,
];
