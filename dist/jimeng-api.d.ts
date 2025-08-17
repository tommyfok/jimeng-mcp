import { JimengConfig, ImageGenerationRequest, ImageGenerationResponse, TaskQueryResponse, TaskQueryConfig } from './types.js';
/**
 * 即梦图像生成API客户端
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */
export declare class JimengAPI {
    private client;
    private config;
    private auth;
    constructor(config: JimengConfig);
    /**
     * 生成图像（提交任务）
     * @param request 图像生成请求参数
     * @returns 任务提交响应
     */
    generateImage(request: Partial<ImageGenerationRequest>): Promise<ImageGenerationResponse>;
    /**
     * 查询任务状态和结果
     * @param taskId 任务ID
     * @param config 查询配置（如水印、返回URL等）
     * @returns 任务查询响应
     */
    queryTask(taskId: string, config?: TaskQueryConfig): Promise<TaskQueryResponse>;
    /**
     * 等待任务完成并返回结果
     * @param taskId 任务ID
     * @param config 查询配置
     * @param maxWaitTime 最大等待时间（毫秒），默认5分钟
     * @param pollInterval 轮询间隔（毫秒），默认2秒
     * @returns 任务完成后的结果
     */
    waitForTaskCompletion(taskId: string, config?: TaskQueryConfig, maxWaitTime?: number, pollInterval?: number): Promise<TaskQueryResponse>;
    /**
     * 生成图像并等待完成
     * @param request 图像生成请求参数
     * @param config 查询配置
     * @param maxWaitTime 最大等待时间
     * @returns 完整的图像生成结果
     */
    generateImageAndWait(request: Partial<ImageGenerationRequest>, config?: TaskQueryConfig, maxWaitTime?: number): Promise<TaskQueryResponse>;
    /**
     * 获取推荐尺寸配置
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
     * 验证图像尺寸是否有效
     * @param width 宽度
     * @param height 高度
     * @returns 是否有效
     */
    validateImageSize(width: number, height: number): boolean;
    /**
     * 验证提示词长度
     * @param prompt 提示词
     * @returns 是否有效
     */
    validatePrompt(prompt: string): boolean;
}
//# sourceMappingURL=jimeng-api.d.ts.map