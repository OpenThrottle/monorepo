import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import { NotificationStatusBadge } from '@openthrottle/react-router-notifications';
// import { ServerHealthObject } from '~/__generated__/graphql';

export interface GlobalFooterProps {
  readonly health?: any;
  // readonly health?: ServerHealthObject;
}

export const GlobalFooter = (props: GlobalFooterProps): React.ReactElement => {
  const { health } = props;

  // Hooks

  // Setup
  const { api: _api, database: _database, redis: _redis } = health ?? {};

  // Handlers

  // Markup
  // const renderStatus = (key: keyof ServerHealthObject) => {
  const renderStatus = (key: any) => {
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

  return (
    <footer
      className="border-border bg-card border-t sm:px-6 lg:px-8"
      data-testid="GlobalFooter"
    >
      <div className="border-border text-muted-foreground border-t p-8 pb-2 text-center text-sm">
        <p>
          Built by engineers &bull; Open source &bull; Run locally &bull; No
          Commitment
        </p>
      </div>

      <Link
        className="text-muted-foreground mb-8 flex items-center justify-center gap-2 text-sm"
        target="_blank"
        to={`${ENV_SOURCE.API_URL_EXTERNAL}/health`}
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
