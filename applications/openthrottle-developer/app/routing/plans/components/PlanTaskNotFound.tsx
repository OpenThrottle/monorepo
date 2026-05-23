import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';

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
      <EmptyTitle>Task not found</EmptyTitle>
      <EmptyDescription>
        The task you are looking for does not exist.
      </EmptyDescription>
    </Empty>
  );
};
