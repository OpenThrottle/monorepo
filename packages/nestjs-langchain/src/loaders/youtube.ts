import { Document } from '@langchain/core/dist/documents';
import { YoutubeLoader } from '@langchain/community/dist/document_loaders/web/youtube';

/**
 * @description Load a single YouTube video using LangChain's YoutubeLoader
 */
export async function loadYouTubeVideo(videoId: string): Promise<Document[]> {
  try {
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

    // console.log("📹 videoWithMetadata --> ", videoWithMetadata);

    return videoWithMetadata;
  } catch (error) {
    console.error(`🚨 Error loading YouTube Video ${videoId}:`, error);

    return [];
  }
}
