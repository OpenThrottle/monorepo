/**
 * @description Inputs and result types for {@link OAuthService}. OAuth failures are values,
 * not exceptions: each carries the RFC 6749 error code the endpoint returns verbatim.
 */
import type {
  OAUTH_AUTHORIZATION_REQUEST_STATUSES,
  OAUTH_GRANT_REVOKED_REASONS,
  OAUTH_REGISTRATION_KINDS,
  OAUTH_SCOPES,
  OAUTH_TOKEN_KINDS,
} from './oauth.constants.ts';
import type { OAuthAuthorizationRequest } from './oauth-authorization-request.entity.ts';
import type { OAuthClient } from './oauth-client.entity.ts';
import type { OAuthGrant } from './oauth-grant.entity.ts';

export type OAuthScope = (typeof OAUTH_SCOPES)[keyof typeof OAUTH_SCOPES];

export type OAuthRegistrationKind =
  (typeof OAUTH_REGISTRATION_KINDS)[keyof typeof OAUTH_REGISTRATION_KINDS];

export type OAuthAuthorizationRequestStatus =
  (typeof OAUTH_AUTHORIZATION_REQUEST_STATUSES)[keyof typeof OAUTH_AUTHORIZATION_REQUEST_STATUSES];

export type OAuthGrantRevokedReason =
  (typeof OAUTH_GRANT_REVOKED_REASONS)[keyof typeof OAUTH_GRANT_REVOKED_REASONS];

export type OAuthTokenKind =
  (typeof OAUTH_TOKEN_KINDS)[keyof typeof OAUTH_TOKEN_KINDS];

/** @description A freshly minted opaque token: the plaintext (shown once) and what is stored. */
export interface MintedOAuthToken {
  readonly prefix: string;
  readonly secretHash: string;
  readonly token: string;
}

/** @description A token split into its lookup prefix and secret. */
export interface ParsedOAuthToken {
  readonly kind: OAuthTokenKind;
  readonly prefix: string;
  readonly secret: string;
}

/** @description RFC 6749 / 7591 error codes the service can produce. */
export type OAuthErrorCode =
  | 'access_denied'
  | 'invalid_client'
  | 'invalid_client_metadata'
  | 'invalid_grant'
  | 'invalid_redirect_uri'
  | 'invalid_request'
  | 'invalid_scope'
  | 'invalid_target';

export interface OAuthFailure {
  readonly description: string;
  readonly error: OAuthErrorCode;
  readonly ok: false;
}

export interface RegisterDynamicClientInput {
  readonly clientName: string | null;
  readonly clientUri: string | null;
  readonly logoUri: string | null;
  readonly redirectUris: readonly string[];
}

export type RegisterDynamicClientResult =
  { readonly client: OAuthClient; readonly ok: true } | OAuthFailure;

export interface UpsertMetadataDocumentClientInput {
  /** @description The metadata document URL, which is also the OAuth client_id. */
  readonly clientId: string;
  readonly clientName: string | null;
  readonly clientUri: string | null;
  readonly fetchedAt: Date;
  readonly logoUri: string | null;
  readonly redirectUris: readonly string[];
}

export interface CreateAuthorizationRequestInput {
  readonly client: OAuthClient;
  readonly codeChallenge: string;
  readonly now: Date;
  readonly redirectUri: string;
  readonly resource: string;
  readonly scopes: readonly OAuthScope[];
  readonly state: string | null;
}

export interface DecideAuthorizationRequestInput {
  readonly approve: boolean;
  readonly id: string;
  readonly now: Date;
  readonly scopes: readonly OAuthScope[];
  readonly userId: string;
}

export type DecideAuthorizationRequestResult =
  | {
      readonly code: string;
      readonly kind: 'approved';
      readonly ok: true;
      readonly request: OAuthAuthorizationRequest;
    }
  | {
      readonly kind: 'denied';
      readonly ok: true;
      readonly request: OAuthAuthorizationRequest;
    }
  | OAuthFailure;

export interface ExchangeAuthorizationCodeInput {
  readonly clientId: string;
  readonly code: string;
  readonly codeVerifier: string;
  readonly now: Date;
  readonly redirectUri: string;
  readonly resource: string | null;
}

export interface RefreshTokensInput {
  readonly clientId: string;
  readonly now: Date;
  readonly refreshToken: string;
  readonly resource: string | null;
  readonly scopes: readonly OAuthScope[] | null;
}

export interface IssuedOAuthTokens {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly grant: OAuthGrant;
  readonly ok: true;
  readonly refreshToken: string;
  readonly scopes: readonly string[];
}

export type IssueOAuthTokensResult = IssuedOAuthTokens | OAuthFailure;

/** @description What a valid access token resolves to. */
export interface VerifiedOAuthAccessToken {
  readonly clientId: string;
  readonly grantId: string;
  readonly resource: string;
  readonly scopes: readonly string[];
  readonly tokenId: string;
  readonly userId: string;
}

export interface RevokeGrantInput {
  readonly grantId: string;
  readonly now: Date;
  readonly reason: OAuthGrantRevokedReason;
  /** @description When set, only that user's grant is revoked. */
  readonly userId: string | null;
}
