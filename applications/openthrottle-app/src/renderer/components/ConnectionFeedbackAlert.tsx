import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CONNECTION_COPY } from '../data/data.copy.ts';
import type { ConnectionFeedback } from '../types/connection-feedback.ts';

export interface ConnectionFeedbackAlertProps {
  readonly feedback: ConnectionFeedback;
}

/** @description The outcome of the last test or connect attempt; renders nothing while idle. */
export const ConnectionFeedbackAlert = (
  props: ConnectionFeedbackAlertProps,
): React.ReactElement | null => {
  const { feedback } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (feedback.kind === 'idle') {
    return null;
  }

  if (feedback.kind === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTitle>{CONNECTION_COPY.errorTitle}</AlertTitle>
        <AlertDescription>{feedback.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <AlertTitle>{CONNECTION_COPY.successTitle}</AlertTitle>
      <AlertDescription>{feedback.message}</AlertDescription>
    </Alert>
  );
};
