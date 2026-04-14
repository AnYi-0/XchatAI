# XchatAI

一个基于 **Next.js 16 + React 19 + TypeScript** 的 Twitter/X 对话分析与 AI 聊天项目。

[English README](./README.en.md)

项目核心能力：

- 从 Twitter/X 拉取指定账号资料与最近推文
- 基于推文上下文发起 AI 对话
- 支持引用某条推文进行提问
- 支持 OpenAI / Claude / Gemini / Qwen 等模型配置
- 会话数据本地文件持久化
- 所有页面与接口默认需要登录后访问

---

## 项目截图

### 登录页

登录页

### 工作台首页

工作台首页

### 配置弹窗

配置弹窗

### 聊天窗口 / 引用推文

聊天窗口 / 引用推文

---

## 功能特性

### 功能一览


| 模块    | 能力说明                             |
| ----- | -------------------------------- |
| 登录鉴权  | 所有页面与接口默认登录可见，未登录自动跳转 `/login`   |
| 会话管理  | 支持搜索、新增、删除会话，并可分页加载更多历史会话        |
| AI 对话 | 基于 Twitter/X 推文上下文提问，支持引用推文与流式回复 |
| 配置管理  | 支持前端填写并保存 Twitter/X 与 AI 参数      |
| 本地存储  | 会话写入本地 JSON，运行配置写入项目根目录 `.env`   |


### 登录与访问控制

- 所有系统页面默认需要登录
- 所有 `/api/`* 接口默认需要登录
- 未登录访问页面时自动跳转 `/login`
- 未登录访问接口时返回 `401`，前端自动跳转登录页
- 登录账号和密码从 `.env` 读取
- 密码在服务端按 **MD5** 配置值校验

### 会话与聊天

- 左侧展示会话列表
- 支持搜索会话
- 支持新增会话（输入 Twitter/X 用户名）
- 支持删除会话
- 支持分页加载更多历史会话
- 会话上下文来自目标账号的推文内容
- 支持引用某条推文提问
- AI 回复使用 **SSE 流式输出**
- 支持分页加载更早消息
- 聊天消息支持 Markdown 渲染

### 配置与存储

- 支持在前端配置并保存：
  - Twitter/X Bearer Token
  - Twitter/X API Key / API Secret
  - AI Provider
  - Base URL
  - Model
  - Temperature
  - Max Tokens
  - Thinking 参数
- 配置最终写入服务端 `.env`
- 会话数据保存在：`data/conversations/<conversationId>/conversation.json`
- 配置保存在项目根目录 `.env`

---

## 技术栈

- **前端**：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- **状态管理**：Zustand
- **Markdown 渲染**：react-markdown、remark-gfm
- **AI SDK**：Vercel AI SDK（`ai`）
- **AI Provider**：OpenAI / Anthropic / Google / Qwen compatible
- **服务端运行模式**：Next.js App Router + Route Handlers
- **鉴权**：服务端签名 Session Cookie
- **持久化**：本地 JSON 文件

---

## 目录结构

```text
xchatai/
├─ app/                         # 页面与 API 路由
│  ├─ api/
│  ├─ login/
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/                  # 页面组件
│  ├─ auth/
│  └─ xchatai/
├─ data/                        # 本地会话数据
├─ lib/
│  ├─ hooks/                    # 前端核心业务 Hook
│  ├─ server/
│  │  ├─ auth/                  # Session / 鉴权逻辑
│  │  ├─ providers/             # AI / Twitter 提供商封装
│  │  ├─ services/              # 服务层
│  │  ├─ storage/               # 本地文件存储
│  │  └─ validators/            # 请求校验
│  ├─ services/                 # 前端请求封装
│  ├─ store/                    # Zustand 状态
│  └─ types/                    # 类型定义
├─ public/                      # 静态资源
├─ docs/                        # 文档与截图资源
├─ proxy.ts                     # 登录访问拦截
├─ .env                         # 服务端配置
├─ README.md
└─ README.en.md
```

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

