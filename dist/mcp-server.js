import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JimengAPI } from './jimeng-api.js';
import { JIMENG_API_CONSTANTS, } from './types.js';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { isAbsolute } from 'path';
import { quickLogError } from './utils.js';
/**
 * 即梦MCP服务器
 * 基于官方文档：https://www.volcengine.com/docs/85621/1817045
 */
export class JimengMCPServer {
    constructor(config) {
        this.isProcessing = false; // 并发控制标志
        this.api = new JimengAPI({
            accessKey: config.accessKey,
            secretKey: config.secretKey,
            endpoint: config.endpoint,
            esEndpoint: config.esEndpoint,
        });
        // 创建 MCP 服务器实例
        this.server = new McpServer({
            name: 'jimeng-image-mcp',
            version: '1.0.0',
        });
        this.setupTools();
        this.setupResources();
    }
    /**
     * 检查是否为本地文件路径
     * @param path 文件路径
     * @returns 是否为本地文件路径
     */
    isLocalFilePath(path) {
        // 检查是否为localhost或127.0.0.1
        if (path.startsWith('http://localhost') ||
            path.startsWith('http://127.0.0.1')) {
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
    readLocalFileAsBase64(filePath) {
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
        }
        catch (error) {
            quickLogError({ error, msg: 'Fail to read local file as base64' });
            throw error;
        }
    }
    /**
     * 验证图片输入格式
     * @param imageUrls 图片URL数组
     * @returns 验证结果
     */
    validateImageInputs(imageUrls) {
        for (const url of imageUrls) {
            // 检查是否为相对路径
            if (url.startsWith('./') || url.startsWith('../')) {
                throw new Error(`不支持相对路径: ${url}\n` +
                    `请使用以下格式之一：\n` +
                    `• 绝对路径: /path/to/image.jpg\n` +
                    `• 文件协议: file:///path/to/image.jpg\n` +
                    `• 远程URL: https://example.com/image.jpg`);
            }
            // 检查是否为有效的URL格式
            if (url.startsWith('http://') || url.startsWith('https://')) {
                try {
                    new URL(url);
                }
                catch {
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
    processImageInput(imageUrls) {
        const binaryDataBase64 = [];
        const remoteUrls = [];
        for (const url of imageUrls) {
            if (this.isLocalFilePath(url)) {
                try {
                    const base64Data = this.readLocalFileAsBase64(url);
                    binaryDataBase64.push(base64Data);
                    console.log(`✅ 成功读取本地文件: ${url}`);
                }
                catch (error) {
                    quickLogError({ error, msg: 'Fail to process image input' });
                    console.warn(`⚠️  本地文件读取失败: ${url}，错误: ${error instanceof Error ? error.message : String(error)}`);
                    // 如果本地文件读取失败，不再尝试作为远程URL处理
                    // 直接抛出错误，让调用方处理
                    throw new Error(`本地文件读取失败: ${url}。请确保文件路径正确且文件存在。`);
                }
            }
            else {
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
    async withConcurrencyControl(operation) {
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            quickLogError({ error, msg: `❌ 任务执行失败，耗时: ${duration}ms` });
            throw error;
        }
        finally {
            this.isProcessing = false;
            console.log(`🔒 释放并发锁，时间: ${new Date().toISOString()}`);
        }
    }
    setupTools() {
        // 统一的图像生成工具
        this.server.registerTool('generate_image', {
            title: '即梦图像生成',
            description: '使用即梦AI 4.0生成图像。支持文生图、图生图、多图参考生成。支持设置尺寸、比例、编辑强度等。',
            inputSchema: {
                prompt: z.string().describe('图像描述提示词'),
                image_urls: z
                    .array(z.string())
                    .optional()
                    .describe('参考图片输入数组（最多10张）。支持：\n• 绝对路径（如 /path/to/image.jpg）\n• 文件协议（如 file:///path/to/image.jpg）\n• 远程URL（如 https://example.com/image.jpg）\n⚠️ 不支持相对路径'),
                size: z
                    .number()
                    .optional()
                    .describe('生成图片的面积（默认2048*2048），面积和宽高需要2选1传入'),
                width: z
                    .number()
                    .optional()
                    .describe('图像宽度（默认自动），需同时传width和height'),
                height: z
                    .number()
                    .optional()
                    .describe('图像高度（默认自动），需同时传width和height'),
                scale: z
                    .number()
                    .optional()
                    .describe('文本描述影响的程度（0-1之间），默认0.5'),
                force_single: z
                    .boolean()
                    .optional()
                    .describe('是否强制生成单图（默认false）'),
                min_ratio: z
                    .number()
                    .optional()
                    .describe('生图结果的宽/高 ≥ min_ratio（默认1/3）'),
                max_ratio: z
                    .number()
                    .optional()
                    .describe('生图结果的宽/高 ≤ max_ratio（默认3）'),
                seed: z.number().optional().describe('随机种子（默认-1）'),
            },
        }, async ({ prompt, image_urls, size, width, height, scale, force_single, min_ratio, max_ratio, seed, }) => {
            return await this.withConcurrencyControl(async () => {
                // 参数验证与默认值处理
                // 如果没有提供任何尺寸参数，默认使用 1024x1024
                if (size === undefined && width === undefined && height === undefined) {
                    width = 1024;
                    height = 1024;
                }
                else if (size === undefined) {
                    // 如果没有提供 size，检查 width 和 height
                    if (width !== undefined && height === undefined) {
                        throw new Error('提供 width 时必须同时提供 height');
                    }
                    if (width === undefined && height !== undefined) {
                        throw new Error('提供 height 时必须同时提供 width');
                    }
                    // 如果都提供了，验证面积范围
                    if (width !== undefined && height !== undefined) {
                        const area = width * height;
                        const minArea = 1024 * 1024;
                        const maxArea = 4096 * 4096;
                        if (area < minArea || area > maxArea) {
                            throw new Error(`图片面积 (width * height) 必须在 1024*1024 到 4096*4096 之间，` +
                                `当前为 ${width}*${height}=${area}`);
                        }
                    }
                }
                const request = {
                    prompt,
                    size,
                    width,
                    height,
                    scale,
                    force_single,
                    min_ratio,
                    max_ratio,
                    seed,
                };
                // 图片输入处理
                if (image_urls && image_urls.length > 0) {
                    // 验证输入格式
                    this.validateImageInputs(image_urls);
                    const processedInput = this.processImageInput(image_urls);
                    const allUrls = [];
                    // 处理远程URL
                    if (processedInput.image_urls.length > 0) {
                        allUrls.push(...processedInput.image_urls);
                    }
                    // 处理本地文件 -> Data URL
                    // 将本地文件转换为Data URL格式传入 image_urls
                    // 假设为 jpeg 格式，实际可能需要根据文件头判断，但简单起见默认 image/jpeg
                    if (processedInput.binary_data_base64.length > 0) {
                        processedInput.binary_data_base64.forEach(base64 => {
                            allUrls.push(`data:image/jpeg;base64,${base64}`);
                        });
                    }
                    request.image_urls = allUrls;
                }
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
        });
        // 查询任务状态工具
        this.server.registerTool('query_task', {
            title: '查询任务状态',
            description: '查询任务状态和结果',
            inputSchema: {
                task_id: z.string().describe('任务ID'),
                req_key: z
                    .string()
                    .optional()
                    .describe('服务标识，默认使用 jimeng_t2i_v40（4.0版本文生图和图生图统一使用此标识）'),
                return_url: z.boolean().optional().describe('是否返回URL'),
                logo_info: z
                    .object({
                    position: z.string().optional(),
                    language: z.string().optional(),
                })
                    .optional()
                    .describe('水印信息'),
            },
        }, async ({ task_id, req_key, return_url, logo_info }) => {
            const config = {};
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
            // 使用提供的 req_key，如果没有提供则使用默认值（文生图）
            const reqKey = req_key || JIMENG_API_CONSTANTS.REQ_KEY_T2I;
            const response = await this.api.queryTask(task_id, reqKey, config);
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
                if (response.data.binary_data_base64 &&
                    response.data.binary_data_base64.length > 0) {
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
        });
    }
    setupResources() {
        // 配置信息资源 - 统一所有配置信息
        this.server.registerResource('config', 'config://jimeng', {
            title: '即梦API配置',
            description: '即梦图像生成API配置信息',
            mimeType: 'application/json',
        }, async (uri) => {
            const sizes = this.api.getRecommendedSizes();
            const positions = this.api.getWatermarkPositions();
            const languages = this.api.getWatermarkLanguages();
            const scaleRange = this.api.getScaleRange();
            const limits = this.api.getImageLimits();
            const config = {
                api_info: {
                    name: '即梦图像生成API',
                    version: '4.0',
                    description: '基于火山引擎的AI图像生成服务',
                },
                // 尺寸配置
                recommended_sizes: sizes,
                // 尺寸约束
                size_constraints: {
                    width_range: [1024, 4096], // 只是近似值，实际由面积和比例控制
                    height_range: [1024, 4096],
                    area_range: [1024 * 1024, 4096 * 4096],
                    aspect_ratio_range: [1 / 16, 16],
                },
                // 水印配置
                watermark_options: {
                    positions,
                    languages,
                },
                // 编辑强度
                scale_range: scaleRange,
                // 图片输入限制
                image_limits: limits,
                // 提示词限制
                prompt_constraints: {
                    min_length: 1,
                    max_length: 800,
                },
                // 工具说明
                tools: {
                    generate_image: '图像生成（支持文生图、图生图、多图参考）',
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
        });
        // 任务状态资源模板
        this.server.registerResource('task-status', new ResourceTemplate('task://{taskId}/status', { list: undefined }), {
            title: '任务状态',
            description: '查询特定任务的状态信息',
        }, async (uri, { taskId }) => {
            try {
                // 资源查询使用默认的 reqKey（文生图）
                // 如果是图生图任务，需要通过工具查询并指定 req_key
                const response = await this.api.queryTask(Array.isArray(taskId) ? taskId.join(',') : taskId, JIMENG_API_CONSTANTS.REQ_KEY_T2I);
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
            }
            catch (error) {
                quickLogError({ error, msg: 'Fail to query task' });
                return {
                    contents: [
                        {
                            uri: uri.href,
                            text: JSON.stringify({
                                task_id: taskId,
                                error: error instanceof Error ? error.message : String(error),
                                status: 'error',
                            }, null, 2),
                        },
                    ],
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('即梦MCP服务器已启动');
    }
}
//# sourceMappingURL=mcp-server.js.map