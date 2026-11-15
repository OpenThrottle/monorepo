import { describe, expect, it } from 'vitest';

import { readComponentUpdateForm } from '../readComponentUpdateForm';

const formOf = (fields: Record<string, string>): FormData => {
  const form = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    form.set(key, value);
  });

  return form;
};

const FIELDS = {
  code: '  export const Hero = () => null;\n',
  name: ' Hero ',
  propsSchemaJson: '{"type":"object"}',
  status: 'ACTIVE',
  typename: ' Hero ',
};

describe('readComponentUpdateForm', () => {
  describe('when every field is posted', () => {
    it('trims name and typename and keeps code and schema as typed', () => {
      expect(readComponentUpdateForm(formOf(FIELDS))).toEqual({
        code: FIELDS.code,
        name: 'Hero',
        propsSchemaJson: FIELDS.propsSchemaJson,
        status: 'ACTIVE',
        typename: 'Hero',
      });
    });
  });

  describe('when status is missing', () => {
    it('leaves it alone', () => {
      const { status: _status, ...rest } = FIELDS;

      expect(readComponentUpdateForm(formOf(rest))).toMatchObject({
        status: null,
      });
    });
  });

  describe('when the form is malformed', () => {
    it.each(['code', 'name', 'propsSchemaJson', 'typename'])(
      'rejects a blank %s',
      (key) => {
        expect(
          readComponentUpdateForm(formOf({ ...FIELDS, [key]: '   ' })),
        ).toBeUndefined();
      },
    );

    it('rejects an unknown status', () => {
      expect(
        readComponentUpdateForm(formOf({ ...FIELDS, status: 'ARCHIVED' })),
      ).toBeUndefined();
    });
  });
});
