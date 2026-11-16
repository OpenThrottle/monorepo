/**
 * @description The OpenThrottle OAuth authorization server's persistence: clients, authorization
 * requests, grants and opaque tokens. Every single-use transition (code redemption, refresh
 * rotation) is a conditional UPDATE so two concurrent requests cannot both win. Design:
 * docs/openthrottle/mcp-oauth-design.md.
 */
import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { EntityManager } from 'typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import {
  OAUTH_AUTHORIZATION_REQUEST_STATUSES,
  OAUTH_GRANT_REVOKED_REASONS,
  OAUTH_LIFETIMES_MS,
  OAUTH_REGISTRATION_KINDS,
  OAUTH_TOKEN_KINDS,
} from './oauth.constants.ts';
import type {
  CreateAuthorizationRequestInput,
  DecideAuthorizationRequestInput,
  DecideAuthorizationRequestResult,
  ExchangeAuthorizationCodeInput,
  IssuedOAuthTokens,
  IssueOAuthTokensResult,
  OAuthErrorCode,
  OAuthFailure,
  RefreshTokensInput,
  RegisterDynamicClientInput,
  RegisterDynamicClientResult,
  RevokeGrantInput,
  UpsertMetadataDocumentClientInput,
  VerifiedOAuthAccessToken,
} from './oauth.types.ts';
import {
  hashOAuthSecret,
  isRegistrableRedirectUri,
  mintAuthorizationCode,
  mintOAuthToken,
  oauthHashesEqual,
  parseOAuthToken,
  verifyPkceS256,
} from './oauth.utils.ts';
import { OAuthAuthorizationRequest } from './oauth-authorization-request.entity.ts';
import { OAuthClient } from './oauth-client.entity.ts';
import { OAuthGrant } from './oauth-grant.entity.ts';
import { OAuthToken } from './oauth-token.entity.ts';

const MAX_REDIRECT_URIS = 10;

const fail = (error: OAuthErrorCode, description: string): OAuthFailure => {
  return { description, error, ok: false };
};

const addMs = (date: Date, ms: number): Date => {
  return new Date(date.getTime() + ms);
};

const earliest = (a: Date, b: Date): Date => {
  return a.getTime() <= b.getTime() ? a : b;
};

