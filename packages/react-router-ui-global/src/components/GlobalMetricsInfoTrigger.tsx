import * as React from 'react';
import clsx from 'clsx';
import { Info } from 'lucide-react';
import { useUrlSyncedOverlay } from '../hooks/useUrlSyncedOverlay';

export interface GlobalMetricsInfoTriggerProps {
  readonly className?: string;
}

const MODAL_KEY = 'ServerMetricsInfo' as const;
const MODAL_PARAM = 'modal' as const;

/**
 * @description Click-to-open trigger button that sets `modal=ServerMetricsInfo` in the URL
 * (preserving any other params). Pair with {@link GlobalMetricsInfoModal} rendered elsewhere
 * in the tree; the URL is the source of truth, so the trigger and the dialog do not need to
 * share React state.
 */
export const GlobalMetricsInfoTrigger = (
  props: GlobalMetricsInfoTriggerProps,
): React.ReactElement => {
  const { className } = props;

  const { setOpen } = useUrlSyncedOverlay({
    // clearParamsOnClose: ['keep'],
    openValue: MODAL_KEY,
    param: MODAL_PARAM,
  });

  const handleClick = React.useCallback((): void => {
    setOpen(true);
  }, [setOpen]);

  return (
    <button
      aria-label="Metrics interpretation help"
      className={clsx(
        'text-muted-foreground hover:text-foreground transition-colors',
        className,
      )}
      data-testid="GlobalMetrics-info-trigger"
      onClick={handleClick}
      type="button"
    >
      <Info className="h-4 w-4" />
    </button>
  );
};

GlobalMetricsInfoTrigger.key = MODAL_KEY;
