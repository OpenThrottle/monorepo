import { useAtomValue } from 'jotai';
import * as React from 'react';
import { useSearchParams } from 'react-router';

import { CMS_DEVICE } from '../config/cms-device';
import { atomFragmentDraft } from '../data/data.atom.fragment-draft';
import { atomSettings } from '../data/data.atom.settings';
import { PREVIEW_COPY } from '../data/data.copy';
import type { CmsFragment } from '../types/cms-fragment';
import type { CmsComponentRegistry } from '../types/cms-render';
import { applyFragmentDraft } from '../utils/applyFragmentDraft';
import { CorePreviewFrame } from './CorePreviewFrame';
import { CoreRendererDebug } from './CoreRendererDebug';

/**
 * @public
 */
export interface CoreRendererDevelopmentProps {
  readonly className: string | undefined;
  readonly componentRegistry: CmsComponentRegistry;
  readonly fragments: readonly CmsFragment[];
  readonly getFragmentHref: (fragment: CmsFragment) => string;
  /**
   * The app's standalone render route. On a phone-sized preview the page loads there in an iframe,
   * so its own viewport applies; `undefined` renders inline instead.
   */
  readonly previewUrl: string | undefined;
  /** The fragment being edited; the draft is merged over its properties. */
  readonly selectedUuid: string | undefined;
}

/**
 * @description The editor's preview: the page in a device frame, showing unsaved edits to the
 * selected fragment as they are typed. `?debug=true` turns on the editing layer.
 * @public
 */
export const CoreRendererDevelopment = (
  props: CoreRendererDevelopmentProps,
): React.ReactElement => {
  const {
    className,
    componentRegistry,
    fragments,
    getFragmentHref,
    previewUrl,
    selectedUuid,
  } = props;

  // Hooks
  const draft = useAtomValue(atomFragmentDraft);
  const { device } = useAtomValue(atomSettings);
  const [searchParams] = useSearchParams();

  // Setup
  const debug = searchParams.get('debug') === 'true';
  const previewed = applyFragmentDraft(fragments, selectedUuid, draft);
  const isIframe = device === CMS_DEVICE.MOBILE && previewUrl !== undefined;
  const src = `${previewUrl ?? ''}?${searchParams.toString()}`;

  // Handlers

  // Markup
  const iframe = (
    <iframe
      className="z-0 block h-full w-full"
      src={src}
      title={PREVIEW_COPY.iframeTitle}
    />
  );

  const inline = (
    <CoreRendererDebug
      className={undefined}
      componentRegistry={componentRegistry}
      debug={debug}
      fragments={previewed}
      getFragmentHref={getFragmentHref}
      selectedUuid={selectedUuid}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CorePreviewFrame className={className}>
      {isIframe ? iframe : inline}
    </CorePreviewFrame>
  );
};
