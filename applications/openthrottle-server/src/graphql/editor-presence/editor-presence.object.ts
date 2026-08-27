/**
 * @description GraphQL ObjectTypes for editor-presence detection: one probed editor and
 * a ListResult-style envelope. Backs the `editorPresence` query, which is deliberately a
 * sibling of `workspaceSettings` rather than a field on it — see the resolver.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { WorkspaceEditorIdEnum } from '../workspace-settings/workspace-editor-id.enum';
import { EditorPresenceStateEnum } from './editor-presence-state.enum';

@ObjectType()
export class EditorPresenceObject {
  @Field(() => WorkspaceEditorIdEnum, {
    description: `The editor this presence result describes.`,
  })
  editor!: WorkspaceEditorIdEnum;

  @Field(() => EditorPresenceStateEnum, {
    description: `Probed presence. Advisory only: a NOT_FOUND editor can still be enabled and will still get a toolbar button, and UNKNOWN must render no hint at all.`,
  })
  presence!: EditorPresenceStateEnum;
}

@ObjectType()
export class EditorPresenceResultObject {
  @Field(() => [EditorPresenceObject], {
    description: `Every editor OpenThrottle can configure, with its probed presence. Always covers the full editor vocabulary — editors are never omitted, they report UNKNOWN.`,
  })
  editors!: EditorPresenceObject[];

  @Field(() => String, {
    description: `ISO-8601 timestamp of when this snapshot was scanned. Cached, so it may lag the current moment by up to the soft TTL.`,
  })
  scannedAt!: string;

  @Field(() => Boolean, {
    description: `True when the probe ran against the user's own machine. False means every entry is UNKNOWN — typically a containerized server, which can only see its own filesystem and so must not claim anything about the user's editors. Clients can use this to suppress hinting wholesale.`,
  })
  trusted!: boolean;
}
