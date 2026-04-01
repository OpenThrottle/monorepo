import * as React from 'react';
import classnames from 'classnames';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { formatPlanTaskStatus } from '../utils/format-status';
import { PlanCardFragment } from '~/__generated__/graphql';

export interface PlanCardProps {
  className?: string;
  plan: PlanCardFragment;
}

export const PlanCard = (props: PlanCardProps) => {
  const { className, plan } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames(
        'line-clamp-2 overflow-hidden rounded-xl',
        className,
      )}
      data-testid="PlanCard"
    >
      {/*
      <CardHeader className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {plan.description}
        </p>
      </CardHeader>
      */}
      <CardContent className="flex flex-col p-4 gap-4">
        <div>
          <Badge
            className="text-xs inline-block px-2 py-1 mb-2"
            variant="outline"
          >
            {formatPlanTaskStatus(plan.status)}
          </Badge>
          <h2 className="text-lg font-bold text-ellipsis whitespace-nowrap overflow-hidden">
            {plan.title}
          </h2>
          {/* <span className="text-sm text-muted-foreground">{plan.id}</span> */}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {plan.description}
        </p>
      </CardContent>
      <CardFooter className="p-2 pt-0" color="transparent">
        <div className="flex-1" />

        <Button
          asChild={true}
          className="cursor-pointer rounded-lg p-2 text-xs"
          variant="outline"
        >
          <Link to={`/plans/${plan.id}`}>View Plan</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
