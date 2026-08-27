import * as React from 'react';
import clsx from 'clsx';
import {
  Badge,
  Card,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { EditorPresenceState } from '~/__generated__/graphql';
import { getWorkspaceEditorOption } from '~/routing/settings/config/workspace-editors';
import {
  workspaceEditorAffiliateLinkAriaLabel,
  workspaceEditorAffiliateLinkLabel,
  workspaceEditorEnableLabel,
  WORKSPACE_SETTINGS_COPY,
} from '~/routing/settings/data/data.copy';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

export interface WorkspaceEditorCardProps {
  /** Referral URL for acquiring this editor, or null when it has no program. */
  affiliateUrl?: string | null;
  className?: string;
  editor: WorkspaceEditorId;
  enabled: boolean;
  onToggle: (editor: WorkspaceEditorId, next: boolean) => void;
  /**
   * Advisory presence. `null`/absent (probe failed) and `UNKNOWN` (the server
   * is not entitled to a claim) both render no badge — silence is the correct
   * output when we do not know. Presence never gates the switch.
   */
  presence?: EditorPresenceState | null;
}

/**
 * @description One editor, whole: its mark and label, what OpenThrottle writes
 * for it, whether we found it on this machine, its enable switch, and where to
 * get it — joined on one card instead of spread across three stacked lists.
 *
 * Presentational only. The parent owns the selection and the submitted payload;
 * detection is advisory and must never disable anything here.
 */
export const WorkspaceEditorCard = (
  props: WorkspaceEditorCardProps,
): React.ReactElement | null => {
  const { affiliateUrl, className, editor, enabled, onToggle, presence } =
    props;

  // Hooks

  // Setup
  const option = getWorkspaceEditorOption(editor);
  const detected = presence === EditorPresenceState.Installed;
  const notDetected = presence === EditorPresenceState.NotFound;
  const enableLabel = workspaceEditorEnableLabel(option?.label ?? editor);

  // Handlers
  const handleToggle = (next: boolean): void => onToggle(editor, next);

  /**
   * Whole-card click target. A `label` cannot carry this: Chrome does not
   * forward label clicks to a `button`-based control, so the affordance was
   * silently inert. Clicks that land on a real control — the switch, the
   * badge's tooltip trigger, the affiliate anchor — are left to that control,
   * so following the link never enables the editor.
   *
   * `input` is in the selector for the switch's hidden form-bubble input,
   * which re-dispatches its own click: without it every switch click toggled
   * twice and landed back where it started.
   */
  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (
      event.target instanceof Element &&
      event.target.closest('a, button, input')
    ) {
      return;
    }

    handleToggle(!enabled);
  };

  // Markup
  const Icon = option?.icon ?? null;

  // Life Cycle

  // 🔌 Short Circuit
  if (option === null) return null;

  return (
    <Card
      className={clsx(
        'flex cursor-pointer flex-col gap-2 p-4 transition-colors',
        // Selection rides on the border and ring, not a background tint: any
        // tint behind `text-muted-foreground` drove the description's contrast
        // under AA (measured 2.59 at accent/40, 3.78 at accent/10). The switch
        // state carries the same signal without relying on color.
        enabled
          ? 'border-primary ring-primary ring-1'
          : 'hover:border-primary/40',
        className,
      )}
      data-editor={editor}
      data-presence={presence ?? ''}
      data-testid="WorkspaceEditorCard"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          {Icon === null ? null : (
            <Icon className="text-muted-foreground size-4 shrink-0" />
          )}
          <span className="font-medium">{option.label}</span>
        </span>

        {detected ? (
          <Badge color="green" size="xs">
            {WORKSPACE_SETTINGS_COPY.presenceDetectedBadge}
          </Badge>
        ) : null}

        {notDetected ? (
          <Tooltip>
            <TooltipTrigger
              aria-label={WORKSPACE_SETTINGS_COPY.presenceNotDetectedTooltip}
            >
              <Badge color="slate" size="xs" variant="outline">
                {WORKSPACE_SETTINGS_COPY.presenceNotDetectedBadge}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              {WORKSPACE_SETTINGS_COPY.presenceNotDetectedTooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <p className="text-muted-foreground text-sm">{option.description}</p>

      <div className="mt-auto flex items-center gap-2 pt-2">
        <Switch
          aria-label={enableLabel}
          checked={enabled}
          data-testid={`WorkspaceEditorCard-switch-${editor}`}
          onCheckedChange={handleToggle}
        />
        <span className="text-sm">{enableLabel}</span>
      </div>

      {typeof affiliateUrl === 'string' ? (
        <a
          aria-label={workspaceEditorAffiliateLinkAriaLabel(option.label)}
          className="text-primary text-sm underline underline-offset-4"
          data-testid="WorkspaceEditorCard-affiliate"
          href={affiliateUrl}
          rel="noopener noreferrer sponsored"
          target="_blank"
        >
          {workspaceEditorAffiliateLinkLabel(option.label)}
        </a>
      ) : null}
    </Card>
  );
};
