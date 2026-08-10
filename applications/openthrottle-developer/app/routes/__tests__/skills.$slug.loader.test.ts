// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { Route } from '@/app/routes/+types/skills.$slug';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('~/routing/skills/data/read-skill-file.server', () => ({
  readSkillFileBySlug: vi.fn(),
}));

vi.mock('~/routing/skills/data/write-skill-file.server', () => ({
  writeSkillFileBySlug: vi.fn(),
}));

const { readSkillFileBySlug } =
  await import('~/routing/skills/data/read-skill-file.server');
const { writeSkillFileBySlug } =
  await import('~/routing/skills/data/write-skill-file.server');
const { action, loader } = await import('../skills.$slug');

const mockReadSkillFileBySlug = vi.mocked(readSkillFileBySlug);
const mockWriteSkillFileBySlug = vi.mocked(writeSkillFileBySlug);

const SAMPLE_ENTRY: RepoSkillEntry = {
  arguments: undefined,
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
    expect(result.content).toBe('---\nname: ot-plans\n---\n\n# OT plans\n');
    expect(result.editable).toBe(true);
    expect(result.entry).toEqual(SAMPLE_ENTRY);
    // The Run-skill modal's deferred discovery bundle: model + repository
    // discovery degrade to [] here (no authed GraphQL in the node test env).
    await expect(result.runOptions).resolves.toEqual({
      models: [],
      repositories: [],
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

  test('delegates saves to writeSkillFileBySlug via the action', async () => {
    mockWriteSkillFileBySlug.mockReturnValue({ ok: true });
    // URL-encoded body (matching fetcher.submit's default) keeps \n intact;
    // multipart FormData would normalize newlines to \r\n.
    const request = new Request('http://localhost/skills/ot-plans', {
      body: new URLSearchParams({
        content: '---\nname: ot-plans\n---\n\n# Edited\n',
      }),
      method: 'POST',
    });

    const result = await action({
      context: createTestRouterContext(),
      params: { slug: 'ot-plans' },
      pattern: '/skills/:slug',
      request,
      url: new URL(request.url),
    });

    expect(mockWriteSkillFileBySlug).toHaveBeenCalledWith(
      'ot-plans',
      '---\nname: ot-plans\n---\n\n# Edited\n',
    );
    expect(result).toEqual({ ok: true });
  });

  test('action rejects a submission without content and never writes', async () => {
    const request = new Request('http://localhost/skills/ot-plans', {
      body: new URLSearchParams({}),
      method: 'POST',
    });

    const result = await action({
      context: createTestRouterContext(),
      params: { slug: 'ot-plans' },
      pattern: '/skills/:slug',
      request,
      url: new URL(request.url),
    });

    expect(result.ok).toBe(false);
    expect(mockWriteSkillFileBySlug).not.toHaveBeenCalled();
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
