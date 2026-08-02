import { describe, expect, test } from 'vitest';
import {
  RULES_ENABLED_FILTERS,
  filterRulesList,
  isRulesEnabledFilter,
  parseRulesEnabledFilterFromSearchParams,
  parseRulesSearchFromSearchParams,
  type RulesListFilterable,
} from '~/routing/rules/utils/parsers';

const rule = (
  overrides: Partial<RulesListFilterable> & Pick<RulesListFilterable, 'title'>,
): RulesListFilterable => ({
  actionType: 'inject-task',
  enabled: true,
  environment: null,
  status: null,
  tagAll: ['breakdown'],
  ...overrides,
});

const sample: RulesListFilterable[] = [
  rule({
    actionType: 'inject-task',
    enabled: true,
    tagAll: ['breakdown'],
    title: 'Grill every breakdown plan',
  }),
  rule({
    actionType: 'availability-exception',
    enabled: false,
    environment: 'staging',
    status: 'PENDING',
    tagAll: ['infra'],
    title: 'Staging infra override',
  }),
  rule({
    actionType: 'inject-task',
    enabled: true,
    tagAll: ['docs'],
    title: 'Docs follow-up',
  }),
];

describe('routing/rules utils parsers', () => {
  describe('RULES_ENABLED_FILTERS', () => {
    test('lists all, disabled, and enabled in alphabetical order', () => {
      expect(RULES_ENABLED_FILTERS).toEqual(['all', 'disabled', 'enabled']);
    });
  });

  describe('isRulesEnabledFilter', () => {
    test('accepts the three known filters', () => {
      expect(isRulesEnabledFilter('all')).toBe(true);
      expect(isRulesEnabledFilter('disabled')).toBe(true);
      expect(isRulesEnabledFilter('enabled')).toBe(true);
    });

    describe('when value is empty or unknown', () => {
      test('rejects empty string and garbage', () => {
        expect(isRulesEnabledFilter('')).toBe(false);
        expect(isRulesEnabledFilter('garbage')).toBe(false);
      });
    });
  });

  describe('parseRulesSearchFromSearchParams', () => {
    test('returns empty string when q is missing', () => {
      expect(parseRulesSearchFromSearchParams(new URLSearchParams())).toBe('');
    });

    test('reads q from the URL', () => {
      expect(
        parseRulesSearchFromSearchParams(new URLSearchParams('q=grill')),
      ).toBe('grill');
    });

    describe('when q is present but empty', () => {
      test('returns empty string', () => {
        expect(
          parseRulesSearchFromSearchParams(new URLSearchParams('q=')),
        ).toBe('');
      });
    });
  });

  describe('parseRulesEnabledFilterFromSearchParams', () => {
    test('defaults to all when enabled is missing', () => {
      expect(
        parseRulesEnabledFilterFromSearchParams(new URLSearchParams()),
      ).toBe('all');
    });

    test('reads valid enabled filter values', () => {
      expect(
        parseRulesEnabledFilterFromSearchParams(
          new URLSearchParams('enabled=enabled'),
        ),
      ).toBe('enabled');
      expect(
        parseRulesEnabledFilterFromSearchParams(
          new URLSearchParams('enabled=disabled'),
        ),
      ).toBe('disabled');
      expect(
        parseRulesEnabledFilterFromSearchParams(
          new URLSearchParams('enabled=all'),
        ),
      ).toBe('all');
    });

    describe('when enabled is invalid', () => {
      test('falls back to all', () => {
        expect(
          parseRulesEnabledFilterFromSearchParams(
            new URLSearchParams('enabled=sideways'),
          ),
        ).toBe('all');
      });
    });

    describe('when enabled is empty', () => {
      test('falls back to all', () => {
        expect(
          parseRulesEnabledFilterFromSearchParams(
            new URLSearchParams('enabled='),
          ),
        ).toBe('all');
      });
    });
  });

  describe('filterRulesList', () => {
    test('returns the full list when search and filter are default', () => {
      expect(filterRulesList(sample, {})).toEqual(sample);
    });

    describe('when enabledFilter is enabled', () => {
      test('keeps only enabled rules', () => {
        expect(
          filterRulesList(sample, { enabledFilter: 'enabled' }).map(
            (r) => r.title,
          ),
        ).toEqual(['Grill every breakdown plan', 'Docs follow-up']);
      });
    });

    describe('when enabledFilter is disabled', () => {
      test('keeps only disabled rules', () => {
        expect(
          filterRulesList(sample, { enabledFilter: 'disabled' }).map(
            (r) => r.title,
          ),
        ).toEqual(['Staging infra override']);
      });
    });

    describe('when search matches title', () => {
      test('filters case-insensitively by title substring', () => {
        expect(
          filterRulesList(sample, { search: 'GRILL' }).map((r) => r.title),
        ).toEqual(['Grill every breakdown plan']);
      });
    });

    describe('when search matches action type', () => {
      test('includes rules whose actionType contains the query', () => {
        expect(
          filterRulesList(sample, { search: 'availability' }).map(
            (r) => r.title,
          ),
        ).toEqual(['Staging infra override']);
      });
    });

    describe('when search matches a tag', () => {
      test('includes rules that list the tag', () => {
        expect(
          filterRulesList(sample, { search: 'docs' }).map((r) => r.title),
        ).toEqual(['Docs follow-up']);
      });
    });

    describe('when search matches status or environment', () => {
      test('includes rules whose status or environment contain the query', () => {
        expect(
          filterRulesList(sample, { search: 'staging' }).map((r) => r.title),
        ).toEqual(['Staging infra override']);
        expect(
          filterRulesList(sample, { search: 'pending' }).map((r) => r.title),
        ).toEqual(['Staging infra override']);
      });
    });

    describe('when search is whitespace-only', () => {
      test('does not narrow the list', () => {
        expect(filterRulesList(sample, { search: '   ' })).toEqual(sample);
      });
    });

    describe('when search and enabledFilter combine', () => {
      test('applies both constraints', () => {
        expect(
          filterRulesList(sample, {
            enabledFilter: 'enabled',
            search: 'inject',
          }).map((r) => r.title),
        ).toEqual(['Grill every breakdown plan', 'Docs follow-up']);
        expect(
          filterRulesList(sample, {
            enabledFilter: 'disabled',
            search: 'inject',
          }),
        ).toEqual([]);
      });
    });
  });
});
