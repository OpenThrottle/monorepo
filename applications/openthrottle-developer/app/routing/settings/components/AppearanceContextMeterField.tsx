import { chatContextMeterAtom } from '@openthrottle/react-router-chat-state';
import { Label, Switch } from '@openthrottle/react-router-shadcn';
import { useAtom } from 'jotai';
import * as React from 'react';

import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearanceContextMeterFieldProps {}

/**
 * @description Opt-in switch for the chat composer's context-window meter.
 * Owns `chatContextMeterAtom`, which lives outside the appearance config, so
 * "Reset appearance" leaves it alone.
 */
export const AppearanceContextMeterField = (
  _props: AppearanceContextMeterFieldProps,
): React.ReactElement => {
  // Hooks
  const [showContextMeter, setShowContextMeter] = useAtom(chatContextMeterAtom);
  const switchId = React.useId();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="AppearanceContextMeterField">
      <div className="flex items-center gap-3">
        <Switch
          checked={showContextMeter}
          id={switchId}
          onCheckedChange={setShowContextMeter}
        />
        <Label htmlFor={switchId}>{APPEARANCE_COPY.contextMeterLabel}</Label>
      </div>
      <p className="text-muted-foreground text-sm">
        {APPEARANCE_COPY.contextMeterHelp}
      </p>
    </div>
  );
};
