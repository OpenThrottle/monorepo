import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { AuthBackground } from '../AuthBackground';

// `/auth` derives `isMotionEnabled` from the stored appearance config, which
// the server never sees. That is only hydration-safe while the flag stays out
// of the markup and drives the canvas effect alone.
describe('AuthBackground', () => {
  describe('mesh background', () => {
    test('renders the same markup whether motion is enabled or not', () => {
      const enabled = renderToString(
        <AuthBackground isChaotic={false} isMotionEnabled={true} />,
      );
      const disabled = renderToString(
        <AuthBackground isChaotic={false} isMotionEnabled={false} />,
      );

      expect(enabled).toBe(disabled);
    });
  });

  describe('chaotic background', () => {
    test('renders the same markup whether motion is enabled or not', () => {
      const enabled = renderToString(
        <AuthBackground isChaotic={true} isMotionEnabled={true} />,
      );
      const disabled = renderToString(
        <AuthBackground isChaotic={true} isMotionEnabled={false} />,
      );

      expect(enabled).toBe(disabled);
    });
  });
});
