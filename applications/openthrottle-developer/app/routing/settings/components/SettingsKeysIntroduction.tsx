import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { KeyRoundIcon } from 'lucide-react';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';

export interface SettingsKeysIntroductionProps {
  className?: string;
}

/**
 * @description Explains service account credentials, one-time token display, and rotation.
 */
export const SettingsKeysIntroduction = (
  _props: SettingsKeysIntroductionProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={KeyRoundIcon}
        title="Keys"
      />
      <div className="text-muted-foreground space-y-4 text-sm">
        <p>
          Long-lived bearer tokens for automation (MCP, Ralph workers, CI). Each
          credential uses the{' '}
          <code className="text-xs">ot_sa_&lt;prefix&gt;_&lt;secret&gt;</code>{' '}
          format in the <code className="text-xs">Authorization</code> header.
        </p>

        <ul className="list-outside list-disc space-y-2 pl-4">
          <li>
            <span className="text-muted-foreground font-semibold">
              One-time secret
            </span>
            <p>
              When you create a credential, the full token is shown once. Copy
              it immediately into{' '}
              <code className="text-xs">OPENTHROTTLE_MCP_AUTH_TOKEN</code> or
              worker env — it cannot be retrieved again.
            </p>
          </li>
          <li>
            <span className="text-muted-foreground font-semibold">
              Rotation
            </span>
            <p>
              Create a new credential, update your env, then revoke the old one
              from the table below. Revoked or expired credentials stop working
              at the next request.
            </p>
          </li>
        </ul>

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
    </div>
  );
};
