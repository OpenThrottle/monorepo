// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { Route } from '@/app/routes/+types/skills.$slug';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('~/routing/skills/data/read-skill-file.server', () => ({
  readSkillFileBySlug: vi.fn(),
}));

const { readSkillFileBySlug } =
  await import('~/routing/skills/data/read-skill-file.server');
const { loader } = await import('../skills.$slug');

const mockReadSkillFileBySlug = vi.mocked(readSkillFileBySlug);

const SAMPLE_ENTRY: RepoSkillEntry = {
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/ot-plans/SKILL.md',
  slug: 'ot-plans',
  source: 'openthrottle',
  summary: 'OpenThrottle plans skill.',
  tags: ['openthrottle'],
};

const loaderArgsForSlug = (slug: string): Route.LoaderArgs => {
  const request = new Request(`http://localhost/skills/${slug}`);
  return {
    context: createTestRouterContext(),
    params: { slug },
    pattern: '/skills/:slug',
    request,
    url: new URL(request.url),
  };
};

describe('routes/skills.$slug loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns entry, content, and editable for a known slug', async () => {
    mockReadSkillFileBySlug.mockReturnValue({
      content: '---\nname: ot-plans\n---\n\n# OT plans\n',
      editable: true,
      entry: SAMPLE_ENTRY,
    });

    const result = await loader(loaderArgsForSlug('ot-plans'));

    expect(mockReadSkillFileBySlug).toHaveBeenCalledWith('ot-plans');
    expect(result).toEqual({
      content: '---\nname: ot-plans\n---\n\n# OT plans\n',
      editable: true,
      entry: SAMPLE_ENTRY,
    });
  });

  test('throws a 404 Response for an unknown slug', async () => {
    mockReadSkillFileBySlug.mockReturnValue({
      content: '',
      editable: true,
      entry: undefined,
    });

    const thrown = await loader(loaderArgsForSlug('does-not-exist')).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(thrown).toBeInstanceOf(Response);
    if (thrown instanceof Response) {
      expect(thrown.status).toBe(404);
    }
  });

  test('throws a 404 Response when no monorepo root resolves (deployed app)', async () => {
    mockReadSkillFileBySlug.mockReturnValue({
      content: '',
      editable: false,
      entry: undefined,
    });

    const thrown = await loader(loaderArgsForSlug('ot-plans')).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(thrown).toBeInstanceOf(Response);
    if (thrown instanceof Response) {
      expect(thrown.status).toBe(404);
    }
  });
});
