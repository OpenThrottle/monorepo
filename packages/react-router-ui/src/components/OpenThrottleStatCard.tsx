import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface OpenThrottleStatCardProps {
  readonly className?: string;
  readonly color?: string;
  /** A short muted line under the value, e.g. why a status reads the way it does. */
  readonly detail?: string;
  readonly subValue?: number;
  readonly title: string;
  /** A number is locale-formatted; a string (a mode or status label) renders as is. */
  readonly value: number | string;
}

export const OpenThrottleStatCard = (
  props: OpenThrottleStatCardProps,
): React.ReactElement => {
  const {
    className = 'p-4 md:p-8',
    color,
    detail,
    subValue,
    title,
    value,
  } = props;

  // Hooks

  // Setup
  const formattedValue =
    typeof value === 'number' ? value.toLocaleString() : value;
  const formattedSubValue = subValue?.toLocaleString();
  // const formattedString =
  //   subValue !== undefined
  //     ? `${formattedValue} / ${formattedSubValue}`
  //     : formattedValue;

  // Handlers

  // Markup
  const detailLine = (
    <p
      className="text-muted-foreground text-xs"
      data-testid="OpenThrottleStatCard-detail"
    >
      {detail}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn('gap-2 p-2 md:p-4', className)}
      data-testid="OpenThrottleStatCard"
    >
      <CardHeader className="flex items-center gap-2 p-0 pb-2">
        {color ? <div className={cn('size-2 rounded-full', color)} /> : null}
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex gap-1 p-0">
        <p className="text-2xl font-bold">{formattedValue}</p>
        {formattedSubValue && (
          <>
            <span className="text-muted-foreground text-2xl">/</span>
            <p className="text-muted-foreground text-2xl">
              {formattedSubValue}
            </p>
          </>
        )}
      </CardContent>
      {detail ? detailLine : null}
    </Card>
  );
};