@Injectable()
export class OAuthService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    @InjectRepository(OAuthAuthorizationRequest)
    private readonly requestRepository: Repository<OAuthAuthorizationRequest>,
    @InjectRepository(OAuthGrant)
    private readonly grantRepository: Repository<OAuthGrant>,
    @InjectRepository(OAuthToken)
    private readonly tokenRepository: Repository<OAuthToken>,
  ) {
    this.logger.debug('🔑 oauth 🔑');
  }

  /**
   * @description Finds a client by the OAuth `client_id` it presents.
   */
  async findClientByClientId(clientId: string): Promise<OAuthClient | null> {
    return this.clientRepository.findOne({ where: { clientId } });
  }

  /**
   * @description RFC 7591 registration of a public client. Validates redirect URIs; never issues a secret.
   */
  async registerDynamicClient(
    input: RegisterDynamicClientInput,
  ): Promise<RegisterDynamicClientResult> {
    if (input.redirectUris.length === 0) {
      return fail('invalid_redirect_uri', 'redirect_uris is required.');
    }
    if (input.redirectUris.length > MAX_REDIRECT_URIS) {
      return fail(
        'invalid_redirect_uri',
        `At most ${MAX_REDIRECT_URIS} redirect_uris are allowed.`,
      );
    }
    const invalid = input.redirectUris.find(
      (uri) => !isRegistrableRedirectUri(uri),
    );
    if (invalid !== undefined) {
      return fail(
        'invalid_redirect_uri',
        `redirect_uri "${invalid}" must be https, loopback http, or a private-use scheme, with no fragment.`,
      );
    }

    const client = await this.clientRepository.save(
      this.clientRepository.create({
        clientId: `ot_client_${randomUUID().replace(/-/g, '')}`,
        clientName: input.clientName,
        clientUri: input.clientUri,
        logoUri: input.logoUri,
        metadataFetchedAt: null,
        redirectUris: [...input.redirectUris],
        registrationKind: OAUTH_REGISTRATION_KINDS.DCR,
      }),
    );

    return { client, ok: true };
  }

  /**
   * @description Inserts or refreshes a client resolved from a Client ID Metadata Document.
   * The caller has already fetched and validated the document; this only persists it.
   */
  async upsertMetadataDocumentClient(
    input: UpsertMetadataDocumentClientInput,
  ): Promise<OAuthClient> {
    const existing = await this.findClientByClientId(input.clientId);
    const entity =
      existing ??
      this.clientRepository.create({
        clientId: input.clientId,
        lastUsedAt: null,
        registrationKind: OAUTH_REGISTRATION_KINDS.CIMD,
      });

    this.clientRepository.merge(entity, {
      clientName: input.clientName,
      clientUri: input.clientUri,
      logoUri: input.logoUri,
      metadataFetchedAt: input.fetchedAt,
      redirectUris: [...input.redirectUris],
    });

    return this.clientRepository.save(entity);
  }

  /**
   * @description Persists a validated authorization request awaiting the user's consent.
   */
  async createAuthorizationRequest(
    input: CreateAuthorizationRequestInput,
  ): Promise<OAuthAuthorizationRequest> {
    await this.clientRepository.update(
      { id: input.client.id },
      { lastUsedAt: input.now },
    );

    return this.requestRepository.save(
      this.requestRepository.create({
        clientRowId: input.client.id,
        codeChallenge: input.codeChallenge,
        codeHash: null,
        decidedAt: null,
        expiresAt: addMs(input.now, OAUTH_LIFETIMES_MS.CONSENT),
        grantId: null,
        grantedScopes: null,
        redirectUri: input.redirectUri,
        requestedScopes: [...input.scopes],
        resource: input.resource,
        state: input.state,
        status: OAUTH_AUTHORIZATION_REQUEST_STATUSES.PENDING,
        userId: null,
      }),
    );
  }

  /**
   * @description A pending, unexpired authorization request with its client, or null.
   */
  async findPendingAuthorizationRequest(
    id: string,
    now: Date,
  ): Promise<OAuthAuthorizationRequest | null> {
    return this.requestRepository.findOne({
      relations: { client: true },
      where: {
        expiresAt: MoreThan(now),
        id,
        status: OAUTH_AUTHORIZATION_REQUEST_STATUSES.PENDING,
      },
    });
  }

  /**
   * @description Records the user's decision. Approval narrows the scopes to what was
   * both requested and approved and mints a 60-second single-use code.
   */
  async decideAuthorizationRequest(
    input: DecideAuthorizationRequestInput,
  ): Promise<DecideAuthorizationRequestResult> {
    const request = await this.findPendingAuthorizationRequest(
      input.id,
      input.now,
    );
    if (request == null) {
      return fail(
        'invalid_request',
        'The authorization request is unknown, already decided, or expired.',
      );
    }

    if (!input.approve) {
      const claimed = await this.claimPendingRequest(input.id, {
        decidedAt: input.now,
        status: OAUTH_AUTHORIZATION_REQUEST_STATUSES.DENIED,
        userId: input.userId,
      });
      if (!claimed) {
        return fail(
          'invalid_request',
          'The authorization request was already decided.',
        );
      }
      return { kind: 'denied', ok: true, request };
    }

    const grantedScopes = input.scopes.filter((scope) =>
      request.requestedScopes.includes(scope),
    );
    if (grantedScopes.length === 0) {
      return fail('invalid_scope', 'Approve at least one requested scope.');
    }

    const { code, codeHash } = mintAuthorizationCode();
    const claimed = await this.claimPendingRequest(input.id, {
      codeHash,
      decidedAt: input.now,
      expiresAt: addMs(input.now, OAUTH_LIFETIMES_MS.AUTHORIZATION_CODE),
      grantedScopes,
      status: OAUTH_AUTHORIZATION_REQUEST_STATUSES.APPROVED,
      userId: input.userId,
    });
    if (!claimed) {
      return fail(
        'invalid_request',
        'The authorization request was already decided.',
      );
    }

    return { code, kind: 'approved', ok: true, request };
  }

  /**
   * @description The token endpoint's `authorization_code` grant: PKCE S256, client,
   * redirect URI and resource must all match. Redeeming a code twice revokes the grant
   * the first redemption produced (OAuth 2.1 §4.1.3).
   */
  async exchangeAuthorizationCode(
    input: ExchangeAuthorizationCodeInput,
  ): Promise<IssueOAuthTokensResult> {
    const request = await this.requestRepository.findOne({
      relations: { client: true },
      where: { codeHash: hashOAuthSecret(input.code) },
    });
    if (request == null) {
      return fail('invalid_grant', 'Unknown authorization code.');
    }

    if (request.status === OAUTH_AUTHORIZATION_REQUEST_STATUSES.EXCHANGED) {
      if (request.grantId != null) {
        await this.revokeGrant({
          grantId: request.grantId,
          now: input.now,
          reason: OAUTH_GRANT_REVOKED_REASONS.CODE_REUSE,
          userId: null,
        });
      }
      return fail('invalid_grant', 'Authorization code already used.');
    }

    const mismatch = this.describeCodeMismatch(request, input);
    if (mismatch !== null) {
      return fail('invalid_grant', mismatch);
    }

    const userId = request.userId;
    const grantedScopes = request.grantedScopes;
    if (userId == null || grantedScopes == null) {
      return fail('invalid_grant', 'Authorization code was not approved.');
    }

    return this.requestRepository.manager.transaction(async (manager) => {
      const claim = await manager
        .createQueryBuilder()
        .update(OAuthAuthorizationRequest)
        .set({ status: OAUTH_AUTHORIZATION_REQUEST_STATUSES.EXCHANGED })
        .where('id = :id AND status = :status', {
          id: request.id,
          status: OAUTH_AUTHORIZATION_REQUEST_STATUSES.APPROVED,
        })
        .execute();
      if (claim.affected !== 1) {
        return fail('invalid_grant', 'Authorization code already used.');
      }

      const grant = await manager.save(
        manager.create(OAuthGrant, {
          clientRowId: request.clientRowId,
          expiresAt: addMs(input.now, OAUTH_LIFETIMES_MS.GRANT),
          lastUsedAt: null,
          resource: request.resource,
          revokedAt: null,
          revokedReason: null,
          scopes: grantedScopes,
          userId,
        }),
      );
      await manager.update(
        OAuthAuthorizationRequest,
        { id: request.id },
        { grantId: grant.id },
      );

      const { issued } = await this.issueTokenPair(manager, grant, input.now);
      return issued;
    });
  }

  /**
   * @description The token endpoint's `refresh_token` grant. Rotates: the presented
   * token is revoked and replaced. Presenting an already-rotated token is reuse and
   * revokes the whole grant (OAuth 2.1 §4.3.1).
   */
  async refreshTokens(
    input: RefreshTokensInput,
  ): Promise<IssueOAuthTokensResult> {
    const parsed = parseOAuthToken(input.refreshToken);
    if (parsed == null || parsed.kind !== OAUTH_TOKEN_KINDS.REFRESH) {
      return fail('invalid_grant', 'Malformed refresh token.');
    }

    const token = await this.tokenRepository.findOne({
      relations: { grant: { client: true } },
      where: { kind: OAUTH_TOKEN_KINDS.REFRESH, prefix: parsed.prefix },
    });
    if (
      token == null ||
      !oauthHashesEqual(token.secretHash, hashOAuthSecret(parsed.secret))
    ) {
      return fail('invalid_grant', 'Unknown refresh token.');
    }

    const { grant } = token;
    if (grant.client.clientId !== input.clientId) {
      return fail(
        'invalid_grant',
        'Refresh token was issued to another client.',
      );
    }

    if (token.revokedAt != null) {
      if (token.replacedBy != null) {
        this.logger.warn(
          `oauth: refresh token ${token.prefix} replayed after rotation; revoking grant ${grant.id}`,
        );
        await this.revokeGrant({
          grantId: grant.id,
          now: input.now,
          reason: OAUTH_GRANT_REVOKED_REASONS.REFRESH_REUSE,
          userId: null,
        });
      }
      return fail('invalid_grant', 'Refresh token is no longer valid.');
    }

    if (!this.isGrantLive(grant, input.now) || token.expiresAt <= input.now) {
      return fail('invalid_grant', 'The grant has expired or was revoked.');
    }
    if (input.resource !== null && input.resource !== grant.resource) {
      return fail('invalid_target', 'resource does not match the grant.');
    }
    const widened = (input.scopes ?? []).find(
      (scope) => !grant.scopes.includes(scope),
    );
    if (widened !== undefined) {
      return fail('invalid_scope', `Scope ${widened} was not granted.`);
    }

    return this.tokenRepository.manager.transaction(async (manager) => {
      const claim = await manager
        .createQueryBuilder()
        .update(OAuthToken)
        .set({ revokedAt: input.now })
        .where('id = :id AND revoked_at IS NULL', { id: token.id })
        .execute();
      if (claim.affected !== 1) {
        return fail('invalid_grant', 'Refresh token is no longer valid.');
      }

      const { issued, refreshTokenId } = await this.issueTokenPair(
        manager,
        grant,
        input.now,
      );
      await manager.update(
        OAuthToken,
        { id: token.id },
        { replacedBy: refreshTokenId },
      );
      return issued;
    });
  }

  /**
   * @description Resolves a bearer access token, or null when it is malformed, unknown,
   * expired, revoked, or its grant is no longer live. Touches the grant's
   * `last_used_at` at most once a minute.
   */
  async verifyAccessToken(
    token: string,
    now: Date,
  ): Promise<VerifiedOAuthAccessToken | null> {
    const parsed = parseOAuthToken(token.replace(/^bearer\s+/i, ''));
    if (parsed == null || parsed.kind !== OAUTH_TOKEN_KINDS.ACCESS) {
      return null;
    }

    const row = await this.tokenRepository.findOne({
      relations: { grant: { client: true } },
      where: { kind: OAUTH_TOKEN_KINDS.ACCESS, prefix: parsed.prefix },
    });
    if (
      row == null ||
      !oauthHashesEqual(row.secretHash, hashOAuthSecret(parsed.secret)) ||
      row.revokedAt != null ||
      row.expiresAt <= now ||
      !this.isGrantLive(row.grant, now)
    ) {
      return null;
    }

    const { grant } = row;
    const lastUsed = grant.lastUsedAt?.getTime() ?? 0;
    if (
      now.getTime() - lastUsed >=
      OAUTH_LIFETIMES_MS.LAST_USED_WRITE_INTERVAL
    ) {
      await this.grantRepository.update({ id: grant.id }, { lastUsedAt: now });
    }

    return {
      clientId: grant.client.clientId,
      grantId: grant.id,
      resource: grant.resource,
      scopes: grant.scopes,
      tokenId: row.id,
      userId: grant.userId,
    };
  }

  /**
   * @description RFC 7009 revocation. A refresh token revokes its whole grant; an access
   * token revokes only itself. Unknown tokens are a silent success, per the RFC.
   */
  async revokeToken(
    rawToken: string,
    clientId: string,
    now: Date,
  ): Promise<void> {
    const parsed = parseOAuthToken(rawToken);
    if (parsed == null) {
      return;
    }

    const row = await this.tokenRepository.findOne({
      relations: { grant: { client: true } },
      where: { kind: parsed.kind, prefix: parsed.prefix },
    });
    if (
      row == null ||
      row.grant.client.clientId !== clientId ||
      !oauthHashesEqual(row.secretHash, hashOAuthSecret(parsed.secret))
    ) {
      return;
    }

    if (row.kind === OAUTH_TOKEN_KINDS.REFRESH) {
      await this.revokeGrant({
        grantId: row.grantId,
        now,
        reason: OAUTH_GRANT_REVOKED_REASONS.USER,
        userId: null,
      });
      return;
    }

    await this.tokenRepository.update({ id: row.id }, { revokedAt: now });
  }

  /**
   * @description Revokes a grant and every token under it. Returns false when no live grant matched.
   */
  async revokeGrant(input: RevokeGrantInput): Promise<boolean> {
    return this.grantRepository.manager.transaction(async (manager) => {
      const result = await manager.update(
        OAuthGrant,
        {
          id: input.grantId,
          revokedAt: IsNull(),
          ...(input.userId !== null && { userId: input.userId }),
        },
        { revokedAt: input.now, revokedReason: input.reason },
      );
      if (result.affected !== 1) {
        return false;
      }
      await manager.update(
        OAuthToken,
        { grantId: input.grantId, revokedAt: IsNull() },
        { revokedAt: input.now },
      );
      return true;
    });
  }

  /**
   * @description Revokes every live grant a user holds (e.g. when the user is disabled).
   */
  async revokeGrantsForUser(
    userId: string,
    reason: RevokeGrantInput['reason'],
    now: Date,
  ): Promise<number> {
    const grants = await this.grantRepository.find({
      select: { id: true },
      where: { revokedAt: IsNull(), userId },
    });
    const revoked = await Promise.all(
      grants.map((grant) =>
        this.revokeGrant({ grantId: grant.id, now, reason, userId }),
      ),
    );
    return revoked.filter(Boolean).length;
  }

  /**
   * @description A user's unrevoked, unexpired grants with their clients, newest first.
   */
  async listActiveGrantsForUser(
    userId: string,
    now: Date,
  ): Promise<OAuthGrant[]> {
    return this.grantRepository.find({
      order: { createdAt: 'DESC' },
      relations: { client: true },
      where: { expiresAt: MoreThan(now), revokedAt: IsNull(), userId },
    });
  }

  private isGrantLive(grant: OAuthGrant, now: Date): boolean {
    return grant.revokedAt == null && grant.expiresAt > now;
  }

  private describeCodeMismatch(
    request: OAuthAuthorizationRequest,
    input: ExchangeAuthorizationCodeInput,
  ): string | null {
    if (request.status !== OAUTH_AUTHORIZATION_REQUEST_STATUSES.APPROVED) {
      return 'Authorization code was not approved.';
    }
    if (request.expiresAt <= input.now) {
      return 'Authorization code expired.';
    }
    if (request.client.clientId !== input.clientId) {
      return 'Authorization code was issued to another client.';
    }
    if (request.redirectUri !== input.redirectUri) {
      return 'redirect_uri does not match the authorization request.';
    }
    if (input.resource !== null && input.resource !== request.resource) {
      return 'resource does not match the authorization request.';
    }
    if (!verifyPkceS256(input.codeVerifier, request.codeChallenge)) {
      return 'code_verifier does not match the code_challenge.';
    }
    return null;
  }

  private async claimPendingRequest(
    id: string,
    values: Partial<OAuthAuthorizationRequest>,
  ): Promise<boolean> {
    const result = await this.requestRepository
      .createQueryBuilder()
      .update(OAuthAuthorizationRequest)
      .set(values)
      .where('id = :id AND status = :status', {
        id,
        status: OAUTH_AUTHORIZATION_REQUEST_STATUSES.PENDING,
      })
      .execute();
    return result.affected === 1;
  }

  private async issueTokenPair(
    manager: EntityManager,
    grant: OAuthGrant,
    now: Date,
  ): Promise<{
    readonly issued: IssuedOAuthTokens;
    readonly refreshTokenId: string;
  }> {
    const access = mintOAuthToken(OAUTH_TOKEN_KINDS.ACCESS);
    const refresh = mintOAuthToken(OAUTH_TOKEN_KINDS.REFRESH);
    const accessExpiresAt = earliest(
      addMs(now, OAUTH_LIFETIMES_MS.ACCESS_TOKEN),
      grant.expiresAt,
    );

    const [, refreshRow] = await manager.save([
      manager.create(OAuthToken, {
        expiresAt: accessExpiresAt,
        grantId: grant.id,
        kind: OAUTH_TOKEN_KINDS.ACCESS,
        prefix: access.prefix,
        replacedBy: null,
        revokedAt: null,
        secretHash: access.secretHash,
      }),
      manager.create(OAuthToken, {
        expiresAt: grant.expiresAt,
        grantId: grant.id,
        kind: OAUTH_TOKEN_KINDS.REFRESH,
        prefix: refresh.prefix,
        replacedBy: null,
        revokedAt: null,
        secretHash: refresh.secretHash,
      }),
    ]);

    if (refreshRow === undefined) {
      throw new Error('oauth: refresh token row was not saved');
    }

    return {
      issued: {
        accessToken: access.token,
        expiresInSeconds: Math.max(
          0,
          Math.floor((accessExpiresAt.getTime() - now.getTime()) / 1000),
        ),
        grant,
        ok: true,
        refreshToken: refresh.token,
        scopes: grant.scopes,
      },
      refreshTokenId: refreshRow.id,
    };
  }
}
