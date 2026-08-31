import { describe, expect, it } from 'vitest';

import { OPENROUTER_SHORTLIST_PER_VENDOR } from '../../config/openrouter-shortlist';
import { buildModelGroups } from '../chat-model-option';
import {
  composeModelOptions,
  toRemoteChatOptions,
} from '../chat-discovery-options';
import type { DiscoveredRemoteModels } from '../chat-discovery-options';

/** A catalog entry shaped like the `discoverRemoteModels` payload. */
function model(id: string, name = id, contextLength = 200_000) {
  return { contextLength, id, name };
}

const CATALOG: DiscoveredRemoteModels = {
  configured: true,
  models: [
    model('aion-labs/aion-3.0', 'AionLabs: Aion 3.0'),
    model('anthropic/claude-opus-5', 'Anthropic: Claude Opus 5'),
    model('anthropic/claude-opus-5:batch', 'Anthropic: Claude Opus 5 (batch)'),
    model('anthropic/claude-sonnet-5', 'Anthropic: Claude Sonnet 5'),
    model('anthropic/claude-fable-5', 'Anthropic: Claude Fable 5'),
    model('anthropic/claude-haiku-5', 'Anthropic: Claude Haiku 5'),
    model('openai/gpt-6', 'OpenAI: GPT-6'),
    model('z-ai/glm-5.3-flash', 'Z.AI: GLM 5.3 Flash', 1_048_576),
  ],
};

describe('toRemoteChatOptions', () => {
  it('maps every catalog entry onto the openrouter backend group', () => {
    const options = toRemoteChatOptions(CATALOG);

    expect(options).toHaveLength(CATALOG.models.length);
    expect(options.every((option) => option.groupId === 'openrouter')).toBe(
      true,
    );
    expect(options[0]).toMatchObject({
      // The id decodes to { backend: 'openrouter', model: <slug> }, which is
      // what routes the turn and selects the capability descriptor.
      id: 'openrouter|aion-labs/aion-3.0',
      label: 'AionLabs: Aion 3.0',
      subLabel: 'aion-labs/aion-3.0',
    });
  });

  it('surfaces the context window compactly in the row description', () => {
    const options = toRemoteChatOptions(CATALOG);
    const flash = options.find(
      (option) => option.subLabel === 'z-ai/glm-5.3-flash',
    );
    const sonnet = options.find(
      (option) => option.subLabel === 'anthropic/claude-sonnet-5',
    );

    expect(flash?.description).toBe('OpenRouter · 1M context');
    expect(sonnet?.description).toBe('OpenRouter · 200K context');
  });

  it('returns nothing at all when the server reports unconfigured', () => {
    // The catalog is PUBLIC, so models are present even unconfigured — the
    // explicit flag is what hides the group, not an empty list.
    expect(toRemoteChatOptions({ ...CATALOG, configured: false })).toEqual([]);
  });

  it('returns an empty list for a configured-but-empty catalog', () => {
    expect(toRemoteChatOptions({ configured: true, models: [] })).toEqual([]);
  });
});

describe('openrouter shortlist flagging', () => {
  it('flags known vendors and caps how many each contributes', () => {
    const shortlisted = toRemoteChatOptions(CATALOG)
      .filter((option) => option.shortlist === true)
      .map((option) => option.subLabel);

    // anthropic is capped, so its 4 plain routes yield only the cap.
    expect(
      shortlisted.filter((id) => id?.startsWith('anthropic/')),
    ).toHaveLength(OPENROUTER_SHORTLIST_PER_VENDOR);
    expect(shortlisted).toContain('openai/gpt-6');
  });

  it('never shortlists a suffixed route variant', () => {
    const batch = toRemoteChatOptions(CATALOG).find(
      (option) => option.subLabel === 'anthropic/claude-opus-5:batch',
    );

    // `:batch` is a real, selectable id — it just should not lead the group.
    expect(batch).toBeDefined();
    expect(batch?.shortlist).toBe(false);
  });

  it('does not shortlist an unlisted vendor', () => {
    const aion = toRemoteChatOptions(CATALOG).find(
      (option) => option.subLabel === 'aion-labs/aion-3.0',
    );

    expect(aion?.shortlist).toBe(false);
  });
});

describe('composeModelOptions with a remote catalog', () => {
  it('appends the remote catalog after the local and CLI lists', () => {
    const options = composeModelOptions(
      { endpoints: [] },
      { agents: [] },
      CATALOG,
    );

    expect(options).toHaveLength(CATALOG.models.length);
    expect(options.every((option) => option.groupId === 'openrouter')).toBe(
      true,
    );
  });

  it('is unchanged for existing two-argument callers', () => {
    expect(composeModelOptions({ endpoints: [] }, { agents: [] })).toEqual([]);
  });

  it('degrades a null remote payload to no openrouter options', () => {
    expect(
      composeModelOptions({ endpoints: [] }, { agents: [] }, null),
    ).toEqual([]);
  });

  it('omits the openrouter rail group entirely when unconfigured', () => {
    const options = composeModelOptions(
      { endpoints: [] },
      { agents: [] },
      {
        ...CATALOG,
        configured: false,
      },
    );

    expect(buildModelGroups(options)).toEqual([]);
  });
});

describe('buildModelGroups for openrouter', () => {
  it('labels the group OpenRouter rather than the first model slug', () => {
    const groups = buildModelGroups(toRemoteChatOptions(CATALOG));

    // The rows carry the model slug as their subLabel, which the generic
    // fallback would otherwise promote into the group name.
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: 'openrouter', label: 'OpenRouter' });
  });
});
