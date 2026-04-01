// Separate export file for vite/vitest configs to avoid global.ts import issues
export {
  createViteConfig,
  defineViteConfig,
  getDirname,
  type CreateViteConfigOptions,
  type PackageType,
} from './vite-config.js';

export {
  createVitestConfig,
  createVitestConfigJsdom,
  createVitestConfigHappyDom,
  createVitestConfigNode,
  type CreateVitestConfigOptions,
  type TestEnvironment,
} from './vitest-config.js';
