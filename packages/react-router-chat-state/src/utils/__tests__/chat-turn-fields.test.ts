import { describe, expect, it } from 'vitest';
import { buildChatTurnFields } from '../chat-turn-fields';

const base = {
  fileMentions: [],
  permissionMode: null,
  persist: true,
  personaId: null,
  reasoning: null,
  repositoryIds: [],
  serviceTier: null,
} as const;

describe('buildChatTurnFields', () => {
  it('builds the plain openai HTTP shape (baseUrl + model, no repo/persona)', () => {
    const fields = buildChatTurnFields({
      ...base,
      decoded: {
        backend: 'openai',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3',
      },
    });

    expect(fields).toEqual({
      backend: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'llama3',
      persist: 'true',
    });
  });

  it('builds a CLI backend on its own cloud model (no baseUrl key)', () => {
    const fields = buildChatTurnFields({
      ...base,
      decoded: { backend: 'cursor', model: 'gpt-5.2' },
      permissionMode: 'autoAcceptEdits',
      persist: false,
      repositoryIds: ['repo-1'],
    });

    expect(fields).toEqual({
      backend: 'cursor',
      fileMentions: '[]',
      modelId: 'gpt-5.2',
      permissionMode: 'autoAcceptEdits',
      persist: 'false',
      personaId: '',
      reasoning: '',
      repositoryIds: '["repo-1"]',
      serviceTier: '',
    });
  });

  it('carries baseUrl AND repo/mention fields for a CLI-on-local-endpoint selection', () => {
    const fields = buildChatTurnFields({
      ...base,
      decoded: {
        backend: 'opencode',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3',
      },
      fileMentions: ['src/a.ts'],
      repositoryIds: ['repo-1'],
    });

    expect(fields.backend).toBe('opencode');
    expect(fields.baseUrl).toBe('http://localhost:11434/v1');
    expect(fields.fileMentions).toBe(JSON.stringify(['src/a.ts']));
    expect(fields.repositoryIds).toBe(JSON.stringify(['repo-1']));
  });

  it('encodes an empty selection as an empty JSON array, not an empty string', () => {
    const fields = buildChatTurnFields({
      ...base,
      decoded: { backend: 'claude' },
    });

    expect(fields.repositoryIds).toBe('[]');
  });

  it('encodes several ids primary-first, preserving order', () => {
    const fields = buildChatTurnFields({
      ...base,
      decoded: { backend: 'claude' },
      repositoryIds: ['repo-primary', 'repo-second', 'repo-third'],
    });

    expect(fields.repositoryIds).toBe(
      JSON.stringify(['repo-primary', 'repo-second', 'repo-third']),
    );
  });

  it('omits repository fields entirely for the openai backend', () => {
    const fields = buildChatTurnFields({
      ...base,
      decoded: { backend: 'openai', baseUrl: 'http://x/v1', model: 'm' },
      repositoryIds: ['repo-1'],
    });

    expect(fields.repositoryIds).toBeUndefined();
  });
});
