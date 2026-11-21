/**
 * @description Request-scoped DataLoader for WorkspaceSettingsResolver (project by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the project relation across many workspace local repository rows.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createEntityByIdLoader } from '@openthrottle/nestjs-postgres';
import type { Project } from '@openthrottle/nestjs-repositories-server';
import {
  ProjectRepositoriesRepository,
  ProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import DataLoader from 'dataloader';

/**
 * @description Holds a project DataLoader for the current request. Injected into WorkspaceSettingsResolver; resolve the project relation via the loader instead of one findById per local-repository row.
 */
@Injectable({ scope: Scope.REQUEST })
export class WorkspaceSettingsLoaders {
  readonly projectLoader: DataLoader<string, Project | null>;
  /** Live projects linked to each repository through project_repositories, oldest link first. */
  readonly projectsByRepositoryIdLoader: DataLoader<string, Project[]>;

  constructor(
    projectRepositoriesRepository: ProjectRepositoriesRepository,
    projectsRepository: ProjectsRepository,
  ) {
    this.projectLoader = createEntityByIdLoader(projectsRepository);
    this.projectsByRepositoryIdLoader = new DataLoader<string, Project[]>(
      async (repositoryIds) => {
        const grouped =
          await projectRepositoriesRepository.listProjectsByRepositoryIds(
            repositoryIds,
          );
        return repositoryIds.map((repositoryId) => {
          return grouped.get(repositoryId) ?? [];
        });
      },
    );
  }
}
