import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Public } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  IssueOAuthTokensResult,
  OAuthClient,
  OAuthErrorCode,
} from '@openthrottle/nestjs-repositories';
import {
  OAuthService,
  parseOAuthScopes,
  redirectUriMatches,
} from '@openthrottle/nestjs-repositories';

import { ClientMetadataService } from './client-metadata/client-metadata.service.ts';
import type { OAuthHttpResponse, OAuthServerConfig } from './oauth.types.ts';
import {
  buildAuthorizationRedirect,
  buildAuthorizationServerMetadata,
  canonicalizeOAuthUrl,
  readOAuthParam,
  readOAuthStringArray,
  resolveOAuthServerConfig,
} from './oauth.utils.ts';

const NO_STORE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
};

/**
 * @description The OAuth 2.1 authorization server for the public MCP domain (OT plan
 * 16f321a7; design docs/openthrottle/mcp-oauth-design.md). Every route is `@Public()`:
 * clients reach it before they hold any credential, and PKCE + exact redirect matching
 * stand in for client authentication. Off (404) until `OT_OAUTH_ISSUER` is set.
 *
 * `/oauth/authorize` validates the client and redirect URI **before** it ever redirects,
 * so an unknown client or a mismatched redirect_uri gets a 400 here and is never bounced
 * to an attacker-chosen URL. Consent happens in the developer app, which completes the
 * flow through the `decideOAuthAuthorization` mutation.
 */
@Public()
@Controller()
export class OAuthController {
  private readonly config: OAuthServerConfig | null;

  constructor(
    private readonly clientMetadataService: ClientMetadataService,
    private readonly logger: LoggerService,
    private readonly oauthService: OAuthService,
  ) {
    const resolved = resolveOAuthServerConfig(process.env);
    if (resolved.kind === 'invalid') {
      throw new Error(`[oauth] ${resolved.error}`);
    }
    this.config = resolved.kind === 'enabled' ? resolved.config : null;
  }

