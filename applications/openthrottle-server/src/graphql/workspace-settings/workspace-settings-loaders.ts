/**
 * @description Request-scoped DataLoader for WorkspaceSettingsResolver (project by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the project relation across many workspace local repository rows.
 */

import {
  type Project,
  ProjectsService,
  createEntityByIdLoader,
} from '@openthrottle/nestjs-repositories';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';

/**
 * @description Holds a project DataLoader for the current request. Injected into WorkspaceSettingsResolver; resolve the project relation via the loader instead of one findById per local-repository row.
 */
@Injectable({ scope: Scope.REQUEST })
export class WorkspaceSettingsLoaders {
  readonly projectLoader: DataLoader<string, Project | null>;

  constructor(projectsService: ProjectsService) {
    this.projectLoader = createEntityByIdLoader(projectsService);
  }
}
