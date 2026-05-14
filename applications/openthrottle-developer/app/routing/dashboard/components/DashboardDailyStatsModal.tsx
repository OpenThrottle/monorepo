import * as React from 'react';
import { GlobalModal } from '@openthrottle/react-router-ui-global';

export interface DashboardDailyStatsModalProps {
  // readonly className?: string;
}

export const DashboardDailyStatsModal = (
  _props: DashboardDailyStatsModalProps,
) => {
  // const { className } = props;

  // Hooks

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalModal param="modal" value={DashboardDailyStatsModal.key}>
      <h2>Dashboard Daily Stats Modal</h2>
      <p className="text-sm text-gray-500">
        lorem ipsum dolor sit amet. Lorem ipsum dolor sit, amet consectetur
        adipisicing elit. Nihil natus, odio officiis sit aliquid tempore odit
        eos fuga nemo cupiditate, doloribus quos maxime? Voluptatem aliquid,
        adipisci itaque ipsum dolore magni!s
      </p>
    </GlobalModal>
  );
};

DashboardDailyStatsModal.key = 'daily-stats';
