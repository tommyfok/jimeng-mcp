import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JimengAPI } from './jimeng-api.js';
import { ImageGenerationRequest, TaskQueryConfig, LogoInfo } from './types.js';
import { z } from 'zod';

/**
 * 即梦MCP服务器
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */
export class JimengMCPServer {
  private server: McpServer;
  private api: JimengAPI;
  private isProcessing: boolean = false; // 并发控制标志
  private processingQueue: Array<() => Promise<any>> = []; // 处理队列

  constructor(config: {
    accessKey: string;
    secretKey: string;
    endpoint?: string;
  }) {
    this.api = new JimengAPI({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      endpoint: config.endpoint,
    });

    // 创建 MCP 服务器实例
    this.server = new McpServer({
      name: 'jimeng-mcp',
      version: '1.0.0',
    });

    this.setupTools();
    this.setupResources();
  }

  /**
   * 并发控制包装器 - 确保同时只有一个图像生成相关的API调用
   */
  private async withConcurrencyControl<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    // 如果正在处理，将操作加入队列
    if (this.isProcessing) {
      return new Promise((resolve, reject) => {
        this.processingQueue.push(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    // 标记为正在处理
    this.isProcessing = true;

    try {
      // 执行操作
      const result = await operation();
      return result;
    } finally {
      // 操作完成后，处理队列中的下一个操作
      this.isProcessing = false;

      if (this.processingQueue.length > 0) {
        const nextOperation = this.processingQueue.shift();
        if (nextOperation) {
          // 异步执行下一个操作，不阻塞当前返回
          setImmediate(() => {
            this.withConcurrencyControl(nextOperation);
          });
        }
      }
    }
  }

  /**
   * 检查是否为图像生成相关的操作
   */
  private isImageGenerationOperation(name: string): boolean {
    return ['generate_image', 'generate_image_and_wait'].includes(name);
  }

  private setupTools() {
    // 图像生成工具
    this.server.registerTool(
      'generate_image',
      {
        title: '图像生成',
        description: '生成图像（提交任务）',
        inputSchema: {
          prompt: z.string().describe('图像描述提示词'),
          use_pre_llm: z.boolean().optional().describe('是否使用预训练LLM'),
          seed: z.number().optional().describe('随机种子'),
          width: z.number().describe('图像宽度'),
          height: z.number().describe('图像高度'),
        },
      },
      async ({ prompt, use_pre_llm, seed, width, height }) => {
        return await this.withConcurrencyControl(async () => {
          const request: Partial<ImageGenerationRequest> = {
            prompt,
            use_pre_llm,
            seed,
            width,
            height,
          };

          const response = await this.api.generateImage(request);

          return {
            content: [
              {
                type: 'text',
                text: `图像生成任务已提交！\n任务ID: ${response.data.task_id}\n状态: ${response.message}`,
              },
            ],
          };
        });
      }
    );

    // 查询任务状态工具
    this.server.registerTool(
      'query_task',
      {
        title: '查询任务状态',
        description: '查询任务状态和结果',
        inputSchema: {
          task_id: z.string().describe('任务ID'),
          return_url: z.boolean().optional().describe('是否返回URL'),
          logo_info: z
            .object({
              position: z.string().optional(),
              language: z.string().optional(),
            })
            .optional()
            .describe('水印信息'),
        },
      },
      async ({ task_id, return_url, logo_info }) => {
        const config: TaskQueryConfig = {};

        if (return_url !== undefined) {
          config.return_url = return_url;
        }

        if (logo_info) {
          config.logo_info = logo_info as LogoInfo;
        }

        const response = await this.api.queryTask(task_id, config);

        let statusText = '';
        switch (response.data.status) {
          case 'in_queue':
            statusText = '任务已提交，等待处理';
            break;
          case 'generating':
            statusText = '任务处理中';
            break;
          case 'done':
            statusText = '任务完成';
            break;
          case 'not_found':
            statusText = '任务未找到';
            break;
          case 'expired':
            statusText = '任务已过期';
            break;
          default:
            statusText = `未知状态: ${response.data.status}`;
        }

        let resultText = `任务状态: ${statusText}\n`;

        if (response.data.status === 'done') {
          if (response.data.image_urls && response.data.image_urls.length > 0) {
            resultText += `\n生成的图像URL:\n${response.data.image_urls.join('\n')}`;
          }
          if (
            response.data.binary_data_base64 &&
            response.data.binary_data_base64.length > 0
          ) {
            resultText += `\n\n生成了 ${response.data.binary_data_base64.length} 张图像`;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: resultText,
            },
          ],
        };
      }
    );

    // 生成图像并等待完成工具
    this.server.registerTool(
      'generate_image_and_wait',
      {
        title: '生成图像并等待',
        description: '生成图像并等待完成',
        inputSchema: {
          prompt: z.string().describe('图像描述提示词'),
          use_pre_llm: z.boolean().optional().describe('是否使用预训练LLM'),
          seed: z.number().optional().describe('随机种子'),
          width: z.number().describe('图像宽度'),
          height: z.number().describe('图像高度'),
          return_url: z.boolean().optional().describe('是否返回URL'),
          logo_info: z
            .object({
              position: z.string().optional(),
              language: z.string().optional(),
            })
            .optional()
            .describe('水印信息'),
          max_wait_time: z.number().optional().describe('最大等待时间（毫秒）'),
        },
      },
      async ({
        prompt,
        use_pre_llm,
        seed,
        width,
        height,
        return_url,
        logo_info,
        max_wait_time,
      }) => {
        return await this.withConcurrencyControl(async () => {
          const request: Partial<ImageGenerationRequest> = {
            prompt,
            use_pre_llm,
            seed,
            width,
            height,
          };

          const config: TaskQueryConfig = {};
          if (return_url !== undefined) {
            config.return_url = return_url;
          }
          if (logo_info) {
            config.logo_info = logo_info as LogoInfo;
          }

          const maxWaitTime = max_wait_time || 5 * 60 * 1000; // 默认5分钟

          const response = await this.api.generateImageAndWait(
            request,
            config,
            maxWaitTime
          );

          let resultText = `图像生成完成！\n`;

          if (response.data.image_urls && response.data.image_urls.length > 0) {
            resultText += `\n生成的图像URL:\n${response.data.image_urls.join('\n')}`;
          }
          if (
            response.data.binary_data_base64 &&
            response.data.binary_data_base64.length > 0
          ) {
            resultText += `\n\n生成了 ${response.data.binary_data_base64.length} 张图像`;
          }

          return {
            content: [
              {
                type: 'text',
                text: resultText,
              },
            ],
          };
        });
      }
    );

    // 获取推荐尺寸工具
    this.server.registerTool(
      'get_recommended_sizes',
      {
        title: '获取推荐尺寸',
        description: '获取推荐图像尺寸配置',
        inputSchema: {},
      },
      async () => {
        const sizes = this.api.getRecommendedSizes();

        return {
          content: [
            {
              type: 'text',
              text: `推荐图像尺寸配置:\n\n标清1K:\n${Object.entries(
                sizes.STANDARD_1K
              )
                .map(
                  ([ratio, size]) =>
                    `  ${ratio}: ${size.width} x ${size.height}`
                )
                .join('\n')}\n\n高清2K:\n${Object.entries(sizes.HD_2K)
                .map(
                  ([ratio, size]) =>
                    `  ${ratio}: ${size.width} x ${size.height}`
                )
                .join('\n')}`,
            },
          ],
        };
      }
    );

    // 获取水印选项工具
    this.server.registerTool(
      'get_watermark_options',
      {
        title: '获取水印选项',
        description: '获取水印配置选项',
        inputSchema: {},
      },
      async () => {
        const positions = this.api.getWatermarkPositions();
        const languages = this.api.getWatermarkLanguages();

        return {
          content: [
            {
              type: 'text',
              text: `水印配置选项:\n\n位置:\n${Object.entries(positions)
                .map(([name, value]) => `  ${name}: ${value}`)
                .join('\n')}\n\n语言:\n${Object.entries(languages)
                .map(([name, value]) => `  ${name}: ${value}`)
                .join('\n')}`,
            },
          ],
        };
      }
    );

    // 验证图像尺寸工具
    this.server.registerTool(
      'validate_image_size',
      {
        title: '验证图像尺寸',
        description: '验证图像尺寸是否有效',
        inputSchema: {
          width: z.number().describe('图像宽度'),
          height: z.number().describe('图像高度'),
        },
      },
      async ({ width, height }) => {
        const isValid = this.api.validateImageSize(width, height);

        return {
          content: [
            {
              type: 'text',
              text: `图像尺寸验证结果: ${isValid ? '有效' : '无效'}\n\n尺寸要求:\n- 宽度和高度范围: 512-2048\n- 宽高比范围: 1:3 到 3:1`,
            },
          ],
        };
      }
    );

    // 验证提示词工具
    this.server.registerTool(
      'validate_prompt',
      {
        title: '验证提示词',
        description: '验证提示词长度是否有效',
        inputSchema: {
          prompt: z.string().describe('提示词'),
        },
      },
      async ({ prompt }) => {
        const isValid = this.api.validatePrompt(prompt);

        return {
          content: [
            {
              type: 'text',
              text: `提示词验证结果: ${isValid ? '有效' : '无效'}\n\n提示词要求:\n- 长度范围: 1-800字符\n- 建议长度: ≤120字符`,
            },
          ],
        };
      }
    );
  }

  private setupResources() {
    // 配置信息资源
    this.server.registerResource(
      'config',
      'config://jimeng',
      {
        title: '即梦API配置',
        description: '即梦图像生成API配置信息',
        mimeType: 'application/json',
      },
      async uri => {
        const sizes = this.api.getRecommendedSizes();
        const positions = this.api.getWatermarkPositions();
        const languages = this.api.getWatermarkLanguages();

        const config = {
          api_info: {
            name: '即梦图像生成API',
            version: '1.0.0',
            description: '基于火山引擎的AI图像生成服务',
          },
          image_sizes: sizes,
          watermark_options: {
            positions,
            languages,
          },
          constraints: {
            image_size: {
              width_range: [512, 2048],
              height_range: [512, 2048],
              aspect_ratio_range: [1 / 3, 3 / 1],
            },
            prompt: {
              min_length: 1,
              max_length: 800,
              recommended_length: 120,
            },
          },
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      }
    );

    // 任务状态资源模板
    this.server.registerResource(
      'task-status',
      new ResourceTemplate('task://{taskId}/status', { list: undefined }),
      {
        title: '任务状态',
        description: '查询特定任务的状态信息',
      },
      async (uri, { taskId }) => {
        try {
          const response = await this.api.queryTask(taskId as string);

          const statusInfo = {
            task_id: taskId,
            status: response.data.status,
            image_urls: response.data.image_urls || [],
            binary_data_count: response.data.binary_data_base64?.length || 0,
          };

          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(statusInfo, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    task_id: taskId,
                    error: error.message,
                    status: 'error',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('即梦MCP服务器已启动');
  }
}
