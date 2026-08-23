import { describe, expect, test } from 'vitest';

import { parseSkillFrontmatter } from '../parse-skill-frontmatter.ts';
import { parseSkillArguments } from '../skill-arguments.ts';

const skillFile = (metadataArguments: string): string =>
  [
    '---',
    'name: demo-skill',
    'description: A demo skill.',
    'metadata:',
    `  arguments: '${metadataArguments}'`,
    '---',
    '',
    '# Demo',
  ].join('\n');

describe('parseSkillArguments', () => {
  test('parses a valid JSON-string declaration and normalizes defaults', () => {
    const args = parseSkillArguments({
      metadata: {
        arguments: JSON.stringify([
          { description: 'The target', name: 'target', required: true },
          { name: 'count', type: 'number' },
          { name: 'dry-run', type: 'boolean' },
          { enum: ['low', 'high'], name: 'level', type: 'enum' },
        ]),
      },
    });

    expect(args).toEqual([
      {
        default: undefined,
        description: 'The target',
        enum: undefined,
        name: 'target',
        required: true,
        type: 'text',
      },
      {
        default: undefined,
        description: undefined,
        enum: undefined,
        name: 'count',
        required: false,
        type: 'number',
      },
      {
        default: undefined,
        description: undefined,
        enum: undefined,
        name: 'dry-run',
        required: false,
        type: 'boolean',
      },
      {
        default: undefined,
        description: undefined,
        enum: ['low', 'high'],
        name: 'level',
        required: false,
        type: 'enum',
      },
    ]);
  });

  test('drops an enum-typed arg with no choices but keeps valid siblings', () => {
    const args = parseSkillArguments({
      metadata: {
        arguments: JSON.stringify([
          { name: 'broken', type: 'enum' },
          { name: 'ok' },
        ]),
      },
    });

    expect(args).toEqual([
      {
        default: undefined,
        description: undefined,
        enum: undefined,
        name: 'ok',
        required: false,
        type: 'text',
      },
    ]);
  });

  test('tolerates an already-parsed inline YAML array', () => {
    const args = parseSkillArguments({
      metadata: {
        arguments: [{ name: 'target' }],
      },
    });

    expect(args?.[0]?.name).toBe('target');
  });

  test.each([
    ['absent metadata', {}],
    ['absent key', { metadata: {} }],
    ['malformed JSON', { metadata: { arguments: '{ not json' } }],
    ['non-array JSON', { metadata: { arguments: '{"a":1}' } }],
    ['empty string', { metadata: { arguments: '' } }],
    ['all entries invalid', { metadata: { arguments: '[{}]' } }],
    ['not an object', 'nope'],
    ['null', null],
  ])('returns undefined for %s', (_label, input) => {
    expect(parseSkillArguments(input)).toBeUndefined();
  });
});

describe('parseSkillFrontmatter arguments integration', () => {
  test('threads declared arguments from metadata into the parsed result', () => {
    const parsed = parseSkillFrontmatter(
      skillFile(JSON.stringify([{ name: 'target', required: true }])),
    );

    expect(parsed.arguments).toEqual([
      {
        default: undefined,
        description: undefined,
        enum: undefined,
        name: 'target',
        required: true,
        type: 'text',
      },
    ]);
  });

  test('leaves arguments undefined when the skill declares none', () => {
    const parsed = parseSkillFrontmatter(
      [
        '---',
        'name: plain',
        'description: No args.',
        '---',
        '',
        '# Plain',
      ].join('\n'),
    );

    expect(parsed.arguments).toBeUndefined();
  });

  test('does not throw and yields undefined arguments on malformed frontmatter', () => {
    const parsed = parseSkillFrontmatter(skillFile('[{ this is not json'));

    expect(parsed.arguments).toBeUndefined();
    expect(parsed.name).toBe('demo-skill');
  });
});
