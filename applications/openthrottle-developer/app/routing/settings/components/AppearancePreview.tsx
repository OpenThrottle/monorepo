import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { APPEARANCE_PREVIEW_CHART_CLASSES } from '~/routing/settings/data/data.appearance';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearancePreviewProps {}

/**
 * @description Live sample of what the current appearance selections produce.
 * Every color comes from the applied CSS tokens via ordinary Tailwind classes,
 * so the preview tracks theme mode, palette, and brand changes without reading
 * or recomputing anything itself. This shows the effect that the removed
 * CSS-token list only named.
 */
export const AppearancePreview = (
  _props: AppearancePreviewProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="AppearancePreview">
      <CardHeader>
        <CardTitle>{APPEARANCE_COPY.previewTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">{APPEARANCE_COPY.previewPrimaryButton}</Button>
          <Button size="sm" variant="outline">
            {APPEARANCE_COPY.previewOutlineButton}
          </Button>
          <Button size="sm" variant="destructive">
            {APPEARANCE_COPY.previewDestructiveButton}
          </Button>
          <Badge>{APPEARANCE_COPY.previewBadge}</Badge>
        </div>

        <div className="space-y-1">
          <p className="text-sm">{APPEARANCE_COPY.previewBody}</p>
          <p className="text-muted-foreground text-sm">
            {APPEARANCE_COPY.previewMuted}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">
            {APPEARANCE_COPY.previewChartsLabel}
          </p>
          <div className="flex gap-1.5" data-testid="AppearancePreviewCharts">
            {APPEARANCE_PREVIEW_CHART_CLASSES.map((chartClass) => (
              <span
                aria-hidden={true}
                className={`h-6 flex-1 rounded ${chartClass}`}
                key={chartClass}
              />
            ))}
          </div>
        </div>

        <div className="bg-sidebar-background flex items-center gap-3 rounded-md border p-3">
          <span
            aria-hidden={true}
            className="bg-sidebar-primary h-8 w-1.5 rounded-full"
          />
          <span className="text-sidebar-foreground text-sm">
            {APPEARANCE_COPY.previewSidebarLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
