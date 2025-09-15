import { getEmbeddingsByChunks } from './embedding';
import { insertVercelAiEmbeddings } from '@/lib/db/vercelai/actions';
import fs from 'fs';

export async function embedDocs() {
  const docs = fs.readFileSync('./ai-docs/basic-components.txt', 'utf-8');
  const embeddings = await getEmbeddingsByChunks(docs);
  await insertVercelAiEmbeddings(
    embeddings.map((item) => ({
      embedding: item.embedding,
      content: item.text
    }))
  );
  return embeddings;
}

embedDocs();
