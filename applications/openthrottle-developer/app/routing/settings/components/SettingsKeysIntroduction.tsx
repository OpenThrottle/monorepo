import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { KeyRoundIcon } from 'lucide-react';

export interface SettingsKeysIntroductionProps {
  className?: string;
}

/**
 * @description Explains service account credentials, one-time token display, and rotation.
 */
export const SettingsKeysIntroduction = (
  _props: SettingsKeysIntroductionProps,
) => {
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
      <p className="text-sm text-muted-foreground">
        Long-lived bearer tokens for automation (MCP, Ralph workers, CI). Each
        credential uses the{' '}
      </p>
    </div>
  );
};
