import {
  GlobalAnimationMesh,
  GlobalAnimationWaves,
} from '@openthrottle/react-router-ui-global';
import * as React from 'react';

export interface AuthBackgroundProps {
  isChaotic: boolean;
  isMotionEnabled: boolean;
}

export const AuthBackground = (
  props: AuthBackgroundProps,
): React.ReactElement => {
  const { isChaotic, isMotionEnabled } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const chaoticBackground = (
    <GlobalAnimationWaves
      attack={0.21}
      colorEnd="0, 0, 300"
      colorMid="0, 200, 0"
      colorStart="0, 0, 300"
      distributionEnd={-0.6}
      distributionStart={0.6}
      enabled={isMotionEnabled}
      n={100}
    />
  );
  const meshBackground = <GlobalAnimationMesh enabled={isMotionEnabled} />;

  // Life Cycle

  // 🔌 Short Circuit

  return isChaotic ? chaoticBackground : meshBackground;
};
