import { NextRequest } from 'next/server';
import { env } from '@/lib/env.mjs';
import { retrieveEmbedding } from './embedding';
import type { OpenAIRequest } from './types';
import type { CoreMessage } from 'ai';
import { streamText, createDataStreamResponse } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getSystemPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';

const openai = createOpenAI({
  apiKey: env.AI_KEY,
  baseURL: env.AI_BASE_URL
});

function referenceString(retrieved: { content: string; similarity: number }[]) {
  if (!retrieved.length) return '';
  return retrieved.map((item, i) => `【片段${i + 1}】${item.content}`).join('\n');
}

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 1. 解析请求体
  const body = await req.json();
  const { message } = body as OpenAIRequest;
  if (!Array.isArray(message) || message.length === 0) {
    return new Response('Invalid request', { status: 400 });
  }

  // 2. 获取最后一条用户消息内容
  const lastMsg = message[message.length - 1];
  const userContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';
  if (!userContent) {
    return new Response('No user message', { status: 400 });
  }

  // 3. 检索相关内容
  const retrieved = await retrieveEmbedding(userContent, 0.5, 3);
  const reference = referenceString(retrieved);
  const systemPrompt = getSystemPrompt(reference);

  // 4. 构造消息数组（将相关内容作为 system message 插入最前）
  const systemMessage: CoreMessage | undefined = systemPrompt
    ? { role: 'system', content: systemPrompt }
    : undefined;
  const messages: CoreMessage[] = [...(systemMessage ? [systemMessage] : []), ...message];

  // 5/6. 创建数据流响应：先写入 retrieved，再合并 AI 文本流
  return createDataStreamResponse({
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    execute: async (dataStream) => {
      dataStream.writeData({ related: retrieved });
      const result = await streamText({
        model: openai(env.MODEL || 'gpt-4o-mini'),
        messages
      });
      result.mergeIntoDataStream(dataStream);
    }
  });
}
