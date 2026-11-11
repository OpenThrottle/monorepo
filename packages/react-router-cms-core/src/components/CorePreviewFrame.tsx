import { cn } from '@openthrottle/react-router-shadcn';
import { useAtomValue } from 'jotai';
import * as React from 'react';

import { atomSettings } from '../data/data.atom.settings';
import { PREVIEW_DEVICE_CLASS_NAMES } from '../data/data.preview';

/**
 * @public
 */
export interface CorePreviewFrameProps {
  readonly children: React.ReactNode;
  readonly className: string | undefined;
}

/**
 * @description A frame sized like the device chosen in the editor settings — phone, tablet or the
 * full width for desktop.
 * @public
 */
export const CorePreviewFrame = (
  props: CorePreviewFrameProps,
): React.ReactElement => {
  const { children, className } = props;

  // Hooks
  const { device } = useAtomValue(atomSettings);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'mx-auto overflow-visible border transition-all',
        PREVIEW_DEVICE_CLASS_NAMES[device],
        className,
      )}
      data-device={device}
      data-testid="CorePreviewFrame"
    >
      {children}
    </div>
  );
};
