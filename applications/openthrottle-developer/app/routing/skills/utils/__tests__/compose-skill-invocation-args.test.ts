import type { SkillArgument } from '@openthrottle/openthrottle-skills';
import { describe, expect, test } from 'vitest';

import {
  composeSkillInvocationArgs,
  hasMissingRequiredSkillArgs,
  seedSkillArgumentDefaults,
  type SkillArgumentValue,
} from '../compose-skill-invocation-args';

const arg = (overrides: Partial<SkillArgument>): SkillArgument => ({
  default: undefined,
  description: undefined,
  enum: undefined,
  name: 'value',
  required: false,
  type: 'text',
  ...overrides,
});

describe('seedSkillArgumentDefaults', () => {
  test('seeds booleans and stringifies scalar defaults', () => {
    const seeded = seedSkillArgumentDefaults([
      arg({ default: true, name: 'dry-run', type: 'boolean' }),
      arg({ name: 'flag', type: 'boolean' }),
      arg({ default: 5, name: 'count', type: 'number' }),
      arg({ name: 'target' }),
      arg({
        default: 'low',
        enum: ['low', 'high'],
        name: 'level',
        type: 'enum',
      }),
    ]);

    expect(seeded).toEqual({
      count: '5',
      'dry-run': true,
      flag: false,
      level: 'low',
      target: '',
    });
  });
});

describe('hasMissingRequiredSkillArgs', () => {
  test('true when a required text arg is empty, false once filled', () => {
    const declarations = [arg({ name: 'target', required: true })];

    expect(hasMissingRequiredSkillArgs(declarations, { target: '' })).toBe(
      true,
    );
    expect(hasMissingRequiredSkillArgs(declarations, { target: '  ' })).toBe(
      true,
    );
    expect(hasMissingRequiredSkillArgs(declarations, { target: 'x' })).toBe(
      false,
    );
  });

  test('required booleans never gate Run', () => {
    const declarations = [
      arg({ name: 'dry-run', required: true, type: 'boolean' }),
    ];

    expect(
      hasMissingRequiredSkillArgs(declarations, { 'dry-run': false }),
    ).toBe(false);
  });
});

describe('composeSkillInvocationArgs', () => {
  const declarations: readonly SkillArgument[] = [
    arg({ name: 'target', required: true }),
    arg({ name: 'count', type: 'number' }),
    arg({ name: 'dry-run', type: 'boolean' }),
    arg({ enum: ['low', 'high'], name: 'level', type: 'enum' }),
  ];

  test('composes named flags in declaration order, quoting spaced values', () => {
    const values: Record<string, SkillArgumentValue> = {
      count: '3',
      'dry-run': true,
      level: 'low',
      target: 'my target',
    };

    expect(composeSkillInvocationArgs(declarations, values)).toBe(
      '--target "my target" --count 3 --dry-run --level low',
    );
  });

  test('omits empty optionals and false booleans', () => {
    const values: Record<string, SkillArgumentValue> = {
      count: '',
      'dry-run': false,
      level: '',
      target: 'go',
    };

    expect(composeSkillInvocationArgs(declarations, values)).toBe(
      '--target go',
    );
  });

  test('escapes embedded double quotes', () => {
    expect(
      composeSkillInvocationArgs([arg({ name: 'msg' })], {
        msg: 'say "hi"',
      }),
    ).toBe('--msg "say \\"hi\\""');
  });

  test('returns empty string when nothing is set', () => {
    expect(composeSkillInvocationArgs(declarations, {})).toBe('');
  });
});
