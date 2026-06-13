/**
 * @description Request-scoped DataLoader for WorkspaceSettingsResolver (project by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the project relation across many workspace local repository rows.
 */

import {
  type Project,
  ProjectsService,
} from '@openthrottle/nestjs-repositories';
import { createLoaderFromFindByIds } from '@openthrottle/nestjs-utils';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';
import { In } from 'typeorm';

/**
 * @description Holds a project DataLoader for the current request. Injected into WorkspaceSettingsResolver; resolve the project relation via the loader instead of one findById per local-repository row.
 */
@Injectable({ scope: Scope.REQUEST })
export class WorkspaceSettingsLoaders {
  readonly projectLoader: DataLoader<string, Project | null>;

  constructor(private readonly projectsService: ProjectsService) {
    this.projectLoader = createLoaderFromFindByIds<string, Project>(
      async (ids) => {
        if (ids.length === 0) return [];

        const list = await this.projectsService
          .getRepository()
          .find({ where: { id: In(ids) } });

        return list;
      },
    );
  }
}
