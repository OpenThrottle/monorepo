import { animate } from 'motion/react';
import * as React from 'react';

import {
  FORM_FADE_MS,
  GRAIN_MIXER_REST,
  GRAIN_REST,
  HOLD_MS,
} from '~/routing/auth/config/animation';
import { assignDocumentLocation } from '~/routing/auth/utils/assignDocumentLocation';

export interface UseLoginExitAnimationOptions {
  readonly isLoginOk: boolean;
  readonly prefersReducedMotion: boolean | null;
  readonly redirectUrl: string;
}

export interface UseLoginExitAnimationResult {
  readonly isExiting: boolean;
}

/**
 * @description On successful login: fade the form out (CSS opacity over FORM_FADE_MS) while
 * the grain overlay tweens to 0, hold on the bare gradient for HOLD_MS, then do a
 * full-document redirect (not SPA navigate) so the root loader re-runs server-side with the
 * new cookie and we load with fresh credentials.
 */
export const useLoginExitAnimation = (
  options: UseLoginExitAnimationOptions,
): UseLoginExitAnimationResult => {
  const { isLoginOk, prefersReducedMotion, redirectUrl } = options;

  // Hooks
  const [isExiting, setIsExiting] = React.useState(false);
  const [_grainOverlay, setGrainOverlay] = React.useState(GRAIN_REST);
  const [_grainMixer, setGrainMixer] = React.useState(GRAIN_MIXER_REST);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!isLoginOk) {
      return;
    }

    if (prefersReducedMotion) {
      assignDocumentLocation(redirectUrl);
      return;
    }

    setIsExiting(true);

    const duration = FORM_FADE_MS / 1000;
    const ease = 'easeOut';

    const grain = animate(GRAIN_REST, 0, {
      duration,
      ease,
      onUpdate: setGrainOverlay,
    });
    const mixer = animate(GRAIN_MIXER_REST, 0, {
      duration,
      ease,
      onUpdate: setGrainMixer,
    });

    const timer = setTimeout(() => {
      assignDocumentLocation(redirectUrl);
    }, FORM_FADE_MS + HOLD_MS);

    return () => {
      grain.stop();
      mixer.stop();
      clearTimeout(timer);
    };
  }, [isLoginOk, prefersReducedMotion, redirectUrl]);

  // 🔌 Short Circuit

  return { isExiting };
};
