import { calculateOutputDir } from './calculate-output-dir.ts';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import swc from 'unplugin-swc';
import type { UserConfig } from 'vite';

export { getDirname } from './vite-config.ts';

/**
 * @description Test environment type
 * @public
 */
export type TestEnvironment = 'jsdom' | 'happy-dom' | 'node';

/**
 * @description Options for creating vitest configuration
 * @public
 */
export interface CreateVitestConfigOptions {
  /**
   * @description Custom coverage directory (defaults to auto-calculation)
   */
  readonly coverageDirectory?: string;
  /**
   * @description Whether coverage is enabled (defaults to true, false for some React Native packages)
   */
  readonly coverageEnabled?: boolean;
  /**
   * @description Additional environment variables
   */
  readonly env?: Record<string, string>;
  /**
   * @description Test environment type
   */
  readonly environment: TestEnvironment;
  /**
   * @description Custom vitest config overrides
   */
  readonly overrides?: Partial<UserConfig>;
  /**
   * @description Path to the package directory (used for coverage directory calculation)
   */
  readonly packagePath: string;
  /**
   * @description Setup files to include
   */
  readonly setupFiles?: readonly string[];
}

/**
 * @description Calculates the coverage directory path relative to the package
 */
const calculateCoverageDirectory = (packagePath: string): string =>
  calculateOutputDir(packagePath, 'coverage');

/**
 * @description Base configuration options for environment-specific configs
 */
interface BaseConfigOptions {
  readonly coverageDirectory?: string;
  readonly coverageEnabled: boolean;
  readonly env: Record<string, string>;
  readonly overrides?: Partial<UserConfig>;
  readonly packagePath: string;
  readonly setupFiles?: readonly string[];
}

/**
 * @description Creates the base vitest configuration shared across all environments
 */
const createBaseVitestConfig = (
  options: BaseConfigOptions & { readonly environment: TestEnvironment },
): ReturnType<typeof defineConfig> => {
  const {
    packagePath,
    coverageDirectory,
    coverageEnabled,
    env,
    environment,
    setupFiles,
    overrides,
  } = options;

  const coverageDir =
    coverageDirectory ?? calculateCoverageDirectory(packagePath);

  // Coverage is opt-in. The v8 provider writes raw coverage to
  // `${reportsDirectory}/.tmp`; when the same project's test task runs
  // concurrently from one checkout, the runs race on that shared directory and
  // one fails with `ENOENT: lstat .../.tmp`. Since nothing in CI consumes the
  // coverage output, default it off and enable it explicitly via
  // `VITEST_COVERAGE=true` (or vitest's own `--coverage` flag, which overrides
  // this). `coverageEnabled: false` (e.g. React Native) remains a hard off.
  const coverageRequested = process.env.VITEST_COVERAGE === 'true';

  return defineConfig({
    test: {
      coverage: {
        enabled: coverageEnabled && coverageRequested,
        exclude: ['dist'],
        provider: 'v8',
        reportsDirectory: coverageDir,
      },
      env: {
        NODE_ENV: 'test',
        TZ: 'UTC',
        ...env,
      },
      environment,
      globals: true,
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      setupFiles: setupFiles ? [...setupFiles] : undefined,
      silent: process.env.DEBUG !== 'true',
    },
    ...overrides,
  });
};

/**
 * @description Creates a vitest configuration for jsdom environment (React packages)
 * @public
 */
export const createVitestConfigJsdom = (
  options: Omit<CreateVitestConfigOptions, 'environment'>,
): ReturnType<typeof defineConfig> => {
  const { coverageEnabled = true, env = {}, setupFiles, ...rest } = options;

  return createBaseVitestConfig({
    ...rest,
    coverageEnabled,
    env,
    environment: 'jsdom',
    setupFiles,
  });
};

/**
 * @description Creates a vitest configuration for happy-dom environment (React Native packages)
 * @public
 */
export const createVitestConfigHappyDom = (
  options: Omit<CreateVitestConfigOptions, 'environment'>,
): ReturnType<typeof defineConfig> => {
  const {
    coverageEnabled = false,
    env = {},
    overrides,
    packagePath,
    setupFiles = ['vitest-react-native/setup'],
    ...rest
  } = options;

  return createBaseVitestConfig({
    ...rest,
    coverageEnabled,
    env: {
      EXPO_OS: 'ios',
      ...env,
    },
    environment: 'happy-dom',
    overrides: {
      // FIXME: Swap out eventually

      plugins: [react()],
      root: packagePath,
      ...overrides,
    },
    packagePath,
    setupFiles,
  });
};

/**
 * @description Creates a vitest configuration for node environment (NestJS/Node packages)
 * @public
 */
export const createVitestConfigNode = (
  options: Omit<CreateVitestConfigOptions, 'environment'>,
): ReturnType<typeof defineConfig> => {
  const {
    coverageEnabled = true,
    env = {},
    overrides,
    setupFiles,
    ...rest
  } = options;

  return createBaseVitestConfig({
    ...rest,
    coverageEnabled,
    env,
    environment: 'node',
    overrides: {
      plugins: [
        swc.vite({ module: { type: 'es6' } }), // Required to build test files with SWC
      ],
      ...overrides,
    },
    setupFiles,
  });
};

/**
 * @description Factory function to create vitest config based on environment type
 * @public
 */
export const createVitestConfig = (
  options: CreateVitestConfigOptions,
): ReturnType<typeof defineConfig> => {
  const { environment, ...rest } = options;

  switch (environment) {
    case 'jsdom':
      return createVitestConfigJsdom(rest);
    case 'happy-dom':
      return createVitestConfigHappyDom(rest);
    case 'node':
      return createVitestConfigNode(rest);
    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }
};
