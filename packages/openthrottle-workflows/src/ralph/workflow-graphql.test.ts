import { describe, expect, it } from 'vitest';
import { RalphNestedDebugCli } from '../__generated__/graphql.js';
import {
  WORKFLOW_RALPH_DEFAULT_ITERATIONS,
  WORKFLOW_RALPH_DEFAULT_MODEL,
  WORKFLOW_RALPH_DEFAULT_PROMPT,
} from './contract/flow-context.js';
import {
  buildRalphFlowContextFromPlanRunTuning,
  buildRalphFlowContextFromRunOptionsShape,
  buildWorkflowGraphqlHeaders,
  mapUnknownToWorkflowGraphqlError,
  resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning,
} from './workflow-graphql.js';

describe('buildWorkflowGraphqlHeaders', () => {
  it('merges additional headers and Bearer token', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: { 'X-Custom': '1' },
      graphqlUrl: undefined,
      token: 'abc',
    });

    expect(headers).toEqual({
      Authorization: 'Bearer abc',
      'X-Custom': '1',
    });
  });

  it('lets configured token win over Authorization in additionalHeaders', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: { Authorization: 'Bearer old' },
      graphqlUrl: undefined,
      token: 'new',
    });

    expect(headers.Authorization).toBe('Bearer new');
  });

  it('omits Authorization when token is undefined', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: { 'X-Foo': 'bar' },
      graphqlUrl: undefined,
      token: undefined,
    });

    expect(headers).toEqual({ 'X-Foo': 'bar' });
  });

  it('treats whitespace-only token as absent', () => {
    const headers = buildWorkflowGraphqlHeaders({
      additionalHeaders: {},
      graphqlUrl: undefined,
      token: '   ',
    });

    expect(headers.Authorization).toBeUndefined();
  });
});

describe('mapUnknownToWorkflowGraphqlError', () => {
  it('maps GraphQL errors message to GRAPHQL_ERRORS code', () => {
    const err = new Error('GraphQL errors: not found');
    const mapped = mapUnknownToWorkflowGraphqlError(err);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_GRAPHQL_ERRORS');
    expect(mapped.message).toBe('GraphQL errors: not found');
    expect(mapped.cause).toBe(err);
  });

  it('maps HTTP status line from nodejs-graphql message', () => {
    const err = new Error(
      'openthrottle-server GraphQL error 500: Internal Server Error',
    );
    const mapped = mapUnknownToWorkflowGraphqlError(err);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_HTTP');
    expect(mapped.httpStatus).toBe(500);
  });

  it('maps missing data message', () => {
    const err = new Error('GraphQL response missing data');
    const mapped = mapUnknownToWorkflowGraphqlError(err);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_MISSING_DATA');
  });

  it('maps non-Error values to UNKNOWN', () => {
    const mapped = mapUnknownToWorkflowGraphqlError(42);

    expect(mapped.code).toBe('WORKFLOW_GRAPHQL_UNKNOWN');
    expect(mapped.message).toBe('42');
    expect(mapped.cause).toBeUndefined();
  });
});

describe('RalphFlowContext from GraphQL / run options', () => {
  const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

  it('resolves defaults from empty tuning (queued plan scope)', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      planId,
      ralph: undefined,
      targetMode: 'plan',
    });

    expect(ctx.kind).toBe('ralph');
    expect(ctx.planId).toBe(planId);
    expect(ctx.targetMode).toBe('plan');
    expect(ctx.mode).toBe('plan-centric');
    expect(ctx.iterations).toBe(WORKFLOW_RALPH_DEFAULT_ITERATIONS);
    expect(ctx.maxIterations).toBe(WORKFLOW_RALPH_DEFAULT_ITERATIONS);
    expect(ctx.prompt).toBe(WORKFLOW_RALPH_DEFAULT_PROMPT);
    expect(ctx.model).toBe(WORKFLOW_RALPH_DEFAULT_MODEL);
    expect(ctx.debugCli).toBe('omit');
    expect(ctx.taskId).toBe('');
  });

  it('maps nested ralph fields and debug enum', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      planId,
      ralph: {
        backend: 'cursor',
        iterationTimeoutSeconds: 120,
        iterations: 3,
        model: 'fast',
        project: 'openthrottle-workflows',
        prompt: '/custom',
        ralphDebugCli: RalphNestedDebugCli.Debug,
      },
      targetMode: 'plan',
    });

    expect(ctx.iterations).toBe(3);
    expect(ctx.maxIterations).toBe(3);
    expect(ctx.iterationTimeoutSeconds).toBe(120);
    expect(ctx.model).toBe('fast');
    expect(ctx.project).toBe('openthrottle-workflows');
    expect(ctx.prompt).toBe('/custom');
    expect(ctx.debugCli).toBe('debug');
  });

  it('applies task-centric maxIterations rule', () => {
    const taskId = 'b56b17b4-b052-44cf-98a6-1c972caca673';
    const shape = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { iterations: 10 },
      targetMode: 'task',
      taskId,
    });

    const ctx = buildRalphFlowContextFromRunOptionsShape(shape);

    expect(shape.iterations).toBe(10);
    expect(ctx.maxIterations).toBe(1);
    expect(ctx.mode).toBe('task-centric');
    expect(ctx.taskId).toBe(taskId);
  });
});
