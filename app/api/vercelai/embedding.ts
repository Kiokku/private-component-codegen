import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/env.mjs';
import { searchSimilarEmbeddings } from '@/lib/db/vercelai/selectors';

const vercelAi = createOpenAI({
  apiKey: env.AI_KEY,
  baseURL: env.AI_BASE_URL
});

/**
 * 将输入文本按分隔符分块，并为每个分块生成 embedding（Vercel AI SDK）
 * @param text 输入文本
 * @param options 分隔符与 embedding 相关配置
 * @returns Promise<Array<{ text: string; embedding: number[] }>>
 */
export async function getEmbeddingsByChunks(
  text: string,
  options?: {
    separator?: string;
    model?: string;
  }
): Promise<Array<{ text: string; embedding: number[] }>> {
  const {
    separator = '-------split line-------',
    model = env.EMBEDDING || 'text-embedding-3-small'
  } = options || {};

  const chunks = text
    .split(separator)
    .map((t) => t.trim())
    .filter(Boolean);
  if (chunks.length === 0) return [];

  const embeddingModel = vercelAi.embedding(model);
  const { embeddings } = await embedMany({ model: embeddingModel, values: chunks });

  return embeddings.map((embedding, i) => ({
    text: chunks[i],
    embedding
  }));
}

// 生成单个 embedding（Vercel AI SDK）
export async function getEmbedding(text: string) {
  const embeddingModel = vercelAi.embedding(env.EMBEDDING || 'text-embedding-3-small');
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding as number[];
}

// 检索召回（使用 vercelai 数据表）
export async function retrieveEmbedding(
  text: string,
  threshold = 0.7,
  topN = 5
): Promise<Array<{ content: string; similarity: number }>> {
  const embedding = await getEmbedding(text);
  const results = await searchSimilarEmbeddings({ embedding, threshold, topN });
  return results;
}
