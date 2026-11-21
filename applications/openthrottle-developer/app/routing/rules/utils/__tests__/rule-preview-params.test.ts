import { describe, expect, test } from 'vitest';

import {
  buildRulePreviewQuery,
  normalizeRuleFormChoice,
  parseRulePreviewEnvironment,
  parseRulePreviewQuery,
  type RulePreviewRequest,
} from '../rule-preview-params';

const request: RulePreviewRequest = {
  evaluateEnvironment: 'ci',
  match: {
    actionType: 'inject-task',
    environment: 'ralph',
    repositoryId: 'repo-1',
    status: 'PENDING',
    tagAll: ['backend', 'spike'],
  },
};

describe('normalizeRuleFormChoice', () => {
  test.each([[null], [''], ['any']])('maps %s to null', (value) => {
    expect(normalizeRuleFormChoice(value)).toBeNull();
  });

  test('keeps a real choice', () => {
    expect(normalizeRuleFormChoice('PENDING')).toBe('PENDING');
  });
});

describe('parseRulePreviewEnvironment', () => {
  test('accepts the known environments', () => {
    expect(parseRulePreviewEnvironment('interactive')).toBe('interactive');
  });

  test('drops an unknown environment and the none choice', () => {
    expect(parseRulePreviewEnvironment('staging')).toBeNull();
    expect(parseRulePreviewEnvironment(null)).toBeNull();
  });
});

describe('buildRulePreviewQuery / parseRulePreviewQuery', () => {
  test('round-trips a full request', () => {
    const query = buildRulePreviewQuery(request);

    expect(parseRulePreviewQuery(new URLSearchParams(query))).toEqual(request);
  });

  test('omits unset fields', () => {
    const query = buildRulePreviewQuery({
      evaluateEnvironment: null,
      match: {
        actionType: 'inject-task',
        environment: null,
        repositoryId: null,
        status: null,
        tagAll: [],
      },
    });

    expect(query).toBe('actionType=inject-task');
  });

  test('repeats tagAll once per tag', () => {
    const params = new URLSearchParams(buildRulePreviewQuery(request));

    expect(params.getAll('tagAll')).toEqual(['backend', 'spike']);
  });
});
