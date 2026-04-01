import { createProjectGraphAsync } from '@nx/devkit';

/** NX project graph node types we treat as "projects" (applications + packages). */
const PROJECT_TAGS = ['type:application', 'type:package'] as const;

/**
 * @description Returns NX project names from the project graph (applications and packages). Use for --project option or validation in workflow and Cortex API.
 */
export const getNxProjectNames = async (): Promise<string[]> => {
  const { nodes } = await createProjectGraphAsync();
  const projects = Object.values(nodes);
  const names = projects
    .filter((project) => {
      const tags = project.data?.tags ?? [];
      return PROJECT_TAGS.some((tag) => tags.includes(tag));
    })
    .map((project) => project.name);

  return names.sort((a, b) => a.localeCompare(b));
};
