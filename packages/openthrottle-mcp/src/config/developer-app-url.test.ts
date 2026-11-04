/**
 * @description Resolution order and normalization of the developer-app base URL used for blog editor links.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_DEVELOPER_APP_URL,
  getBlogPostEditorUrl,
  getDeveloperAppBaseUrl,
} from './developer-app-url.ts';

describe('getDeveloperAppBaseUrl', () => {
  let previousAppUrl: string | undefined;
  let previousDeveloperUrl: string | undefined;

  beforeEach(() => {
    previousAppUrl = process.env.APP_URL_DEVELOPER;
    previousDeveloperUrl = process.env.OPENTHROTTLE_DEVELOPER_URL;
    delete process.env.APP_URL_DEVELOPER;
    delete process.env.OPENTHROTTLE_DEVELOPER_URL;
  });

  afterEach(() => {
    if (previousAppUrl === undefined) delete process.env.APP_URL_DEVELOPER;
    else process.env.APP_URL_DEVELOPER = previousAppUrl;
    if (previousDeveloperUrl === undefined) {
      delete process.env.OPENTHROTTLE_DEVELOPER_URL;
    } else {
      process.env.OPENTHROTTLE_DEVELOPER_URL = previousDeveloperUrl;
    }
  });

  describe('when nothing is configured', () => {
    it('falls back to the local developer app origin', () => {
      expect(getDeveloperAppBaseUrl()).toBe(DEFAULT_DEVELOPER_APP_URL);
      expect(DEFAULT_DEVELOPER_APP_URL).toBe('http://localhost:6020');
    });
  });

  describe('when only APP_URL_DEVELOPER is set', () => {
    it('uses it', () => {
      process.env.APP_URL_DEVELOPER = 'https://dev.example.com';

      expect(getDeveloperAppBaseUrl()).toBe('https://dev.example.com');
    });
  });

  describe('when both are set', () => {
    it('prefers OPENTHROTTLE_DEVELOPER_URL and strips trailing slashes', () => {
      process.env.APP_URL_DEVELOPER = 'https://dev.example.com';
      process.env.OPENTHROTTLE_DEVELOPER_URL = 'http://localhost:7190//';

      expect(getDeveloperAppBaseUrl()).toBe('http://localhost:7190');
    });
  });

  describe('when a value is blank', () => {
    it('treats it as unset', () => {
      process.env.OPENTHROTTLE_DEVELOPER_URL = '   ';

      expect(getDeveloperAppBaseUrl()).toBe(DEFAULT_DEVELOPER_APP_URL);
    });
  });
});

describe('getBlogPostEditorUrl', () => {
  it('appends /blog/<postId> to the base URL', () => {
    process.env.OPENTHROTTLE_DEVELOPER_URL = 'http://localhost:7190';
    try {
      expect(getBlogPostEditorUrl('abc-123')).toBe(
        'http://localhost:7190/blog/abc-123',
      );
    } finally {
      delete process.env.OPENTHROTTLE_DEVELOPER_URL;
    }
  });
});
