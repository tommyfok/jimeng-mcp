# Jimeng MCP Service

基于即梦图像生成API的MCP（Model Context Protocol）服务，提供图像生成和任务查询能力。

## 功能特性

- 🎨 **图像生成**: 使用即梦API生成高质量图像
- 📊 **任务查询**: 查询图像生成任务的状态和结果
- 🔧 **模型管理**: 获取可用的模型和采样器列表
- 🚀 **MCP协议**: 完全兼容MCP协议标准

## 安装

### 从npm安装（推荐）

```bash
# 全局安装
npm install -g @tommyfok/jimeng-mcp

# 或本地安装
npm install @tommyfok/jimeng-mcp
```

### 从源码安装

```bash
git clone https://github.com/tommyfok/jimeng-mcp.git
cd jimeng-mcp
npm install
npm run build
```

## 配置

创建 `.env` 文件并配置以下环境变量：

```bash
JIMENG_API_KEY=your_api_key_here
JIMENG_SECRET_KEY=your_secret_key_here
JIMENG_ENDPOINT=https://api.jimeng.com  # 可选
```

## 使用方法

### 1. 启动MCP服务器

```bash
# 使用环境变量
npm start

# 或使用命令行参数
npm run cli serve --api-key YOUR_KEY --secret-key YOUR_SECRET
```

### 2. 测试连接

```bash
npm run cli test --api-key YOUR_KEY --secret-key YOUR_SECRET
```

### 3. 通过npx使用

```bash
# 直接使用npx（无需安装）
npx @tommyfok/jimeng-mcp serve --api-key YOUR_KEY --secret-key YOUR_SECRET

# 或全局安装后使用
npm install -g @tommyfok/jimeng-mcp
jimeng-mcp serve --api-key YOUR_KEY --secret-key YOUR_SECRET

# 测试连接
jimeng-mcp test --api-key YOUR_KEY --secret-key YOUR_SECRET
```

## 可用工具

- `generate_image` - 使用即梦API生成图像
- `query_task` - 查询图像生成任务的状态和结果
- `get_models` - 获取可用的图像生成模型列表
- `get_samplers` - 获取可用的采样器列表

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 运行CLI
npm run cli
```

## 许可证

MIT
