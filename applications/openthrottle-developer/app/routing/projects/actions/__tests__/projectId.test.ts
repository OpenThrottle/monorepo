// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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
  ProjectDetailAddPlanDocument,
  ProjectDetailAddProjectTagDocument,
  ProjectDetailCancelProjectRunDocument,
  ProjectDetailLinkRepositoryDocument,
  ProjectDetailMovePlanDocument,
  ProjectDetailRemovePlanDocument,
  ProjectDetailRemoveProjectTagDocument,
  ProjectDetailRunProjectDocument,
  ProjectDetailUnlinkRepositoryDocument,
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

  describe('project structure intents', () => {
    test.each([
      [
        'linkProjectRepository',
        { repositoryId: 'repo-1' },
        ProjectDetailLinkRepositoryDocument,
        { projectId: 'proj-1', repositoryId: 'repo-1' },
      ],
      [
        'unlinkProjectRepository',
        { repositoryId: 'repo-1' },
        ProjectDetailUnlinkRepositoryDocument,
        { projectId: 'proj-1', repositoryId: 'repo-1' },
      ],
      [
        'addPlanToProject',
        { planId: 'plan-1' },
        ProjectDetailAddPlanDocument,
        { planId: 'plan-1', projectId: 'proj-1' },
      ],
      [
        'removePlanFromProject',
        { planId: 'plan-1' },
        ProjectDetailRemovePlanDocument,
        { planId: 'plan-1' },
      ],
      [
        'moveProjectPlan',
        { direction: 'UP', planId: 'plan-2' },
        ProjectDetailMovePlanDocument,
        { direction: 'UP', planId: 'plan-2' },
      ],
    ])('%s calls its mutation', async (intent, fields, document, input) => {
      const result = await runProjectDetailAction(
        actionArgs(form({ intent, ...fields })),
      );

      expect(result).toEqual({ projectUpdated: true });
      expect(mockExecute).toHaveBeenCalledWith(expect.any(Request), document, {
        input,
      });
    });

    test('rejects a move with an unknown direction without calling the server', async () => {
      const result = await runProjectDetailAction(
        actionArgs(
          form({
            direction: 'SIDEWAYS',
            intent: 'moveProjectPlan',
            planId: 'p',
          }),
        ),
      );

      expect(result).toHaveProperty('projectError');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('rejects a structure intent with no ids without calling the server', async () => {
      const result = await runProjectDetailAction(
        actionArgs(form({ intent: 'addPlanToProject' })),
      );

      expect(result).toHaveProperty('projectError');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('surfaces a server failure as projectError', async () => {
      mockExecute.mockRejectedValueOnce(new Error('boom'));
      const result = await runProjectDetailAction(
        actionArgs(form({ intent: 'removePlanFromProject', planId: 'p' })),
      );

      expect(result).toEqual({ projectError: 'boom' });
    });
  });
});

describe('projects/actions/projectId project run', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({}),
    );
  });

  test('runProject runs the route project', async () => {
    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'runProject' })),
    );

    expect(result).toEqual({ projectRunUpdated: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      ProjectDetailRunProjectDocument,
      { input: { projectId: 'proj-1' } },
    );
  });

  test('cancelProjectRun cancels the posted run', async () => {
    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'cancelProjectRun', projectRunId: 'run-1' })),
    );

    expect(result).toEqual({ projectRunUpdated: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      ProjectDetailCancelProjectRunDocument,
      { input: { projectRunId: 'run-1' } },
    );
  });

  test('cancelProjectRun without a run id is refused without a call', async () => {
    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'cancelProjectRun' })),
    );

    expect(result).toEqual({ projectRunError: 'Missing project run id.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('a refusal comes back as projectRunError', async () => {
    mockExecute.mockRejectedValue(
      new Error('This project already has an active run.'),
    );

    const result = await runProjectDetailAction(
      actionArgs(form({ intent: 'runProject' })),
    );

    expect(result).toEqual({
      projectRunError: 'This project already has an active run.',
    });
  });
});
