import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { FilePlusIcon } from 'lucide-react';

export interface SkillsToolbarProps {
  className?: string;
}

export const SkillsToolbar = (
  props: SkillsToolbarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('flex gap-2', className)} data-testid="SkillsToolbar">
      <div className="flex gap-2">
        <Input placeholder="Filter by slug, path, or summary" />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>

      <div className="flex-1" />

      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label="Toggle sidebar (Cmd/Ctrl+B)"
            type="submit"
            variant="outline"
          >
            <FilePlusIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Create new skill</TooltipContent>
      </Tooltip>
    </div>
  );
};
