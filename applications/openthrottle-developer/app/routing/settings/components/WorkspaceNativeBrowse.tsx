import * as React from 'react';
import { Form } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { FolderSearchIcon } from 'lucide-react';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

export interface WorkspaceNativeBrowseProps {
  isAdding: boolean;
  isPicking: boolean;
  onClearPicked: () => void;
  onPickNative: () => void;
  pickError: string | null;
  pickedPath: string | null;
}

/**
 * @description Native OS folder-dialog affordance: a prominent Browse… button
 * that opens the server-host chooser, then a confirm step wiring the returned
 * path into the existing addFolder action. User-cancel is silent (no picked
 * path, no error). Only rendered when the native dialog is available.
 */
export const WorkspaceNativeBrowse = (
  props: WorkspaceNativeBrowseProps,
): React.ReactElement => {
  const {
    isAdding,
    isPicking,
    onClearPicked,
    onPickNative,
    pickError,
    pickedPath,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-2" data-testid="WorkspaceNativeBrowse">
      <Button disabled={isPicking} onClick={onPickNative} type="button">
        <FolderSearchIcon aria-hidden={true} className="size-4" />
        {isPicking
          ? WORKSPACE_FOLDERS_COPY.pickerLoading
          : WORKSPACE_FOLDERS_COPY.browseButton}
      </Button>
      <p className="text-muted-foreground text-xs">
        {WORKSPACE_FOLDERS_COPY.browseNativeHint}
      </p>

      {pickError ? (
        <p className="text-destructive text-sm" role="alert">
          {pickError}
        </p>
      ) : null}

      {pickedPath ? (
        <div className="flex items-center justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {WORKSPACE_FOLDERS_COPY.nativePickedPrefix}
            </p>
            <p className="truncate font-mono text-sm">{pickedPath}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={onClearPicked}
              size="sm"
              type="button"
              variant="ghost"
            >
              {WORKSPACE_FOLDERS_COPY.nativePickAgain}
            </Button>
            <Form method="post">
              <input name="intent" type="hidden" value="addFolder" />
              <input name="path" type="hidden" value={pickedPath} />
              <Button disabled={isAdding} size="sm" type="submit">
                {WORKSPACE_FOLDERS_COPY.addFolderButton}
              </Button>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
