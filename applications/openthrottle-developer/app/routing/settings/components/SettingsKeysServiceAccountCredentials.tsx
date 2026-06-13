import * as React from 'react';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { LockKeyholeIcon } from 'lucide-react';

export interface SettingsKeysServiceAccountCredentialsProps {
  className?: string;
}

export const SettingsKeysServiceAccountCredentials = (
  _props: SettingsKeysServiceAccountCredentialsProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={LockKeyholeIcon}
      id="service-account-credentials"
      legend="Service account credentials"
    >
      <div className="text-muted-foreground space-y-4 text-sm">
        <p>
          Long-lived bearer tokens for automation (MCP, Ralph workers, CI). Each
          credential uses the{' '}
          <code className="text-xs">ot_sa_&lt;prefix&gt;_&lt;secret&gt;</code>{' '}
          format in the <code className="text-xs">Authorization</code> header.
        </p>
        <p>
          <span className="text-foreground font-medium">One-time secret:</span>{' '}
          when you create a credential, the full token is shown once. Copy it
          immediately into{' '}
          <code className="text-xs">OPENTHROTTLE_MCP_AUTH_TOKEN</code> or worker
          env — it cannot be retrieved again.
        </p>
        <p>
          <span className="text-foreground font-medium">Rotation:</span> create
          a new credential, update your env, then revoke the old one from the
          table below. Revoked or expired credentials stop working at the next
          request.
        </p>
        <p>
          Human JWT sessions manage these keys in the developer portal; service
          account tokens must not call these admin mutations. See{' '}
          <a
            className="text-primary underline-offset-4 hover:underline"
            data-testid="SettingsKeysIntroduction-docs-link"
            href={MCP_DEVELOPER_AUTH_DOC_HREF}
            rel="noreferrer"
            target="_blank"
          >
            MCP and worker authentication (AUTH.md)
          </a>{' '}
          for bootstrap and env setup.
        </p>
      </div>
    </OpenThrottleFieldset>
  );
};
