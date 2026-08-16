import * as React from 'react';
import { Form, useNavigation } from 'react-router';
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
import { GitBranchPlusIcon } from 'lucide-react';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

export interface CloneRepoDialogProps {
  actionError?: string | null;
}

/**
 * @description "Clone repo" sibling to the add-folder gesture: submits a git URL
 * (+ optional folder name) to the cloneRepository mutation, which clones into the
 * server's managed checkout root and registers it via the same pipeline. The
 * result renders in the shared AddFolderResult panel.
 */
export const CloneRepoDialog = (
  props: CloneRepoDialogProps,
): React.ReactElement => {
  const { actionError } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const navigation = useNavigation();

  // Setup
  const isCloning =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'cloneRepo';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild={true}>
        <Button data-testid="CloneRepoDialogTrigger" variant="outline">
          <GitBranchPlusIcon aria-hidden={true} className="size-4" />
          {WORKSPACE_FOLDERS_COPY.cloneRepoButton}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" data-testid="CloneRepoDialog">
        <DialogHeader>
          <DialogTitle className="mb-4">
            {WORKSPACE_FOLDERS_COPY.cloneRepoTitle}
          </DialogTitle>
          <DialogDescription>
            {WORKSPACE_FOLDERS_COPY.cloneRepoDescription}
          </DialogDescription>
        </DialogHeader>

        <Form className="space-y-4" method="post">
          <input name="intent" type="hidden" value="cloneRepo" />
          <div className="space-y-1">
            <Label htmlFor="clone-repo-git-url">
              {WORKSPACE_FOLDERS_COPY.cloneRepoUrlLabel}
            </Label>
            <Input
              autoComplete="off"
              id="clone-repo-git-url"
              name="gitUrl"
              placeholder="git@github.com:owner/repo.git"
              required={true}
              spellCheck={false}
              type="text"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="clone-repo-name">
              {WORKSPACE_FOLDERS_COPY.cloneRepoNameLabel}
            </Label>
            <Input id="clone-repo-name" name="name" type="text" />
          </div>
          <Button disabled={isCloning} type="submit">
            {isCloning ? 'Cloning…' : WORKSPACE_FOLDERS_COPY.cloneRepoButton}
          </Button>
        </Form>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
