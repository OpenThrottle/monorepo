/**
 * @description Types for resolving OAuth Client ID Metadata Documents (CIMD).
 */
import type { OAuthClient } from '@openthrottle/nestjs-repositories-server';

/** @description The validated fields OT keeps from a metadata document. */
export interface ClientMetadataDocument {
  readonly clientId: string;
  readonly clientName: string | null;
  readonly clientUri: string | null;
  readonly logoUri: string | null;
  readonly redirectUris: readonly string[];
}

export type ParseClientMetadataDocumentResult =
  | { readonly document: ClientMetadataDocument; readonly ok: true }
  | { readonly error: string; readonly ok: false };

export type FetchClientMetadataResult =
  | { readonly body: string; readonly ok: true }
  | { readonly error: string; readonly ok: false };

export type ResolveMetadataDocumentClientResult =
  | { readonly client: OAuthClient; readonly ok: true }
  | { readonly error: string; readonly ok: false };
