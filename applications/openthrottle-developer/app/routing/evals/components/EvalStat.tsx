import {
  Card,
  CardContent,
  CardDescription,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface EvalStatProps {
  readonly className?: string;
  /** A line under the value, for example the interval. */
  readonly detail: string;
  /** What the number means, as the tile's tooltip text. */
  readonly hint: string;
  readonly label: string;
  readonly value: string;
}

/**
 * @description One headline number: a label, the value large, a detail line.
 * The hint is the native tooltip so the tile stays quiet.
 */
export const EvalStat = (props: EvalStatProps): React.ReactElement => {
  const { className, detail, hint, label, value } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={cn('gap-1 py-4', className)} data-testid="EvalStat">
      <CardContent className="flex flex-col gap-1 px-4">
        <CardDescription title={hint}>{label}</CardDescription>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground min-h-4 text-xs">{detail}</p>
      </CardContent>
    </Card>
  );
};
