import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { env } from '@/lib/env.mjs';
import { retrieveEmbedding } from './embedding';
import type { OpenAIRequest } from './types';
import type {
  ChatCompletionSystemMessageParam,
  ChatCompletionMessageParam
} from 'openai/resources/chat/completions';
import { getSystemPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';

const openai = new OpenAI({
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
  const retrieved = await retrieveEmbedding(userContent, 0.7, 3);
  const reference = referenceString(retrieved);
  const systemPrompt = getSystemPrompt(reference);

  // 4. 构造消息数组（将相关内容作为 system message 插入最前）
  const messages: ChatCompletionMessageParam[] = [
    ...(systemPrompt
      ? [{ role: 'system', content: systemPrompt } as ChatCompletionSystemMessageParam]
      : []),
    ...message
  ];

  // 5. 创建 ReadableStream 以 SSE 方式推送
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 先推送相关内容
      controller.enqueue(encoder.encode(`event: related\ndata: ${JSON.stringify(retrieved)}\n\n`));
      try {
        // 调用 OpenAI 流式接口
        const resp = await openai.chat.completions.create({
          model: env.MODEL || 'gpt-3.5-turbo',
          messages,
          stream: true
        });
        for await (const chunk of resp) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (typeof content === 'string') {
            controller.enqueue(
              encoder.encode(`event: message\ndata: ${JSON.stringify(content)}\n\n`)
            );
          }
        }
        controller.close();
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'error';
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(errMsg)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
