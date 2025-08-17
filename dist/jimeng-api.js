import axios from 'axios';
import { JIMENG_API_CONSTANTS, } from './types.js';
import { VolcengineAuth } from './auth.js';
/**
 * 即梦图像生成API客户端
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */
export class JimengAPI {
    constructor(config) {
        this.config = {
            ...config,
            region: config.region || JIMENG_API_CONSTANTS.DEFAULT_REGION,
            service: config.service || JIMENG_API_CONSTANTS.DEFAULT_SERVICE,
            endpoint: config.endpoint || JIMENG_API_CONSTANTS.DEFAULT_ENDPOINT,
        };
        this.auth = new VolcengineAuth(this.config);
        this.client = axios.create({
            baseURL: this.config.endpoint,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // 添加请求拦截器，自动添加签名
        this.client.interceptors.request.use(async (config) => {
            if (config.data) {
                let signedRequest;
                // 根据请求类型选择签名方法
                if (config.url === '/' && config.method === 'post') {
                    if (config.data.req_key === JIMENG_API_CONSTANTS.REQ_KEY) {
                        if (config.data.task_id) {
                            // 查询任务
                            signedRequest = this.auth.signTaskQueryRequest(config.data);
                        }
                        else {
                            // 提交任务
                            signedRequest = this.auth.signImageGenerationRequest(config.data);
                        }
                    }
                }
                if (signedRequest) {
                    Object.assign(config.headers, signedRequest.headers);
                    config.url = signedRequest.url;
                }
            }
            return config;
        });
        // 添加响应拦截器，统一错误处理
        this.client.interceptors.response.use(response => response, error => {
            if (error.response) {
                const { status, data } = error.response;
                console.error(`API请求失败: ${status}`, data);
                // 根据错误码判断是否需要重试
                if (status === 429 || status === 500) {
                    console.log('建议重试此请求');
                }
            }
            return Promise.reject(error);
        });
    }
    /**
     * 生成图像（提交任务）
     * @param request 图像生成请求参数
     * @returns 任务提交响应
     */
    async generateImage(request) {
        try {
            // 构建请求体，使用官方文档的格式
            const payload = {
                req_key: JIMENG_API_CONSTANTS.REQ_KEY,
                prompt: request.prompt || '',
                use_pre_llm: request.use_pre_llm ?? true,
                seed: request.seed ?? -1,
            };
            // 如果指定了宽高，则添加到请求中
            if (request.width && request.height) {
                payload.width = request.width;
                payload.height = request.height;
            }
            const response = await this.client.post('/', payload);
            return response.data;
        }
        catch (error) {
            console.error('图像生成请求失败:', error.message);
            throw new Error(`图像生成失败: ${error.message}`);
        }
    }
    /**
     * 查询任务状态和结果
     * @param taskId 任务ID
     * @param config 查询配置（如水印、返回URL等）
     * @returns 任务查询响应
     */
    async queryTask(taskId, config) {
        try {
            const payload = {
                req_key: JIMENG_API_CONSTANTS.REQ_KEY,
                task_id: taskId,
            };
            // 如果提供了配置，构建req_json
            if (config) {
                const reqJson = {};
                if (config.return_url !== undefined) {
                    reqJson.return_url = config.return_url;
                }
                if (config.logo_info) {
                    reqJson.logo_info = config.logo_info;
                }
                if (Object.keys(reqJson).length > 0) {
                    payload.req_json = JSON.stringify(reqJson);
                }
            }
            const response = await this.client.post('/', payload);
            return response.data;
        }
        catch (error) {
            console.error('任务查询失败:', error.message);
            throw new Error(`任务查询失败: ${error.message}`);
        }
    }
    /**
     * 等待任务完成并返回结果
     * @param taskId 任务ID
     * @param config 查询配置
     * @param maxWaitTime 最大等待时间（毫秒），默认5分钟
     * @param pollInterval 轮询间隔（毫秒），默认2秒
     * @returns 任务完成后的结果
     */
    async waitForTaskCompletion(taskId, config, maxWaitTime = 5 * 60 * 1000, pollInterval = 2000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const response = await this.queryTask(taskId, config);
                if (response.data.status === 'done') {
                    return response;
                }
                else if (response.data.status === 'not_found' ||
                    response.data.status === 'expired') {
                    throw new Error(`任务状态异常: ${response.data.status}`);
                }
                // 等待指定间隔后再次查询
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            catch (error) {
                console.error('轮询任务状态失败:', error);
                throw error;
            }
        }
        throw new Error('任务等待超时');
    }
    /**
     * 生成图像并等待完成
     * @param request 图像生成请求参数
     * @param config 查询配置
     * @param maxWaitTime 最大等待时间
     * @returns 完整的图像生成结果
     */
    async generateImageAndWait(request, config, maxWaitTime = 5 * 60 * 1000) {
        // 1. 提交任务
        const submitResponse = await this.generateImage(request);
        const taskId = submitResponse.data.task_id;
        console.log(`任务已提交，任务ID: ${taskId}`);
        // 2. 等待任务完成
        return await this.waitForTaskCompletion(taskId, config, maxWaitTime);
    }
    /**
     * 获取推荐尺寸配置
     * @returns 推荐尺寸配置
     */
    getRecommendedSizes() {
        return JIMENG_API_CONSTANTS.RECOMMENDED_SIZES;
    }
    /**
     * 获取水印位置选项
     * @returns 水印位置选项
     */
    getWatermarkPositions() {
        return JIMENG_API_CONSTANTS.WATERMARK_POSITIONS;
    }
    /**
     * 获取水印语言选项
     * @returns 水印语言选项
     */
    getWatermarkLanguages() {
        return JIMENG_API_CONSTANTS.WATERMARK_LANGUAGES;
    }
    /**
     * 验证图像尺寸是否有效
     * @param width 宽度
     * @param height 高度
     * @returns 是否有效
     */
    validateImageSize(width, height) {
        // 检查尺寸范围
        if (width < 512 || width > 2048 || height < 512 || height > 2048) {
            return false;
        }
        // 检查宽高比
        const ratio = width / height;
        if (ratio < 1 / 3 || ratio > 3) {
            return false;
        }
        return true;
    }
    /**
     * 验证提示词长度
     * @param prompt 提示词
     * @returns 是否有效
     */
    validatePrompt(prompt) {
        return prompt.length > 0 && prompt.length <= 800;
    }
}
//# sourceMappingURL=jimeng-api.js.map