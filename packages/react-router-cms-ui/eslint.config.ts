import { dataFolderEslintConfig, eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,
  ...dataFolderEslintConfig,

  /**
   * Component primitive shape — enforced hard for this package
   * (docs/monorepo/component-primitive-shape.md), from the first component on,
   * so the port never accrues shape debt to ratchet down later.
   */
  {
    files: ['**/components/**/*.tsx'],
    ignores: ['**/__tests__/**', '**/*.test.tsx'],
    rules: {
      'max-lines': [
        'error',
        { max: 210, skipBlankLines: false, skipComments: false },
      ],
      'openthrottle/component-primitive-shape': 'error',
    },
  },
];
