import * as React from 'react';
import {
  GlobalErrorBoundary,
  type GlobalErrorBoundaryProps,
} from '@openthrottle/react-router-ui-global';
import { MAIL_PATHS } from '~/global/data/data.navigation';

export interface MailGlobalErrorBoundaryProps extends Omit<
  GlobalErrorBoundaryProps,
  'homePath'
> {}

/**
 * @description Mail app error boundary: “Back to Home” returns to inbox.
 */
export const MailGlobalErrorBoundary = (
  props: MailGlobalErrorBoundaryProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <GlobalErrorBoundary {...props} homePath={MAIL_PATHS.inbox} />;
};
