/**
 * @description Unit tests for the stdio agent-environment capture: the detection rungs in order
 * (explicit declaration, CI, orchestrator run identity, agent harness, nothing), and the header a
 * captured — or never-captured — process sends.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  AGENT_ENVIRONMENT_HEADER,
  agentEnvironmentHeaders,
  captureStdioAgentEnvironment,
  detectAgentEnvironmentFromEnv,
  getCapturedAgentEnvironment,
} from '../agent-environment.ts';

describe('detectAgentEnvironmentFromEnv', () => {
  it('prefers an explicit OPENTHROTTLE_MCP_ENVIRONMENT over every other signal', () => {
    expect(
      detectAgentEnvironmentFromEnv({
        CI: 'true',
        OPENTHROTTLE_MCP_ENVIRONMENT: ' Interactive ',
        OPENTHROTTLE_PLAN_ID: 'plan-1',
      }),
    ).toBe('interactive');
  });

  it('ignores an unrecognised declaration and falls through', () => {
    expect(
      detectAgentEnvironmentFromEnv({
        CLAUDECODE: '1',
        OPENTHROTTLE_MCP_ENVIRONMENT: 'staging',
      }),
    ).toBe('interactive');
  });

  it('reports ci when CI is truthy, even under an orchestrator', () => {
    expect(
      detectAgentEnvironmentFromEnv({ CI: 'true', OPENTHROTTLE_PLAN_ID: 'p' }),
    ).toBe('ci');
  });

  it('treats a falsy CI as unset', () => {
    expect(detectAgentEnvironmentFromEnv({ CI: 'false' })).toBeNull();
    expect(detectAgentEnvironmentFromEnv({ CI: '0' })).toBeNull();
  });

  it('reports ralph when an orchestrator set the run identity', () => {
    expect(
      detectAgentEnvironmentFromEnv({
        CLAUDECODE: '1',
        OPENTHROTTLE_PLAN_ID: 'plan-1',
      }),
    ).toBe('ralph');
  });

  it('ignores a blank run identity', () => {
    expect(
      detectAgentEnvironmentFromEnv({ OPENTHROTTLE_PLAN_ID: '  ' }),
    ).toBeNull();
  });

  it('reports interactive for an agent harness with no orchestrator or CI', () => {
    expect(detectAgentEnvironmentFromEnv({ CURSOR_AGENT: '1' })).toBe(
      'interactive',
    );
  });

  it('reports nothing without a signal', () => {
    expect(detectAgentEnvironmentFromEnv({})).toBeNull();
  });
});

describe('agentEnvironmentHeaders', () => {
  afterEach(() => {
    captureStdioAgentEnvironment(null);
  });

  it('sends no header when nothing was captured (the HTTP surface)', () => {
    expect(getCapturedAgentEnvironment()).toBeNull();
    expect(agentEnvironmentHeaders()).toEqual({});
  });

  it('sends the captured environment', () => {
    captureStdioAgentEnvironment('ralph');

    expect(agentEnvironmentHeaders()).toEqual({
      [AGENT_ENVIRONMENT_HEADER]: 'ralph',
    });
  });
});
