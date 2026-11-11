import { Button, cn } from '@openthrottle/react-router-shadcn';
import { DotsSixVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsSixVertical';
import * as React from 'react';

import { REORDER_HANDLE_COPY } from '../data/data.copy';

/**
 * @public
 */
export interface ReorderHandleProps {
  readonly className: string | undefined;
  /** The drag-source ref from `useReorderItem`. */
  readonly handleRef: React.RefCallback<HTMLElement>;
}

/**
 * @description The grab point of a {@link ReorderItem} — the only part of the row that starts a drag.
 * @public
 */
export const ReorderHandle = (
  props: ReorderHandleProps,
): React.ReactElement => {
  const { className, handleRef } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      aria-label={REORDER_HANDLE_COPY.label}
      className={cn('cursor-grab active:cursor-grabbing', className)}
      ref={handleRef}
      size="icon"
      title={REORDER_HANDLE_COPY.label}
      type="button"
      variant="ghost"
    >
      <DotsSixVerticalIcon size={20} />
    </Button>
  );
};
