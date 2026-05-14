import * as React from 'react';
import {
  GlobalErrorBoundary,
  type GlobalErrorBoundaryProps,
} from '@openthrottle/react-router-ui-global';
import { MAIL_PATHS } from '~/global/data/data.navigation';

/**
 * @description Mail app error boundary: “Back to Home” returns to inbox.
 */
export const MailGlobalErrorBoundary = (
  props: Omit<GlobalErrorBoundaryProps, 'homePath'>,
) => <GlobalErrorBoundary {...props} homePath={MAIL_PATHS.inbox} />;
