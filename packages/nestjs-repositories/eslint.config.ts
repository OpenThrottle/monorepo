import {
  eslintConfig,
  nestjsEslintConfig,
  nodeEsmEslintConfig,
} from '@tools/dotfiles';

// ESM + `moduleResolution: nodenext`: Node requires the file extension on
// every relative specifier, and `eslint --fix` is what writes it.
export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,
  ...nestjsEslintConfig,

  /**
   * The plans/tasks status-write chokepoint. This override must live in this
   * project's own config: nx lints with cwd at the project, where the shared
   * config's `packages/nestjs-repositories/**` prefix can't match the
   * project-relative paths (same reason `component-primitive-shape`'s
   * shadcn-primitive override lives in
   * `packages/react-router-shadcn/eslint.config.ts` instead of the shared
   * config alone — see the fuller reasoning in `@tools/dotfiles`' own
   * `index.ts`). Enabled at `error` repo-wide within this project.
   */
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': 'error',
    },
  },
];
