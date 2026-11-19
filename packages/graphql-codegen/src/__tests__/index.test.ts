import { describe, expect, it } from 'vitest';

import { defineCodegen } from '../index';

/**
 * `defineCodegen` builds a config object without touching the filesystem or a
 * running server (the schema path is only `resolve`d, never read), so these
 * tests assert the emitted Zod block's plugin knobs directly.
 */
describe('defineCodegen', () => {
  const build = (overrides?: Partial<Parameters<typeof defineCodegen>[0]>) => {
    return defineCodegen({
      dirname: '/workspace/applications/example',
      documents: ['app/**/*.graphql'],
      ...overrides,
    });
  };

  const zodBlock = (config: ReturnType<typeof defineCodegen>) => {
    return config.generates['./app/__generated__/schemas.ts'];
  };

  const clientBlock = (config: ReturnType<typeof defineCodegen>) => {
    return config.generates['./app/__generated__/'];
  };

  it('emits the typescript-validation-schema (Zod) block by default', () => {
    const config = build();
    const block = zodBlock(config);

    expect(block).toBeDefined();
    expect(block).toMatchObject({ plugins: ['typescript-validation-schema'] });
  });

  it('rejects empty strings for required inputs via notAllowEmptyString', () => {
    const block = zodBlock(build());

    expect(block).toMatchObject({
      config: { notAllowEmptyString: true, schema: 'zod' },
    });
  });

  it('keeps generated schemas on the zod/v3 compat subpath', () => {
    const block = zodBlock(build());

    expect(block).toMatchObject({ config: { zodImportPath: 'zod/v3' } });
  });

  const schemaTypesBlock = (config: ReturnType<typeof defineCodegen>) => {
    return config.generates['./app/__generated__/schema-types.ts'];
  };

  it('emits generated enums as const objects rather than TypeScript enums', () => {
    const block = clientBlock(build());

    expect(block).toMatchObject({ config: { enumType: 'const' } });
  });

  it('keeps enumType out of reach of a consumer presetConfig override', () => {
    const block = clientBlock(build({ presetConfig: { enumType: 'native' } }));

    expect(block).toMatchObject({ config: { enumType: 'const' } });
  });

  it('pins the ID and DateTime scalars to string on the client block', () => {
    const block = clientBlock(build());

    expect(block).toMatchObject({
      config: { scalars: { DateTime: 'string', ID: 'string' } },
    });
  });

  it('emits every input type and enum for the Zod schemas to import', () => {
    const config = build();

    expect(schemaTypesBlock(config)).toMatchObject({
      config: { enumsAsConst: true, onlyOperationTypes: true },
      plugins: ['typescript'],
    });
    expect(zodBlock(config)).toMatchObject({
      config: { importFrom: './schema-types.js' },
    });
  });

  it('follows importExtension in the Zod importFrom', () => {
    const block = zodBlock(build({ importExtension: '.ts' }));

    expect(block).toMatchObject({
      config: { importFrom: './schema-types.ts' },
    });
  });

  it('omits the Zod and schema-types blocks when withZodSchemas is false', () => {
    const config = build({ withZodSchemas: false });

    expect(zodBlock(config)).toBeUndefined();
    expect(schemaTypesBlock(config)).toBeUndefined();
  });
});
