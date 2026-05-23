import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import swc from 'unplugin-swc';
import type { UserConfig } from 'vite';

export { getDirname } from './vite-config.js';

/**
 * @description Test environment type
 * @publicApi
 */
export type TestEnvironment = 'jsdom' | 'happy-dom' | 'node';

/**
 * @description Options for creating vitest configuration
 * @publicApi
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
const calculateCoverageDirectory = (packagePath: string): string => {
  // packagePath is __dirname from the config file
  const packageAbsolutePath = resolve(packagePath);
  const pathParts = packageAbsolutePath.split('/').filter(Boolean);

  // Find packages/ or tools/ in the path
  const packagesIndex = pathParts.lastIndexOf('packages');
  const toolsIndex = pathParts.lastIndexOf('tools');
  const baseIndex = Math.max(packagesIndex, toolsIndex);

  if (baseIndex === -1) {
    throw new Error(
      `Could not find 'packages' or 'tools' in path: ${packageAbsolutePath}`,
    );
  }

  // Calculate depth: how many directories from package to root
  const depth = pathParts.length - baseIndex - 1;
  const relativeUp = '../'.repeat(depth);

  // Get the package path relative to packages/ or tools/
  const packageRelativePath = pathParts.slice(baseIndex + 1).join('/');
  const baseDir = pathParts[baseIndex]; // 'packages' or 'tools'

  return `${relativeUp}coverage/${baseDir}/${packageRelativePath}`;
};

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

  return defineConfig({
    test: {
      coverage: {
        enabled: coverageEnabled,
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
 * @publicApi
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
 * @publicApi
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
 * @publicApi
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
 * @publicApi
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
