/**
 * @description Handler tests for the plan inbox MCP tools (post_plan_message, claim_plan_messages)
 * with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ClaimPlanMessagesDocument,
  PlanMessageKind,
  PostPlanMessageDocument,
} from '../__generated__/graphql.js';
import {
  claimPlanMessagesToolHandler,
  postPlanMessageToolHandler,
} from './plan-messages.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const planRunId = '0b7e1c52-4c1d-4c7a-9a59-6a2f4d6f8e10';
const taskId = 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7';
const serviceAccountToken = '***REMOVED-OT-TOKEN***';

const message = (kind: string, author: string, body: string) => {
  return {
    author,
    body,
    createdAt: '2026-11-03T08:00:00.000Z',
    deliveredAt: null,
    deliveredToTaskId: null,
    id: `m-${author}`,
    kind,
    planId,
    planRunId: null,
    status: 'PENDING',
    taskId: null,
    updatedAt: '2026-11-03T08:00:00.000Z',
  };
};

describe('plan inbox MCP tools', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('postPlanMessageToolHandler', () => {
    describe('when the body is empty', () => {
      it('returns an invalid-args error without calling GraphQL', async () => {
        const result = await postPlanMessageToolHandler({
          body: '',
          kind: PlanMessageKind.Steer,
          planId,
        });

        expect(result).toMatchObject({ isError: true });
        expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
      });
    });

    describe('when the kind is unknown', () => {
      it('returns an invalid-args error without calling GraphQL', async () => {
        const result = await postPlanMessageToolHandler({
          body: 'hello',
          kind: 'SHOUT',
          planId,
        });

        expect(result).toMatchObject({ isError: true });
        expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
      });
    });

    describe('when GraphQL posts the message', () => {
      it('defaults optional fields to null and returns the message', async () => {
        const posted = message('QUEUE', 'visormatt', 'Also add a test');
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          postPlanMessage: posted,
        });

        const result = await postPlanMessageToolHandler({
          body: 'Also add a test',
          kind: PlanMessageKind.Queue,
          planId,
        });

        expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
          serviceAccountToken,
          PostPlanMessageDocument,
          {
            input: {
              author: null,
              body: 'Also add a test',
              kind: 'QUEUE',
              planId,
              taskId: null,
            },
          },
        );
        expect(result).toMatchObject({
          structuredContent: { message: posted },
        });
      });
    });
  });

  describe('claimPlanMessagesToolHandler', () => {
    describe('when nothing is pending', () => {
      it('says so', async () => {
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          claimPlanMessages: { auditChunk: null, messages: [] },
        });

        const result = await claimPlanMessagesToolHandler({
          planId,
          planRunId,
          taskId,
        });

        expect(result.content[0]?.text).toContain('No pending inbox messages');
      });
    });

    describe('when messages are delivered', () => {
      it('passes the run and task through and renders STEERs as returned', async () => {
        const steer = message('STEER', 'bob', 'Use the existing helper');
        const queue = message('QUEUE', 'alice', 'Update the README');
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          claimPlanMessages: {
            auditChunk: { content: '[inbox]', id: 'chunk-1', planId },
            messages: [steer, queue],
          },
        });

        const result = await claimPlanMessagesToolHandler({
          planId,
          planRunId,
          taskId,
        });

        expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
          serviceAccountToken,
          ClaimPlanMessagesDocument,
          { input: { planId, planRunId, taskId } },
        );

        const text = result.content[0]?.text ?? '';

        expect(text).toContain('Delivered 2 inbox message(s)');
        expect(text.indexOf('[STEER from @bob]')).toBeLessThan(
          text.indexOf('[QUEUE from @alice]'),
        );
      });
    });
  });
});
