import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { Check, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import {
  DEFAULT_REASONING_LABELS,
  DEFAULT_SERVICE_TIER_LABELS,
} from '../data/chat-reasoning-tier-labels';
import type { ChatReasoningLevel, ChatServiceTier } from '../types';
import type { ChatBackendCapabilities } from '../types';

export interface ChatReasoningTierControlProps {
  /** Selected backend's capabilities; gates which options (and sections) show. */
  readonly capabilities: ChatBackendCapabilities;
  readonly className?: string;
  readonly onReasoningChange?: (level: ChatReasoningLevel) => void;
  readonly onServiceTierChange?: (tier: ChatServiceTier) => void;
  /** Currently-selected reasoning level. */
  readonly reasoning?: ChatReasoningLevel;
  /** Override the default human labels for reasoning levels. */
  readonly reasoningLabels?: Partial<Record<ChatReasoningLevel, string>>;
  /** Currently-selected service tier. */
  readonly serviceTier?: ChatServiceTier;
  /** Override the default human labels for service tiers. */
  readonly serviceTierLabels?: Partial<Record<ChatServiceTier, string>>;
}

/**
 * @description Controlled, presentational reasoning + service-tier dropdown
 * (the screenshots' `Low · Standard` control). Two single-select sections —
 * Reasoning and Service Tier — each with a checkmark on the active value. Both
 * are gated by the selected backend's {@link ChatBackendCapabilities}: a
 * section is hidden when the backend exposes no options for it, and the whole
 * control returns nothing when neither section has options. The package
 * hardcodes no capability data.
 *
 * @public
 */
export const ChatReasoningTierControl = (
  props: ChatReasoningTierControlProps,
): React.ReactElement | null => {
  const {
    capabilities,
    className,
    onReasoningChange,
    onServiceTierChange,
    reasoning,
    reasoningLabels,
    serviceTier,
    serviceTierLabels,
  } = props;

  // Hooks

  // Setup
  const reasoningLevels = capabilities.reasoningLevels;
  const serviceTiers = capabilities.serviceTiers;
  const showReasoning = reasoningLevels.length > 0;
  const showTier = serviceTiers.length > 0;

  const reasoningLabelFor = (level: ChatReasoningLevel): string =>
    reasoningLabels?.[level] ?? DEFAULT_REASONING_LABELS[level];
  const serviceTierLabelFor = (tier: ChatServiceTier): string =>
    serviceTierLabels?.[tier] ?? DEFAULT_SERVICE_TIER_LABELS[tier];

  const triggerParts: string[] = [];
  if (showReasoning) {
    triggerParts.push(
      reasoning != null ? reasoningLabelFor(reasoning) : 'Reasoning',
    );
  }
  if (showTier) {
    triggerParts.push(
      serviceTier != null ? serviceTierLabelFor(serviceTier) : 'Tier',
    );
  }
  const triggerLabel = triggerParts.join(' · ');

  // Handlers
  const onReasoningSelect = (
    event: Event | React.SyntheticEvent,
    level: ChatReasoningLevel,
  ): void => {
    // Keep the menu open so the tier can be picked in the same session.
    event.preventDefault();
    onReasoningChange?.(level);
  };

  const onTierSelect = (
    event: Event | React.SyntheticEvent,
    tier: ChatServiceTier,
  ): void => {
    event.preventDefault();
    onServiceTierChange?.(tier);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!showReasoning && !showTier) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button
          aria-label="Reasoning and service tier"
          className={clsx('h-8 w-auto gap-1.5', className)}
          data-testid="ChatReasoningTierControl-trigger"
          type="button"
          variant="outline"
        >
          <SlidersHorizontal className="size-4 opacity-70" />
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {showReasoning ? (
          <>
            <DropdownMenuLabel>Reasoning</DropdownMenuLabel>
            {reasoningLevels.map((level) => {
              const isActive = level === reasoning;
              return (
                <DropdownMenuItem
                  className="gap-2"
                  data-testid={`ChatReasoningTierControl-reasoning-${level}`}
                  key={level}
                  onSelect={(event) => onReasoningSelect(event, level)}
                >
                  <Check
                    className={clsx(
                      'size-4 shrink-0',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {reasoningLabelFor(level)}
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}
        {showReasoning && showTier ? <DropdownMenuSeparator /> : null}
        {showTier ? (
          <>
            <DropdownMenuLabel>Service Tier</DropdownMenuLabel>
            {serviceTiers.map((tier) => {
              const isActive = tier === serviceTier;
              return (
                <DropdownMenuItem
                  className="gap-2"
                  data-testid={`ChatReasoningTierControl-tier-${tier}`}
                  key={tier}
                  onSelect={(event) => onTierSelect(event, tier)}
                >
                  <Check
                    className={clsx(
                      'size-4 shrink-0',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {serviceTierLabelFor(tier)}
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
