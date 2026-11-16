import { describe, expect, it } from 'vitest';

import {
  isFetchableAddress,
  isMetadataDocumentClientId,
  parseClientMetadataDocument,
} from './client-metadata.utils.ts';

const URL_ID = 'https://client.example.com/oauth/metadata.json';

describe('isMetadataDocumentClientId', () => {
  it('accepts an https URL with a path', () => {
    expect(isMetadataDocumentClientId(URL_ID)).toBe(true);
  });

  it('rejects non-https, root paths, ports, query, fragment, credentials and dot segments', () => {
    expect(isMetadataDocumentClientId('ot_client_abc')).toBe(false);
    expect(isMetadataDocumentClientId('http://client.example.com/m')).toBe(
      false,
    );
    expect(isMetadataDocumentClientId('https://client.example.com/')).toBe(
      false,
    );
    expect(
      isMetadataDocumentClientId('https://client.example.com:8443/m'),
    ).toBe(false);
    expect(isMetadataDocumentClientId('https://client.example.com/m?x=1')).toBe(
      false,
    );
    expect(isMetadataDocumentClientId('https://client.example.com/m#x')).toBe(
      false,
    );
    expect(isMetadataDocumentClientId('https://u:p@client.example.com/m')).toBe(
      false,
    );
    expect(
      isMetadataDocumentClientId('https://client.example.com/a/../m'),
    ).toBe(false);
  });
});

describe('isFetchableAddress', () => {
  it('allows public addresses', () => {
    expect(isFetchableAddress('93.184.216.34')).toBe(true);
    expect(isFetchableAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(true);
  });

  it('refuses loopback, private, link-local, CGNAT and metadata ranges', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      '::',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      'not-an-ip',
    ]) {
      expect(isFetchableAddress(address), address).toBe(false);
    }
  });
});

describe('parseClientMetadataDocument', () => {
  const valid = {
    client_id: URL_ID,
    client_name: 'Example',
    redirect_uris: ['http://127.0.0.1/callback'],
  };

  it('accepts a public-client document whose client_id equals its URL', () => {
    const result = parseClientMetadataDocument(JSON.stringify(valid), URL_ID);

    expect(result).toEqual({
      document: {
        clientId: URL_ID,
        clientName: 'Example',
        clientUri: null,
        logoUri: null,
        redirectUris: ['http://127.0.0.1/callback'],
      },
      ok: true,
    });
  });

  describe('when the document is unacceptable', () => {
    it('refuses a client_id mismatch', () => {
      const body = JSON.stringify({
        ...valid,
        client_id: 'https://other.example/m',
      });

      expect(parseClientMetadataDocument(body, URL_ID).ok).toBe(false);
    });

    it('refuses a confidential client', () => {
      const body = JSON.stringify({
        ...valid,
        token_endpoint_auth_method: 'private_key_jwt',
      });

      expect(parseClientMetadataDocument(body, URL_ID).ok).toBe(false);
    });

    it('refuses missing or unsafe redirect URIs', () => {
      expect(
        parseClientMetadataDocument(
          JSON.stringify({ ...valid, redirect_uris: [] }),
          URL_ID,
        ).ok,
      ).toBe(false);
      expect(
        parseClientMetadataDocument(
          JSON.stringify({
            ...valid,
            redirect_uris: ['http://evil.example/cb'],
          }),
          URL_ID,
        ).ok,
      ).toBe(false);
    });

    it('refuses non-JSON and non-objects', () => {
      expect(parseClientMetadataDocument('<html>', URL_ID).ok).toBe(false);
      expect(parseClientMetadataDocument('[]', URL_ID).ok).toBe(false);
    });
  });
});
