import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';

export interface OpenThrottleModalProps {
  readonly children?: React.ReactNode;
  readonly param: string;
  /**
   * Accessible name for the dialog. Rendered into a visually-hidden
   * `DialogTitle` so screen readers announce the dialog while keeping the
   * default UI chrome unchanged.
   */
  readonly title?: string;
  readonly value: string;
}

export const OpenThrottleModal = (
  props: OpenThrottleModalProps,
): React.ReactElement => {
  const { children, param, title = 'Dialog', value } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const isOpen = searchParams.get(param) === value;

  // Handlers
  const onOpenChange = (open: boolean) => {
    const newParams = new URLSearchParams(searchParams);

    if (open) newParams.set(param, value);
    else newParams.delete(param);

    setSearchParams(newParams);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog
      data-testid="OpenThrottleModal"
      onOpenChange={onOpenChange}
      open={isOpen}
    >
      <DialogContent>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
};
