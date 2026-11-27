import { getRequestAuthToken } from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/resources.attachments.$id';
import {
  ATTACHMENT_PASSTHROUGH_HEADERS,
  attachmentErrorResponse,
  buildAttachmentsUpstreamUrl,
} from '~/global/utils/attachment-proxy.server';

/**
 * Resource route loader behind the thread's image thumbnails —
 * `GET /resources/attachments/:id`. A same-origin proxy to openthrottle-server's
 * owner-only `GET /attachments/:id`: it forwards the cookie's token as a bearer
 * header and streams the bytes back with the content-type and caching headers
 * the server set. Any non-200 (404 for someone else's image included) is the
 * same status with no body; an unreachable API is a 502.
 */
export const loader = async (args: Route.LoaderArgs): Promise<Response> => {
  const { params, request } = args;

  const token = getRequestAuthToken(request);
  if (token === null) {
    return new Response(null, { status: 401 });
  }

  try {
    const upstream = await fetch(buildAttachmentsUpstreamUrl(params.id), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (upstream.status !== 200) {
      return new Response(null, { status: upstream.status });
    }

    const headers = new Headers();
    for (const name of ATTACHMENT_PASSTHROUGH_HEADERS) {
      const value = upstream.headers.get(name);
      if (value !== null) {
        headers.set(name, value);
      }
    }

    return new Response(upstream.body, { headers, status: 200 });
  } catch {
    return attachmentErrorResponse(
      'The attachment service is unreachable.',
      502,
    );
  }
};
