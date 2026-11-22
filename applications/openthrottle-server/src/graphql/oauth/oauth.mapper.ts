/**
 * @description Maps OAuth repository rows to GraphQL objects.
 */

import type {
  OAuthAuthorizationRequest,
  OAuthGrant,
} from '@openthrottle/nestjs-repositories-server';

import { describeClientHost } from '../../modules/oauth/oauth.utils.ts';
import {
  OAuthAuthorizationRequestObject,
  OAuthGrantObject,
} from './oauth.object.ts';

const hostOf = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.host
      : `${url.protocol}//`;
  } catch {
    return uri;
  }
};

export const toOAuthAuthorizationRequestObject = (
  request: OAuthAuthorizationRequest,
): OAuthAuthorizationRequestObject => {
  const object = new OAuthAuthorizationRequestObject();
  object.clientHost = describeClientHost(request.client);
  object.clientName = request.client.clientName;
  object.expiresAt = request.expiresAt;
  object.id = request.id;
  object.redirectHost = hostOf(request.redirectUri);
  object.registrationKind = request.client.registrationKind;
  object.requestedScopes = request.requestedScopes;
  object.resource = request.resource;
  return object;
};

export const toOAuthGrantObject = (grant: OAuthGrant): OAuthGrantObject => {
  const object = new OAuthGrantObject();
  object.clientHost = describeClientHost(grant.client);
  object.clientName = grant.client.clientName;
  object.createdAt = grant.createdAt;
  object.expiresAt = grant.expiresAt;
  object.id = grant.id;
  object.lastUsedAt = grant.lastUsedAt;
  object.resource = grant.resource;
  object.scopes = grant.scopes;
  return object;
};
