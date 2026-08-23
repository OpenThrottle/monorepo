import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { Switch } from '@openthrottle/react-router-shadcn';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { action as repositorySkillInjectionAction } from '~/routes/resources.repository-skill-injection';

/** Resource-route action path backing the inline skill-injection toggle. */
const SKILL_INJECTION_ACTION = '/resources/repository-skill-injection';

export interface RepositorySkillInjectionToggleProps {
  /** Repository-level rollup from the loader (server truth). */
  enabled: boolean;
  /** Repository whose checkouts are flipped together. */
  repositoryId: string;
  /** Used to disambiguate the accessible label across rows. */
  repositoryName: string;
}

export const RepositorySkillInjectionToggle = (
  props: RepositorySkillInjectionToggleProps,
): React.ReactElement => {
  const { enabled, repositoryId, repositoryName } = props;

  // Hooks
  const fetcher = useFetcher<typeof repositorySkillInjectionAction>();
  const revalidator = useRevalidator();

  // Setup
  // While a flip is in flight, reflect the submitted value optimistically;
  // otherwise show the loader's server truth.
  const submittedEnabled = fetcher.formData?.get('enabled');
  const optimisticEnabled =
    fetcher.state !== 'idle' && submittedEnabled != null
      ? submittedEnabled === 'true'
      : enabled;
  // Flipping this does real filesystem work in the checkout, so block a second
  // submission until the first settles rather than queueing rapid double-flips.
  const disabled = fetcher.state !== 'idle';
  const errorMessage =
    fetcher.data != null && fetcher.data.errorMessage != null
      ? fetcher.data.errorMessage ||
        REPOSITORIES_TABLE_COPY.injectionUpdateFailed
      : null;

  // Handlers
  const handleCheckedChange = (next: boolean): void => {
    fetcher.submit(
      { enabled: String(next), repositoryId },
      { action: SKILL_INJECTION_ACTION, method: 'post' },
    );
  };

  // Markup

  // Life Cycle
  const revalidatedRef = React.useRef(false);
  React.useEffect(() => {
    // Once the mutation settles cleanly, refetch the loader so the row and the
    // repository detail badge re-reflect the persisted state. Guard so it fires
    // once per settled submission.
    if (fetcher.state === 'idle' && fetcher.data != null) {
      if (!revalidatedRef.current && fetcher.data.errorMessage == null) {
        revalidatedRef.current = true;
        revalidator.revalidate();
      }
    } else {
      revalidatedRef.current = false;
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        aria-label={`${REPOSITORIES_TABLE_COPY.injectionToggleLabelPrefix} ${repositoryName}`}
        checked={optimisticEnabled}
        data-testid={`RepositorySkillInjectionToggle-${repositoryId}`}
        disabled={disabled}
        onCheckedChange={handleCheckedChange}
      />
      {errorMessage != null ? (
        <p className="text-destructive text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
};
