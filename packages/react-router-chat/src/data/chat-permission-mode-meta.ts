import * as React from 'react';
import { Lock, Pencil, Unlock } from 'lucide-react';
import { ChatPermissionMode } from '../types';

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
  ChatPermissionMode,
  PermissionModeMeta
> = {
  [ChatPermissionMode.autoAcceptEdits]: {
    description: 'Auto-approve edits, ask before other actions',
    icon: Pencil,
    label: 'Auto-accept edits',
  },
  [ChatPermissionMode.fullAccess]: {
    description: 'Allow commands and edits without prompts',
    icon: Unlock,
    label: 'Full access',
  },
  [ChatPermissionMode.supervised]: {
    description: 'Ask before commands and file changes',
    icon: Lock,
    label: 'Supervised',
  },
};
