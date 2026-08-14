import * as React from 'react';
import { Button, Label } from '@openthrottle/react-router-shadcn';
import { useAtom } from 'jotai';
import { onboardingStateAtom } from '~/routing/dashboard/data/atom.onboarding';
import { GET_STARTED_RESTORE_COPY } from '~/routing/dashboard/data/data.copy';

export interface SettingsOnboardingRestoreProps {
  className?: string;
}

/**
 * @description Settings control that brings back a dismissed dashboard "Get
 * Started" checklist by resetting the persisted onboarding atom. Discoverable
 * but unobtrusive; the button is disabled while the checklist is not dismissed,
 * so it only offers an action when there is something to restore.
 */
export const SettingsOnboardingRestore = (
  props: SettingsOnboardingRestoreProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const [onboarding, setOnboarding] = useAtom(onboardingStateAtom);

  // Setup
  const { dismissed } = onboarding;

  // Handlers
  const handleRestore = React.useCallback((): void => {
    setOnboarding((prev) => ({ ...prev, dismissed: false }));
  }, [setOnboarding]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section className={className} data-testid="SettingsOnboardingRestore">
      <Label>{GET_STARTED_RESTORE_COPY.label}</Label>
      <div className="mt-3">
        <Button
          disabled={!dismissed}
          onClick={handleRestore}
          size="sm"
          variant="outline"
        >
          {GET_STARTED_RESTORE_COPY.action}
        </Button>
      </div>
      <p className="text-muted-foreground mt-3 text-sm">
        {dismissed
          ? GET_STARTED_RESTORE_COPY.hiddenNote
          : GET_STARTED_RESTORE_COPY.visibleNote}
      </p>
    </section>
  );
};
