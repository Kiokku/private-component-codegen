# OpenAI API 集成配置指南

## 环境变量配置

在项目根目录创建 `.env.local` 文件，并添加以下配置：

```bash
# OpenAI API 配置
AI_KEY=your_openai_api_key_here
AI_BASE_URL=https://api.openai.com/v1
MODEL=gpt-3.5-turbo

# 数据库配置（如果使用）
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# 嵌入模型配置
EMBEDDING=text-embedding-ada-002

# 环境配置
NODE_ENV=development
```

## 配置说明

### AI_KEY

你的 OpenAI API 密钥，可以从 [OpenAI 平台](https://platform.openai.com/api-keys) 获取。

### AI_BASE_URL

OpenAI API 的基础 URL，通常使用默认值 `https://api.openai.com/v1`。

### MODEL

要使用的 AI 模型，推荐使用 `gpt-3.5-turbo` 或 `gpt-4`。

### DATABASE_URL

PostgreSQL 数据库连接字符串，用于存储对话历史和嵌入向量。

### EMBEDDING

用于文本嵌入的模型，推荐使用 `text-embedding-ada-002`。

## 功能特性

- ✅ 流式响应支持
- ✅ RAG 文档检索
- ✅ 消息重试功能
- ✅ 错误处理
- ✅ 实时对话界面

## 使用方法

1. 配置环境变量
2. 启动开发服务器：`npm run dev`
3. 访问 `/openai-sdk` 页面
4. 开始与 AI 助手对话

## 注意事项

- 确保 API 密钥有足够的配额
- 在生产环境中妥善保护环境变量
- 定期检查 API 使用情况和费用
