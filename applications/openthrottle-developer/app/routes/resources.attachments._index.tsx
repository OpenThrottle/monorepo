import { getRequestAuthToken } from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/resources.attachments._index';
import {
  attachmentErrorResponse,
  buildAttachmentsUpstreamUrl,
  isOversizedUpload,
  isSameOriginRequest,
} from '~/global/utils/attachment-proxy.server';

/**
 * Resource route action behind the composer's image upload —
 * `POST /resources/attachments` (multipart, field `file`). A same-origin proxy
 * to openthrottle-server's `POST /attachments`: the browser never holds the API
 * token, this action reads it from the auth cookie and forwards the file with a
 * bearer header. The upstream status and JSON body pass through unchanged
 * (400 / 413 / 415 included); an unreachable API is a 502.
 */
export const action = async (args: Route.ActionArgs): Promise<Response> => {
  const { request } = args;

  if (!isSameOriginRequest(request)) {
    return attachmentErrorResponse('Cross-origin upload rejected.', 403);
  }

  const token = getRequestAuthToken(request);
  if (token === null) {
    return attachmentErrorResponse('Sign in to attach images.', 401);
  }

  if (isOversizedUpload(request)) {
    return attachmentErrorResponse('The image is too large to upload.', 413);
  }

  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!(file instanceof File)) {
    return attachmentErrorResponse('Choose an image to upload.', 400);
  }

  const outgoing = new FormData();
  outgoing.append('file', file, file.name);

  try {
    const upstream = await fetch(buildAttachmentsUpstreamUrl(), {
      body: outgoing,
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    });

    return new Response(await upstream.text(), {
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
      },
      status: upstream.status,
    });
  } catch {
    return attachmentErrorResponse('The upload service is unreachable.', 502);
  }
};
