import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import * as readSkillFile from '~/routing/skills/data/read-skill-file.server';
import * as skillIndexLoaders from '~/routing/skills/data/skill-index-loaders';
import * as modelsServer from '~/routing/home/data/models.server';
import { loader } from '../skills.$slug';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

vi.mock('@openthrottle/react-router-graphql');
vi.mock('~/routing/skills/data/read-skill-file.server');
vi.mock('~/routing/skills/data/skill-index-loaders');
vi.mock('~/routing/home/data/models.server');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);
const mockReadSkillFileBySlug = vi.mocked(readSkillFile.readSkillFileBySlug);
const mockLoadProjectSkillFlags = vi.mocked(
  skillIndexLoaders.loadProjectSkillFlags,
);
const mockLoadSkillTagVocabulary = vi.mocked(
  skillIndexLoaders.loadSkillTagVocabulary,
);
const mockLoadComposerModels = vi.mocked(modelsServer.loadComposerModels);
const mockLoadRepositories = vi.mocked(modelsServer.loadRepositories);

const entry: RepoSkillEntry = {
  arguments: undefined,
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/ot-plans/SKILL.md',
  slug: 'ot-plans',
  source: 'openthrottle',
  summary: 'OpenThrottle plans skill.',
  tags: ['openthrottle'],
};

const runLoader = (slug: string) => {
  const request = new Request('http://localhost/skills/ot-plans');

  return loader({
    context: createTestRouterContext(),
    params: { slug },
    pattern: '/skills/:slug',
    request,
    url: new URL(request.url),
  });
};

describe('routes/skills.$slug loader', () => {
  beforeEach(() => {
    mockReadSkillFileBySlug.mockReset().mockReturnValue({
      content: '# body',
      editable: true,
      entry,
      metadata: { name: 'ot-plans' },
      rawContent: '---\nname: ot-plans\n---\n\n# body',
    });
    mockLoadProjectSkillFlags.mockReset().mockResolvedValue([]);
    mockLoadSkillTagVocabulary.mockReset().mockResolvedValue([]);
    mockLoadComposerModels.mockReset().mockResolvedValue([]);
    mockLoadRepositories.mockReset().mockResolvedValue([]);
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('resolves populated usage for a skill with recorded invocations', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      skillUsage: {
        byDay: [
          {
            date: '2026-08-05',
            oursCount: 5,
            thirdPartyCount: 0,
            totalCount: 5,
          },
        ],
        bySkill: [
          {
            abandonedCount: 0,
            avgDurationMs: 1500,
            count: 5,
            errorCount: 0,
            lastUsedAt: '2026-08-05T12:00:00.000Z',
            outcomeCount: 3,
            scope: 'ours',
            skillName: 'ot-plans',
            successCount: 3,
          },
        ],
      },
    });

    const result = await runLoader('ot-plans');
    const usage = await result.usage;

    // Queried on YYYY-MM-DD with the discovered slug as skillName.
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      expect.objectContaining({
        end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        skillName: 'ot-plans',
        start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(usage).toEqual({
      available: true,
      byDay: [
        { date: '2026-08-05', oursCount: 5, thirdPartyCount: 0, totalCount: 5 },
      ],
      skill: {
        abandonedCount: 0,
        avgDurationMs: 1500,
        count: 5,
        errorCount: 0,
        lastUsedAt: '2026-08-05T12:00:00.000Z',
        outcomeCount: 3,
        scope: 'ours',
        skillName: 'ot-plans',
        successCount: 3,
      },
    });
  });

  test('resolves the empty usage state when the skill has no invocations', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      skillUsage: { byDay: [], bySkill: [] },
    });

    const result = await runLoader('ot-plans');
    const usage = await result.usage;

    expect(usage).toEqual({ available: true, byDay: [], skill: null });
  });

  test('degrades to the unavailable sentinel when the query fails (still 200)', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(
      new Error('permission denied: settings:read'),
    );

    const result = await runLoader('ot-plans');
    const usage = await result.usage;

    expect(usage).toEqual({ available: false });
  });

  test('throws a 404 Response when the slug is not a discovered skill', async () => {
    mockReadSkillFileBySlug.mockReturnValue({
      content: '',
      editable: true,
      entry: undefined,
      metadata: {},
      rawContent: '',
    });

    await expect(runLoader('does-not-exist')).rejects.toBeInstanceOf(Response);
  });

  test('returns a DB-only orphan when disk discovery misses the slug', async () => {
    mockReadSkillFileBySlug.mockReturnValue({
      content: '',
      editable: true,
      entry: undefined,
      metadata: {},
      rawContent: '',
    });
    mockLoadProjectSkillFlags.mockResolvedValue([
      {
        description: 'Gone from disk.',
        orphanedAt: '2026-08-14T00:00:00.000Z',
        slug: 'ghost',
        source: 'external',
        staticDisableModelInvocation: null,
        tags: ['github'],
      },
    ]);
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      skillUsage: { byDay: [], bySkill: [] },
    });

    const result = await runLoader('ghost');

    expect(result.entry.slug).toBe('ghost');
    expect(result.entry.orphanedAt).toBe('2026-08-14T00:00:00.000Z');
    expect(result.editable).toBe(false);
    expect(result.content).toBe('');
    expect(result.metadata).toEqual({});
    expect(result.rawContent).toBe('');
  });

  test('passes the parsed metadata and raw file through for a discovered skill', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      skillUsage: { byDay: [], bySkill: [] },
    });

    const result = await runLoader('ot-plans');

    expect(result.metadata).toEqual({ name: 'ot-plans' });
    // rawContent keeps the frontmatter so the editor can round-trip the file,
    // while content is the stripped body.
    expect(result.rawContent).toBe('---\nname: ot-plans\n---\n\n# body');
    expect(result.content).toBe('# body');
  });
});
