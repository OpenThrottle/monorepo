import * as React from 'react';
import classnames from 'classnames';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';

export interface PlanNotFoundProps {
  readonly className?: string;
}

export const PlanNotFound = (props: PlanNotFoundProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main
      className={classnames(
        'h-full max-w-7xl w-full mx-auto',
        'flex flex-1 items-center justify-center',
        className,
      )}
    >
      <Empty>
        <EmptyMedia variant="icon">
          <PuzzlePieceIcon size={48} />
        </EmptyMedia>
        <EmptyTitle>Plan not found</EmptyTitle>
        <EmptyDescription>
          The plan you are looking for does not exist.
        </EmptyDescription>
      </Empty>
    </main>
  );
};
