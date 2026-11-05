import { Sheet, SheetContent } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type {
  TimelineMarkerCluster,
  TimelineSpan,
} from '~/routing/timeline/types';

import { TimelineClusterDetail } from './TimelineClusterDetail';
import { TimelineSpanDetail } from './TimelineSpanDetail';

export interface TimelineDetailPopoverProps {
  readonly cluster: TimelineMarkerCluster | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly span: TimelineSpan | null;
}

export const TimelineDetailPopover = (
  props: TimelineDetailPopoverProps,
): React.ReactElement => {
  const { cluster, onOpenChange, span } = props;

  // Hooks

  // Setup
  const isOpen = span != null || cluster != null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent data-testid="TimelineDetailPopover" side="right">
        {span != null && <TimelineSpanDetail span={span} />}

        {cluster != null && <TimelineClusterDetail cluster={cluster} />}
      </SheetContent>
    </Sheet>
  );
};