在项目根目录创建 `.env`，可参考：

```env
# 登录配置
XCHATAI_AUTH_USERNAME="demo"
XCHATAI_AUTH_PASSWORD_MD5="c710ac795e1cd0c8648cb83cbdcf6152"
# 可选：自定义 session 签名密钥
XCHATAI_AUTH_SESSION_SECRET="replace-with-your-own-secret"

# AI 配置
XCHATAI_AI_PROVIDER="openai"
XCHATAI_AI_BASE_URL="https://api.openai.com/v1"
XCHATAI_AI_API_KEY="your-api-key"
XCHATAI_AI_MODEL="gpt-4.1-mini"
XCHATAI_AI_TEMPERATURE="0.7"
XCHATAI_AI_MAX_TOKENS="2048"
XCHATAI_AI_ENABLE_THINKING="false"
XCHATAI_AI_THINKING_BUDGET="1024"
XCHATAI_AI_THINKING_LEVEL="medium"

# Twitter / X 配置
XCHATAI_TWITTER_BEARER_TOKEN="your-bearer-token"
XCHATAI_TWITTER_API_KEY="your-api-key"
XCHATAI_TWITTER_API_SECRET="your-api-secret"
XCHATAI_TWITTER_ACCESS_TOKEN="your-access-token"
XCHATAI_TWITTER_ACCESS_SECRET="your-access-secret"
```

### 3. 启动开发环境

```bash
pnpm dev
```

默认访问：

```text
http://localhost:3000
```

### 4. 生产构建

```bash
pnpm build
pnpm start
```

---

## 登录配置说明

系统登录依赖以下两个配置：

```env
XCHATAI_AUTH_USERNAME="demo"
XCHATAI_AUTH_PASSWORD_MD5="<md5后的密码>"
```

### 如何生成 MD5 密码

#### macOS

```bash
echo -n '你的明文密码' | md5
```

#### Linux

```bash
echo -n '你的明文密码' | md5sum
```

#### Node.js

```bash
node -e "console.log(require('crypto').createHash('md5').update('你的明文密码').digest('hex'))"
```

> 注意：用户在登录页输入的是**明文密码**，服务端会将其计算为 MD5 后，与 `.env` 中的哈希值进行比对。

---

## 使用流程

### 1. 登录

- 打开系统后，如果未登录会自动跳转到 `/login`
- 输入 `.env` 中配置的用户名与对应明文密码

### 2. 配置 AI / Twitter

- 首次进入系统，如果缺少必要配置，会自动弹出配置窗口
- 填写 Twitter/X 与 AI 参数后保存

### 3. 新增会话

- 在左侧输入目标 Twitter/X 用户名
- 系统会拉取该账号资料与最近推文并创建本地会话

### 4. 发起对话

- 可以直接发问
- 也可以先引用某条推文，再基于该推文提问
- 回复内容会流式输出

## 本地数据示例

会话文件示例：

```json
{
  "id": "test-user-001",
  "name": "Annie Case",
  "handle": "anniecase",
  "bio": "Music creator, performer, and storyteller.",
  "messageCount": 8,
  "messages": [
    {
      "id": "tweet-1",
      "role": "tweet",
      "content": "A short reminder...",
      "createdAt": "2026-04-13T02:08:14.757Z"
    },
    {
      "id": "msg-1",
      "role": "user",
      "content": "你这句话是想表达什么？",
      "createdAt": "2026-04-13T06:08:14.757Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "可以理解为...",
      "createdAt": "2026-04-13T06:09:14.757Z"
    }
  ]
}
```

---

## License

本项目基于 **Apache License 2.0** 开源发布。

- License 文件：`[LICENSE](./LICENSE)`
- 你可以自由使用、修改、分发和商用本项目，但需遵守 Apache-2.0 条款

