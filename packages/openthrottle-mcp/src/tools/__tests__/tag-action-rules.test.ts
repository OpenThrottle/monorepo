/**
 * @description Handler tests for list_rule_applications: the exactly-one planId/ruleId argument rule and which GraphQL document each argument selects.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PreviewTagActionRuleDocument,
  RuleApplicationsDocument,
  RuleApplicationsForRuleDocument,
} from '../../__generated__/graphql.js';
import {
  listRuleApplicationsToolHandler,
  listRuleApplicationsToolParameters,
  previewTagActionRuleToolHandler,
} from '../tag-action-rules.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const application = {
  createdAt: '2026-11-01T00:00:00.000Z',
  detailsJson: '{"reason":"skill-unavailable"}',
  id: 'app-1',
  planId: 'plan-1',
  ruleId: 'rule-1',
  state: 'flagged',
  taskId: null,
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const structured = (result: object): unknown => {
  return 'structuredContent' in result ? result.structuredContent : null;
};

beforeEach(() => {
  vi.mocked(executeGraphqlWithAuth).mockReset();
  process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_test_token';
});

afterEach(() => {
  delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
});

describe('list_rule_applications parameters', () => {
  it('advertises both planId and ruleId as properties', () => {
    expect(
      Object.keys(listRuleApplicationsToolParameters.shape).sort(),
    ).toEqual(['planId', 'ruleId']);
  });
});

describe('listRuleApplicationsToolHandler', () => {
  it('queries by plan when given a planId', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      ruleApplications: [application],
    });

    const result = await listRuleApplicationsToolHandler({ planId: 'plan-1' });

    expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
      'ot_sa_test_token',
      RuleApplicationsDocument,
      { planId: 'plan-1' },
    );
    expect(structured(result)).toEqual({
      applications: [application],
      totalCount: 1,
    });
  });

  it('queries by rule when given a ruleId', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      ruleApplicationsForRule: [application],
    });

    const result = await listRuleApplicationsToolHandler({ ruleId: 'rule-1' });

    expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
      'ot_sa_test_token',
      RuleApplicationsForRuleDocument,
      { ruleId: 'rule-1' },
    );
    expect(structured(result)).toEqual({
      applications: [application],
      totalCount: 1,
    });
  });

  it('reports an empty rule ledger', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      ruleApplicationsForRule: [],
    });

    const result = await listRuleApplicationsToolHandler({ ruleId: 'rule-1' });

    expect(result.content[0]?.text).toContain('rule-1');
    expect(structured(result)).toEqual({
      applications: [],
      totalCount: 0,
    });
  });

  it('rejects both ids together without calling GraphQL', async () => {
    const result = await listRuleApplicationsToolHandler({
      planId: 'plan-1',
      ruleId: 'rule-1',
    });

    expect('isError' in result).toBe(true);
    expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
  });

  it('rejects neither id without calling GraphQL', async () => {
    const result = await listRuleApplicationsToolHandler({});

    expect('isError' in result).toBe(true);
    expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
  });
});

describe('previewTagActionRuleToolHandler', () => {
  const preview = {
    cap: 500,
    environment: null,
    evaluated: 2,
    matched: [
      {
        id: 'plan-1',
        projectId: null,
        repositoryId: 'repo-1',
        status: 'PENDING',
        title: 'A',
      },
    ],
    matchedCount: 1,
    nonMatching: [
      {
        conditions: [
          {
            actual: null,
            condition: 'environment',
            expected: 'ci',
            passed: false,
          },
        ],
        failedOnlyOnEnvironment: true,
        id: 'plan-2',
        missingTags: [],
        projectId: null,
        repositoryId: null,
        status: 'PENDING',
        title: 'B',
      },
    ],
    specificity: 1,
    truncated: false,
  };

  it('sends only the match fields plus the evaluation environment', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      previewTagActionRule: preview,
    });

    const result = await previewTagActionRuleToolHandler({
      actionType: 'inject-task',
      environment: 'ci',
      evaluateEnvironment: 'ci',
      tagAll: ['spike'],
    });

    expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
      'ot_sa_test_token',
      PreviewTagActionRuleDocument,
      {
        environment: 'ci',
        input: expect.objectContaining({
          actionType: 'inject-task',
          environment: 'ci',
          projectId: null,
          repositoryId: null,
          tagAll: ['spike'],
        }),
      },
    );
    expect(structured(result)).toEqual({ preview });
    expect(result.content[0]?.text).toContain('Matches 1 of 2 plans');
    expect(result.content[0]?.text).toContain('environment only');
  });

  it('passes the project scope through', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      previewTagActionRule: preview,
    });

    await previewTagActionRuleToolHandler({
      actionType: 'inject-task',
      projectId: 'project-1',
    });

    expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
      'ot_sa_test_token',
      PreviewTagActionRuleDocument,
      {
        environment: null,
        input: expect.objectContaining({ projectId: 'project-1' }),
      },
    );
  });

  it('rejects arguments without an action type before calling GraphQL', async () => {
    const result = await previewTagActionRuleToolHandler({
      actionType: '',
    });

    expect('isError' in result).toBe(true);
    expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
  });
});
