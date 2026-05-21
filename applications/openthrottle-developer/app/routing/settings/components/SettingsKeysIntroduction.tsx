import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { KeyRoundIcon } from 'lucide-react';

export interface SettingsKeysIntroductionProps {
  className?: string;
}

/**
 * @description Explains service account credentials, one-time token display, and rotation.
 */
export const SettingsKeysIntroduction = (
  props: SettingsKeysIntroductionProps,
) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={KeyRoundIcon}
          title="Keys"
        />
        <p className="text-sm text-muted-foreground">
          Long-lived bearer tokens for automation (MCP, Ralph workers, CI). Each
          credential uses the{' '}
        </p>
      </div>

      <Card className={className} data-testid="SettingsKeysIntroduction">
        <CardHeader>
          <CardTitle className="text-base">
            Service account credentials
          </CardTitle>
          <CardDescription>
            Long-lived bearer tokens for automation (MCP, Ralph workers, CI).
            Each credential uses the{' '}
            <code className="text-xs">ot_sa_&lt;prefix&gt;_&lt;secret&gt;</code>{' '}
            format in the <code className="text-xs">Authorization</code> header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              One-time secret:
            </span>{' '}
            when you create a credential, the full token is shown once. Copy it
            immediately into{' '}
            <code className="text-xs">MCP_DEVELOPER_AUTH_TOKEN</code> or worker
            env — it cannot be retrieved again.
          </p>
          <p>
            <span className="font-medium text-foreground">Rotation:</span>{' '}
            create a new credential, update your env, then revoke the old one
            from the table below. Revoked or expired credentials stop working at
            the next request.
          </p>
          <p>
            Human JWT sessions manage these keys in the developer portal;
            service account tokens must not call these admin mutations. See{' '}
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
        </CardContent>
      </Card>
    </>
  );
};
