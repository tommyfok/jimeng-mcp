# 即梦 MCP 服务器

一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的即梦图像生成 API 服务器，使用官方 TypeScript SDK 构建。

## 功能特性

### 🎨 图像生成工具

- **`text_to_image`** - 提交图像生成任务
- **`image_to_image`** - 提交图生图任务（支持绝对路径、文件协议和远程URL，不支持相对路径）
- **`query_task`** - 查询任务状态和结果

### 🔧 辅助工具

- **`get_recommended_sizes`** - 获取推荐图像尺寸配置
- **`get_watermark_options`** - 获取水印配置选项
- **`validate_image_size`** - 验证图像尺寸是否有效
- **`validate_prompt`** - 验证提示词长度是否有效

### 📚 信息资源

- **`config://jimeng`** - 即梦API配置信息
- **`task://{taskId}/status`** - 任务状态信息

## 安装

```bash
npm install jimeng-image-mcp
```

## 环境配置

创建 `.env` 文件：

```env
JIMENG_ACCESS_KEY=your_access_key_here
JIMENG_SECRET_KEY=your_secret_key_here
```

## 使用方法

### 🖼️ 本地文件支持

图生图工具现在支持多种图片输入方式：

**本地文件路径：**

- 相对路径：`./image.jpg`, `../images/photo.png`
- 绝对路径：`/Users/username/Pictures/image.jpg`
- 文件协议：`file:///path/to/image.jpg`

**远程URL：**

- HTTP/HTTPS链接：`https://example.com/image.jpg`

**自动处理：**

- 本地文件会自动读取并转换为base64编码
- 远程URL会直接传递给API
- 支持混合输入（同时使用本地文件和远程URL）

### 在 Cursor 中配置

在 Cursor 的设置中添加以下 MCP 服务器配置：

```json
{
  "mcpServers": {
    "jimeng": {
      "command": "npx",
      "args": ["jimeng-image-mcp", "serve"],
      "env": {
        "JIMENG_ACCESS_KEY": "your_access_key_here",
        "JIMENG_SECRET_KEY": "your_secret_key_here"
      }
    }
  }
}
```

### 作为 MCP 服务器运行

```bash
# 构建项目
npm run build

# 运行 MCP 服务器
npm start
```

### 在代码中使用

```typescript
import { JimengMCPServer } from 'jimeng-image-mcp';

const server = new JimengMCPServer({
  accessKey: process.env.JIMENG_ACCESS_KEY!,
  secretKey: process.env.JIMENG_SECRET_KEY!,
  endpoint: process.env.JIMENG_ENDPOINT,
});

// 启动服务器
await server.run();
```

### CLI 工具

```bash
# 安装 CLI 工具
npm install -g jimeng-image-mcp

# 使用 CLI
jimeng-image-mcp --help
```

## MCP 协议支持

本服务器完全支持 MCP 协议规范，包括：

- ✅ 工具调用 (Tools) - 支持所有即梦API功能
- ✅ 资源管理 (Resources) - 配置信息和任务状态
- ✅ 并发控制 - 防止API调用冲突
- ✅ 错误处理 - 完整的错误捕获和报告
- ✅ 类型安全 - TypeScript + Zod 验证
- ✅ 标准传输 - 支持 stdio 和 HTTP 传输

### 支持的传输方式

- **stdio** - 命令行工具和本地集成
- **HTTP** - 远程服务器部署（需要额外配置）

### 工具调用示例

```typescript
// 生成图像
const result = await client.callTool({
  name: 'text_to_image',
  arguments: {
    prompt: '一只可爱的小猫',
    width: 1024,
    height: 1024,
    use_pre_llm: true,
  },
});

// 图生图（支持绝对路径、文件协议和远程URL，不支持相对路径）
const i2iResult = await client.callTool({
  name: 'image_to_image',
  arguments: {
    prompt: '将小猫变成小狗',
    image_urls: [
      '/path/to/local-cat.jpg', // 绝对路径
      'file:///path/to/another-cat.png', // 文件协议
      'https://example.com/cat.jpg', // 远程URL
    ],
    scale: 0.8,
  },
});

// 查询任务状态
const status = await client.callTool({
  name: 'query_task',
  arguments: {
    task_id: 'task_123',
  },
});
```

### 资源访问示例

```typescript
// 获取配置信息
const config = await client.readResource({
  uri: 'config://jimeng',
});

// 获取任务状态
const taskStatus = await client.readResource({
  uri: 'task://task_123/status',
});
```

## 开发

### 构建

```bash
npm run build
```

### 开发模式

```bash
npm run dev
```

### 代码质量

```bash
# 检查代码格式
npm run lint:check
npm run format:check

# 自动修复代码格式
npm run lint:fix

# 单独运行
npm run lint        # ESLint 检查并修复
npm run format      # Prettier 格式化
```

### 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:api
npm run test:local
```

## 技术架构

- **MCP SDK**: `@modelcontextprotocol/sdk` v1.17.3+
- **类型安全**: TypeScript + Zod 验证
- **并发控制**: 队列式任务处理
- **错误处理**: 完整的错误捕获和报告

## 依赖要求

- Node.js >= 20.0.0
- TypeScript >= 5.0.0

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [即梦 API 文档](https://www.volcengine.com/docs/85621/1616429)
