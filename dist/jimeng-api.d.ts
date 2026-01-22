import { JimengConfig, ImageGenerationRequest, ImageGenerationResponse, ImageToImageRequest, ImageToImageResponse, TaskQueryResponse, TaskQueryConfig } from './types.js';
/**
 * 即梦图像生成API客户端
 * 基于官方文档：
 * - 文生图：https://www.volcengine.com/docs/85621/1817045
 * - 图生图3.0智能参考：https://www.volcengine.com/docs/85621/1747301
 */
export declare class JimengAPI {
    private client;
    private config;
    private auth;
    constructor(config: JimengConfig);
    /**
     * 生成图像（文生图，提交任务）
     * @param request 图像生成请求参数
     * @returns 任务提交响应
     */
    generateImage(request: Partial<ImageGenerationRequest>): Promise<ImageGenerationResponse>;
    /**
     * 图生图3.0智能参考（提交任务）
     * @param request 图生图请求参数
     * @returns 任务提交响应
     */
    generateImageToImage(request: Partial<ImageToImageRequest>): Promise<ImageToImageResponse>;
    /**
     * 查询任务状态和结果
     * @param taskId 任务ID
     * @param reqKey 服务标识（jimeng_t2i_v30 或 jimeng_i2i_v30）
     * @param config 查询配置（如水印、返回URL等）
     * @returns 任务查询响应
     */
    queryTask(taskId: string, reqKey?: string, config?: TaskQueryConfig): Promise<TaskQueryResponse>;
    /**
     * 获取推荐尺寸配置（文生图）
     * @returns 推荐尺寸配置
     */
    getRecommendedSizes(): {
        readonly STANDARD_1K: {
            readonly '1:1': {
                readonly width: 1328;
                readonly height: 1328;
            };
            readonly '4:3': {
                readonly width: 1472;
                readonly height: 1104;
            };
            readonly '3:2': {
                readonly width: 1584;
                readonly height: 1056;
            };
            readonly '16:9': {
                readonly width: 1664;
                readonly height: 936;
            };
            readonly '21:9': {
                readonly width: 2016;
                readonly height: 864;
            };
        };
        readonly HD_2K: {
            readonly '1:1': {
                readonly width: 2048;
                readonly height: 2048;
            };
            readonly '4:3': {
                readonly width: 2304;
                readonly height: 1728;
            };
            readonly '3:2': {
                readonly width: 2496;
                readonly height: 1664;
            };
            readonly '16:9': {
                readonly width: 2560;
                readonly height: 1440;
            };
            readonly '21:9': {
                readonly width: 3024;
                readonly height: 1296;
            };
        };
    };
    /**
     * 获取图生图推荐尺寸配置
     * @returns 图生图推荐尺寸配置
     */
    getImageToImageRecommendedSizes(): {
        readonly '1:1': {
            readonly width: 1328;
            readonly height: 1328;
        };
        readonly '4:3': {
            readonly width: 1472;
            readonly height: 1104;
        };
        readonly '3:2': {
            readonly width: 1584;
            readonly height: 1056;
        };
        readonly '16:9': {
            readonly width: 1664;
            readonly height: 936;
        };
        readonly '21:9': {
            readonly width: 2016;
            readonly height: 864;
        };
    };
    /**
     * 获取水印位置选项
     * @returns 水印位置选项
     */
    getWatermarkPositions(): {
        readonly BOTTOM_RIGHT: 0;
        readonly BOTTOM_LEFT: 1;
        readonly TOP_LEFT: 2;
        readonly TOP_RIGHT: 3;
    };
    /**
     * 获取水印语言选项
     * @returns 水印语言选项
     */
    getWatermarkLanguages(): {
        readonly CHINESE: 0;
        readonly ENGLISH: 1;
    };
    /**
     * 获取编辑强度范围
     * @returns 编辑强度范围
     */
    getScaleRange(): {
        readonly MIN: 0;
        readonly MAX: 1;
        readonly DEFAULT: 0.5;
    };
    /**
     * 获取图片输入限制
     * @returns 图片输入限制
     */
    getImageLimits(): {
        readonly MAX_SIZE_MB: 4.7;
        readonly MAX_RESOLUTION: 4096;
        readonly MAX_ASPECT_RATIO: 3;
        readonly SUPPORTED_FORMATS: readonly ["JPEG", "PNG"];
    };
    /**
     * 验证图像尺寸是否有效（文生图）
     * @param width 宽度
     * @param height 高度
     * @returns 是否有效
     */
    validateImageSize(width: number, height: number): boolean;
    /**
     * 验证图生图图像尺寸是否有效
     * @param width 宽度
     * @param height 高度
     * @returns 是否有效
     */
    validateImageToImageSize(width: number, height: number): boolean;
    /**
     * 验证提示词长度
     * @param prompt 提示词
     * @returns 是否有效
     */
    validatePrompt(prompt: string): boolean;
    /**
     * 验证编辑强度
     * @param scale 编辑强度
     * @returns 是否有效
     */
    validateScale(scale: number): boolean;
    /**
     * 验证图生图请求参数
     * @param request 图生图请求参数
     */
    private validateImageToImageRequest;
    /**
     * 将图片文件转换为base64编码
     * @param filePath 图片文件路径
     * @returns base64编码字符串
     */
    imageFileToBase64(filePath: string): Promise<string>;
    /**
     * 验证图片文件
     * @param filePath 图片文件路径
     * @returns 验证结果
     */
    validateImageFile(filePath: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=jimeng-api.d.ts.map