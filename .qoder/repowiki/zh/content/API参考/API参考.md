# API参考

<cite>
**Referenced Files in This Document**   
- [route.ts](file://app/api/openai/route.ts)
- [types.ts](file://app/api/openai/types.ts)
- [route.ts](file://app/api/vercelai/route.ts)
- [types.ts](file://app/api/vercelai/types.ts)
- [env.mjs](file://lib/env.mjs)
- [embedding.ts](file://app/api/openai/embedding.ts)
- [embedding.ts](file://app/api/vercelai/embedding.ts)
- [prompt.ts](file://lib/prompt.ts)
- [index.tsx](file://app/openai-sdk/index.tsx)
- [index.tsx](file://app/vercel-ai/index.tsx)
</cite>

## 目录
1. [介绍](#介绍)
2. [OpenAI API](#openai-api)
3. [VercelAI API](#vercelai-api)
4. [认证机制](#认证机制)
5. [错误响应](#错误响应)
6. [客户端调用示例](#客户端调用示例)
7. [流式响应实现](#流式响应实现)
8. [速率限制](#速率限制)

## 介绍
本文档详细介绍了项目中暴露的公共API端点，重点涵盖`/api/openai/route.ts`和`/api/vercelai/route.ts`两个API的实现细节。这些API为前端组件提供了与AI模型交互的能力，支持流式响应和基于检索增强生成（RAG）的功能。API设计遵循RESTful原则，使用JSON格式进行数据交换，并通过环境变量进行配置管理。

## OpenAI API

`/api/openai`端点提供了与OpenAI模型交互的接口，支持流式响应和上下文感知的对话功能。该API在接收到用户请求后，会先检索相关文档，然后将检索到的内容作为系统消息注入到对话上下文中，最后调用OpenAI的流式接口生成响应。

### HTTP方法
- **POST**: 用于发送聊天消息并接收流式响应

### URL路径
- `/api/openai`

### 请求头
| 请求头 | 值 | 说明 |
|-------|-----|------|
| Content-Type | application/json | 指定请求体为JSON格式 |

### 请求体
请求体应遵循`OpenAIRequest`类型定义，包含一个消息数组：

```json
{
  "message": [
    {
      "role": "user",
      "content": "用户输入内容"
    }
  ]
}
```

其中`message`数组中的每个对象都应包含`role`（角色）和`content`（内容）字段。支持的角色包括`user`、`assistant`和`system`。

### 响应格式
API返回`text/event-stream`格式的流式响应，包含以下事件类型：

- `related`: 推送检索到的相关文档片段
- `message`: 推送AI生成的文本片段
- `error`: 推送错误信息

响应头包含以下关键信息：
- `Content-Type: text/event-stream; charset=utf-8`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

**Section sources**
- [route.ts](file://app/api/openai/route.ts#L1-L95)
- [types.ts](file://app/api/openai/types.ts#L1-L6)

## VercelAI API

`/api/vercelai`端点提供了与Vercel AI SDK集成的接口，实现了类似的功能但使用了不同的底层实现。该API同样支持流式响应和RAG功能，但在实现细节上有所差异。

### HTTP方法
- **POST**: 用于发送聊天消息并接收流式响应

### URL路径
- `/api/vercelai`

### 请求头
| 请求头 | 值 | 说明 |
|-------|-----|------|
| Content-Type | application/json | 指定请求体为JSON格式 |

### 请求体
请求体应遵循`OpenAIRequest`类型定义，与OpenAI API类似：

```json
{
  "messages": [
    {
      "role": "user",
      "content": "用户输入内容"
    }
  ]
}
```

注意：该API同时支持`messages`和`message`作为请求体的根属性，以兼容不同的客户端实现。

### 响应格式
API使用Vercel AI SDK的`streamText`功能生成流式响应，并通过`toDataStreamResponse`方法转换为标准的数据流响应。响应包含与OpenAI API类似的事件类型，但实现方式更为简洁。

响应头包含以下关键信息：
- `Content-Type: text/plain; charset=utf-8`
- `Access-Control-Allow-Origin: *`

**Section sources**
- [route.ts](file://app/api/vercelai/route.ts#L1-L69)
- [types.ts](file://app/api/vercelai/types.ts#L1-L6)

## 认证机制
API的认证通过环境变量中的AI密钥实现，无需在每个请求中传递认证信息。这种设计简化了客户端的调用流程，同时确保了密钥的安全性。

### 环境变量配置
API依赖以下环境变量进行配置：

```typescript
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    HTTP_AGENT: z.string().optional(),
    EMBEDDING: z.string().min(1),
    AI_KEY: z.string().min(1),     // AI服务认证密钥
    AI_BASE_URL: z.string().min(1), // AI服务基础URL
    MODEL: z.string().min(1)        // 模型名称
  },
  client: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: z.string().min(1),
  }
});
```

`AI_KEY`环境变量用于认证到AI服务（如OpenAI），`AI_BASE_URL`指定AI服务的API端点，`MODEL`指定要使用的AI模型。

### 实现细节
在API实现中，密钥被用于初始化相应的AI客户端：

```typescript
// OpenAI API
const openai = new OpenAI({
  apiKey: env.AI_KEY,
  baseURL: env.AI_BASE_URL
});

// VercelAI API
const openai = createOpenAI({
  apiKey: env.AI_KEY,
  baseURL: env.AI_BASE_URL
});
```

这种集中式的认证管理方式确保了密钥不会暴露在客户端代码中，提高了安全性。

**Section sources**
- [env.mjs](file://lib/env.mjs#L1-L28)
- [route.ts](file://app/api/openai/route.ts#L15-L20)
- [route.ts](file://app/api/vercelai/route.ts#L15-L20)

## 错误响应
API实现了全面的错误处理机制，能够返回适当的HTTP状态码和错误信息，帮助客户端诊断和处理问题。

### 错误状态码
| 状态码 | 原因 | 说明 |
|-------|------|------|
| 400 | 请求格式无效 | 当请求体不符合预期格式时返回，如消息数组为空或缺少必要字段 |
| 405 | 方法不允许 | 当使用非POST方法访问API时返回 |
| 500 | 服务器内部错误 | 当AI服务调用失败或其他内部错误发生时返回 |

### 错误处理实现
API在多个层面实现了错误处理：

1. **请求验证**: 在处理请求体之前，API会验证输入的有效性：
   - 检查HTTP方法是否为POST
   - 验证消息数组是否存在且不为空
   - 确保最后一条用户消息包含有效内容

2. **流式错误处理**: 在流式响应过程中，任何错误都会通过`error`事件推送：
   ```typescript
   catch (e) {
     const errMsg = e instanceof Error ? e.message : 'error';
     controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(errMsg)}\n\n`));
     controller.close();
   }
   ```

3. **AI服务错误**: 当调用AI服务失败时，错误信息会被捕获并作为流式事件返回，而不是直接返回HTTP 500错误，这确保了流式连接的完整性。

**Section sources**
- [route.ts](file://app/api/openai/route.ts#L25-L40)
- [route.ts](file://app/api/vercelai/route.ts#L22-L37)
- [route.ts](file://app/api/openai/route.ts#L75-L85)

## 客户端调用示例
以下示例展示了如何从客户端调用这些API。

### curl命令示例
```bash
curl -X POST http://localhost:3000/api/openai \
  -H "Content-Type: application/json" \
  -d '{
    "message": [
      {
        "role": "user",
        "content": "什么是前端组件化？"
      }
    ]
  }'
```

```bash
curl -X POST http://localhost:3000/api/vercelai \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "如何使用Button组件？"
      }
    ]
  }'
```

### JavaScript fetch代码片段
```javascript
// 调用OpenAI API
async function callOpenAIAPI(messages) {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: messages
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    // 处理SSE事件
    const events = chunk.split('\n\n');
    events.forEach(event => {
      if (event.startsWith('data:')) {
        const data = JSON.parse(event.substring(5));
        result += data;
      }
    });
  }

  return result;
}
```

```javascript
// 调用VercelAI API
async function callVercelAIAPI(messages) {
  const response = await fetch('/api/vercelai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: messages
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.body;
}
```

**Section sources**
- [index.tsx](file://app/openai-sdk/index.tsx#L88-L135)
- [index.tsx](file://app/vercel-ai/index.tsx#L0-L37)

## 流式响应实现
API实现了流式响应功能，允许客户端实时接收AI生成的内容，提供更好的用户体验。

### OpenAI API流式实现
OpenAI API使用原生的`ReadableStream`实现流式响应：

```typescript
const stream = new ReadableStream({
  async start(controller) {
    // 推送相关文档
    controller.enqueue(encoder.encode(`event: related\ndata: ${JSON.stringify(retrieved)}\n\n`));
    try {
      // 调用OpenAI流式接口
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
      // 错误处理
      controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(errMsg)}\n\n`));
      controller.close();
    }
  }
});
```

### VercelAI API流式实现
VercelAI API使用Vercel AI SDK的高级API：

```typescript
const result = await streamText({
  model: openai(env.MODEL || 'gpt-4o-mini'),
  messages: finalMessages,
  onFinish: async () => {
    console.log('RAG documents retrieved:', retrieved.length);
  }
});

return result.toDataStreamResponse({
  headers: {
    'Access-Control-Allow-Origin': '*'
  }
});
```

### 客户端处理方式
客户端需要使用`Response.body.getReader()`来读取流式响应，并使用`TextDecoder`解码二进制数据。对于SSE格式的响应，需要按`\n\n`分割事件，并解析每个事件的类型和数据。

**Section sources**
- [route.ts](file://app/api/openai/route.ts#L55-L95)
- [route.ts](file://app/api/vercelai/route.ts#L50-L69)

## 速率限制
当前API实现中未显式包含速率限制机制。速率限制应由部署环境或反向代理层（如Nginx、API网关）来实现。

### 建议的速率限制策略
1. **基于IP的限制**: 限制单个IP地址的请求频率，防止滥用
2. **基于令牌的限制**: 为授权用户分配请求令牌，控制API使用量
3. **突发限制**: 允许短时间内的突发请求，但限制长期平均速率

### 监控和配额管理
- 监控API使用量和费用
- 确保AI服务密钥有足够的配额
- 定期检查API使用情况和费用

虽然当前实现没有内置速率限制，但通过环境变量和外部服务可以轻松添加这一功能。

**Section sources**
- [env.mjs](file://lib/env.mjs#L1-L28)
- [OPENAI_SETUP.md](file://OPENAI_SETUP.md#L59-L64)