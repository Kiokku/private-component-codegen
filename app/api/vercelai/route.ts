import { streamText, createDataStream, DataStreamWriter } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/env.mjs';
import { retrieveEmbedding } from './embedding';
import { getSystemPrompt } from '@/lib/prompt';
import { OpenAIRequest, SearchResult } from './types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const openai = createOpenAI({
  apiKey: env.AI_KEY,
  baseURL: env.AI_BASE_URL
});

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as OpenAIRequest;

    // Get the last message content for similarity search
    const lastMessage = messages[messages.length - 1];
    const lastMessageContent = typeof lastMessage.content === 'string' ? lastMessage.content : '';

    if (!lastMessageContent) {
      return new Response('No user message', { status: 400 });
    }

    // Search for relevant content using embeddings
    const relevantContent = await retrieveEmbedding(lastMessageContent, 0.5, 3);
    const reference = relevantContent.map((result) => result.content).join('\n\n');

    // Create system prompt with reference content
    const systemPrompt = getSystemPrompt(reference);

    const stream = createDataStream({
      execute: async (dataStream: DataStreamWriter) => {
        // First, send the relevant content as serializable objects
        const serializableContent = relevantContent.map((result: SearchResult) => ({
          content: result.content,
          similarity: result.similarity
        }));

        dataStream.writeData({
          type: 'relevantContent',
          data: serializableContent
        });

        // Then stream the AI response
        const result = streamText({
          model: openai(env.MODEL || 'gpt-4o-mini'),
          messages,
          system: systemPrompt,
          temperature: 0.7
        });

        // Merge the AI response stream into our data stream
        await result.mergeIntoDataStream(dataStream);
      }
    });

    // Convert the stream to a Response object
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
