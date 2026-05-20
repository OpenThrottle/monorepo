import { createProjectGraphAsync } from '@nx/devkit';
import prompts, { Choice } from 'prompts';
import { MESSAGE_ON_CANCEL } from '../config/index';

/** NX project graph node types we treat as "projects" (applications + packages). */
const PROJECT_TAGS = ['type:application', 'type:package'] as const;

/**
 * @description Returns NX project names from the project graph
 * (applications and packages). Use for --project option or validation
 * in workflow and OpenThrottle Server.
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

export const getProjectsByTag = async (tag: string) => {
  const matches = await getProjectsByTags([tag]);

  return matches;
};

export const getProjectsByTags = async (tags: string[]) => {
  const { nodes } = await createProjectGraphAsync();
  const projects = Object.values(nodes);

  const matches = projects.filter((project) => {
    const tagsProject = project.data.tags ?? [];

    let isFullMatch = true;

    tags.forEach((tag) => {
      const isPresent = tagsProject.includes(tag);
      if (!isPresent) isFullMatch = false;
    });

    return isFullMatch;
  });

  return matches;
};

export const getGraphQLApplications = async () => {
  const nestjsProjects = await getProjectsByTags([
    'technology:graphql',
    'technology:nestjs',
    'type:application',
  ]);

  const projects: Choice[] = nestjsProjects.map((project) => ({
    title: project.name,
    value: project.name,
  }));

  const { project } = await prompts({
    choices: projects.sort(sortChoices),
    message: `Select a project`,
    name: 'project',
    type: 'select',
  });

  if (!project) throw new Error(MESSAGE_ON_CANCEL);

  return project;
};

export const getNestJSApplication = async () => {
  const nestjsProjects = await getProjectsByTags([
    'technology:nestjs',
    'type:application',
  ]);

  const projects: Choice[] = nestjsProjects.map((project) => ({
    title: project.name,
    value: project.name,
  }));

  const { project } = await prompts({
    choices: projects.sort(sortChoices),
    message: `Select a project`,
    name: 'project',
    type: 'select',
  });

  if (!project) throw new Error(MESSAGE_ON_CANCEL);

  return project;
};

const sortChoices = (a: Choice, b: Choice) => {
  return a.title.localeCompare(b.title);
};
