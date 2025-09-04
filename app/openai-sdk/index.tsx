'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ChatMessages } from '@/app/components/ChatMessages';
import type { Message } from '@/app/components/ChatMessages/interface';
import { RAGDocument } from '@/app/components/RAGDocsShow/interface';
import { nanoid } from 'nanoid';

// 定义 API 响应事件类型
type SSEEvent = 'related' | 'message' | 'error';

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nanoid(),
      role: 'assistant',
      content: '你好！我是你的 AI 助手，有什么可以帮助你的吗？'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageImgUrl, setMessageImgUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
      // 清除之前的错误
      if (error) setError(null);
    },
    [error]
  );

  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string, ragDocs?: RAGDocument[]) => {
      const newMessage: Message = {
        id: nanoid(),
        role,
        content,
        ragDocs
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  const handleSSEEvent = useCallback((eventType: SSEEvent, data: string) => {
    try {
      const parsedData = JSON.parse(data);

      if (eventType === 'related') {
        // 更新最后一条助手消息的 RAG 文档
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.ragDocs = parsedData;
          }
          return newMessages;
        });
      } else if (eventType === 'message') {
        // 更新最后一条助手消息的内容
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = (lastMessage.content as string) + parsedData;
          }
          return newMessages;
        });
      } else if (eventType === 'error') {
        throw new Error(parsedData);
      }
    } catch (e) {
      console.error(`Failed to parse ${eventType} data:`, e);
      if (eventType === 'error') {
        setError(data || '发生未知错误');
      }
    }
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userInput = input.trim();
      setInput('');
      setIsLoading(true);
      setError(null);
      setIsConnected(true);

      // 添加用户消息
      addMessage('user', userInput);

      // 添加空的助手消息
      addMessage('assistant', '');

      // 准备发送给 API 的消息
      const apiMessages = [...messages, { role: 'user' as const, content: userInput }];

      try {
        // 创建新的 AbortController
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: apiMessages.map((msg) => ({
              role: msg.role,
              content: msg.content
            }))
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7) as SSEEvent;
              const nextLine = lines[lines.indexOf(line) + 1];

              if (nextLine && nextLine.startsWith('data: ')) {
                const data = nextLine.slice(6);
                handleSSEEvent(eventType, data);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was aborted');
          // 如果请求被中止，删除空的助手消息
          setMessages((prev) => prev.slice(0, -1));
        } else {
          console.error('Error:', error);
          const errorMessage = error instanceof Error ? error.message : '发生未知错误';
          setError(errorMessage);
          // 更新最后一条助手消息为错误信息
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = '抱歉，发生了错误，请重试。';
            }
            return newMessages;
          });
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [input, isLoading, messages, addMessage, handleSSEEvent]
  );

  const onRetry = useCallback(
    (id: string) => {
      // 找到要重试的消息
      const messageIndex = messages.findIndex((msg) => msg.id === id);
      if (messageIndex === -1) return;

      const message = messages[messageIndex];
      if (message.role !== 'assistant') return;

      // 找到上一条用户消息
      const userMessageIndex = messageIndex - 1;
      if (userMessageIndex < 0 || messages[userMessageIndex].role !== 'user') return;

      const userMessage = messages[userMessageIndex];

      // 删除当前助手消息和之后的所有消息
      setMessages((prev) => prev.slice(0, messageIndex));

      // 重新提交用户消息
      setInput(userMessage.content as string);
      setTimeout(() => {
        onSubmit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>);
      }, 100);
    },
    [messages, onSubmit]
  );

  // 初始欢迎消息已在 state 中设置，避免 StrictMode 下重复渲染

  return (
    <div className="h-screen">
      <div className="h-full">
        {/* 状态指示器 */}
        <div className="fixed top-4 left-4 z-50 flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
          ></div>
          <span className="text-sm text-gray-600">{isConnected ? '已连接' : '未连接'}</span>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <span className="block sm:inline">错误: {error}</span>
            <button className="ml-2 text-red-700 hover:text-red-900" onClick={() => setError(null)}>
              ×
            </button>
          </div>
        )}

        <ChatMessages
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          messageImgUrl={messageImgUrl}
          setMessagesImgUrl={setMessageImgUrl}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
};

export default Home;
