import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { Check, Lock } from 'lucide-react';
import * as React from 'react';

import { PERMISSION_MODE_META } from '../data/data.chat-permission-mode-meta';
import { CHAT_PERMISSION_REMEMBER_COPY } from '../data/data.copy';
import type { ChatBackendCapabilities } from '../types';
import { ChatPermissionMode } from '../types';

export interface ChatPermissionModeControlProps {
  /** Selected backend's capabilities; gates which modes render. */
  readonly capabilities: ChatBackendCapabilities;
  readonly className?: string;
  readonly onPermissionModeChange?: (mode: ChatPermissionMode) => void;
  /**
   * Renders the "Remember my choice" opt-in when supplied (and the backend has
   * an elevated mode); omit to hide it. Pair with {@link rememberPermissionMode}.
   */
  readonly onRememberPermissionModeChange?: (remember: boolean) => void;
  /** Currently-selected permission mode. */
  readonly permissionMode?: ChatPermissionMode;
  /** Whether an elevated mode is kept across sessions instead of resetting. */
  readonly rememberPermissionMode?: boolean;
}

/**
 * @description Controlled, presentational permission-mode selector
 * (Supervised / Auto-accept edits / Full access) with a lock/pencil icon and a
 * description line per option and a checkmark on the active mode. The available
 * modes are gated by the selected backend's
 * {@link ChatBackendCapabilities.permissionModes}; the control returns nothing
 * when the backend exposes no modes. When `onRememberPermissionModeChange` is
 * supplied, a "Remember my choice" checkbox below the modes lets the user keep
 * an elevated mode across sessions; it shows only when the backend offers an
 * elevated mode. The package hardcodes no capability data.
 *
 * @public
 */
export const ChatPermissionModeControl = (
  props: ChatPermissionModeControlProps,
): React.ReactElement | null => {
  const {
    capabilities,
    className,
    onPermissionModeChange,
    onRememberPermissionModeChange,
    permissionMode,
    rememberPermissionMode = false,
  } = props;

  // Hooks

  // Setup
  const modes = capabilities.permissionModes;
  const activeMeta =
    permissionMode != null ? PERMISSION_MODE_META[permissionMode] : undefined;
  const TriggerIcon = activeMeta?.icon ?? Lock;
  // Only Auto-accept edits / Full access ever reset, so the opt-in is
  // meaningless for a backend whose sole mode is Supervised.
  const hasElevatedMode = modes.some(
    (mode) => mode !== ChatPermissionMode.supervised,
  );
  const showRemember = onRememberPermissionModeChange != null && hasElevatedMode; // prettier-ignore

  // Handlers
  const onSelectMode = (mode: ChatPermissionMode): void => {
    onPermissionModeChange?.(mode);
  };
  const onRememberCheckedChange = (checked: boolean): void => {
    onRememberPermissionModeChange?.(checked);
  };
  // Keep the menu open so the user sees the box tick.
  const onRememberSelect = (event: Event): void => {
    event.preventDefault();
  };

  // Markup
  const rememberItem = (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        checked={rememberPermissionMode}
        className="items-start"
        data-testid="ChatPermissionModeControl-remember"
        onCheckedChange={onRememberCheckedChange}
        onSelect={onRememberSelect}
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">
            {CHAT_PERMISSION_REMEMBER_COPY.label}
          </span>
          <span className="text-muted-foreground text-xs">
            {CHAT_PERMISSION_REMEMBER_COPY.hint}
          </span>
        </span>
      </DropdownMenuCheckboxItem>
    </>
  );

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
          className={cn('h-8 w-auto gap-1.5 pointer-coarse:h-11', className)}
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
                className={cn(
                  'mt-0.5 ml-auto size-4 shrink-0',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
            </DropdownMenuItem>
          );
        })}
        {showRemember ? rememberItem : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
