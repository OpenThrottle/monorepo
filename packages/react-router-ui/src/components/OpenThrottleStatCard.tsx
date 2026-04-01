import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';

export interface OpenThrottleStatCardProps {
  readonly className?: string;
  readonly subValue?: number;
  readonly title: string;
  readonly value: number;
}

export const OpenThrottleStatCard = (props: OpenThrottleStatCardProps) => {
  const { className, subValue, title, value } = props;

  // Hooks

  // Setup
  const formattedValue = value.toLocaleString();
  const formattedSubValue = subValue?.toLocaleString();
  const formattedString =
    subValue !== undefined
      ? `${formattedValue} / ${formattedSubValue}`
      : formattedValue;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('p-4', className)}
      data-testid="OpenThrottleStatCard"
    >
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-2xl font-bold">{formattedString}</p>
      </CardContent>
    </Card>
  );
};
