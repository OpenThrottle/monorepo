import * as React from 'react';
import classnames from 'classnames';
import { Card, CardContent } from '@openthrottle/react-router-shadcn';
import { PuzzlePieceIcon } from '@phosphor-icons/react/dist/ssr/PuzzlePiece';

export interface DashboardStatCardProps {
  className?: string;
  description: string;
  heading: string;
}

export const DashboardStatCard = (props: DashboardStatCardProps) => {
  const { className, description, heading } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('p-8 rounded-xl', className)}
      data-testid="DashboardStatCard"
    >
      <div className="flex items-center gap-2">
        <PuzzlePieceIcon weight="fill" />
        <h2 className="text-xl font-bold heading-2">{heading}</h2>
      </div>
      <CardContent className="mt-4">
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};
