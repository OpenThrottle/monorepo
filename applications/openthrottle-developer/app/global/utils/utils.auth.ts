import {
  LoginDocument,
  RegisterDocument,
} from '@openthrottle/openthrottle-developer-codegen';
import { executeGraphql } from '@openthrottle/react-router-graphql';

/**
 * @description Call login GraphQL mutation on openthrottle-server. Uses API_URL (same as executeGraphql).
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
 * @description Call login GraphQL mutation on openthrottle-server.
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
