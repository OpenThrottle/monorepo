import * as React from 'react';
import clsx from 'clsx';
import { SparklesIcon } from 'lucide-react';
import { GLOBAL_FEATURE_ONBOARDING_MODAL } from '../config';
import { GLOBAL_FEATURE_ONBOARDING_TRIGGER_LABEL } from '../data/data.copy';
import { useUrlSyncedOverlay } from '../hooks/useUrlSyncedOverlay';

export interface GlobalFeatureOnboardingTriggerProps {
  readonly className?: string;
  /** Button label. Defaults to the shared "How it works" copy. */
  readonly label?: string;
}

/**
 * @description Click-to-open trigger that sets `modal=onboarding` in the URL
 * (preserving other params). Pair with {@link GlobalFeatureOnboardingModal}
 * rendered elsewhere in the tree; the URL is the source of truth, so the trigger
 * and the dialog do not share React state. Rendered in feature headers so the
 * onboarding pitch stays reachable after a list is populated.
 * @public
 */
export const GlobalFeatureOnboardingTrigger = (
  props: GlobalFeatureOnboardingTriggerProps,
): React.ReactElement => {
  const { className, label = GLOBAL_FEATURE_ONBOARDING_TRIGGER_LABEL } = props;

  // Hooks
  const { setOpen } = useUrlSyncedOverlay({
    openValue: GLOBAL_FEATURE_ONBOARDING_MODAL.value,
    param: GLOBAL_FEATURE_ONBOARDING_MODAL.param,
  });

  // Setup

  // Handlers
  const handleClick = React.useCallback((): void => {
    setOpen(true);
  }, [setOpen]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <button
      aria-label={label}
      className={clsx(
        'cursor-pointer transition-colors',
        'inline-flex items-center gap-3',
        'text-muted-foreground hover:text-foreground text-sm',
        className,
      )}
      data-testid="GlobalFeatureOnboardingTrigger"
      onClick={handleClick}
      type="button"
    >
      <SparklesIcon className="text-accent size-4" />
      {label}
    </button>
  );
};

GlobalFeatureOnboardingTrigger.key = GLOBAL_FEATURE_ONBOARDING_MODAL.value;
