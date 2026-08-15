import * as React from 'react';
import { GLOBAL_FEATURE_ONBOARDING_MODAL } from '../config';
import { GlobalFeatureOnboarding } from './GlobalFeatureOnboarding';
import type { GlobalFeatureOnboardingContent } from './GlobalFeatureOnboarding';
import { GlobalModal } from './GlobalModal';

export interface GlobalFeatureOnboardingModalProps {
  readonly className?: string;
  /** Typed, feature-supplied onboarding copy — same object the inline empty-state uses. */
  readonly content: GlobalFeatureOnboardingContent;
}

/**
 * @description The onboarding "teach-me-fast" pitch surfaced in a dialog so it
 * stays reachable once a list is populated (the inline empty-state only renders
 * when empty & unfiltered). Bound to `?modal=onboarding` via {@link GlobalModal};
 * pair with a {@link GlobalFeatureOnboardingTrigger}. Renders the same
 * {@link GlobalFeatureOnboarding} content in `renderAs="dialog"` mode, so the copy
 * is single-sourced with the empty-state block.
 * @public
 */
export const GlobalFeatureOnboardingModal = (
  props: GlobalFeatureOnboardingModalProps,
): React.ReactElement => {
  const { className, content } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalModal
      param={GLOBAL_FEATURE_ONBOARDING_MODAL.param}
      value={GLOBAL_FEATURE_ONBOARDING_MODAL.value}
    >
      <GlobalFeatureOnboarding
        className={className}
        content={content}
        renderAs="dialog"
      />
    </GlobalModal>
  );
};

GlobalFeatureOnboardingModal.key = GLOBAL_FEATURE_ONBOARDING_MODAL.value;
