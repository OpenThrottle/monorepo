import { Lock, Pencil, Unlock } from 'lucide-react';
import type * as React from 'react';

import type { ChatPermissionModeValue } from '../types';
import { CHAT_PERMISSION_MODE } from '../types';

interface PermissionModeMeta {
  readonly description: string;
  readonly icon: React.ComponentType<{ readonly className?: string }>;
  readonly label: string;
}

/**
 * Canonical UI copy + icon per permission mode (from the screenshots). Kept out
 * of {@link ChatPermissionModeControl} per the repo's component/data split.
 * @public
 */
export const PERMISSION_MODE_META: Record<
  ChatPermissionModeValue,
  PermissionModeMeta
> = {
  [CHAT_PERMISSION_MODE.autoAcceptEdits]: {
    description: 'Auto-approve edits, ask before other actions',
    icon: Pencil,
    label: 'Auto-accept edits',
  },
  [CHAT_PERMISSION_MODE.fullAccess]: {
    description: 'Allow commands and edits without prompts',
    icon: Unlock,
    label: 'Full access',
  },
  [CHAT_PERMISSION_MODE.supervised]: {
    description: 'Ask before commands and file changes',
    icon: Lock,
    label: 'Supervised',
  },
};

/**
 * Supervised description for a backend that applies file edits without asking,
 * so Supervised only gates commands and tools.
 * @public
 */
export const SUPERVISED_UNGATED_EDITS_DESCRIPTION = `Ask before commands; edits apply without asking`;
