import { CMS_STATUS } from '../config/cms-status';
import type { CmsParsedSchema } from '../types/cms-json-schema';

/**
 * @description A schema with one property per form field type. Specs only — not
 * exported from the package.
 */
export const MOCK_FORM_SCHEMA: CmsParsedSchema = {
  created_at: '2026-01-01T00:00:00.000Z',
  is_deleted: false,
  json_schema: {
    properties: {
      choice: {
        anyOf: [{ $ref: '#/definitions/ButtonProps' }, { type: 'string' }],
        description: 'A button or plain text',
      },
      className: { description: 'Classes to apply', type: 'className' },
      copy: { description: 'Body copy', type: 'wysiwyg' },
      count: { description: 'How many', type: 'number' },
      href: { description: 'Where it goes', type: 'link' },
      images: {
        description: 'Image URLs',
        items: { type: 'string' },
        type: 'array',
      },
      meta: { description: 'Extra data', type: 'object' },
      secondary: { description: 'Use the outline style', type: 'boolean' },
      size: {
        description: 'Button size',
        enum: ['sm', 'md', 'lg'],
        type: 'string',
      },
      title: { description: 'The heading', type: 'string' },
    },
    required: ['title'],
    type: 'object',
  },
  status: CMS_STATUS.ACTIVE,
  typename: 'Mock',
  updated_at: '2026-01-01T00:00:00.000Z',
  uuid: 'schema-mock',
  version: '1.0.0',
};
