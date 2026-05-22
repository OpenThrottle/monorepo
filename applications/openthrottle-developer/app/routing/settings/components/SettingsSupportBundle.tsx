import * as React from 'react';
import { Button, toast } from '@openthrottle/react-router-shadcn';
import {
  buildSupportBundlePayload,
  copyText,
  downloadJson,
} from '~/routing/settings/utils/settings.support';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';

export interface SettingsSupportBundleProps {}

export const SettingsSupportBundle = (_props: SettingsSupportBundleProps) => {
  // Hooks

  // Setup

  // Handlers
  const handleCopyBundle = async (): Promise<void> => {
    const payload = buildSupportBundlePayload();

    await copyText(JSON.stringify(payload, null, 2));

    toast.success('Support bundle copied to clipboard');
  };

  const handleDownloadBundle = (): void => {
    downloadJson(buildSupportBundlePayload());

    toast.success('Support bundle downloaded');
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset id="support-bundle" legend="Support bundle">
      <div className="flex flex-col gap-4">
        <p className="space-y-2 text-sm text-muted-foreground">
          Includes sanitized <code className="text-xs">window.env</code>, page
          URL, user agent, language, and the{' '}
          <strong className="font-medium text-foreground">full</strong> client
          log buffer (not the filtered view). Attach the file or pasted JSON to
          bug reports; omit sensitive context outside this bundle if needed.
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={handleCopyBundle}
            size="sm"
            type="button"
            variant="outline"
          >
            Copy bundle JSON
          </Button>
          <Button
            onClick={handleDownloadBundle}
            size="sm"
            type="button"
            variant="secondary"
          >
            Download bundle JSON
          </Button>
        </div>
      </div>
    </OpenThrottleFieldset>
  );
};
