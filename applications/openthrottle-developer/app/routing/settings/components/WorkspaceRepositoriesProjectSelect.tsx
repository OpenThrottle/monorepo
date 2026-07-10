import * as React from 'react';
import type { GetWorkspaceSettingsQuery } from '~/__generated__/graphql';

export type ProjectOption = GetWorkspaceSettingsQuery['projects'][number];

const NONE_PROJECT_VALUE = '__none__';

export interface WorkspaceRepositoriesProjectSelectProps {
  currentProjectId: string | null;
  name: string;
  projects: ProjectOption[];
}

export const WorkspaceRepositoriesProjectSelect = (
  props: WorkspaceRepositoriesProjectSelectProps,
): React.ReactElement => {
  const { currentProjectId, name, projects } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <select
      className="border-input bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
      defaultValue={currentProjectId ?? NONE_PROJECT_VALUE}
      name={name}
    >
      <option value={NONE_PROJECT_VALUE}>No project</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
};
