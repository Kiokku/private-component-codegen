import type { CoreMessage } from 'ai';

export type OpenAIRequest = {
  messages: CoreMessage[];
};

export type SearchResult = {
  content: string;
  similarity: number;
};
