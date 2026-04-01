/**
 * @description Produces 1536-dim query embeddings via OpenAI (text-embedding-3-small) for documentation vector search.
 */

import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

/**
 * @description Embeds a single text using OpenAI. Requires OPENAI_API_KEY in env.
 * @returns 1536-dim embedding array, or undefined if API key missing or request fails.
 */
export async function embedQuery(text: string): Promise<number[] | undefined> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return undefined;
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    input: text.slice(0, 8191),
    model: EMBEDDING_MODEL,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIM) {
    return undefined;
  }

  return embedding;
}
