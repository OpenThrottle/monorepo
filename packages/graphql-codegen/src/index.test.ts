import { describe, expect, it } from 'vitest';
import { defineCodegen } from './index';

/**
 * `defineCodegen` builds a config object without touching the filesystem or a
 * running server (the schema path is only `resolve`d, never read), so these
 * tests assert the emitted Zod block's plugin knobs directly.
 */
describe('defineCodegen', () => {
  const build = (overrides?: Partial<Parameters<typeof defineCodegen>[0]>) =>
    defineCodegen({
      dirname: '/workspace/applications/example',
      documents: ['app/**/*.graphql'],
      ...overrides,
    });

  const zodBlock = (config: ReturnType<typeof defineCodegen>) =>
    config.generates['./app/__generated__/schemas.ts'];

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

  it('omits the Zod block when withZodSchemas is false', () => {
    const config = build({ withZodSchemas: false });

    expect(zodBlock(config)).toBeUndefined();
  });
});
