import {
  LoginDocument,
  LogoutDocument,
  RegisterDocument,
} from '@openthrottle/openthrottle-developer-codegen';
import { executeGraphql } from '@openthrottle/react-router-graphql';

/**
 * Call login GraphQL mutation on openthrottle-server. Uses API_URL (same as executeGraphql).
 */
export async function callRegisterMutation(
  email: string,
  password: string,
): Promise<string | null> {
  const data = await executeGraphql(RegisterDocument, {
    input: { email, password },
  });

  return data.register.accessToken ?? null;
}

/**
 * Call login GraphQL mutation on openthrottle-server.
 * Uses API_URL (same as executeGraphql).
 */
export async function callLoginMutation(
  email: string,
  password: string,
): Promise<string | null> {
  const data = await executeGraphql(LoginDocument, {
    input: { email, password },
  });

  return data.login?.accessToken ?? null;
}

/**
 * Call logout GraphQL mutation on openthrottle-server.
 */
export async function callLogoutMutation(): Promise<boolean | null> {
  const data = await executeGraphql(LogoutDocument, {});

  return data.signout.success;
}
