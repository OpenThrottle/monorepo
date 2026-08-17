import * as React from 'react';
import { GlobalModal } from '@openthrottle/react-router-ui-global';
import { SETTINGS_KEYS_COPY } from '~/routing/settings/data/data.copy';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';

export interface SettingsKeysHelpModalProps {}

/**
 * @description Keys-specific operational help (one-time secret, rotation, human
 * JWT sessions). Opened from the `/settings/keys` header trigger via
 * `?modal=keys-help`; the URL is the source of truth so this never shares state
 * with the create-credential dialog.
 */
export const SettingsKeysHelpModal = (
  _props: SettingsKeysHelpModalProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalModal param="modal" value={SettingsKeysHelpModal.key}>
      <div className="space-y-4" data-testid="SettingsKeysHelpModal">
        <h2 className="ui-heading">{SETTINGS_KEYS_COPY.modalTitle}</h2>

        <div className="text-muted-foreground space-y-4 text-sm">
          <ul className="list-outside list-disc space-y-2 pl-4">
            <li>
              <span className="text-muted-foreground font-semibold">
                {SETTINGS_KEYS_COPY.oneTimeSecretTitle}
              </span>
              <p>
                {SETTINGS_KEYS_COPY.oneTimeSecretBodyPrefix}
                <code className="text-xs">
                  {SETTINGS_KEYS_COPY.oneTimeSecretEnvCode}
                </code>
                {SETTINGS_KEYS_COPY.oneTimeSecretBodySuffix}
              </p>
            </li>
            <li>
              <span className="text-muted-foreground font-semibold">
                {SETTINGS_KEYS_COPY.rotationTitle}
              </span>
              <p>{SETTINGS_KEYS_COPY.rotationBody}</p>
            </li>
          </ul>

          <p>
            {SETTINGS_KEYS_COPY.jwtPrefix}
            <a
              className="text-primary underline-offset-4 hover:underline"
              data-testid="SettingsKeysHelpModal-docs-link"
              href={MCP_DEVELOPER_AUTH_DOC_HREF}
              rel="noreferrer"
              target="_blank"
            >
              {SETTINGS_KEYS_COPY.docsLinkLabel}
            </a>
            {SETTINGS_KEYS_COPY.docsSuffix}
          </p>
        </div>
      </div>
    </GlobalModal>
  );
};

SettingsKeysHelpModal.key = 'keys-help';
