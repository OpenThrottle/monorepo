import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { Check, Lock, Pencil, Unlock } from 'lucide-react';
import clsx from 'clsx';
import { ChatPermissionMode } from '../types';
import type { ChatBackendCapabilities } from '../types';

export interface ChatPermissionModeControlProps {
  /** Selected backend's capabilities; gates which modes render. */
  readonly capabilities: ChatBackendCapabilities;
  readonly className?: string;
  readonly onPermissionModeChange?: (mode: ChatPermissionMode) => void;
  /** Currently-selected permission mode. */
  readonly permissionMode?: ChatPermissionMode;
}

interface PermissionModeMeta {
  readonly description: string;
  readonly icon: React.ComponentType<{ readonly className?: string }>;
  readonly label: string;
}

/** Canonical UI copy + icon per permission mode (from the screenshots). */
const PERMISSION_MODE_META: Record<ChatPermissionMode, PermissionModeMeta> = {
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

/**
 * @description Controlled, presentational permission-mode selector
 * (Supervised / Auto-accept edits / Full access) with a lock/pencil icon and a
 * description line per option and a checkmark on the active mode. The available
 * modes are gated by the selected backend's
 * {@link ChatBackendCapabilities.permissionModes}; the control returns nothing
 * when the backend exposes no modes. The package hardcodes no capability data.
 *
 * @public
 */
export const ChatPermissionModeControl = (
  props: ChatPermissionModeControlProps,
): React.ReactElement | null => {
  const { capabilities, className, onPermissionModeChange, permissionMode } =
    props;

  // Hooks

  // Setup
  const modes = capabilities.permissionModes;
  const activeMeta =
    permissionMode != null ? PERMISSION_MODE_META[permissionMode] : undefined;
  const TriggerIcon = activeMeta?.icon ?? Lock;

  // Handlers
  const onSelectMode = (mode: ChatPermissionMode): void => {
    onPermissionModeChange?.(mode);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (modes.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button
          aria-label="Permission mode"
          className={clsx('h-8 w-auto gap-1.5', className)}
          data-testid="ChatPermissionModeControl-trigger"
          type="button"
          variant="outline"
        >
          <TriggerIcon className="size-4 opacity-70" />
          {activeMeta?.label ?? 'Permissions'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {modes.map((mode) => {
          const meta = PERMISSION_MODE_META[mode];
          const Icon = meta.icon;
          const isActive = mode === permissionMode;

          return (
            <DropdownMenuItem
              className="items-start gap-2"
              data-testid={`ChatPermissionModeControl-mode-${mode}`}
              key={mode}
              onSelect={() => onSelectMode(mode)}
            >
              <Icon className="mt-0.5 size-4 shrink-0 opacity-70" />
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{meta.label}</span>
                <span className="text-muted-foreground text-xs">
                  {meta.description}
                </span>
              </span>
              <Check
                className={clsx(
                  'mt-0.5 ml-auto size-4 shrink-0',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
