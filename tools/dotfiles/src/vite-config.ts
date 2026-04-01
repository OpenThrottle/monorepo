import { existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { join, resolve } from 'path';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';

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
   * @description Type of package (determines plugins and settings)
   */
  readonly packageType: PackageType;
  /**
   * @description Path to the package directory (used for cache directory calculation)
   */
  readonly packagePath: string;
  /**
   * @description Custom entry points (defaults to auto-detection)
   */
  readonly entry?: readonly string[];
  /**
   * @description Whether to include CSS code splitting (defaults based on package type)
   */
  readonly cssCodeSplit?: boolean;
  /**
   * @description Whether to include sourcemap (defaults to true)
   */
  readonly sourcemap?: boolean;
  /**
   * @description Whether to include nxCopyAssetsPlugin (defaults based on package type)
   */
  readonly includeAssets?: boolean;
  /**
   * @description Custom vite config overrides
   */
  readonly overrides?: Partial<UserConfig>;
}

/**
 * @description Calculates the cache directory path relative to the package
 * @example
 *   packages/barguide/react-hooks -> ../../node_modules/.vite/packages/react-hooks
 *   packages/rocketcms/surveys -> ../../../node_modules/.vite/packages/rocketcms/surveys
 */
const calculateCacheDir = (packagePath: string): string => {
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
  // packages/barguide/react-hooks = 3 parts, need to go up 2 levels (../../)
  // packages/rocketcms/surveys = 3 parts, need to go up 2 levels (../../)
  // But wait, let's check actual examples...
  // Actually, depth is: pathParts.length - baseIndex - 1
  // packages/barguide/react-hooks: length=3, baseIndex=0, depth=2 -> ../../
  const depth = pathParts.length - baseIndex - 1;
  const relativeUp = '../'.repeat(depth);

  // Get the package path relative to packages/ or tools/
  const packageRelativePath = pathParts.slice(baseIndex + 1).join('/');
  const baseDir = pathParts[baseIndex]; // 'packages' or 'tools'

  return `${relativeUp}node_modules/.vite/${baseDir}/${packageRelativePath}`;
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
    includeAssets,
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

  // Determine if we should include assets plugin
  const shouldIncludeAssets = includeAssets ?? packageType !== 'nestjs';

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

  // Add assets plugin if needed
  if (shouldIncludeAssets) {
    plugins.push(nxCopyAssetsPlugin(['README.md']));
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
    build: overrides?.build
      ? {
          ...config.build,
          ...overrides.build,
          lib: overrides.build.lib
            ? {
                ...config.build?.lib,
                ...overrides.build.lib,
              }
            : config.build?.lib,
        }
      : config.build,
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
