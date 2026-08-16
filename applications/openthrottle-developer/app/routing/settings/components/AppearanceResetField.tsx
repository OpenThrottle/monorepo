import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
} from '@openthrottle/react-router-shadcn';
import { useAtom } from 'jotai';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import { countNonDefaultAppearanceFields } from '~/routing/settings/utils/count-non-default-appearance-fields';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearanceResetFieldProps {}

/**
 * @description Returns every appearance preference to its default in one click.
 * A single changed field resets straight away; two or more prompt first, since
 * one click would otherwise discard several separate choices at once.
 */
export const AppearanceResetField = (
  _props: AppearanceResetFieldProps,
): React.ReactElement => {
  // Hooks
  const [config, setConfig] = useAtom(configAtom);
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Setup
  const changedFieldCount = countNonDefaultAppearanceFields(config);
  const isDefault = changedFieldCount === 0;

  // Handlers
  const handleReset = (): void => {
    setConfig(DEFAULT_APPEARANCE_CONFIG);
    setIsConfirming(false);
  };

  const handleResetClick = (): void => {
    if (changedFieldCount > 1) {
      setIsConfirming(true);
      return;
    }

    handleReset();
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="AppearanceResetField">
      <Label>{APPEARANCE_COPY.resetLabel}</Label>
      <div>
        <Button
          disabled={isDefault}
          onClick={handleResetClick}
          size="sm"
          variant="outline"
        >
          {APPEARANCE_COPY.resetButton}
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        {APPEARANCE_COPY.resetHelp}
      </p>

      <AlertDialog onOpenChange={setIsConfirming} open={isConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {APPEARANCE_COPY.resetConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {APPEARANCE_COPY.resetConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {APPEARANCE_COPY.resetConfirmCancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              {APPEARANCE_COPY.resetConfirmConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
