import { useEffect, useState } from 'react';

import type { ShellBridge } from '../../bridge/types/shell-bridge.ts';
import type { ConnectionFeedback } from '../types/connection-feedback.ts';

export interface UseConnectionFormOptions {
  readonly bridge: ShellBridge;
}

export interface UseConnectionFormResult {
  readonly feedback: ConnectionFeedback;
  readonly isBusy: boolean;
  readonly onConnect: () => Promise<void>;
  readonly onTest: () => Promise<void>;
  readonly onUrlChange: (value: string) => void;
  readonly serverUrl: string;
}

/**
 * @description State for the connection screen: the URL being edited, whether a
 * test or connect is in flight, and the last outcome. All network work happens
 * in main behind the bridge.
 */
export const useConnectionForm = (
  options: UseConnectionFormOptions,
): UseConnectionFormResult => {
  const { bridge } = options;

  // Hooks
  const [serverUrl, setServerUrl] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<ConnectionFeedback>({
    kind: 'idle',
  });

  // Setup

  // Handlers
  const onUrlChange = (value: string): void => {
    setServerUrl(value);
    setFeedback({ kind: 'idle' });
  };

  const onTest = async (): Promise<void> => {
    setIsBusy(true);

    const result = await bridge.testServer(serverUrl);

    setFeedback(
      result.ok
        ? { kind: 'success', message: result.url }
        : { kind: 'error', message: result.reason },
    );
    setIsBusy(false);
  };

  const onConnect = async (): Promise<void> => {
    setIsBusy(true);

    const result = await bridge.saveServer(serverUrl);

    // On success main replaces this window; stay busy until it does.
    if (!result.ok) {
      setFeedback({ kind: 'error', message: result.reason });
      setIsBusy(false);
    }
  };

  // Markup

  // Life Cycle
  useEffect(() => {
    let isCurrent = true;

    void bridge.getSettings().then((settings) => {
      if (!isCurrent) {
        return;
      }

      setServerUrl(settings.serverUrl);

      if (settings.notice !== undefined) {
        setFeedback({ kind: 'error', message: settings.notice });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [bridge]);

  // 🔌 Short Circuit

  return { feedback, isBusy, onConnect, onTest, onUrlChange, serverUrl };
};
