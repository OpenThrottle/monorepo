/**
 * @description GraphQL resolver for editor-presence detection.
 *
 * **Why this is a sibling query and not a field on `workspaceSettings`.** Presence is a
 * nicety; the editor preferences it annotates are not. Hanging it off the
 * `workspaceSettings` payload would couple the two failure modes — a probe problem
 * could take down the settings page it is only supposed to decorate, and the reverse.
 * As a separate query the client fetches it in its own document and simply renders no
 * hints when it fails, which is the same reasoning the plan-detail route landed on.
 *
 * Guarded by `SETTINGS_READ`, matching `workspaceSettings` — no new permission.
 */

import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { EditorPresenceResultObject } from './editor-presence.object';
import { EditorPresenceService } from './editor-presence.service';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class EditorPresenceResolver {
  // NOT named `editorPresence`: a constructor property with the query's name shadows
  // the resolver method on the instance, and the field silently wins.
  constructor(private readonly presence: EditorPresenceService) {}

  @Query(() => EditorPresenceResultObject, {
    description: `Probe which editors are installed on the machine hosting the server. Returns a cached snapshot (60s TTL); does not probe per request. **Advisory only** — this never gates enabling an editor. An editor reporting NOT_FOUND can still be enabled and will still get a working toolbar button, and UNKNOWN (a containerized server, an unsupported platform, or a failed probe) means nothing is claimed either way and clients should render no hint.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async editorPresence(): Promise<EditorPresenceResultObject> {
    const result = await this.presence.detect();

    return {
      editors: result.editors.map((editor) => ({
        editor: editor.editor,
        presence: editor.presence,
      })),
      scannedAt: result.scannedAt,
      trusted: result.trusted,
    };
  }
}
