'use client';

import React, { useCallback, useState } from 'react';
import { useChat } from 'ai/react';
import ChatMessages from '@/app/components/ChatMessages/ChatMessages';
import { RAGDocument } from '@/app/components/RAGDocsShow/interface';

const Home = () => {
  const [ragDocuments, setRagDocuments] = useState<RAGDocument[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, data } = useChat({
    api: '/api/vercelai'
  });

  // 使用 useChat 的 data 字段来获取数据流中的 RAG 文档
  // data 是一个数组，包含从服务器端通过 dataStream.writeData 发送的所有数据
  const relevantContent = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    // 查找类型为 'relevantContent' 的数据
    const ragData = data.find((item: unknown) => {
      return (
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        (item as { type: string }).type === 'relevantContent'
      );
    }) as { type: string; data: Array<{ content: string; similarity: number }> } | undefined;

    if (ragData && ragData.data && Array.isArray(ragData.data)) {
      return ragData.data.map((doc: { content: string; similarity: number }, index: number) => ({
        id: `rag-${index}`,
        content: doc.content,
        score: doc.similarity
      }));
    }
    return [];
  }, [data]);

  // 更新 ragDocuments 状态
  React.useEffect(() => {
    setRagDocuments(relevantContent);
  }, [relevantContent]);

  const [messageImgUrl, setMessagesImgUrl] = useState('');

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      // Currently we don't send the image to the API; just clear it after sending
      handleSubmit(e);
      if (messageImgUrl) setMessagesImgUrl('');
    },
    [handleSubmit, messageImgUrl]
  );

  const onRetry = useCallback(() => {
    reload();
  }, [reload]);

  // 处理RAG文档数据 - 为最新的助手消息添加 RAG 文档
  const processedMessages = messages.map((message, index) => {
    if (message.role === 'assistant' && index === messages.length - 1 && ragDocuments.length > 0) {
      // 为最新的助手消息添加 RAG 文档
      return {
        ...message,
        ragDocs: ragDocuments
      };
    }
    return message;
  });

  return (
    <ChatMessages
      messages={
        processedMessages as unknown as Array<{
          id: string;
          role: 'user' | 'assistant' | 'tool';
          content: string;
          ragDocs?: Array<{ id: string; content: string; score: number }>;
        }>
      }
      input={input}
      handleInputChange={
        handleInputChange as unknown as (e: React.ChangeEvent<HTMLInputElement>) => void
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      messageImgUrl={messageImgUrl}
      setMessagesImgUrl={setMessagesImgUrl}
      onRetry={onRetry}
    />
  );
};

export default Home;
