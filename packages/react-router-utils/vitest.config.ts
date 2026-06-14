import { createVitestConfigJsdom, getDirname } from '@tools/dotfiles';

export default createVitestConfigJsdom({
  packagePath: getDirname(import.meta.url),
});
