import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, PencilIcon, PlusCircle } from 'lucide-react';
import { Link } from 'react-router';

export interface PlanToolbarActionsMenuProps {
  readonly planId: string;
}

/**
 * @description The {@link PlanToolbar} Actions dropdown (Add Task / Edit Plan),
 * scoped to the plan. Extracted from the toolbar per component-primitive-shape
 * R6.
 */
export const PlanToolbarActionsMenu = (
  props: PlanToolbarActionsMenuProps,
): React.ReactElement => {
  const { planId } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DropdownMenu>
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <DropdownMenuTrigger asChild={true}>
            <Button id="plan-actions-trigger" size="xs" variant="ghost">
              Actions
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Add task or edit plan</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild={true}>
          <Link
            className="flex items-center gap-2"
            to={`/plans/${planId}/tasks/create`}
          >
            <PlusCircle size={14} />
            Add Task
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild={true}>
          <Link
            className="flex items-center gap-2"
            to={`/plans/${planId}/edit`}
          >
            <PencilIcon size={14} />
            Edit Plan
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
