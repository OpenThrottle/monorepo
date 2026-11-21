/**
 * @description Project tool handlers + schemas: list_projects and get_project (core) and
 * create_project, update_project and delete_project (admin). Wired up via the shared `developerMcpToolDefinitions` registry and the
 * Nest surface. list_projects exists so an agent can resolve a project by name to the id that
 * create_plan / add_plan_to_project take, without anyone knowing a UUID.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import {
  DeleteProjectDocument,
  McpCreateProjectDocument,
  McpGetProjectDocument,
  McpListProjectsDocument,
  type McpProjectSummaryFragment,
  McpUpdateProjectDocument,
} from '../__generated__/graphql.js';
import {
  CreateProjectInputSchema,
  DeleteProjectInputSchema,
  UpdateProjectInputSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/getAuthToken.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

type ProjectRepositorySummary = {
  readonly id: string;
  readonly name: string;
  readonly normalizedRemoteUrl: string | null;
};

type ProjectSummary = {
  readonly description: string | null;
  readonly id: string;
  readonly name: string;
  readonly planCount: number;
  readonly repositories: readonly ProjectRepositorySummary[];
  readonly updatedAt: string;
};

interface ProjectDetail extends ProjectSummary {
  readonly createdAt: string;
}

/**
 * @description Flattens the GraphQL projection into the tool result shape: plan ids become a
 * count (get_project_plans lists the plans themselves) and nullable scalars become explicit nulls.
 */
const toProjectSummary = (
  project: McpProjectSummaryFragment,
): ProjectSummary => {
  const repositories = project.repositories.map((repository) => ({
    id: repository.id,
    name: repository.name,
    normalizedRemoteUrl: repository.normalizedRemoteUrl ?? null,
  }));

  return {
    description: project.description ?? null,
    id: project.id,
    name: project.name,
    planCount: project.plans?.length ?? 0,
    repositories,
    updatedAt: String(project.updatedAt),
  };
};

interface ProjectDetailSource extends McpProjectSummaryFragment {
  readonly createdAt: unknown;
}

const toProjectDetail = (project: ProjectDetailSource): ProjectDetail => {
  return {
    ...toProjectSummary(project),
    createdAt: String(project.createdAt),
  };
};

const toProjectText = (verb: string, project: ProjectDetail): string => {
  return `${verb} ${project.name} (${project.id}):\n${JSON.stringify(project, null, 2)}`;
};

// ── list_projects ────────────────────────────────────────────────────────────

export const listProjectsToolParameters = z
  .object({
    name: z
      .string()
      .min(1)
      .nullable()
      .optional()
      .describe(`Case-insensitive substring of the project name`),
  })
  .strict();

export const listProjectsToolDescription = `List OpenThrottle projects (cross-repo initiatives), newest first. Optional name filters by case-insensitive substring. Each entry carries id, name, description, planCount and linked repositories. Use it to resolve a project by name, then pass its id as projectId to create_plan or add_plan_to_project.`;

export async function listProjectsToolHandler(
  args: z.infer<typeof listProjectsToolParameters>,
): Promise<GenericResult<{ projects: ProjectSummary[] }>> {
  const parsed = listProjectsToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ projects: ProjectSummary[] }>('list_projects', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      McpListProjectsDocument,
      {},
    );
    const needle = parsed.data.name?.toLowerCase() ?? null;
    const projects = (result?.projects ?? [])
      .filter((project) => {
        return needle === null || project.name.toLowerCase().includes(needle);
      })
      .map(toProjectSummary);
    const filterText = needle === null ? '' : ` matching "${needle}"`;
    const text = `Projects${filterText} (${projects.length}):\n${JSON.stringify(projects, null, 2)}`;

    return { structuredContent: { projects }, text };
  });
}

// ── get_project ──────────────────────────────────────────────────────────────

export const getProjectToolParameters = z
  .object({
    id: z.string().min(1).describe(`Project UUID`),
  })
  .strict();

export const getProjectToolDescription = `Fetch one OpenThrottle project by id: name, description, planCount, linked repositories and timestamps. Errors when the project does not exist or is deleted. For its plans in order, use get_project_plans.`;

export async function getProjectToolHandler(
  args: z.infer<typeof getProjectToolParameters>,
): Promise<GenericResult<{ project: ProjectDetail }>> {
  const parsed = getProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ project: ProjectDetail }>('get_project', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, McpGetProjectDocument, {
      id: parsed.data.id,
    });
    const found = result?.project;
    if (!found) {
      return null;
    }

    const project = toProjectDetail(found);
    return {
      structuredContent: { project },
      text: toProjectText('Project', project),
    };
  });
}

// ── create_project ───────────────────────────────────────────────────────────

export const createProjectToolParameters = CreateProjectInputSchema()
  .omit({ nxProjectName: true })
  .strict();

export const createProjectToolDescription = `Create an OpenThrottle project (a cross-repo initiative) with a name and optional description. Names are not unique: call list_projects first so you do not create a duplicate. Returns the project; link repositories with link_project_repository and file plans with add_plan_to_project.`;

export async function createProjectToolHandler(
  args: z.infer<typeof createProjectToolParameters>,
): Promise<GenericResult<{ project: ProjectDetail }>> {
  const parsed = createProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ project: ProjectDetail }>('create_project', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      McpCreateProjectDocument,
      { input: parsed.data },
    );
    const created = result?.createProject;
    if (!created) {
      return null;
    }

    const project = toProjectDetail(created);
    return {
      structuredContent: { project },
      text: toProjectText('Created project', project),
    };
  });
}

// ── update_project ───────────────────────────────────────────────────────────

export const updateProjectToolParameters = UpdateProjectInputSchema()
  .omit({ nxProjectName: true })
  .strict();

export const updateProjectToolDescription = `Rename an OpenThrottle project or change its description, by id. Omitted fields are left unchanged; description null clears it. Errors when the project does not exist or is deleted.`;

export async function updateProjectToolHandler(
  args: z.infer<typeof updateProjectToolParameters>,
): Promise<GenericResult<{ project: ProjectDetail }>> {
  const parsed = updateProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ project: ProjectDetail }>('update_project', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      McpUpdateProjectDocument,
      { input: parsed.data },
    );
    const updated = result?.updateProject;
    if (!updated) {
      return null;
    }

    const project = toProjectDetail(updated);
    return {
      structuredContent: { project },
      text: toProjectText('Updated project', project),
    };
  });
}

// ── delete_project ───────────────────────────────────────────────────────────

type DeleteProjectResult = GenericResult<{
  deleted: boolean;
}>;

export const deleteProjectToolParameters = DeleteProjectInputSchema().strict();

export const deleteProjectToolDescription = `Soft-delete an OpenThrottle project by id. Returns whether a live project was deleted. The row is kept: plans, tasks and repository links keep their project_id and read as no project while the project is deleted.`;

export async function deleteProjectToolHandler(
  args: z.infer<typeof deleteProjectToolParameters>,
): Promise<DeleteProjectResult> {
  const parsed = deleteProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ deleted: boolean }>('delete_project', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, DeleteProjectDocument, {
      input: parsed.data,
    });

    const deleted = result?.deleteProject ?? false;
    const text = deleted
      ? `Deleted project: ${parsed.data.id}`
      : `Project not found or already deleted: ${parsed.data.id}`;

    return { structuredContent: { deleted }, text };
  });
}
