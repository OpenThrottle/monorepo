import {
  LoginDocument,
  LogoutDocument,
  RegisterDocument,
} from '@openthrottle/openthrottle-developer-codegen';
import {
  executeGraphql,
  getForwardedClientHeaders,
} from '@openthrottle/react-router-graphql';

/**
 * Call register GraphQL mutation on openthrottle-server. Uses API_URL (same as executeGraphql).
 * Forwards the browser's address from `request` so the server's per-IP limit
 * applies to the visitor, not to this app.
 */
export async function callRegisterMutation(
  email: string,
  password: string,
  request: Request,
): Promise<string | null> {
  const data = await executeGraphql(
    RegisterDocument,
    { input: { email, password } },
    { headers: getForwardedClientHeaders(request) },
  );

  return data.register.accessToken ?? null;
}

/**
 * Call login GraphQL mutation on openthrottle-server.
 * Uses API_URL (same as executeGraphql). Forwards the browser's address from
 * `request` so the server's per-IP login limit applies to the visitor, not to
 * this app.
 */
export async function callLoginMutation(
  email: string,
  password: string,
  request: Request,
): Promise<string | null> {
  const data = await executeGraphql(
    LoginDocument,
    { input: { email, password } },
    { headers: getForwardedClientHeaders(request) },
  );

  return data.login?.accessToken ?? null;
}

/**
 * Call logout GraphQL mutation on openthrottle-server.
 */
export async function callLogoutMutation(): Promise<boolean | null> {
  const data = await executeGraphql(LogoutDocument, {});

  return data.signout.success;
}
