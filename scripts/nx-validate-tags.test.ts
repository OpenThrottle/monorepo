import { describe, expect, it } from 'vitest';

import {
  extractProductionTags,
  extractTechnologyTags,
  formatResults,
  hasValidationErrors,
  isValidProductionValue,
  isValidTechnologyTag,
  resultHasErrors,
  validateProjectTags,
} from './nx-validate-tags.ts';

describe('extractTechnologyTags', () => {
  it('extracts and strips the technology: prefix', () => {
    expect(
      extractTechnologyTags([
        'technology:react',
        'technology:typescript',
        'name:foo',
        'type:tool',
      ]),
    ).toEqual(['react', 'typescript']);
  });

  it('returns an empty array when no technology tags are present', () => {
    expect(extractTechnologyTags(['name:foo', 'production:true'])).toEqual([]);
  });
});

describe('extractProductionTags', () => {
  it('extracts and strips the production: prefix', () => {
    expect(
      extractProductionTags(['production:true', 'technology:react']),
    ).toEqual(['true']);
  });
});

describe('isValidTechnologyTag', () => {
  it('accepts reference technology values', () => {
    expect(isValidTechnologyTag('react')).toBe(true);
    expect(isValidTechnologyTag('nestjs')).toBe(true);
    expect(isValidTechnologyTag('typescript')).toBe(true);
  });

  it('rejects unknown technology values', () => {
    expect(isValidTechnologyTag('rust')).toBe(false);
    expect(isValidTechnologyTag('')).toBe(false);
    expect(isValidTechnologyTag('React')).toBe(false);
  });
});

describe('isValidProductionValue', () => {
  it('accepts true/false only', () => {
    expect(isValidProductionValue('true')).toBe(true);
    expect(isValidProductionValue('false')).toBe(true);
    expect(isValidProductionValue('yes')).toBe(false);
    expect(isValidProductionValue('1')).toBe(false);
  });
});

describe('validateProjectTags', () => {
  it('passes a project with one valid technology and one production tag', () => {
    const result = validateProjectTags('clean-project', [
      'technology:react',
      'production:true',
      'name:clean-project',
    ]);

    expect(resultHasErrors(result)).toBe(false);
    expect(result.hasTechnologyTag).toBe(true);
    expect(result.hasProductionTag).toBe(true);
    expect(result.technologyTags).toEqual(['react']);
  });

  it('flags a missing technology tag', () => {
    const result = validateProjectTags('no-tech', ['production:false']);

    expect(result.hasTechnologyTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags a missing production tag', () => {
    const result = validateProjectTags('no-prod', ['technology:nodejs']);

    expect(result.hasProductionTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags multiple production tags', () => {
    const result = validateProjectTags('dup-prod', [
      'technology:react',
      'production:true',
      'production:false',
    ]);

    expect(result.multipleProductionTags).toBe(true);
    expect(result.hasProductionTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags an invalid technology tag value', () => {
    const result = validateProjectTags('bad-tech', [
      'technology:cobol',
      'production:true',
    ]);

    expect(result.invalidTechnologyTags).toEqual(['cobol']);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags an invalid production tag value', () => {
    const result = validateProjectTags('bad-prod', [
      'technology:react',
      'production:maybe',
    ]);

    expect(result.invalidProductionTags).toEqual(['maybe']);
    expect(resultHasErrors(result)).toBe(true);
  });
});

describe('hasValidationErrors', () => {
  it('is false when every project is valid', () => {
    const results = [
      validateProjectTags('a', ['technology:react', 'production:true']),
      validateProjectTags('b', ['technology:nestjs', 'production:false']),
    ];

    expect(hasValidationErrors(results)).toBe(false);
  });

  it('is true when at least one project has a violation', () => {
    const results = [
      validateProjectTags('a', ['technology:react', 'production:true']),
      validateProjectTags('b', ['production:true']),
    ];

    expect(hasValidationErrors(results)).toBe(true);
  });
});

describe('formatResults', () => {
  it('reports success when there are no violations', () => {
    const results = [
      validateProjectTags('a', ['technology:react', 'production:true']),
    ];

    const output = formatResults(results);

    expect(output).toContain('All projects have valid');
    expect(output).toContain('Validated 1 projects');
  });

  it('lists projects missing technology tags', () => {
    const results = [validateProjectTags('missing-tech', ['production:true'])];

    const output = formatResults(results);

    expect(output).toContain('missing technology tags');
    expect(output).toContain('missing-tech');
  });

  it('lists invalid technology tag values', () => {
    const results = [
      validateProjectTags('bad', ['technology:cobol', 'production:true']),
    ];

    const output = formatResults(results);

    expect(output).toContain('invalid technology tags');
    expect(output).toContain('technology:cobol');
  });
});
