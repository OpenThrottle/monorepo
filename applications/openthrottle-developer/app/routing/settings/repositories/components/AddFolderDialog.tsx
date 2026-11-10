import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { FolderPlusIcon } from 'lucide-react';
import * as React from 'react';
import { Form } from 'react-router';

import type {
  DiscoveredFolderObject,
  WorkspacePickerCapabilitiesObject,
} from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { AddFolderCandidate } from '~/routing/settings/repositories/components/AddFolderCandidate';
import { DirectoryPicker } from '~/routing/settings/repositories/components/DirectoryPicker';
import { NativeBrowse } from '~/routing/settings/repositories/components/NativeBrowse';
import { useAddFolderDialog } from '~/routing/settings/repositories/hooks/useAddFolderDialog';

export interface AddFolderDialogProps {
  actionError?: string | null;
  discoveredFolders: readonly Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
  /** The workspace-root scan is still streaming in, so an empty list means "not yet", not "none". */
  isDiscoveringFolders: boolean;
  pickerCapabilities: Pick<
    WorkspacePickerCapabilitiesObject,
    'canUseNativeDialog' | 'defaultBrowsePath' | 'roots'
  >;
}

export const AddFolderDialog = (
  props: AddFolderDialogProps,
): React.ReactElement => {
  const {
    actionError,
    discoveredFolders,
    isDiscoveringFolders,
    pickerCapabilities,
  } = props;

  // Hooks
  const picker = useAddFolderDialog({
    actionError,
    canUseNativeDialog: pickerCapabilities.canUseNativeDialog,
    defaultBrowsePath: pickerCapabilities.defaultBrowsePath,
    roots: pickerCapabilities.roots,
  });

  // Setup
  const hasDiscoveredFolders = discoveredFolders.length > 0;
  const showDiscovering = isDiscoveringFolders && !hasDiscoveredFolders;
  const { addFolderButton, pickerLoading } = WORKSPACE_FOLDERS_COPY;
  const submitLabel = picker.isAdding ? pickerLoading : addFolderButton;

  // Handlers

  // Markup
  const nativeBrowse = (
    <NativeBrowse
      isAdding={picker.isAdding}
      isPicking={picker.isPicking}
      onClearPicked={picker.handleClearPickedPath}
      onPickNative={picker.handlePickNative}
      pickError={picker.pickError}
      pickedPath={picker.pickedPath}
    />
  );
  const inAppBrowse = (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">
          {WORKSPACE_FOLDERS_COPY.browseTitle}
        </p>
        <p className="text-muted-foreground text-xs">
          {WORKSPACE_FOLDERS_COPY.browseInAppHint}
        </p>
      </div>
      <DirectoryPicker
        breadcrumbs={picker.breadcrumbs}
        browseError={picker.browseError}
        currentIsGitRepo={picker.currentIsGitRepo}
        currentPath={picker.currentPath}
        entries={picker.entries}
        isAdding={picker.isAdding}
        isBrowsing={picker.isBrowsing}
        onAddCurrent={picker.handleAddCurrent}
        onBrowseRoots={() => picker.handleBrowse('')}
        onNavigateTo={picker.handleNavigateTo}
        onOpen={picker.handleOpen}
        onUp={picker.handleUp}
        parentPath={picker.parentPath}
      />
    </div>
  );
  const discoveringNotice = (
    <p
      aria-busy={true}
      className="text-muted-foreground border-t pt-4 text-xs"
      role="status"
    >
      {WORKSPACE_FOLDERS_COPY.discoveringFolders}
    </p>
  );
  const discoveredList = (
    <div className="space-y-2 border-t pt-4">
      <ul className="space-y-2">
        {discoveredFolders.map((candidate) => (
          <AddFolderCandidate
            candidate={candidate}
            isAdding={picker.isAdding}
            key={candidate.path}
          />
        ))}
      </ul>
    </div>
  );
  const manualPathForm = (
    <Form className="space-y-2" method="post">
      <input name="intent" type="hidden" value="addFolder" />
      <p className="text-muted-foreground text-xs">
        {WORKSPACE_FOLDERS_COPY.advancedPathHint}
      </p>
      <div className="space-y-1">
        <Label htmlFor="manual-folder-path">
          {WORKSPACE_FOLDERS_COPY.manualPathLabel}
        </Label>
        <Input
          id="manual-folder-path"
          name="path"
          placeholder="/Users/you/Development/my-repo"
          required={true}
          type="text"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="manual-folder-display-name">
          {WORKSPACE_FOLDERS_COPY.manualDisplayNameLabel}
        </Label>
        <Input id="manual-folder-display-name" name="displayName" type="text" />
      </div>
      <Button disabled={picker.isAdding} type="submit" variant="outline">
        {submitLabel}
      </Button>
    </Form>
  );
  const errorAlert = (
    <p className="text-destructive text-sm" role="alert">
      {actionError}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={picker.setOpen} open={picker.open}>
      <DialogTrigger asChild={true}>
        <Button data-testid="AddFolderDialogTrigger" variant="outline">
          <FolderPlusIcon aria-hidden={true} className="size-4" />
          {WORKSPACE_FOLDERS_COPY.addFolderButton}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        data-testid="AddFolderDialog"
      >
        <DialogHeader>
          <DialogTitle>{WORKSPACE_FOLDERS_COPY.addFolderTitle}</DialogTitle>
          <DialogDescription>
            {WORKSPACE_FOLDERS_COPY.addFolderDescription}
          </DialogDescription>
        </DialogHeader>

        {picker.canUseNativeDialog ? nativeBrowse : inAppBrowse}

        {hasDiscoveredFolders ? discoveredList : null}
        {showDiscovering ? discoveringNotice : null}

        <div className="space-y-2 border-t pt-4">
          <button
            className="text-muted-foreground text-sm hover:underline"
            onClick={picker.handleToggleManualPath}
            type="button"
          >
            {WORKSPACE_FOLDERS_COPY.advancedPathToggle}
          </button>
          {picker.showManualPath ? manualPathForm : null}
        </div>

        {actionError ? errorAlert : null}
      </DialogContent>
    </Dialog>
  );
};
