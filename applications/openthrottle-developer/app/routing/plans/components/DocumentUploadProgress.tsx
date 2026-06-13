import * as React from 'react';
import classnames from 'classnames';
import { Progress, Spinner } from '@openthrottle/react-router-shadcn';

type DocumentUploadProgressState =
  | { readonly kind: 'busy'; readonly message: string; readonly value: number }
  | { readonly kind: 'idle' };

interface DocumentUploadProgressProps {
  readonly className?: string;
  readonly state: DocumentUploadProgressState;
}

/**
 * @description Upload / server round-trip indicator (indeterminate progress + label).
 */
export const DocumentUploadProgress = (
  props: DocumentUploadProgressProps,
): React.ReactElement | null => {
  const { className, state } = props;

  if (state.kind === 'idle') {
    return null;
  }

  return (
    <div
      aria-busy={true}
      aria-live="polite"
      className={classnames(
        'border-border bg-muted/40 flex flex-col gap-2 rounded-md border p-3',
        className,
      )}
      data-testid="DocumentUploadProgress"
      role="status"
    >
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner aria-hidden={true} className="size-4 shrink-0" />
        <span>{state.message}</span>
      </div>
      <Progress className="h-1.5" value={state.value} />
    </div>
  );
};
