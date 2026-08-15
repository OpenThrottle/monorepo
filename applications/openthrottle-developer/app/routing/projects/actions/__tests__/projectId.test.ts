// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/projects.$projectId._index';

// Keep the real `parseFormData`; only stub the network call. `importOriginal`
// is SSR-safe under node (the package's `window.env` read is `IS_BROWSER`-gated).
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  ProjectDetailAddProjectTagDocument,
  ProjectDetailRemoveProjectTagDocument,
} = await import('~/__generated__/graphql');
const { runProjectDetailAction } = await import('../projectId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const actionArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request('http://localhost/projects/proj-1', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { projectId: 'proj-1' },
    pattern: '/projects/:projectId',
    request,
    url: new URL(request.url),
  };
};

const form = (entries: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe('projects/actions/projectId tag parser', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({}),
    );
  });

  test('addProjectTag injects the route projectId and trims the tag', async () => {
    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'addProjectTag', tag: '  backend  ' })),
    );

    expect(result).toEqual({ projectTagUpdated: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      ProjectDetailAddProjectTagDocument,
      { input: { projectId: 'proj-1', tag: 'backend' } },
    );
  });

  test('removeProjectTag targets the remove document', async () => {
    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'removeProjectTag', tag: 'backend' })),
    );

    expect(result).toEqual({ projectTagUpdated: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      ProjectDetailRemoveProjectTagDocument,
      { input: { projectId: 'proj-1', tag: 'backend' } },
    );
  });

  test('rejects a blank tag without calling the server', async () => {
    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'addProjectTag', tag: '   ' })),
    );

    expect(result).toEqual({ projectTagError: 'Tag is required.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('returns empty for an unrecognized intent', async () => {
    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'noop' })),
    );

    expect(result).toEqual({});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
