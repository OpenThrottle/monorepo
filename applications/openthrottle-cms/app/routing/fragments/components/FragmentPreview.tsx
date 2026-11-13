import type { CmsFragment } from '@openthrottle/react-router-cms-core';
import {
  atomSettings,
  CORE_COMPONENTS,
  CoreRendererDevelopment,
} from '@openthrottle/react-router-cms-core';
import {
  cn,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { useAtom } from 'jotai';
import * as React from 'react';

import { FRAGMENT_PREVIEW_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_PREVIEW_DEVICES } from '~/routing/fragments/data/data.preview';
import type { CmsFragmentEditorRecords } from '~/routing/fragments/utils/to-cms-records';
import { toCmsPreviewFragments } from '~/routing/fragments/utils/to-cms-records';

export interface FragmentPreviewProps {
  readonly className: string | undefined;
  readonly records: CmsFragmentEditorRecords;
}

/**
 * @description The fragment rendered with its unsaved draft, in a frame sized by the device
 * toggle. Shares the editor's Jotai store, so render it inside the same `Provider` as
 * `FragmentEditor`: typing in a field then updates the preview without saving.
 */
export const FragmentPreview = (
  props: FragmentPreviewProps,
): React.ReactElement => {
  const { className, records } = props;

  // Hooks
  const [settings, setSettings] = useAtom(atomSettings);

  // Setup
  const fragments = toCmsPreviewFragments(records);

  // Handlers
  const onDeviceChange = (value: string): void => {
    const choice = FRAGMENT_PREVIEW_DEVICES.find((device) => {
      return device.value === value;
    });

    if (choice) setSettings({ ...settings, device: choice.value });
  };

  const getFragmentHref = (fragment: CmsFragment): string => {
    return `/fragments/${fragment.uuid}`;
  };

  // Markup
  const devices = FRAGMENT_PREVIEW_DEVICES.map((device) => {
    const Icon = device.icon;

    return (
      <ToggleGroupItem
        aria-label={device.label}
        key={device.value}
        value={device.value}
      >
        <Icon aria-hidden={true} className="size-4" />
      </ToggleGroupItem>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={FRAGMENT_PREVIEW_COPY.heading}
      className={cn('flex min-w-0 flex-col gap-4', className)}
      data-testid="FragmentPreview"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">{FRAGMENT_PREVIEW_COPY.heading}</p>
        <ToggleGroup
          aria-label={FRAGMENT_PREVIEW_COPY.deviceToggle}
          onValueChange={onDeviceChange}
          size="sm"
          type="single"
          value={settings.device}
          variant="outline"
        >
          {devices}
        </ToggleGroup>
      </div>
      <div className="bg-muted/30 overflow-auto rounded-md border p-4">
        <CoreRendererDevelopment
          className={undefined}
          componentRegistry={CORE_COMPONENTS}
          fragments={fragments}
          getFragmentHref={getFragmentHref}
          previewUrl={undefined}
          selectedUuid={records.fragment.uuid}
        />
      </div>
    </section>
  );
};
