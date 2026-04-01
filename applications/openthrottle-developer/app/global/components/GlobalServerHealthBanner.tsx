import * as React from 'react';
import classnames from 'classnames';
import { X } from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import type { ServerHealthObject } from '~/__generated__/graphql';

export interface GlobalServerHealthBannerProps {
  readonly health?: ServerHealthObject;
}

/**
 * @description Top bar shown when Cortex (AI MCP data source) is unreachable or unconfigured.
 * Uses serverHealth.database as proxy for MCP data availability. Dismissible for the session.
 */
export const GlobalServerHealthBanner = (
  props: GlobalServerHealthBannerProps,
) => {
  const { health } = props;

  // Hooks
  const [dismissed, setDismissed] = React.useState(false);

  // Setup
  const databaseStatus = health?.database;
  const isUnreachable = databaseStatus === 'unreachable';
  const isUnhealthy = databaseStatus !== undefined && databaseStatus !== 'ok';

  // Handlers
  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
  }, []);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!isUnhealthy || dismissed) return null;

  return (
    <div
      className={classnames(
        'flex w-full items-center justify-center gap-2 px-4 py-2 text-sm text-center',
        isUnreachable
          ? 'bg-destructive/90 text-destructive-foreground'
          : 'bg-amber-500/90 text-amber-950',
      )}
      data-testid="GlobalServerHealthBanner"
      role="alert"
    >
      <span className="flex-1">
        Cortex (AI MCP data) is unreachable. Plans and tasks may be unavailable.
      </span>
      <Button
        aria-label="Dismiss banner"
        className={classnames(
          'shrink-0 size-8 p-0',
          isUnreachable
            ? 'text-destructive-foreground hover:bg-destructive-foreground/20'
            : 'text-amber-950 hover:bg-amber-950/20',
        )}
        onClick={handleDismiss}
        type="button"
        variant="ghost"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};
