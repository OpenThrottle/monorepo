// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Route } from '@/app/routes/+types/skills.availability';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

// Keep the real `parseFormData` (the action validates FormData through it);
// only stub the network call. `importOriginal` is SSR-safe here — the package's
// transitive `window.env` read is guarded by `IS_BROWSER`, false under node.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  AddSkillAvailabilityRuleDocument,
  SkillAvailabilityAuthoringRuleSetDocument,
  SkillAvailabilityAuthoringVocabularyDocument,
  SkillAvailabilityProjectsDocument,
} = await import('~/__generated__/graphql');
const { action, loader } = await import('../skills.availability');

const mockExecuteGraphqlWithAuth = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const PROJECTS_RESULT = {
  projects: [
    { id: 'other-1', name: 'Other', nxProjectName: 'other' },
    {
      id: 'dogfood-1',
      name: 'OpenThrottle/monorepo',
      nxProjectName: 'OpenThrottle/monorepo',
    },
  ],
};

const loaderArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/skills/availability');
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/skills/availability',
    request,
    url: new URL(request.url),
  };
};

const actionArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request('http://localhost/skills/availability', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/skills/availability',
    request,
    url: new URL(request.url),
  };
};

describe('routes/skills.availability loader', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('resolves the dogfood project and returns its posture, rules, and vocabulary', async () => {
    mockExecuteGraphqlWithAuth.mockImplementation(
      asMock<typeof executeGraphqlWithAuth>(
        (_request: Request, document: unknown): Promise<unknown> => {
          if (document === SkillAvailabilityProjectsDocument) {
            return Promise.resolve(PROJECTS_RESULT);
          }
          if (document === SkillAvailabilityAuthoringRuleSetDocument) {
            return Promise.resolve({
              skillAvailabilityRuleSet: {
                posture: 'deny',
                rules: [
                  {
                    environment: 'ralph',
                    id: 'rule-1',
                    slugAllow: ['git-commit'],
                    slugDeny: [],
                    tagAllow: ['github'],
                    tagDeny: [],
                  },
                ],
              },
            });
          }
          if (document === SkillAvailabilityAuthoringVocabularyDocument) {
            return Promise.resolve({
              skillTagVocabulary: {
                tags: [{ id: 't1', tag: 'github' }],
                totalCount: 1,
              },
            });
          }
          return Promise.resolve({});
        },
      ),
    );

    const result = await loader(loaderArgs());

    expect(result.projectId).toBe('dogfood-1');
    expect(result.posture).toBe('deny');
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]).toMatchObject({
      environment: 'ralph',
      id: 'rule-1',
      tagAllow: ['github'],
    });
    expect(result.vocabulary).toEqual([{ id: 't1', tag: 'github' }]);
  });

  test('returns a null project (and passthrough) when no monorepo project exists', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        projects: [{ id: 'other-1', name: 'Other', nxProjectName: 'other' }],
      }),
    );

    const result = await loader(loaderArgs());

    expect(result.projectId).toBeNull();
    expect(result.posture).toBeNull();
    expect(result.rules).toEqual([]);
    expect(result.vocabulary).toEqual([]);
  });
});

describe('routes/skills.availability action', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('returns an unknown-intent error for tag intents (moved to /skills/vocabulary)', async () => {
    const formData = new FormData();
    formData.set('intent', 'addTag');
    formData.set('tag', 'pr-review');

    const result = await action(actionArgs(formData));

    expect(result).toEqual({
      error: 'Unknown intent "addTag".',
      intent: 'addTag',
    });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('addRule parses the serialized tag/slug lists into the rule input', async () => {
    mockExecuteGraphqlWithAuth.mockImplementation(
      asMock<typeof executeGraphqlWithAuth>(
        (_request: Request, document: unknown): Promise<unknown> => {
          if (document === SkillAvailabilityProjectsDocument) {
            return Promise.resolve(PROJECTS_RESULT);
          }
          return Promise.resolve({ addSkillAvailabilityRule: { id: 'r9' } });
        },
      ),
    );

    const formData = new FormData();
    formData.set('intent', 'addRule');
    formData.set('environment', 'ci');
    formData.set('tagAllow', JSON.stringify(['github']));
    formData.set('tagDeny', JSON.stringify([]));
    formData.set('slugAllow', JSON.stringify(['git-commit']));
    formData.set('slugDeny', JSON.stringify([]));

    const result = await action(actionArgs(formData));

    expect(result).toEqual({ intent: 'addRule', ok: true });
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      AddSkillAvailabilityRuleDocument,
      {
        input: {
          environment: 'ci',
          slugAllow: ['git-commit'],
          slugDeny: [],
          tagAllow: ['github'],
          tagDeny: [],
        },
        projectId: 'dogfood-1',
      },
    );
  });

  test('rejects removeRule when the rule id is blank', async () => {
    const formData = new FormData();
    formData.set('intent', 'removeRule');
    formData.set('ruleId', '');

    const result = await action(actionArgs(formData));

    expect(result).toEqual({
      error: 'Rule id is required.',
      intent: 'removeRule',
    });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('surfaces the server error message as { error }', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(
      new Error('No dogfood project reachable.'),
    );

    const formData = new FormData();
    formData.set('intent', 'addRule');
    formData.set('environment', 'ci');
    formData.set('tagAllow', JSON.stringify(['github']));
    formData.set('tagDeny', JSON.stringify([]));
    formData.set('slugAllow', JSON.stringify([]));
    formData.set('slugDeny', JSON.stringify([]));

    const result = await action(actionArgs(formData));

    expect(result).toEqual({
      error: 'No dogfood project reachable.',
      intent: 'addRule',
    });
  });
});
