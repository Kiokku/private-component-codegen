import { pgTable, text, varchar, vector, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';

export const vercelAiEmbeddings = pgTable(
  'vercel_ai_embeddings',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull()
  },
  (t) => ({
    vercelAiEmbeddingIndex: index('vercel_ai_embedding_index').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops')
    )
  })
);
