import { Check, Loader2, X } from 'lucide-react';
import { ChatToolStatus } from '../types';
import type { ChatToolStatus as ChatToolStatusType } from '../types';

interface StatusConfig {
  readonly Icon: typeof Check;
  readonly color: 'amber' | 'green' | 'red';
  readonly label: string;
  readonly spin: boolean;
}

/**
 * Icon + color + label per tool-call status. Kept out of {@link ChatToolCall}
 * per the repo's component/data split.
 * @public
 */
export const STATUS_CONFIG: Record<ChatToolStatusType, StatusConfig> = {
  [ChatToolStatus.failed]: {
    Icon: X,
    color: 'red',
    label: 'failed',
    spin: false,
  },
  [ChatToolStatus.running]: {
    Icon: Loader2,
    color: 'amber',
    label: 'running',
    spin: true,
  },
  [ChatToolStatus.succeeded]: {
    Icon: Check,
    color: 'green',
    label: 'succeeded',
    spin: false,
  },
};
