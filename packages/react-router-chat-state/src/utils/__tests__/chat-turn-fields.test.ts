import { describe, expect, it } from 'vitest';
import { buildChatTurnFields } from '../chat-turn-fields';

const base = {
  fileMentions: [],
  permissionMode: null,
  persist: true,
  personaId: null,
  reasoning: null,
  repositoryId: null,
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
      repositoryId: 'repo-1',
    });

    expect(fields).toEqual({
      backend: 'cursor',
      fileMentions: '[]',
      modelId: 'gpt-5.2',
      permissionMode: 'autoAcceptEdits',
      persist: 'false',
      personaId: '',
      reasoning: '',
      repositoryId: 'repo-1',
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
      repositoryId: 'repo-1',
    });

    expect(fields.backend).toBe('opencode');
    expect(fields.baseUrl).toBe('http://localhost:11434/v1');
    expect(fields.fileMentions).toBe(JSON.stringify(['src/a.ts']));
    expect(fields.repositoryId).toBe('repo-1');
  });
});
