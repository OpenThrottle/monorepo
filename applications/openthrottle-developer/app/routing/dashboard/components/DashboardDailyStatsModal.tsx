import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';

export interface DashboardDailyStatsModalProps {
  // readonly className?: string;
}

export const DashboardDailyStatsModal = (
  _props: DashboardDailyStatsModalProps,
) => {
  // const { className } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  const param = searchParams.get('modal');
  const isOpen = param === DashboardDailyStatsModal.key;

  // Handlers
  const onToggle = () => {
    const newParams = new URLSearchParams(searchParams);

    if (isOpen) {
      newParams.delete('modal');
    } else {
      newParams.set('modal', DashboardDailyStatsModal.key);
    }

    setSearchParams(newParams, { preventScrollReset: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <Button onClick={onToggle} variant="outline">
        Open
      </Button>
      <Dialog onOpenChange={onToggle} open={isOpen}>
        <DialogContent className="sm:max-w-sm data-[state=closed]:slide-out-to-top-[0%] ">
          <h2>DashboardDailyStatsModal</h2>
          <p>lorem ipsum dolor sit amet</p>
        </DialogContent>
      </Dialog>
    </>
  );
};

DashboardDailyStatsModal.key = 'daily-stats';
