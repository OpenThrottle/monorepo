// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import * as CmsUi from '@openthrottle/react-router-cms-ui';
import { Ajv } from 'ajv';
import { describe, expect, test } from 'vitest';

import * as CmsCore from '../src/index';
import { getSchemaDefaults } from '../src/utils/getSchemaDefaults';
import { isCmsJsonSchema } from '../src/utils/parse-cms-schema';

/**
 * @description The committed output of `scripts/generate-cms-schemas.ts` for both block packages
 * (OT plan a608869b). The generator's own drift gate (`cms-schemas:check`) proves the files match
 * the props interfaces; this proves they are usable: every block has one, each is valid JSON
 * Schema under a strict Ajv, and each block's defaults satisfy its own schema.
 */

const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readJson = (path: string): unknown => {
  return JSON.parse(readFileSync(path, 'utf8'));
};

const require = createRequire(import.meta.url);
const SCHEMA_DIRS = {
  core: join(import.meta.dirname, '../schemas'),
  ui: join(dirname(require.resolve('@openthrottle/react-router-cms-ui/package.json')), 'schemas'), // prettier-ignore
};

const readManifest = (dir: string): readonly string[] => {
  const manifest = readJson(join(dir, 'manifest.json'));
  const schemas = isRecord(manifest) ? manifest['schemas'] : undefined;

  if (!Array.isArray(schemas)) return [];

  return schemas.flatMap((entry) => {
    const typename = isRecord(entry) ? entry['typename'] : undefined;

    return typeof typename === 'string' ? [typename] : [];
  });
};

const blockNames = (
  exports: Readonly<Record<string, unknown>>,
): readonly string[] => {
  return Object.entries(exports)
    .filter((entry) => typeof entry[1] === 'function' && 'debug' in entry[1])
    .map((entry) => entry[0])
    .sort();
};

const SCHEMAS = Object.entries(SCHEMA_DIRS).flatMap(([pkg, dir]) => {
  return readManifest(dir).map((typename) => {
    return { pkg, schema: readJson(join(dir, `${typename}.schema.json`)), typename }; // prettier-ignore
  });
});

const schemaOf = (typename: string): Readonly<Record<string, unknown>> => {
  const found = SCHEMAS.find((entry) => entry.typename === typename)?.schema;

  return isRecord(found) ? found : {};
};

const createAjv = (): Ajv => {
  const ajv = new Ajv({ strict: true, validateSchema: true });

  ajv.addKeyword({ keyword: 'x-cms-widget', schemaType: 'string' });

  return ajv;
};

describe('block schemas: coverage', () => {
  test('every cms-ui block has a schema, and no schema is an orphan', () => {
    expect(readManifest(SCHEMA_DIRS.ui).toSorted()).toStrictEqual(blockNames(CmsUi)); // prettier-ignore
  });

  test('every cms-core block has a schema, and no schema is an orphan', () => {
    expect(readManifest(SCHEMA_DIRS.core).toSorted()).toStrictEqual(blockNames(CmsCore)); // prettier-ignore
  });

  test('covers the 10 cms-ui blocks and the 4 layout/logic blocks', () => {
    expect(SCHEMAS).toHaveLength(14);
  });
});

describe.each(SCHEMAS)('block schemas: $typename ($pkg)', ({ schema }) => {
  test('compiles under strict Ajv with x-cms-widget registered', () => {
    expect(() => createAjv().compile(isRecord(schema) ? schema : {})).not.toThrow(); // prettier-ignore
  });

  test('its defaults validate against it', () => {
    const validate = createAjv().compile(isRecord(schema) ? schema : {});
    const defaults = isCmsJsonSchema(schema) ? getSchemaDefaults(schema) : {};

    // A required prop with no @default (e.g. LogicParams.param) is left for the editor to fill,
    // so validate the defaults that exist, not their completeness.
    expect(validate(defaults) || validate.errors?.every((error) => error.keyword === 'required')).toBe(true); // prettier-ignore
  });
});

describe('block schemas: strict Ajv rejects the RocketCMS shape', () => {
  test('a widget name in `type` fails meta-validation', () => {
    const legacy = { properties: { className: { type: 'className' } }, type: 'object' }; // prettier-ignore

    expect(() => createAjv().compile(legacy)).toThrow();
  });
});

describe('block schemas: shape', () => {
  test.each([
    ['Button', 'size', ['lg', 'md', 'sm', 'xl']],
    ['Button', 'variant', ['primary', 'secondary']],
    ['Card', 'icon', ['Pencil', 'Rocket', 'Star', 'Sun']],
    ['Heading', 'heading', ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']],
  ])('%s.%s is an enum', (typename, key, values) => {
    expect(schemaOf(typename)['properties']).toMatchObject({ [key]: { enum: values } }); // prettier-ignore
  });

  test.each([
    ['Button', ['cta']],
    ['Card', ['copy', 'heading', 'icon']],
    ['Layout', []],
    ['LogicParams', ['param', 'value']],
  ])('%s requires %j', (typename, required) => {
    expect(schemaOf(typename)['required']).toStrictEqual(required);
  });

  test('Button carries no inherited DOM attributes', () => {
    const properties = schemaOf('Button')['properties'];

    expect(Object.keys(isRecord(properties) ? properties : {})).toStrictEqual(['className', 'cta', 'size', 'variant']); // prettier-ignore
  });
});
