import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import type { FormEvent } from 'react';
import * as React from 'react';

import type { ShellBridge } from '../../bridge/types/shell-bridge.ts';
import { CONNECTION_COPY } from '../data/data.copy.ts';
import { useConnectionForm } from '../hooks/useConnectionForm.ts';
import { ConnectionFeedbackAlert } from './ConnectionFeedbackAlert.tsx';

export interface ConnectionScreenProps {
  readonly bridge: ShellBridge;
}

/**
 * @description The first-run / unreachable-server screen: one card to enter an
 * OpenThrottle server URL, test it and connect. Talks to main only through
 * `bridge`.
 */
export const ConnectionScreen = (
  props: ConnectionScreenProps,
): React.ReactElement => {
  const { bridge } = props;

  // Hooks
  const { feedback, isBusy, onConnect, onTest, onUrlChange, serverUrl } =
    useConnectionForm({ bridge });

  // Setup
  const isDisabled = isBusy || serverUrl.trim() === '';

  // Handlers
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onConnect();
  };

  // Markup
  const feedbackAlert = <ConnectionFeedbackAlert feedback={feedback} />;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>
              <h1>{CONNECTION_COPY.title}</h1>
            </CardTitle>
            <CardDescription>{CONNECTION_COPY.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="server-url">{CONNECTION_COPY.inputLabel}</Label>
              <Input
                autoFocus={true}
                id="server-url"
                inputMode="url"
                onChange={(event) => {
                  onUrlChange(event.target.value);
                }}
                placeholder={CONNECTION_COPY.inputPlaceholder}
                spellCheck={false}
                value={serverUrl}
              />
            </div>
            {feedbackAlert}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              disabled={isDisabled}
              onClick={() => {
                void onTest();
              }}
              type="button"
              variant="outline"
            >
              {CONNECTION_COPY.test}
            </Button>
            <Button disabled={isDisabled} type="submit">
              {isBusy ? CONNECTION_COPY.connecting : CONNECTION_COPY.connect}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
};
