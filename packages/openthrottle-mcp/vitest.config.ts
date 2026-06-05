import {
  createVitestConfigNode,
  getDirname,
} from '@tools/dotfiles/vitest-config';

export default createVitestConfigNode({
  packagePath: getDirname(import.meta.url),
});
