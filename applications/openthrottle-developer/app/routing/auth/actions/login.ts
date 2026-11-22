import { buildAuthCookie } from '@openthrottle/react-router-auth';
import { parseFormData } from '@openthrottle/react-router-graphql';
import { data } from 'react-router';

import type { Route } from '@/app/routes/+types/_index';
import { LoginInputSchema } from '~/__generated__/schemas';
import { callLoginMutation } from '~/global/utils/utils.auth';

export interface AuthFetcherData {
  readonly error?: string;
  readonly ok?: boolean;
}

export type AuthActionResult = ReturnType<typeof data<AuthFetcherData>>;

/**
 * @description The login action of the auth index route. It sets the auth cookie via headers
 * and returns data (not a redirect): a fetcher follows redirects, which would navigate before
 * the exit animation runs. The client navigates to the redirect target once the choreography
 * completes.
 */
export const loginAction = async (
  args: Route.ActionArgs,
): Promise<AuthActionResult> => {
  const formData = await args.request.formData();
  const parsed = parseFormData(formData, LoginInputSchema());
  if (!parsed.success) {
    return data<AuthFetcherData>({ error: parsed.error });
  }

  // parseFormData trims values; the password is sent exactly as typed.
  const rawPassword = formData.get('password');
  const password =
    typeof rawPassword === 'string' ? rawPassword : parsed.data.password;

  try {
    const token = await callLoginMutation(parsed.data.email, password);
    if (!token) {
      return data<AuthFetcherData>({ error: 'Login failed' });
    }

    return data<AuthFetcherData>(
      { ok: true },
      { headers: { 'Set-Cookie': buildAuthCookie(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';

    return data<AuthFetcherData>({ error: message });
  }
};
