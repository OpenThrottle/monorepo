/**
 * @description Fishery factory for the agent_token_usage entity (test fixtures).
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { AgentTokenUsage } from './agent-token-usage.entity';

export type AgentTokenUsageFactoryData = Pick<
  AgentTokenUsage,
  | 'cachedReadTokens'
  | 'cachedWriteTokens'
  | 'conversationId'
  | 'costUsd'
  | 'createdAt'
  | 'id'
  | 'inputTokens'
  | 'messageId'
  | 'model'
  | 'outputTokens'
  | 'provider'
  | 'rawUsage'
  | 'reasoningTokens'
  | 'totalTokens'
  | 'userId'
>;

export const agentTokenUsageFactory =
  Factory.define<AgentTokenUsageFactoryData>(() => {
    const inputTokens = faker.number.int({ max: 20000, min: 100 });
    const outputTokens = faker.number.int({ max: 4000, min: 1 });

    return {
      cachedReadTokens: faker.number.int({ max: 5000, min: 0 }),
      cachedWriteTokens: faker.number.int({ max: 1000, min: 0 }),
      conversationId: faker.string.uuid(),
      costUsd: faker.number.float({ fractionDigits: 6, max: 1, min: 0 }),
      createdAt: faker.date.recent(),
      id: faker.string.uuid(),
      inputTokens,
      messageId: faker.string.uuid(),
      model: faker.helpers.arrayElement(['claude-opus-4-8', 'gpt-5', 'grok-4']),
      outputTokens,
      provider: faker.helpers.arrayElement([
        'claude',
        'codex',
        'cursor',
        'grok',
        'opencode',
        'openai',
      ]),
      rawUsage: null,
      reasoningTokens: faker.number.int({ max: 500, min: 0 }),
      totalTokens: inputTokens + outputTokens,
      userId: faker.string.uuid(),
    };
  });
