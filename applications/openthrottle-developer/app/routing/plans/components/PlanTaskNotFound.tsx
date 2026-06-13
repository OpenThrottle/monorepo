import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';
import { PLAN_TASK_NOT_FOUND_COPY } from '~/routing/plans/data/data.copy';

export interface PlanTaskNotFoundProps {}

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
