import { describe, expect, it } from 'vitest';

import { HEADER_APP_NAME, HEADER_APP_VERSION } from './index';

// These header names are a wire contract consumed by nestjs-graphql and
// nestjs-modules (Apollo/CLS wiring). Lock the literal values so an accidental
// rename here surfaces as a failing test rather than a silent runtime mismatch.
describe('header constants', () => {
  it('HEADER_APP_NAME is "x-app-name"', () => {
    expect(HEADER_APP_NAME).toBe('x-app-name');
  });

  it('HEADER_APP_VERSION is "x-app-version"', () => {
    expect(HEADER_APP_VERSION).toBe('x-app-version');
  });
});
