import type { EslintFlatConfig } from '@tools/dotfiles';
import { eslintConfig } from '@tools/dotfiles';

const eslintRootConfig = [
  {
    ignores: [
      '!**/*',
      '.agents/skills/**/*',
      '.opencode/skills/**/*',
      'skills/**/*',
    ],
  },
  ...eslintConfig,
] as EslintFlatConfig[];

export default eslintRootConfig;
