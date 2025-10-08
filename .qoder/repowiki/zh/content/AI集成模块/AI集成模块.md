
# AI集成模块

<cite>
**本文档引用文件**  
- [app/openai-sdk/index.tsx](file://app/openai-sdk/index.tsx)
- [app/langchain/index.tsx](file://app/langchain/index.tsx)
- [app/llamaindex/index.tsx](file://app/llamaindex/index.tsx)
- [app/vercel-ai/index.tsx](file://app/vercel-ai/index.tsx)
- [app/api/openai/route.ts](file://app/api/openai/route.ts)
- [app/api/vercelai/route.ts](file://app/api/vercelai/route.ts)
- [lib/db/openai/schema.ts](file://lib/db/openai/schema.ts)
- [lib/db/vercelai/schema.ts](file://lib/db/vercelai/schema.ts)
- [INTEGRATION_SUMMARY.md](file://INTEGRATION_SUMMARY.md)
- [OPENAI_SETUP.md](file://OPENAI_SETUP.md)
- [README.md](file://README.md)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概述](#架构概述)
5. [详细组件分析](#详细组件分析)
6. [依赖分析](#依赖分析)
7. [性能考量](#性能考量)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)

## 简介
本项目是一个基于私有组件生成业务组件代码的AI RAG（检索增强生成）应用，支持四种不同的AI框架集成：OpenAI SDK、LangChain、LlamaIndex和Vercel AI SDK。每种集成都在`app`目录下拥有独立的页面实现，通过插件式架构设计，实现了多AI框架的灵活支持与统一的用户体验。

## 项目结构
项目采用模块化设计，在`app`目录下为每个AI框架提供独立的集成路径，包括`openai-sdk`、`langchain`、`llamaindex`和`vercel-ai`。每个集成路径包含一个`index.tsx`页面组件，负责渲染