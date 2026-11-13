import { CONVERSATION_PERMISSION_MODES } from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import { resolveScenarioTurn, scenarioRun } from '../scenarioRun.ts';

describe('resolveScenarioTurn', () => {
  describe('when the stem is a single-turn slug', () => {
    it('resolves the first turn', () => {
      expect(resolveScenarioTurn('simple-turn')).toMatchObject({
        scenario: { slug: 'simple-turn' },
        turnIndex: 0,
      });
    });
  });

  describe('when the stem names a later turn', () => {
    it('resolves that turn', () => {
      expect(resolveScenarioTurn('resume.turn-2')?.turnIndex).toBe(1);
    });
  });

  describe('when nothing matches', () => {
    it.each(['nope', 'resume.turn-9'])('returns null for %s', (stem) => {
      expect(resolveScenarioTurn(stem)).toBeNull();
    });
  });
});

describe('scenarioRun', () => {
  const context = {
    cwd: '/work',
    history: [],
    model: null,
    sessionId: 'session',
    signal: undefined,
  };

  it('resumes only after the first turn', () => {
    const first = resolveScenarioTurn('resume.turn-1');
    const second = resolveScenarioTurn('resume.turn-2');
    if (first === null || second === null) {
      throw new Error('resume scenario missing');
    }

    expect(scenarioRun(first, context).resumeSession).toBe(false);
    expect(scenarioRun(second, context).resumeSession).toBe(true);
  });

  it('carries the turn posture and maps a null model to the default', () => {
    const resolved = resolveScenarioTurn('permission-denied');
    if (resolved === null) {
      throw new Error('permission-denied scenario missing');
    }

    expect(scenarioRun(resolved, context)).toMatchObject({
      model: '',
      permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
    });
  });
});
