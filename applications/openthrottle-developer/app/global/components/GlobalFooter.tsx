import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import {
  ENV_SOURCE,
  FEATURE_BETA_PREVIEW,
} from '@openthrottle/react-router-utils';
import { NotificationStatusBadge } from '@openthrottle/react-router-notifications';
import { ServerHealthObject } from '~/__generated__/graphql';

export interface GlobalFooterProps {
  readonly health?: ServerHealthObject;
}

export const GlobalFooter = (props: GlobalFooterProps) => {
  const { health } = props;

  // Hooks

  // Setup
  const { api: _api, database: _database, redis: _redis } = health ?? {};

  // Handlers

  // Markup
  const renderStatus = (key: keyof ServerHealthObject) => {
    const value = health?.[key];

    let color = 'bg-amber-500'; // Same as un-configured but if we don't know set it to orange

    switch (value) {
      case 'ok':
        color = 'bg-green-500';
        break;
      case 'unconfigured':
        color = 'bg-amber-500';
        break;
      case 'unreachable':
        color = 'bg-red-500';
        break;
    }

    return (
      <div
        className={classnames(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          color,
        )}
      />
    );
  };

  // Life Cycle

  // 🔌 Short Circuit
  if (!FEATURE_BETA_PREVIEW) return null;

  return (
    <footer
      className="border-t border-border bg-card sm:px-6 lg:px-8"
      data-testid="GlobalFooter"
    >
      <div className="border-t border-border p-8 pb-2 text-center text-sm text-muted-foreground">
        <p>Built by engineers. Open source. No lock-in.</p>
      </div>

      <Link
        className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-8"
        target="_blank"
        to={`${ENV_SOURCE.API_URL}/health`}
      >
        <div>{renderStatus('api')} &nbsp;API</div>
        <div className="opacity-50">&bull;</div>
        <div>{renderStatus('database')} &nbsp;Postgres</div>
        <div className="opacity-50">&bull;</div>
        <div>{renderStatus('redis')} &nbsp;Redis</div>
        <div className="opacity-50">&bull;</div>
        <div className="flex items-center gap-1">
          <NotificationStatusBadge /> &nbsp;Sockets
        </div>
      </Link>
    </footer>
  );
};
