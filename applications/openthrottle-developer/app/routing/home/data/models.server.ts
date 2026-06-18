import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { DiscoverLocalModelsDocument } from '~/__generated__/graphql';
import { toChatModelOptions } from '~/routing/home/utils/chat-model-option';

/**
 * @description Server-only loader helper: discover locally-running models for the
 * home composer dropdown. Returns an empty list when discovery fails or no local
 * model servers are running, so the route renders a clear empty/disabled state
 * rather than erroring.
 */
export async function loadDiscoveredModels(
  request: Request,
): Promise<ChatModelOption[]> {
  try {
    const data = await executeGraphqlWithAuth(
      request,
      DiscoverLocalModelsDocument,
    );
    return toChatModelOptions(data.discoverLocalModels);
  } catch {
    return [];
  }
}
