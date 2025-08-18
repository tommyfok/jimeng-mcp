import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JimengAPI } from './jimeng-api.js';
import { ImageGenerationRequest, TaskQueryConfig } from './types.js';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { isAbsolute } from 'path';
import { quickLogError } from './utils.js';

/**
 * 即梦MCP服务器
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */
export class JimengMCPServer {
  private server: McpServer;
  private api: JimengAPI;
  private isProcessing: boolean = false; // 并发控制标志

  constructor(config: {
    accessKey: string;
    secretKey: string;
    endpoint?: string;
    esEndpoint?: string;
  }) {
    this.api = new JimengAPI({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      endpoint: config.endpoint,
      esEndpoint: config.esEndpoint,
    });

    // 创建 MCP 服务器实例
    this.server = new McpServer({
      name: 'jimeng-image-mcp',
      version: '0.3.3',
    });

    this.setupTools();
    this.setupResources();
  }

  /**
   * 检查是否为本地文件路径
   * @param path 文件路径
   * @returns 是否为本地文件路径
   */
  private isLocalFilePath(path: string): boolean {
    // 检查是否为localhost或127.0.0.1
    if (
      path.startsWith('http://localhost') ||
      path.startsWith('http://127.0.0.1')
    ) {
      return true;
    }

    // 只支持绝对路径，移除相对路径支持
    if (isAbsolute(path)) {
      return true;
    }

    // 检查是否为文件协议
    if (path.startsWith('file://')) {
      return true;
    }

    return false;
  }

