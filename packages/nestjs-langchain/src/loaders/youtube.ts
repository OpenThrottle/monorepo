import type { Document } from '@langchain/core/documents';
import { YoutubeLoader } from '@langchain/community/document_loaders/web/youtube';

/**
 * @description Load a single YouTube video using LangChain's YoutubeLoader
 */
export async function loadYouTubeVideo(videoId: string): Promise<Document[]> {
  const loader = new YoutubeLoader({ videoId });
  const video = await loader.load();

  // Add metadata about the file
  const videoWithMetadata = video.map((doc: Document) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      type: 'youtube',
    },
  }));

  return videoWithMetadata;
}
