import { describe, expect, it } from 'vitest';
import {
  extractProductionTags,
  extractPublishTags,
  extractTechnologyTags,
  extractTypeTags,
  formatResults,
  hasValidationErrors,
  isValidProductionValue,
  isValidPublishValue,
  isValidTechnologyTag,
  isValidTypeTag,
  resultHasErrors,
  validateProjectTags,
} from '../nx-validate-tags.ts';

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

describe('extractTypeTags', () => {
  it('extracts and strips the type: prefix', () => {
    expect(
      extractTypeTags(['type:package', 'name:foo', 'production:true']),
    ).toEqual(['package']);
  });
});

describe('extractPublishTags', () => {
  it('extracts and strips the publish: prefix', () => {
    expect(extractPublishTags(['publish:false', 'type:package'])).toEqual([
      'false',
    ]);
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

describe('isValidTypeTag', () => {
  it('accepts the four project kinds only', () => {
    expect(isValidTypeTag('application')).toBe(true);
    expect(isValidTypeTag('infrastructure')).toBe(true);
    expect(isValidTypeTag('package')).toBe(true);
    expect(isValidTypeTag('tool')).toBe(true);
    expect(isValidTypeTag('lib')).toBe(false);
    expect(isValidTypeTag('')).toBe(false);
  });
});

describe('isValidPublishValue', () => {
  it('accepts true/false only', () => {
    expect(isValidPublishValue('true')).toBe(true);
    expect(isValidPublishValue('false')).toBe(true);
    expect(isValidPublishValue('maybe')).toBe(false);
  });
});

describe('validateProjectTags', () => {
  it('passes an application with one technology, production, and type tag', () => {
    const result = validateProjectTags('clean-app', [
      'technology:react',
      'production:true',
      'name:clean-app',
      'type:application',
    ]);

    expect(resultHasErrors(result)).toBe(false);
    expect(result.hasTechnologyTag).toBe(true);
    expect(result.hasProductionTag).toBe(true);
    expect(result.hasTypeTag).toBe(true);
    expect(result.technologyTags).toEqual(['react']);
  });

  it('passes a package that declares a publish tag', () => {
    const result = validateProjectTags('clean-pkg', [
      'technology:nestjs',
      'production:false',
      'publish:false',
      'type:package',
    ]);

    expect(resultHasErrors(result)).toBe(false);
    expect(result.requiresPublishTag).toBe(true);
    expect(result.hasPublishTag).toBe(true);
  });

  it('flags a missing technology tag', () => {
    const result = validateProjectTags('no-tech', [
      'production:false',
      'type:application',
    ]);

    expect(result.hasTechnologyTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags a missing production tag', () => {
    const result = validateProjectTags('no-prod', [
      'technology:nodejs',
      'type:application',
    ]);

    expect(result.hasProductionTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags multiple production tags', () => {
    const result = validateProjectTags('dup-prod', [
      'technology:react',
      'production:true',
      'production:false',
      'type:application',
    ]);

    expect(result.multipleProductionTags).toBe(true);
    expect(result.hasProductionTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags an invalid technology tag value', () => {
    const result = validateProjectTags('bad-tech', [
      'technology:cobol',
      'production:true',
      'type:application',
    ]);

    expect(result.invalidTechnologyTags).toEqual(['cobol']);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags an invalid production tag value', () => {
    const result = validateProjectTags('bad-prod', [
      'technology:react',
      'production:maybe',
      'type:application',
    ]);

    expect(result.invalidProductionTags).toEqual(['maybe']);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags a missing type tag', () => {
    const result = validateProjectTags('no-type', [
      'technology:react',
      'production:true',
    ]);

    expect(result.hasTypeTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags an invalid type tag value', () => {
    const result = validateProjectTags('bad-type', [
      'technology:react',
      'production:true',
      'type:library',
    ]);

    expect(result.invalidTypeTags).toEqual(['library']);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('flags a package missing its required publish tag', () => {
    const result = validateProjectTags('no-publish', [
      'technology:nestjs',
      'production:false',
      'type:package',
    ]);

    expect(result.requiresPublishTag).toBe(true);
    expect(result.hasPublishTag).toBe(false);
    expect(resultHasErrors(result)).toBe(true);
  });

  it('does not require a publish tag for applications', () => {
    const result = validateProjectTags('app-no-publish', [
      'technology:react',
      'production:true',
      'type:application',
    ]);

    expect(result.requiresPublishTag).toBe(false);
    expect(resultHasErrors(result)).toBe(false);
  });

  it('flags an invalid publish tag value', () => {
    const result = validateProjectTags('bad-publish', [
      'technology:nestjs',
      'production:false',
      'publish:maybe',
      'type:package',
    ]);

    expect(result.invalidPublishValues).toEqual(['maybe']);
    expect(resultHasErrors(result)).toBe(true);
  });
});

describe('hasValidationErrors', () => {
  it('is false when every project is valid', () => {
    const results = [
      validateProjectTags('a', [
        'technology:react',
        'production:true',
        'type:application',
      ]),
      validateProjectTags('b', [
        'technology:nestjs',
        'production:false',
        'publish:false',
        'type:package',
      ]),
    ];

    expect(hasValidationErrors(results)).toBe(false);
  });

  it('is true when at least one project has a violation', () => {
    const results = [
      validateProjectTags('a', [
        'technology:react',
        'production:true',
        'type:application',
      ]),
      validateProjectTags('b', ['production:true', 'type:application']),
    ];

    expect(hasValidationErrors(results)).toBe(true);
  });
});

describe('formatResults', () => {
  it('reports success when there are no violations', () => {
    const results = [
      validateProjectTags('a', [
        'technology:react',
        'production:true',
        'type:application',
      ]),
    ];

    const output = formatResults(results);

    expect(output).toContain('All projects have valid');
    expect(output).toContain('Validated 1 projects');
  });

  it('lists projects missing technology tags', () => {
    const results = [
      validateProjectTags('missing-tech', [
        'production:true',
        'type:application',
      ]),
    ];

    const output = formatResults(results);

    expect(output).toContain('missing technology tags');
    expect(output).toContain('missing-tech');
  });

  it('lists invalid technology tag values', () => {
    const results = [
      validateProjectTags('bad', [
        'technology:cobol',
        'production:true',
        'type:application',
      ]),
    ];

    const output = formatResults(results);

    expect(output).toContain('invalid technology tags');
    expect(output).toContain('technology:cobol');
  });

  it('lists projects with invalid type tags', () => {
    const results = [
      validateProjectTags('bad-type', [
        'technology:react',
        'production:true',
        'type:library',
      ]),
    ];

    const output = formatResults(results);

    expect(output).toContain('invalid type tags');
    expect(output).toContain('type:library');
  });

  it('lists packages missing a required publish tag', () => {
    const results = [
      validateProjectTags('needs-publish', [
        'technology:nestjs',
        'production:false',
        'type:package',
      ]),
    ];

    const output = formatResults(results);

    expect(output).toContain('requiring a publish tag');
    expect(output).toContain('needs-publish');
  });
});
