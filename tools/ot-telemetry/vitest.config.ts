import { createVitestConfigNode, getDirname } from '@tools/dotfiles';

export default createVitestConfigNode({
  packagePath: getDirname(import.meta.url),
});
