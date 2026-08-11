import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';

export interface SkillUsageStatTileProps {
  label: string;
  value: React.ReactNode;
}

/**
 * @description One labelled headline stat tile for the per-skill usage detail
 * card. Presentational only — the label and value are supplied by the parent.
 */
export const SkillUsageStatTile = (
  props: SkillUsageStatTileProps,
): React.ReactElement => {
  const { label, value } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="gap-0 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-foreground text-xl font-semibold tabular-nums">
          {value}
        </div>
      </CardContent>
    </Card>
  );
};
