/**
 * @description Reads the background-activity registry for the `backgroundActivities` query
 * (OT plan 5767e798). The registry owns storage and the ETA math; this keeps the GraphQL
 * mapping out of it.
 */

import { Injectable } from '@nestjs/common';

import { BackgroundActivityRegistryService } from '../../services/background-activity-registry/background-activity-registry.service.ts';
import type { BackgroundActivityObject } from './background-activities.object.ts';

@Injectable()
export class BackgroundActivitiesService {
  constructor(private readonly registry: BackgroundActivityRegistryService) {}

  async findAll(): Promise<BackgroundActivityObject[]> {
    const snapshots = await this.registry.list();

    return snapshots.map((snapshot) => {
      return {
        done: snapshot.done,
        etaSeconds: snapshot.etaSeconds,
        id: snapshot.id,
        kind: snapshot.kind,
        label: snapshot.label,
        startedAt: snapshot.startedAt,
        status: snapshot.status,
        total: snapshot.total,
      };
    });
  }
}
