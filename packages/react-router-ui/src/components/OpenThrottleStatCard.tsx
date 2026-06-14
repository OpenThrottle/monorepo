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
  readonly color?: string;
  readonly subValue?: number;
  readonly title: string;
  readonly value: number;
}

export const OpenThrottleStatCard = (
  props: OpenThrottleStatCardProps,
): React.ReactElement => {
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
      className={classnames('gap-2 p-4', className)}
      data-testid="OpenThrottleStatCard"
    >
      <CardHeader className="flex items-center gap-2 p-0 pb-2">
        {color ? <div className={`size-2 rounded-full ${color}`} /> : null}
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex gap-1 p-0">
        <p className="text-2xl font-bold">{formattedValue}</p>
        {formattedSubValue ? (
          <>
            <span className="text-muted-foreground text-2xl">/</span>
            <p className="text-muted-foreground text-2xl">
              {formattedSubValue}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
