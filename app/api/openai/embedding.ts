import OpenAI from 'openai';
import { env } from '@/lib/env.mjs';

const embeddingAI = new OpenAI({
  apiKey: env.AI_KEY,
  baseURL: env.AI_BASE_URL
});
/**
 * 将输入文本按分隔符分块，并为每个分块生成 embedding。
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
    model = env.EMBEDDING || 'text-embedding-ada-002'
  } = options || {};

  // 分块
  const chunks = text
    .split(separator)
    .map((t) => t.trim())
    .filter(Boolean);
  if (chunks.length === 0) return [];

  // 批量生成 embedding
  const resp = await embeddingAI.embeddings.create({
    model,
    input: chunks,
    encoding_format: 'float'
  });

  // 返回原文和 embedding
  return resp.data.map((item, i) => ({
    text: chunks[i],
    embedding: item.embedding as number[]
  }));
}
