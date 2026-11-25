import { Ban, Check, Loader2, X } from 'lucide-react';

import type { ChatToolStatusValue } from '../types';
import { CHAT_TOOL_STATUS } from '../types';

interface StatusConfig {
  readonly Icon: typeof Check;
  readonly color: 'amber' | 'green' | 'red' | 'slate';
  readonly label: string;
  readonly spin: boolean;
}

/**
 * Icon + color + label per tool-call status. Kept out of {@link ChatToolCall}
 * per the repo's component/data split.
 * @public
 */
export const STATUS_CONFIG: Record<ChatToolStatusValue, StatusConfig> = {
  [CHAT_TOOL_STATUS.failed]: {
    Icon: X,
    color: 'red',
    label: 'failed',
    spin: false,
  },
  [CHAT_TOOL_STATUS.notRun]: {
    Icon: Ban,
    color: 'slate',
    label: 'not run',
    spin: false,
  },
  [CHAT_TOOL_STATUS.running]: {
    Icon: Loader2,
    color: 'amber',
    label: 'running',
    spin: true,
  },
  [CHAT_TOOL_STATUS.succeeded]: {
    Icon: Check,
    color: 'green',
    label: 'succeeded',
    spin: false,
  },
};
