import { describe, it, expect } from 'vitest';
import { NestjsSlackError } from './nestjs-slack.error';
import {
  validateNestjsSlackOptions,
  type NestjsSlackModuleOptions,
} from './nestjs-slack.options';

describe('validateNestjsSlackOptions', () => {
  describe('when options are null or undefined', () => {
    it('throws NestjsSlackError when options is null', () => {
      expect(() => validateNestjsSlackOptions(null)).toThrow(NestjsSlackError);
    });

    it('throws when options is null', () => {
      expect(() => validateNestjsSlackOptions(null)).toThrow(
        /options are required.*forRoot/,
      );
    });

    it('throws when options is undefined', () => {
      expect(() => validateNestjsSlackOptions(undefined)).toThrow(
        /options are required.*forRoot/,
      );
    });
  });

  describe('when webhookUrl is missing or invalid type', () => {
    it('throws when webhookUrl is missing', () => {
      expect(() => validateNestjsSlackOptions({})).toThrow(
        /webhookUrl is required and must be a non-empty string/,
      );
    });

    it('throws when webhookUrl is empty string', () => {
      expect(() =>
        validateNestjsSlackOptions({
          webhookUrl: '',
        } as NestjsSlackModuleOptions),
      ).toThrow(/webhookUrl is required and must be a non-empty string/);
    });

    it('throws when webhookUrl is whitespace only', () => {
      expect(() =>
        validateNestjsSlackOptions({
          webhookUrl: '   ',
        } as NestjsSlackModuleOptions),
      ).toThrow(/webhookUrl is required and must be a non-empty string/);
    });

    it('throws when webhookUrl is not a string', () => {
      expect(() =>
        validateNestjsSlackOptions({
          webhookUrl: 123,
        } as unknown as NestjsSlackModuleOptions),
      ).toThrow(/webhookUrl is required and must be a non-empty string/);
    });
  });

  describe('when webhookUrl is not a valid URL', () => {
    it('throws when webhookUrl is not a URL', () => {
      expect(() =>
        validateNestjsSlackOptions({ webhookUrl: 'not-a-url' }),
      ).toThrow(/webhookUrl is not a valid URL/);
    });

    it('throws when protocol is not http or https', () => {
      expect(() =>
        validateNestjsSlackOptions({ webhookUrl: 'ftp://example.com/foo' }),
      ).toThrow(/webhookUrl must use http or https/);
    });
  });

  describe('when webhookUrl uses cleartext http against a non-loopback host', () => {
    it('throws for http against a remote host', () => {
      expect(() =>
        validateNestjsSlackOptions({ webhookUrl: 'http://example.com/foo' }),
      ).toThrow(/must use https for non-loopback hosts/);
    });

    it('does not throw for http against 127.0.0.1', () => {
      expect(() =>
        validateNestjsSlackOptions({
          webhookUrl: 'http://127.0.0.1:3000/webhook',
        }),
      ).not.toThrow();
    });
  });

  describe('when allowedHosts is provided', () => {
    it('throws when the host is not in the allowlist', () => {
      expect(() =>
        validateNestjsSlackOptions({
          allowedHosts: ['hooks.slack.com'],
          webhookUrl: 'https://example.com/slack-webhook',
        }),
      ).toThrow(/webhookUrl host is not allowed/);
    });

    it('does not throw when the host matches an exact allowlist entry', () => {
      expect(() =>
        validateNestjsSlackOptions({
          allowedHosts: ['hooks.slack.com'],
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        }),
      ).not.toThrow();
    });

    it('does not throw when the host matches a wildcard allowlist entry', () => {
      expect(() =>
        validateNestjsSlackOptions({
          allowedHosts: ['*.slack.com'],
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        }),
      ).not.toThrow();
    });

    it('matches the allowlist case-insensitively', () => {
      expect(() =>
        validateNestjsSlackOptions({
          allowedHosts: ['Hooks.Slack.Com'],
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        }),
      ).not.toThrow();
    });

    it('does not match the apex domain for a leading-wildcard pattern', () => {
      expect(() =>
        validateNestjsSlackOptions({
          allowedHosts: ['*.slack.com'],
          webhookUrl: 'https://slack.com/services/T00/B00/xxx',
        }),
      ).toThrow(/webhookUrl host is not allowed/);
    });
  });

  describe('when webhookUrl is valid', () => {
    it('does not throw for https Slack webhook URL', () => {
      expect(() =>
        validateNestjsSlackOptions({
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        }),
      ).not.toThrow();
    });

    it('does not throw for http localhost URL', () => {
      expect(() =>
        validateNestjsSlackOptions({
          webhookUrl: 'http://localhost:3000/webhook',
        }),
      ).not.toThrow();
    });

    it('does not throw for https arbitrary URL', () => {
      expect(() =>
        validateNestjsSlackOptions({
          webhookUrl: 'https://example.com/slack-webhook',
        }),
      ).not.toThrow();
    });
  });
});
