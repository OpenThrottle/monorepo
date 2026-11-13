import { resolve, sep } from 'path';

/**
 * @description Calculates a build/test output directory rooted at the workspace
 * root, relative to a package living under `packages/` or `tools/`.
 *
 * The `packagePath` is typically `__dirname` from a package's config file. The
 * returned path walks up to the workspace root with `../` segments and then
 * appends `<outputBase>/<packages|tools>/<package relative path>` so each
 * package writes to an isolated subtree (e.g. `node_modules/.vite/...` for the
 * Vite cache or `coverage/...` for coverage reports).
 *
 * Path splitting uses `path.sep`, so this resolves correctly on both POSIX and
 * Windows. Throws if neither `packages` nor `tools` appears in the path.
 */
export const calculateOutputDir = (
  packagePath: string,
  outputBase: string,
): string => {
  // packagePath is typically __dirname from the config file
  const packageAbsolutePath = resolve(packagePath);
  const pathParts = packageAbsolutePath.split(sep).filter(Boolean);

  // Find packages/ or tools/ in the path
  const packagesIndex = pathParts.lastIndexOf('packages');
  const toolsIndex = pathParts.lastIndexOf('tools');
  const baseIndex = Math.max(packagesIndex, toolsIndex);

  if (baseIndex === -1) {
    throw new Error(
      `Could not find 'packages' or 'tools' in path: ${packageAbsolutePath}`,
    );
  }

  // Depth: how many directories from the package up to the workspace root —
  // the `packages`/`tools` segment itself plus every segment below it.
  // packages/nestjs-github -> ../../; packages/openthrottle/react-hooks -> ../../../
  const depth = pathParts.length - baseIndex;
  const relativeUp = '../'.repeat(depth);

  // Get the package path relative to packages/ or tools/
  const packageRelativePath = pathParts.slice(baseIndex + 1).join('/');
  const baseDir = pathParts[baseIndex]; // 'packages' or 'tools'

  return `${relativeUp}${outputBase}/${baseDir}/${packageRelativePath}`;
};