  @Get('.well-known/oauth-authorization-server')
  metadata(@Res() res: OAuthHttpResponse): void {
    const config = this.requireConfig();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).json(buildAuthorizationServerMetadata(config));
  }

  @Post('oauth/register')
  async register(
    @Body() body: unknown,
    @Res() res: OAuthHttpResponse,
  ): Promise<void> {
    this.requireConfig();
    res.setHeader('Access-Control-Allow-Origin', '*');

    const authMethod = readOAuthParam(body, 'token_endpoint_auth_method');
    if (authMethod !== null && authMethod !== 'none') {
      this.sendError(
        res,
        400,
        'invalid_client_metadata',
        'Only public clients are supported: token_endpoint_auth_method must be "none".',
      );
      return;
    }

    const result = await this.oauthService.registerDynamicClient({
      clientName: readOAuthParam(body, 'client_name'),
      clientUri: readOAuthParam(body, 'client_uri'),
      logoUri: readOAuthParam(body, 'logo_uri'),
      redirectUris: readOAuthStringArray(body, 'redirect_uris') ?? [],
    });
    if (!result.ok) {
      this.sendError(res, 400, result.error, result.description);
      return;
    }

    const { client } = result;
    this.logger.log(`oauth: registered client ${client.clientId} (dcr)`);
    res.status(201).json({
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.clientName,
      grant_types: ['authorization_code', 'refresh_token'],
      redirect_uris: client.redirectUris,
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });
  }

  @Get('oauth/authorize')
  async authorize(
    @Query() query: unknown,
    @Res() res: OAuthHttpResponse,
  ): Promise<void> {
    const config = this.requireConfig();

    const clientId = readOAuthParam(query, 'client_id');
    let client: OAuthClient | null;
    if (
      clientId !== null &&
      this.clientMetadataService.isMetadataDocumentClientId(clientId)
    ) {
      const resolved = await this.clientMetadataService.resolve(
        clientId,
        new Date(),
      );
      if (!resolved.ok) {
        this.sendError(res, 400, 'invalid_client', resolved.error);
        return;
      }
      client = resolved.client;
    } else {
      client = await this.findClient(clientId);
    }
    if (client === null) {
      this.sendError(res, 400, 'invalid_client', 'Unknown client_id.');
      return;
    }

    const redirectUri = readOAuthParam(query, 'redirect_uri');
    if (
      redirectUri === null ||
      !redirectUriMatches(client.redirectUris, redirectUri)
    ) {
      this.sendError(
        res,
        400,
        'invalid_request',
        'redirect_uri is missing or not registered for this client.',
      );
      return;
    }

    // From here the redirect URI is trusted, so errors go back to the client.
    const state = readOAuthParam(query, 'state');
    const redirectError = (
      error: OAuthErrorCode | 'unsupported_response_type',
      description: string,
    ): void => {
      res.redirect(
        302,
        buildAuthorizationRedirect(redirectUri, {
          error,
          error_description: description,
          iss: config.issuer,
          state,
        }),
      );
    };

    if (readOAuthParam(query, 'response_type') !== 'code') {
      redirectError(
        'unsupported_response_type',
        'response_type must be "code".',
      );
      return;
    }

    const codeChallenge = readOAuthParam(query, 'code_challenge');
    if (
      codeChallenge === null ||
      readOAuthParam(query, 'code_challenge_method') !== 'S256'
    ) {
      redirectError(
        'invalid_request',
        'PKCE is required: code_challenge with code_challenge_method=S256.',
      );
      return;
    }

    const resource = this.resolveResource(readOAuthParam(query, 'resource'));
    if (resource === null) {
      redirectError(
        'invalid_target',
        "resource must name this server's MCP endpoint.",
      );
      return;
    }

    // Unknown scopes are dropped and none-known means the default set: the user
    // sees exactly what will be granted on the consent screen and can narrow it.
    const scopes = parseOAuthScopes(readOAuthParam(query, 'scope'));

    const request = await this.oauthService.createAuthorizationRequest({
      client,
      codeChallenge,
      now: new Date(),
      redirectUri,
      resource,
      scopes,
      state,
    });

    const consent = new URL(config.consentUrl);
    consent.searchParams.set('request', request.id);
    res.redirect(302, consent.toString());
  }

  @HttpCode(200)
  @Post('oauth/token')
  async token(
    @Body() body: unknown,
    @Res() res: OAuthHttpResponse,
  ): Promise<void> {
    this.requireConfig();
    res.setHeader('Access-Control-Allow-Origin', '*');
    for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
      res.setHeader(name, value);
    }

    const client = await this.findClient(readOAuthParam(body, 'client_id'));
    if (client === null) {
      this.sendError(res, 401, 'invalid_client', 'Unknown client_id.');
      return;
    }

    const rawResource = readOAuthParam(body, 'resource');
    const resource =
      rawResource === null ? null : this.resolveResource(rawResource);
    if (rawResource !== null && resource === null) {
      this.sendError(res, 400, 'invalid_target', 'Unknown resource.');
      return;
    }

    const grantType = readOAuthParam(body, 'grant_type');
    let result: IssueOAuthTokensResult;

    if (grantType === 'authorization_code') {
      const code = readOAuthParam(body, 'code');
      const codeVerifier = readOAuthParam(body, 'code_verifier');
      const redirectUri = readOAuthParam(body, 'redirect_uri');
      if (code === null || codeVerifier === null || redirectUri === null) {
        this.sendError(
          res,
          400,
          'invalid_request',
          'code, code_verifier and redirect_uri are required.',
        );
        return;
      }
      result = await this.oauthService.exchangeAuthorizationCode({
        clientId: client.clientId,
        code,
        codeVerifier,
        now: new Date(),
        redirectUri,
        resource,
      });
    } else if (grantType === 'refresh_token') {
      const refreshToken = readOAuthParam(body, 'refresh_token');
      if (refreshToken === null) {
        this.sendError(
          res,
          400,
          'invalid_request',
          'refresh_token is required.',
        );
        return;
      }
      // A refresh always carries the grant's scopes; `scope` (downscoping) is ignored.
      result = await this.oauthService.refreshTokens({
        clientId: client.clientId,
        now: new Date(),
        refreshToken,
        resource,
        scopes: null,
      });
    } else {
      res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: `grant_type must be authorization_code or refresh_token.`,
      });
      return;
    }

    if (!result.ok) {
      this.sendError(res, 400, result.error, result.description);
      return;
    }

    res.status(200).json({
      access_token: result.accessToken,
      expires_in: result.expiresInSeconds,
      refresh_token: result.refreshToken,
      scope: result.scopes.join(' '),
      token_type: 'Bearer',
    });
  }

  @HttpCode(200)
  @Post('oauth/revoke')
  async revoke(
    @Body() body: unknown,
    @Res() res: OAuthHttpResponse,
  ): Promise<void> {
    this.requireConfig();
    res.setHeader('Access-Control-Allow-Origin', '*');

    const token = readOAuthParam(body, 'token');
    const clientId = readOAuthParam(body, 'client_id');
    if (token === null) {
      this.sendError(res, 400, 'invalid_request', 'token is required.');
      return;
    }
    if (clientId !== null) {
      await this.oauthService.revokeToken(token, clientId, new Date());
    }
    // RFC 7009 §2.2: an unknown or foreign token is still a 200.
    res.status(200).json({});
  }

  private requireConfig(): OAuthServerConfig {
    if (this.config === null) {
      throw new NotFoundException();
    }
    return this.config;
  }

  private async findClient(
    clientId: string | null,
  ): Promise<OAuthClient | null> {
    if (clientId === null) {
      return null;
    }
    return this.oauthService.findClientByClientId(clientId);
  }

  private resolveResource(raw: string | null): string | null {
    if (raw === null || this.config === null) {
      return null;
    }
    const canonical = canonicalizeOAuthUrl(raw);
    return canonical !== null && this.config.resources.includes(canonical)
      ? canonical
      : null;
  }

  private sendError(
    res: OAuthHttpResponse,
    status: number,
    error: OAuthErrorCode,
    description: string,
  ): void {
    res.status(status).json({ error, error_description: description });
  }
}
