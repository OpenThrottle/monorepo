// Separate export file for vite/vitest configs to avoid global.ts import issues

/** @public */
export {
  createViteConfig,
  type CreateViteConfigOptions,
  defineViteConfig,
  getDirname,
  type PackageType,
} from './vite-config.ts';

/** @public */
export {
  createVitestConfig,
  createVitestConfigHappyDom,
  createVitestConfigJsdom,
  createVitestConfigNode,
  type CreateVitestConfigOptions,
  type TestEnvironment,
} from './vitest-config.ts';
