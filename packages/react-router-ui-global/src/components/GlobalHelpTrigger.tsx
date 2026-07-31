import * as React from 'react';
import clsx from 'clsx';
import { Info } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { useUrlSyncedOverlay } from '../hooks/useUrlSyncedOverlay';

export interface GlobalHelpTriggerProps {
  readonly className?: string;
}

const MODAL_KEY = 'help' as const;
const MODAL_PARAM = 'modal' as const;

/**
 * @description Click-to-open trigger button that sets `modal=help` in the URL
 * (preserving any other params). Pair with {@link GlobalHelpModal} rendered
 * elsewhere in the tree; the URL is the source of truth, so the trigger and the
 * dialog do not need to share React state.
 */
export const GlobalHelpTrigger = (
  props: GlobalHelpTriggerProps,
): React.ReactElement => {
  const { className } = props;

  const { setOpen } = useUrlSyncedOverlay({
    openValue: MODAL_KEY,
    param: MODAL_PARAM,
  });

  const handleClick = React.useCallback((): void => {
    setOpen(true);
  }, [setOpen]);

  return (
    <Tooltip delayDuration={1_000}>
      <TooltipTrigger asChild={true}>
        <Button
          aria-label="Help and shortcuts"
          className={clsx('relative size-6 shrink-0 rounded-full', className)}
          data-testid="GlobalHelpTrigger"
          onClick={handleClick}
          type="button"
          variant="ghost"
        >
          <Info />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Help and shortcuts</p>
      </TooltipContent>
    </Tooltip>
  );
};

GlobalHelpTrigger.key = MODAL_KEY;