  /**
   * 读取本地文件并转换为base64
   * @param filePath 文件路径
   * @returns base64编码的字符串
   */
  private readLocalFileAsBase64(filePath: string): string {
    try {
      // 移除file://协议前缀
      const cleanPath = filePath.replace(/^file:\/\//, '');

      // 只处理绝对路径，不再支持相对路径解析
      const resolvedPath = cleanPath;

      // 检查文件是否存在
      if (!existsSync(resolvedPath)) {
        throw new Error(`文件不存在: ${resolvedPath}`);
      }

      // 读取文件并转换为base64
      const fileBuffer = readFileSync(resolvedPath);
      return fileBuffer.toString('base64');
    } catch (error) {
      quickLogError({ error, msg: 'Fail to read local file as base64' });
      throw error;
    }
  }

  /**
   * 验证图片输入格式
   * @param imageUrls 图片URL数组
   * @returns 验证结果
   */
  private validateImageInputs(imageUrls: string[]): void {
    for (const url of imageUrls) {
      // 检查是否为相对路径
      if (url.startsWith('./') || url.startsWith('../')) {
        throw new Error(
          `不支持相对路径: ${url}\n` +
            `请使用以下格式之一：\n` +
            `• 绝对路径: /path/to/image.jpg\n` +
            `• 文件协议: file:///path/to/image.jpg\n` +
            `• 远程URL: https://example.com/image.jpg`
        );
      }

      // 检查是否为有效的URL格式
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          new URL(url);
        } catch {
          throw new Error(`无效的URL格式: ${url}`);
        }
      }
    }
  }

  /**
   * 处理图片输入，支持绝对路径、文件协议和远程URL，不支持相对路径
   * @param imageUrls 图片URL数组
   * @returns 处理后的请求对象
   */
  private processImageInput(imageUrls: string[]): {
    binary_data_base64: string[];
    image_urls: string[];
  } {
    const binaryDataBase64: string[] = [];
    const remoteUrls: string[] = [];

    for (const url of imageUrls) {
      if (this.isLocalFilePath(url)) {
        try {
          const base64Data = this.readLocalFileAsBase64(url);
          binaryDataBase64.push(base64Data);
          console.log(`✅ 成功读取本地文件: ${url}`);
        } catch (error) {
          quickLogError({ error, msg: 'Fail to process image input' });
          console.warn(
            `⚠️  本地文件读取失败: ${url}，错误: ${error instanceof Error ? error.message : String(error)}`
          );
          // 如果本地文件读取失败，不再尝试作为远程URL处理
          // 直接抛出错误，让调用方处理
          throw new Error(
            `本地文件读取失败: ${url}。请确保文件路径正确且文件存在。`
          );
        }
      } else {
        remoteUrls.push(url);
        console.log(`✅ 添加远程URL: ${url}`);
      }
    }

    return {
      binary_data_base64: binaryDataBase64,
      image_urls: remoteUrls,
    };
  }

  /**
   * 简单的并发控制 - 确保同时只有一个图像生成相关的API调用
   */
  private async withConcurrencyControl<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.isProcessing) {
      const error = new Error('另一个图像生成任务正在进行中，请稍后再试');
      console.warn(`⚠️  并发控制: ${error.message}`);
      throw error;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    console.log(`🚀 开始执行任务，时间: ${new Date().toISOString()}`);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      console.log(`✅ 任务执行成功，耗时: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      quickLogError({ error, msg: `❌ 任务执行失败，耗时: ${duration}ms` });
      throw error;
    } finally {
      this.isProcessing = false;
      console.log(`🔒 释放并发锁，时间: ${new Date().toISOString()}`);
    }
  }

  private setupTools() {
    // 文生图工具
    this.server.registerTool(
      'text_to_image',
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

    // 图生图工具
    this.server.registerTool(
      'image_to_image',
      {
        title: '图生图',
        description: '基于输入图片生成新图像（提交任务）',
        inputSchema: {
          prompt: z.string().describe('图像描述提示词'),
          image_urls: z
            .array(z.string())
            .optional()
            .describe(
              '图片输入数组，支持：\n• 绝对路径（如 /path/to/image.jpg）\n• 文件协议（如 file:///path/to/image.jpg）\n• 远程URL（如 https://example.com/image.jpg）\n⚠️ 不支持相对路径（如 ./image.jpg）'
            ),
          scale: z.number().optional().describe('编辑强度（0-1之间）'),
          seed: z.number().optional().describe('随机种子'),
          width: z.number().optional().describe('图像宽度'),
          height: z.number().optional().describe('图像高度'),
        },
      },
      async ({ prompt, image_urls, scale, seed, width, height }) => {
        return await this.withConcurrencyControl(async () => {
          const request: any = {
            prompt,
            scale,
            seed,
          };

          // 图片输入处理（支持绝对路径、文件协议和远程URL，不支持相对路径）
          if (image_urls && image_urls.length > 0) {
            // 首先验证输入格式
            this.validateImageInputs(image_urls);

            const processedInput = this.processImageInput(image_urls);

            // 设置处理后的图片输入
            if (processedInput.binary_data_base64.length > 0) {
              request.binary_data_base64 = processedInput.binary_data_base64;
            }
            if (processedInput.image_urls.length > 0) {
              request.image_urls = processedInput.image_urls;
            }

            // 检查是否有有效的图片输入
            if (
              processedInput.binary_data_base64.length === 0 &&
              processedInput.image_urls.length === 0
            ) {
              return {
                content: [
                  {
                    type: 'text',
                    text: '❌ 没有有效的图片输入。请检查文件路径是否正确，或提供有效的远程URL。',
                  },
                ],
              };
            }
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 必须提供图片输入。支持：\n• 绝对路径（如 /path/to/image.jpg）\n• 文件协议（如 file:///path/to/image.jpg）\n• 远程URL（如 https://example.com/image.jpg）\n⚠️ 不支持相对路径（如 ./image.jpg）',
                },
              ],
            };
          }

          // 如果指定了宽高，则添加到请求中
          if (width && height) {
            request.width = width;
            request.height = height;
          }

          const response = await this.api.generateImageToImage(request);

          return {
            content: [
              {
                type: 'text',
                text: `图生图任务已提交！\n任务ID: ${response.data.task_id}\n状态: ${response.message}`,
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
          config.logo_info = {
            position: logo_info.position
              ? Number(logo_info.position)
              : undefined,
            language: logo_info.language
              ? Number(logo_info.language)
              : undefined,
          };
        }

        const response = await this.api.queryTask(task_id, undefined, config);

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
  }

  private setupResources() {
    // 配置信息资源 - 统一所有配置信息
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
        const i2iSizes = this.api.getImageToImageRecommendedSizes();
        const positions = this.api.getWatermarkPositions();
        const languages = this.api.getWatermarkLanguages();
        const scaleRange = this.api.getScaleRange();
        const limits = this.api.getImageLimits();

        const config = {
          api_info: {
            name: '即梦图像生成API',
            version: '1.0.0',
            description: '基于火山引擎的AI图像生成服务',
          },
          // 文生图尺寸配置
          text_to_image_sizes: {
            standard_1k: sizes.STANDARD_1K,
            hd_2k: sizes.HD_2K,
            constraints: {
              width_range: [512, 2048],
              height_range: [512, 2048],
              aspect_ratio_range: [1 / 3, 3 / 1],
            },
          },
          // 图生图尺寸配置
          image_to_image_sizes: {
            recommended: i2iSizes,
            constraints: {
              width_range: [512, 2016],
              height_range: [512, 2016],
              aspect_ratio_range: [1 / 3, 3 / 1],
            },
          },
          // 水印配置
          watermark_options: {
            positions,
            languages,
          },
          // 图生图编辑强度
          scale_range: scaleRange,
          // 图片输入限制
          image_limits: limits,
          // 提示词限制
          prompt_constraints: {
            min_length: 1,
            max_length: 800,
            recommended_length: 120,
          },
          // 工具说明
          tools: {
            text_to_image: '文生图（提交任务）',
            image_to_image: '图生图（提交任务）',
            query_task: '查询任务状态',
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
          const response = await this.api.queryTask(
            Array.isArray(taskId) ? taskId.join(',') : taskId
          );

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
        } catch (error: unknown) {
          quickLogError({ error, msg: 'Fail to query task' });
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    task_id: taskId,
                    error:
                      error instanceof Error ? error.message : String(error),
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
