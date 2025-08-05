import { db } from '@/lib/db';
import { openAiEmbeddings } from './schema';
import { cosineDistance, desc, sql } from 'drizzle-orm';

/**
 * 基于向量嵌入的语义相似度搜索
 * @param embedding 查询向量
 * @param threshold 相似度阈值（0-1，越大越相似）
 * @param topN 返回结果数量
 * @returns Array<{ content: string; similarity: number }>
 */
export async function searchSimilarEmbeddings({
  embedding,
  threshold = 0.75,
  topN = 5
}: {
  embedding: number[];
  threshold?: number;
  topN?: number;
}): Promise<Array<{ content: string; similarity: number }>> {
  // 余弦距离越小越相似，相似度 = 1 - 距离
  const similarity = sql<number>`1 - (${cosineDistance(openAiEmbeddings.embedding, embedding)})`;

  const results = await db
    .select({ content: openAiEmbeddings.content, similarity })
    .from(openAiEmbeddings)
    .where(sql`${similarity} > ${threshold}`)
    .orderBy(desc(similarity))
    .limit(topN);

  return results;
}
