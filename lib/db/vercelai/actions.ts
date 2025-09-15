'use server';

import { db } from '@/lib/db';
import { vercelAiEmbeddings } from './schema';

/**
 * 批量插入 Vercel AI Embedding 数据
 * @param embeddings Array<{ embedding: number[]; content: string }>
 */
export async function insertVercelAiEmbeddings(
  embeddings: Array<{ embedding: number[]; content: string }>
) {
  if (!Array.isArray(embeddings) || embeddings.length === 0) return [];
  // 构造插入数据
  const rows = embeddings.map(({ embedding, content }) => ({
    embedding,
    content
  }));
  // 批量插入
  return db.insert(vercelAiEmbeddings).values(rows).returning();
}
