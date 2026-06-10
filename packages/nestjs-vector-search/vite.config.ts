import { defineViteConfig, getDirname } from '@tools/dotfiles';

export default defineViteConfig({
  packagePath: getDirname(import.meta.url),
  packageType: 'nestjs',
});
