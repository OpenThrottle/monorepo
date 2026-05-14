import * as React from 'react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { ColumnsIcon, TableIcon } from 'lucide-react';

export interface PlanToggleLayoutProps {
  // readonly className?: string;
  readonly onValueChange: (value: string) => void;
  readonly value: string;
}

export const PlanToggleLayout = (props: PlanToggleLayoutProps) => {
  const { onValueChange, value } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold">Tasks</h2>
      <ToggleGroup
        aria-label="Choose how to display plan tasks"
        className="shrink-0"
        onValueChange={onValueChange}
        size="sm"
        type="single"
        value={value}
        variant="outline"
      >
        <ToggleGroupItem
          aria-label="Table view"
          className="gap-1.5 px-2.5"
          value="table"
        >
          <TableIcon aria-hidden={true} className="size-4" />
          Table
        </ToggleGroupItem>
        <ToggleGroupItem
          aria-label="Board view"
          className="gap-1.5 px-2.5"
          value="board"
        >
          <ColumnsIcon aria-hidden={true} className="size-4" />
          Board
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
