import { fileURLToPath } from 'node:url';

import { readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Locate `@tools/generators` on disk.
 *
 * Uses `import.meta.resolve`, not `require.resolve`: this file is ESM, where
 * `require` does not exist. It resolves through the same `exports` map and
 * returns a `file://` URL, so the result is converted back to a path.
 */
const resolveGeneratorsPackageJson = (): string =>
  fileURLToPath(import.meta.resolve('@tools/generators/package.json'));

interface GeneratorMeta {
  readonly description: string;
  readonly factory: string;
  readonly schema: string;
}

export interface GeneratorItem {
  readonly description: string;
  readonly name: string;
}

const generatorsData = ((): Record<string, GeneratorMeta> => {
  const pkgPath = resolveGeneratorsPackageJson();
  const generatorsPath = join(dirname(pkgPath), 'generators.json');
  const raw = readFileSync(generatorsPath, 'utf-8');
  const data: { generators: Record<string, GeneratorMeta> } = JSON.parse(raw);
  return data.generators;
})();

/**
 * @description Reads generators.json from @tools/generators and returns list of { name, description }.
 */
export function getGeneratorsList(): GeneratorItem[] {
  return Object.entries(generatorsData).map(([name, meta]) => ({
    description: meta.description,
    name,
  }));
}

export interface GeneratorDetail {
  readonly description: string;
  readonly name: string;
  readonly schema: Record<string, unknown> | null;
}

/**
 * @description Returns a single generator's meta and schema by name, or null if not found.
 */
export function getGeneratorByName(name: string): GeneratorDetail | null {
  const meta = generatorsData[name];
  if (!meta) {
    return null;
  }
  let schema: Record<string, unknown> | null = null;
  try {
    const pkgPath = resolveGeneratorsPackageJson();
    const pkgDir = dirname(pkgPath);
    const schemaPath = join(pkgDir, meta.schema.replace(/^\.\//, ''));
    const raw = readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(raw);
  } catch {
    // schema remains null
  }
  return {
    description: meta.description,
    name,
    schema,
  };
}
