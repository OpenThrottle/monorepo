/**
 * @description Resolves an OAuth client whose client_id is a Client ID Metadata Document
 * URL: fetches the document under an SSRF guard, validates it, and caches it as an
 * `oauth_clients` row (registration_kind = cimd).
 *
 * The guard runs in the socket's `lookup` hook, so the address check applies to the
 * address actually connected to — a hostname cannot resolve to a public address for a
 * pre-check and a private one for the connection (DNS rebinding). No redirects are
 * followed; the body is capped and the request times out.
 */
import type { LookupAddress } from 'node:dns';
import { lookup as dnsLookup } from 'node:dns';
import { request } from 'node:https';

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { OAuthService } from '@openthrottle/nestjs-repositories-server';

import {
  CLIENT_METADATA_FRESH_MS,
  CLIENT_METADATA_MAX_BYTES,
  CLIENT_METADATA_STALE_IF_ERROR_MS,
  CLIENT_METADATA_TIMEOUT_MS,
} from './client-metadata.constants.ts';
import type {
  FetchClientMetadataResult,
  ResolveMetadataDocumentClientResult,
} from './client-metadata.types.ts';
import {
  isFetchableAddress,
  isMetadataDocumentClientId,
  parseClientMetadataDocument,
} from './client-metadata.utils.ts';

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

const guardedLookup = (
  hostname: string,
  options: object,
  callback: LookupCallback,
): void => {
  dnsLookup(hostname, { all: true }, (error, addresses) => {
    if (error !== null) {
      callback(error, []);
      return;
    }
    const blocked = addresses.find(
      (entry) => !isFetchableAddress(entry.address),
    );
    if (blocked !== undefined || addresses.length === 0) {
      const refusal: NodeJS.ErrnoException = new Error(
        `refusing to fetch client metadata from non-public address ${blocked?.address ?? '(none)'}`,
      );
      refusal.code = 'EOT_BLOCKED_ADDRESS';
      callback(refusal, []);
      return;
    }
    if ('all' in options && options.all === true) {
      callback(null, addresses);
      return;
    }
    const [first] = addresses;
    callback(null, first?.address ?? '', first?.family);
  });
};

@Injectable()
export class ClientMetadataService {
  constructor(
    private readonly logger: LoggerService,
    private readonly oauthService: OAuthService,
  ) {}

  /**
   * @description Whether a client_id should be resolved as a metadata document.
   */
  isMetadataDocumentClientId(clientId: string): boolean {
    return isMetadataDocumentClientId(clientId);
  }

  /**
   * @description Returns the cached client when fresh; otherwise fetches, validates and
   * stores the document. A failed re-fetch falls back to a cached copy under 24 hours old.
   */
  async resolve(
    clientId: string,
    now: Date,
  ): Promise<ResolveMetadataDocumentClientResult> {
    if (!isMetadataDocumentClientId(clientId)) {
      return {
        error: 'client_id is not a valid metadata document URL.',
        ok: false,
      };
    }

    const cached = await this.oauthService.findClientByClientId(clientId);
    const fetchedAt =
      cached?.metadataFetchedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const age = now.getTime() - fetchedAt;
    if (cached !== null && age < CLIENT_METADATA_FRESH_MS) {
      return { client: cached, ok: true };
    }

    const fetched = await this.fetchDocument(clientId);
    const parsed = fetched.ok
      ? parseClientMetadataDocument(fetched.body, clientId)
      : fetched;

    if (!parsed.ok) {
      this.logger.warn(
        `oauth: client metadata ${clientId} unusable: ${parsed.error}`,
      );
      if (cached !== null && age < CLIENT_METADATA_STALE_IF_ERROR_MS) {
        return { client: cached, ok: true };
      }
      return { error: parsed.error, ok: false };
    }

    const client = await this.oauthService.upsertMetadataDocumentClient({
      ...parsed.document,
      fetchedAt: now,
    });
    return { client, ok: true };
  }

  private fetchDocument(url: string): Promise<FetchClientMetadataResult> {
    return new Promise((resolve) => {
      const req = request(
        url,
        {
          headers: { accept: 'application/json' },
          lookup: guardedLookup,
          method: 'GET',
          timeout: CLIENT_METADATA_TIMEOUT_MS,
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            resolve({
              error: `Fetching the client metadata document returned HTTP ${res.statusCode ?? 0} (redirects are not followed).`,
              ok: false,
            });
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > CLIENT_METADATA_MAX_BYTES) {
              req.destroy();
              resolve({
                error: 'The client metadata document is too large.',
                ok: false,
              });
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => {
            resolve({ body: Buffer.concat(chunks).toString('utf8'), ok: true });
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({
          error: 'Fetching the client metadata document timed out.',
          ok: false,
        });
      });
      req.on('error', (error) => {
        resolve({
          error: `Could not fetch the client metadata document: ${error.message}`,
          ok: false,
        });
      });
      req.end();
    });
  }
}
