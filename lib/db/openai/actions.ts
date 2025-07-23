'use server';

import { db } from '@/lib/db';
import { openAiEmbeddings } from './schema';

/**
 * 批量插入 OpenAI Embedding 数据
 * @param embeddings Array<{ embedding: number[]; content: string }>
 */
export async function insertOpenAiEmbeddings(
  embeddings: Array<{ embedding: number[]; content: string }>
) {
  if (!Array.isArray(embeddings) || embeddings.length === 0) return [];
  // 构造插入数据
  const rows = embeddings.map(({ embedding, content }) => ({
    embedding,
    content
  }));
  // 批量插入
  return db.insert(openAiEmbeddings).values(rows).returning();
}
