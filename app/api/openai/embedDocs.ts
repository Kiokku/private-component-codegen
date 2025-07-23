import { getEmbeddingsByChunks } from './embedding';
import { insertOpenAiEmbeddings } from '@/lib/db/openai/actions';
import fs from 'fs';

export async function embedDocs() {
  const docs = fs.readFileSync('./ai-docs/basic-components.txt', 'utf-8');
  const embeddings = await getEmbeddingsByChunks(docs);
  await insertOpenAiEmbeddings(
    embeddings.map((item) => ({
      embedding: item.embedding,
      content: item.text
    }))
  );
  return embeddings;
}

embedDocs();
