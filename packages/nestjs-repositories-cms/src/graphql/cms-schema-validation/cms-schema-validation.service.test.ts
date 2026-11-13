import { describe, expect, it } from 'vitest';

import { CmsSchemaValidationService } from './cms-schema-validation.service.ts';

const BUTTON_SCHEMA = {
  additionalProperties: false,
  properties: {
    copy: { default: 'Click', type: 'string', 'x-cms-widget': 'wysiwyg' },
    size: { default: 'md', enum: ['sm', 'md', 'lg'], type: 'string' },
    width: { type: 'number' },
  },
  required: ['copy'],
  type: 'object',
};

describe('CmsSchemaValidationService', () => {
  const service = new CmsSchemaValidationService();

  describe('getDefaults', () => {
    it('collects top-level defaults only', () => {
      expect(service.getDefaults(BUTTON_SCHEMA)).toEqual({
        copy: 'Click',
        size: 'md',
      });
    });

    it('returns {} for a schema without properties', () => {
      expect(service.getDefaults({ type: 'object' })).toEqual({});
    });
  });

  describe('validate', () => {
    it('accepts valid properties, with the x-cms-widget keyword known', () => {
      expect(
        service.validate('s1', BUTTON_SCHEMA, { copy: 'Go', size: 'lg' }),
      ).toEqual({ ok: true });
    });

    it('rejects a value outside an enum with its instance path', () => {
      const result = service.validate('s1', BUTTON_SCHEMA, {
        copy: 'Go',
        size: 'xl',
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.issues).toEqual([
        expect.objectContaining({ instancePath: '/size' }),
      ]);
    });

    it('rejects an unknown property (additionalProperties: false)', () => {
      expect(
        service.validate('s1', BUTTON_SCHEMA, { colour: 'red', copy: 'Go' }).ok,
      ).toBe(false);
    });

    it('does not coerce types', () => {
      expect(
        service.validate('s1', BUTTON_SCHEMA, { copy: 'Go', width: '12' }).ok,
      ).toBe(false);
    });

    it('reports a stored schema that does not compile', () => {
      const result = service.validate('bad', { type: 'nope' }, {});

      expect(!result.ok && result.issues[0]?.message).toMatch(/bad/);
    });
  });

  describe('check', () => {
    it('accepts a strict schema and rejects an unknown keyword', () => {
      expect(service.check(BUTTON_SCHEMA).ok).toBe(true);
      expect(service.check({ madeUp: true, type: 'object' }).ok).toBe(false);
    });
  });
});
