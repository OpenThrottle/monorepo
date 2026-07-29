/**
 * Drift guard: every composer control value the UI can send must change the
 * concrete CLI invocation — i.e. no backend silently drops a control. Because
 * the composer can only send values from these enums, and each backend's argv
 * builder maps EVERY enum value to a real flag/param here, any capability a
 * backend advertises (a subset of these enums, in react-router-chat-state) is
 * necessarily honored. If a future edit drops a level/mode/tier from a builder,
 * this fails.
 */

import { describe, expect, it } from 'vitest';

import { buildClaudeArgv } from '../claude/argv.ts';
import { buildCodexArgv } from '../codex/argv.ts';
import { buildCursorAgentArgv } from '../cursor-agent/argv.ts';
import { buildGrokArgv } from '../grok/argv.ts';
import { buildOpencodeArgv } from '../opencode/argv.ts';
import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
  CONVERSATION_SERVICE_TIERS,
  type ConversationPermissionMode,
  type ConversationReasoningEffort,
} from '../types.ts';

const ALL_REASONING = Object.values(CONVERSATION_REASONING_EFFORTS);
const ALL_PERMISSIONS = Object.values(CONVERSATION_PERMISSION_MODES);

/** Whether an argv carries the backend's reasoning flag with a non-empty value. */
const reasoningFlagPresent: Record<
  string,
  (reasoning: ConversationReasoningEffort) => boolean
> = {
  claude: (reasoning) => {
    const argv = buildClaudeArgv({
      prompt: 'p',
      reasoning,
      resume: false,
      sessionId: 's',
    });
    const value = argv[argv.indexOf('--effort') + 1];
    return argv.includes('--effort') && !!value && value.length > 0;
  },
  codex: (reasoning) => {
    const argv = buildCodexArgv({ prompt: 'p', reasoning, resume: false });
    return argv.some((a) => a.startsWith('model_reasoning_effort='));
  },
  cursor: (reasoning) => {
    // Reasoning rides on the model-string bracket, so a model is required.
    const argv = buildCursorAgentArgv({
      cwd: '/w',
      model: 'm',
      prompt: 'p',
      reasoning,
      sessionId: 's',
    });
    const model = argv[argv.indexOf('--model') + 1] ?? '';
    return model.includes('effort=');
  },
  grok: (reasoning) => {
    const argv = buildGrokArgv({
      cwd: '/w',
      prompt: 'p',
      reasoning,
      resume: false,
    });
    const value = argv[argv.indexOf('--reasoning-effort') + 1];
    return argv.includes('--reasoning-effort') && !!value && value.length > 0;
  },
  opencode: (reasoning) => {
    const argv = buildOpencodeArgv({ cwd: '/w', prompt: 'p', reasoning });
    const value = argv[argv.indexOf('--variant') + 1];
    return argv.includes('--variant') && !!value && value.length > 0;
  },
};

describe('control-honoring drift guard', () => {
  describe('reasoning: every backend maps every reasoning level to a flag (no drops)', () => {
    for (const backend of Object.keys(reasoningFlagPresent)) {
      it(`${backend} honors all ${ALL_REASONING.length} reasoning levels`, () => {
        for (const reasoning of ALL_REASONING) {
          expect(
            reasoningFlagPresent[backend]?.(reasoning),
            `${backend} dropped reasoning=${reasoning}`,
          ).toBe(true);
        }
      });
    }
  });

  describe('permission: each mode changes the CLI invocation (not cosmetic)', () => {
    const permutationsFor: Record<
      string,
      (permissionMode: ConversationPermissionMode | undefined) => string
    > = {
      claude: (permissionMode) =>
        JSON.stringify(
          buildClaudeArgv({
            // MCP servers make the scoped-allowlist posture observable.
            mcpServers: { 'ot-mcp': { command: 'bash' } },
            permissionMode,
            prompt: 'p',
            resume: false,
            sessionId: 's',
          }),
        ),
      codex: (permissionMode) =>
        JSON.stringify(
          buildCodexArgv({ permissionMode, prompt: 'p', resume: false }),
        ),
      grok: (permissionMode) =>
        JSON.stringify(
          buildGrokArgv({
            cwd: '/w',
            permissionMode,
            prompt: 'p',
            resume: false,
          }),
        ),
    };

    for (const backend of Object.keys(permutationsFor)) {
      it(`${backend} produces a distinct argv for each permission posture`, () => {
        const render = permutationsFor[backend];
        const seen = new Set(
          ALL_PERMISSIONS.map((permissionMode) => render?.(permissionMode)),
        );
        // fullAccess / autoAcceptEdits / supervised must all differ.
        expect(seen.size).toBe(ALL_PERMISSIONS.length);
      });
    }

    it('cursor: fullAccess adds --force, supervised does not', () => {
      const full = buildCursorAgentArgv({
        cwd: '/w',
        permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
        prompt: 'p',
        sessionId: 's',
      });
      const supervised = buildCursorAgentArgv({
        cwd: '/w',
        permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
        prompt: 'p',
        sessionId: 's',
      });
      expect(full).toContain('--force');
      expect(supervised).not.toContain('--force');
    });
  });

  describe('service tier: cursor (the only tier-aware backend) routes both tiers', () => {
    it('fast and standard produce distinct model brackets', () => {
      const model = (
        tier: (typeof CONVERSATION_SERVICE_TIERS)[keyof typeof CONVERSATION_SERVICE_TIERS],
      ): string => {
        const argv = buildCursorAgentArgv({
          cwd: '/w',
          model: 'm',
          prompt: 'p',
          serviceTier: tier,
          sessionId: 's',
        });
        return argv[argv.indexOf('--model') + 1] ?? '';
      };
      expect(model(CONVERSATION_SERVICE_TIERS.fast)).toContain('fast=true');
      expect(model(CONVERSATION_SERVICE_TIERS.standard)).toContain(
        'fast=false',
      );
    });
  });
});
