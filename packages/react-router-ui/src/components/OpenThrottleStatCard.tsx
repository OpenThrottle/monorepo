import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';

export interface OpenThrottleStatCardProps {
  readonly color?: string;
  readonly className?: string;
  readonly subValue?: number;
  readonly title: string;
  readonly value: number;
}

export const OpenThrottleStatCard = (props: OpenThrottleStatCardProps) => {
  const { className = 'p-4 md:p-8', color, subValue, title, value } = props;

  // Hooks

  // Setup
  const formattedValue = value.toLocaleString();
  const formattedSubValue = subValue?.toLocaleString();
  // const formattedString =
  //   subValue !== undefined
  //     ? `${formattedValue} / ${formattedSubValue}`
  //     : formattedValue;

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
        <div className="flex gap-2 items-center">
          {color ? <div className={`size-2 rounded-full ${color}`} /> : null}
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex gap-1">
        <p className="text-2xl font-bold">{formattedValue}</p>
        {formattedSubValue ? (
          <>
            <span className="text-2xl text-muted-foreground">/</span>
            <p className="text-2xl text-muted-foreground">
              {formattedSubValue}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
