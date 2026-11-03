import { eslintConfig, nestjsEslintConfig } from '@tools/dotfiles';

export default [{ ignores: ['!**/*'] }, ...eslintConfig, ...nestjsEslintConfig];
