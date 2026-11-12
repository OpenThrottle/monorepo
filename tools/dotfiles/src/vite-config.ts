import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { join } from 'path';
import { fileURLToPath } from 'url';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { calculateOutputDir } from './calculate-output-dir.ts';

/**
 * @description Gets the directory path in ESM modules (replacement for __dirname)
 */
export const getDirname = (importMetaUrl: string): string => {
  return dirname(fileURLToPath(importMetaUrl));
};

/**
 * @description Package type for vite configuration
 */
export type PackageType = 'react' | 'react-native' | 'nestjs' | 'node';

/**
 * @description Options for creating vite configuration
 */
export interface CreateViteConfigOptions {
  /**
   * @description Whether to include CSS code splitting (defaults based on package type)
   */
  readonly cssCodeSplit?: boolean;
  /**
   * @description Custom entry points (defaults to auto-detection)
   */
  readonly entry?: readonly string[];
  /**
   * @description Custom vite config overrides
   */
  readonly overrides?: Partial<UserConfig>;
  /**
   * @description Path to the package directory (used for cache directory calculation)
   */
  readonly packagePath: string;
  /**
   * @description Type of package (determines plugins and settings)
   */
  readonly packageType: PackageType;
  /**
   * @description Whether to include sourcemap (defaults to true)
   */
  readonly sourcemap?: boolean;
}

/**
 * @description Calculates the cache directory path relative to the package
 */
const calculateCacheDir = (packagePath: string): string => {
  return calculateOutputDir(packagePath, 'node_modules/.vite');
};

/**
 * @description Auto-detects entry points (checks for index.css)
 */
const detectEntryPoints = (packagePath: string): readonly string[] => {
  const cssPath = join(packagePath, 'src', 'index.css');

  const entries: string[] = ['src/index.ts'];

  if (existsSync(cssPath)) {
    entries.push('src/index.css');
  }

  return entries;
};

/**
 * @description Layers `override` onto `base`, merging the two `lib` blocks
 * key by key rather than letting the override replace the whole block.
 */
const mergeBuildOptions = (
  base: UserConfig['build'],
  override: UserConfig['build'],
): UserConfig['build'] => {
  if (!override) {
    return base;
  }

  const lib = override.lib ? { ...base?.lib, ...override.lib } : base?.lib;
  return { ...base, ...override, lib };
};

/**
 * @description Creates a vite configuration for a package
 * @link https://vitejs.dev/guide/build.html#library-mode
 * @link https://nx.dev/recipes/vite/configure-vite#typescript-paths
 */
export const createViteConfig = (
  options: CreateViteConfigOptions,
): UserConfig => {
  const {
    packageType,
    packagePath,
    entry,
    cssCodeSplit,
    sourcemap = true,
    overrides,
  } = options;

  // Auto-detect entry points if not provided
  const entryPoints: string[] = entry
    ? [...entry]
    : [...detectEntryPoints(packagePath)];

  // Determine CSS code splitting based on package type
  const shouldCssCodeSplit =
    cssCodeSplit ??
    (packageType === 'react' && entryPoints.includes('src/index.css'));

  // Determine dts rollupTypes based on package type
  const rollupTypes = packageType !== 'nestjs';

  // Build plugins array
  const plugins: UserConfig['plugins'] = [
    dts({
      rollupTypes,
      tsconfigPath: 'tsconfig.lib.json',
    }),
  ];

  // Add React plugin for React and React Native packages
  if (packageType === 'react' || packageType === 'react-native') {
    plugins.push(react());
  }

  // Calculate cache directory
  const cacheDir = calculateCacheDir(packagePath);

  // Base configuration
  const config: UserConfig = {
    build: {
      cssCodeSplit: shouldCssCodeSplit,
      emptyOutDir: true,
      lib: {
        entry: entryPoints,
        fileName: (format, entryName) => {
          const isESM = format === 'es';
          const extension = isESM ? 'mjs' : 'cjs';
          return `${entryName}.${extension}`;
        },
        formats: ['cjs', 'es'],
      },
      reportCompressedSize: true,
      sourcemap,
      ssr: true,
    },
    cacheDir,
    plugins,
    root: packagePath,
  };

  // Merge with overrides
  const mergedConfig: UserConfig = {
    ...config,
    ...overrides,
    build: mergeBuildOptions(config.build, overrides?.build),
    plugins: [...(config.plugins ?? []), ...(overrides?.plugins ?? [])],
  };

  return mergedConfig;
};

/**
 * @description Creates a vite configuration using defineConfig wrapper
 */
export const defineViteConfig = (
  options: CreateViteConfigOptions,
): ReturnType<typeof defineConfig> => {
  return defineConfig(createViteConfig(options));
};
