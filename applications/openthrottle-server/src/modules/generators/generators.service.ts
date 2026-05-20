import { readFileSync } from 'fs';
import { dirname, join } from 'path';

declare const require: NodeRequire;

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
  const pkgPath = require.resolve('@tools/generators/package.json');
  const generatorsPath = join(dirname(pkgPath), 'generators.json');
  const raw = readFileSync(generatorsPath, 'utf-8');
  const data = JSON.parse(raw) as { generators: Record<string, GeneratorMeta> };
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
    const pkgPath = require.resolve('@tools/generators/package.json');
    const pkgDir = dirname(pkgPath);
    const schemaPath = join(pkgDir, meta.schema.replace(/^\.\//, ''));
    const raw = readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // schema remains null
  }
  return {
    description: meta.description,
    name,
    schema,
  };
}
