import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  ListToolsResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { JimengAPI } from './jimeng-api.js';
import { JimengConfig } from './types.js';

export class JimengMCPServer {
  private server: Server;
  private jimengAPI: JimengAPI;

  constructor(config: JimengConfig) {
    this.jimengAPI = new JimengAPI(config);
    this.server = new Server(
      {
        name: 'jimeng-mcp',
        version: '1.0.0',
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'generate_image',
          description: '使用即梦API生成图像',
          inputSchema: { type: 'object' }
        },
        {
          name: 'query_task',
          description: '查询图像生成任务的状态和结果',
          inputSchema: { type: 'object' }
        },
        {
          name: 'get_models',
          description: '获取可用的图像生成模型列表',
          inputSchema: { type: 'object' }
        },
        {
          name: 'get_samplers',
          description: '获取可用的采样器列表',
          inputSchema: { type: 'object' }
        }
      ];

      return {
        tools,
      } satisfies ListToolsResult;
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        switch (name) {
          case 'generate_image':
            result = await this.jimengAPI.generateImage(args as any);
            break;
          
          case 'query_task':
            result = await this.jimengAPI.queryTask(args as any);
            break;
          
          case 'get_models':
            result = await this.jimengAPI.getModels();
            break;
          
          case 'get_samplers':
            result = await this.jimengAPI.getSamplers();
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ],
          isError: false
        } satisfies CallToolResult;

      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        } satisfies CallToolResult;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jimeng MCP server started');
  }
}
