/**
 * @description Handler tests for the project MCP tools (list_projects, get_project, create_project, update_project, delete_project) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createProjectToolHandler,
  deleteProjectToolHandler,
  getProjectToolHandler,
  listProjectsToolHandler,
  updateProjectToolHandler,
} from '../projects.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const projectId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = '***REMOVED-OT-TOKEN***';

const buildProject = (name: string, id: string = projectId) => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    description: null,
    id,
    name,
    plans: [{ id: 'plan-1' }, { id: 'plan-2' }],
    repositories: [
      { id: 'repo-1', name: 'monorepo', normalizedRemoteUrl: null },
    ],
    updatedAt: '2026-11-02T00:00:00.000Z',
  };
};

describe('listProjectsToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('rejects unknown keys without calling GraphQL', async () => {
      const result = await listProjectsToolHandler({
        // @ts-expect-error — strict schema rejects unknown keys
        nope: true,
      });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when no name filter is given', () => {
    it('returns every project with planCount and repositories', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        projects: [
          buildProject('OpenThrottle CMS'),
          buildProject('Docs', 'p2'),
        ],
      });

      const result = await listProjectsToolHandler({});

      expect(result).toMatchObject({
        structuredContent: {
          projects: [
            {
              description: null,
              id: projectId,
              name: 'OpenThrottle CMS',
              planCount: 2,
              repositories: [
                { id: 'repo-1', name: 'monorepo', normalizedRemoteUrl: null },
              ],
            },
            { id: 'p2', name: 'Docs' },
          ],
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {},
      );
    });
  });

  describe('when a name filter is given', () => {
    it('keeps only case-insensitive substring matches', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        projects: [
          buildProject('OpenThrottle CMS'),
          buildProject('Docs', 'p2'),
        ],
      });

      const result = await listProjectsToolHandler({ name: 'cms' });

      expect(result).toMatchObject({
        structuredContent: { projects: [{ id: projectId }] },
      });
      if (!('structuredContent' in result)) {
        throw new Error('expected a success result');
      }
      expect(result.structuredContent.projects).toHaveLength(1);
    });
  });

  describe('when a project has no plans field', () => {
    it('reports planCount 0', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        projects: [{ ...buildProject('Empty'), plans: null }],
      });

      const result = await listProjectsToolHandler({});

      expect(result).toMatchObject({
        structuredContent: { projects: [{ planCount: 0 }] },
      });
    });
  });

  describe('when GraphQL throws', () => {
    it('returns an error result', async () => {
      vi.mocked(executeGraphqlWithAuth).mockRejectedValue(new Error('boom'));

      const result = await listProjectsToolHandler({});

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/list_projects failed/) }],
        isError: true,
      });
    });
  });
});

describe('getProjectToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      // @ts-expect-error — id is required
      const result = await getProjectToolHandler({});

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when the project exists', () => {
    it('returns the project with createdAt and planCount', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        project: buildProject('OpenThrottle CMS'),
      });

      const result = await getProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        structuredContent: {
          project: {
            createdAt: '2026-11-01T00:00:00.000Z',
            id: projectId,
            latestProjectRun: null,
            planCount: 2,
          },
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { id: projectId },
      );
    });

    it('includes the newest project run so an agent can poll run_project', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        project: {
          ...buildProject('OpenThrottle CMS'),
          latestProjectRun: {
            cancelRequestedAt: null,
            createdAt: '2026-11-22T00:00:00.000Z',
            currentPlan: { id: 'plan-2', title: 'Second' },
            id: 'run-1',
            projectId,
            settledAt: '2026-11-22T01:00:00.000Z',
            startedAt: '2026-11-22T00:00:01.000Z',
            status: 'STOPPED',
            stoppedByPlan: { id: 'plan-2', title: 'Second' },
            stoppedReason: 'Plan run x settled FAILED.',
          },
        },
      });

      const result = await getProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        structuredContent: {
          project: {
            latestProjectRun: {
              id: 'run-1',
              status: 'STOPPED',
              stoppedByPlan: { id: 'plan-2', title: 'Second' },
            },
          },
        },
      });
    });
  });

  describe('when the project does not exist', () => {
    it('returns an error result', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ project: null });

      const result = await getProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/get_project returned no result/) },
        ],
        isError: true,
      });
    });
  });
});

describe('createProjectToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('rejects the deprecated nxProjectName without calling GraphQL', async () => {
      const result = await createProjectToolHandler({
        name: 'CMS',
        nxProjectName: 'applications/cms',
      });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('rejects an empty name without calling GraphQL', async () => {
      const result = await createProjectToolHandler({ name: '' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL creates the project', () => {
    it('returns the project and maps the input through', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        createProject: { ...buildProject('CMS'), plans: [], repositories: [] },
      });

      const result = await createProjectToolHandler({
        description: 'Content site',
        name: 'CMS',
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/Created project CMS/) }],
        structuredContent: {
          project: { id: projectId, name: 'CMS', planCount: 0 },
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { description: 'Content site', name: 'CMS' } },
      );
    });
  });
});

describe('updateProjectToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await updateProjectToolHandler({ name: 'CMS' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL updates the project', () => {
    it('returns the project and passes a null description through', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateProject: buildProject('Renamed'),
      });

      const result = await updateProjectToolHandler({
        description: null,
        id: projectId,
        name: 'Renamed',
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/Updated project Renamed/) }],
        structuredContent: { project: { name: 'Renamed' } },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { description: null, id: projectId, name: 'Renamed' } },
      );
    });
  });

  describe('when the project does not exist', () => {
    it('returns an error result', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateProject: null,
      });

      const result = await updateProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/update_project returned no result/) },
        ],
        isError: true,
      });
    });
  });
});

describe('deleteProjectToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await deleteProjectToolHandler({});

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*id/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL deletes the project', () => {
    it('returns deleted: true and maps the input through', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deleteProject: true,
      });

      const result = await deleteProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/Deleted project/) }],
        structuredContent: { deleted: true },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { id: projectId } },
      );
    });
  });

  describe('when no row was deleted', () => {
    it('returns deleted: false with a not-found message', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deleteProject: false,
      });

      const result = await deleteProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/not found/) }],
        structuredContent: { deleted: false },
      });
    });
  });
});
