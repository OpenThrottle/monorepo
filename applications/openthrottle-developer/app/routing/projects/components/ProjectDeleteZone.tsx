import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  cn,
} from '@openthrottle/react-router-shadcn';
import { Trash2Icon } from 'lucide-react';
import * as React from 'react';
import { useNavigation, useSubmit } from 'react-router';

import { PROJECT_DELETE_COPY } from '~/routing/projects/data/copy';

export interface ProjectDeleteZoneProps {
  readonly className?: string;
  readonly projectName: string;
}

/**
 * @description Danger zone on the project edit route: a delete button behind a
 * confirmation. Confirming posts `intent=deleteProject` to the route action,
 * which redirects to the projects list. The delete is soft and plans survive
 * unassigned, which the confirmation says plainly.
 */
export const ProjectDeleteZone = (
  props: ProjectDeleteZoneProps,
): React.ReactElement => {
  const { className, projectName } = props;

  // Hooks
  const submit = useSubmit();
  const navigation = useNavigation();
  const [open, setOpen] = React.useState(false);

  // Setup
  const isDeleting = navigation.formData?.get('intent') === 'deleteProject';

  // Handlers
  const handleConfirm = (): void => {
    void submit({ intent: 'deleteProject' }, { method: 'post' });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn('border-destructive/40 w-full', className)}
      data-testid="ProjectDeleteZone"
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium">
            {PROJECT_DELETE_COPY.heading}
          </h2>
          <p className="text-muted-foreground text-sm">
            {PROJECT_DELETE_COPY.description}
          </p>
        </div>
        <Button
          className="text-destructive hover:text-destructive gap-2"
          disabled={isDeleting}
          onClick={() => setOpen(true)}
          type="button"
          variant="outline"
        >
          <Trash2Icon aria-hidden={true} className="size-4" />
          {PROJECT_DELETE_COPY.trigger}
        </Button>
      </CardContent>

      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`${PROJECT_DELETE_COPY.confirmTitlePrefix} ${projectName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {PROJECT_DELETE_COPY.confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{PROJECT_DELETE_COPY.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleConfirm}
            >
              {PROJECT_DELETE_COPY.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
