import {
  createVitestConfigJsdom,
  getDirname,
} from '@tools/dotfiles/vitest-config';

export default createVitestConfigJsdom({
  packagePath: getDirname(import.meta.url),
  setupFiles: ['./vitest.setup.ts'],
});
