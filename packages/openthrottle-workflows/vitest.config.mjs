/**
 * @description Vitest config as `.mjs` so Node loads `@tools/dotfiles` from compiled `dist`
 * (importing `@tools/dotfiles` from `.ts` fails: package exports point at `.ts` sources).
 */
import {
  createVitestConfigNode,
  getDirname,
} from '../../tools/dotfiles/dist/src/index.js';

export default createVitestConfigNode({
  packagePath: getDirname(import.meta.url),
});
