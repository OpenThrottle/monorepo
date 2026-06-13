import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';

export interface PlanTaskNotFoundProps {}

/**
 * User-facing copy for this not-found state, single-sourced so a wording change
 * updates the rendered string and its spec in one place (specs import this
 * instead of duplicating the literal).
 *
 * @publicApi
 */
export const PLAN_TASK_NOT_FOUND_COPY = {
  description: 'The task you are looking for does not exist.',
  title: 'Task not found',
} as const;

export const PlanTaskNotFound = (
  _props: PlanTaskNotFoundProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty>
      <EmptyMedia variant="icon">
        <PuzzlePieceIcon size={48} />
      </EmptyMedia>
      <EmptyTitle>{PLAN_TASK_NOT_FOUND_COPY.title}</EmptyTitle>
      <EmptyDescription>
        {PLAN_TASK_NOT_FOUND_COPY.description}
      </EmptyDescription>
    </Empty>
  );
};
