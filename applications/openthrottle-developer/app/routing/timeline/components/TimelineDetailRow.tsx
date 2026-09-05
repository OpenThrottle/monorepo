import * as React from 'react';

export interface TimelineDetailRowProps {
  readonly label: string;
  readonly value: React.ReactNode;
}

/** One label/value line in the timeline detail panel. */
export const TimelineDetailRow = (
  props: TimelineDetailRowProps,
): React.ReactElement => {
  const { label, value } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex justify-between gap-4 py-1 text-sm"
      data-testid="TimelineDetailRow"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
};
