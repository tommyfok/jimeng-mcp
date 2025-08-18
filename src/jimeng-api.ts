import axios, { AxiosInstance } from 'axios';
import {
  JimengConfig,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageToImageRequest,
  ImageToImageResponse,
  TaskQueryRequest,
  TaskQueryResponse,
  TaskQueryConfig,
  JIMENG_API_CONSTANTS,
} from './types.js';
import { VolcengineAuth } from './auth.js';
import { quickLogError } from './utils.js';

/**
 * 即梦图像生成API客户端
 * 基于官方文档：
 * - 文生图：https://www.volcengine.com/docs/85621/1616429
 * - 图生图3.0智能参考：https://www.volcengine.com/docs/85621/1747301
 */
export class JimengAPI {
  private client: AxiosInstance;
  private config: JimengConfig;
  private auth: VolcengineAuth;

  constructor(config: JimengConfig) {
    this.config = {
      ...config,
      region: config.region || JIMENG_API_CONSTANTS.DEFAULT_REGION,
      service: config.service || JIMENG_API_CONSTANTS.DEFAULT_SERVICE,
      endpoint: config.endpoint || JIMENG_API_CONSTANTS.DEFAULT_ENDPOINT,
    };

    // 设置ES_ENDPOINT环境变量（如果配置中提供了）
    if (config.esEndpoint) {
      process.env.ES_ENDPOINT = config.esEndpoint;
    }

    this.auth = new VolcengineAuth(this.config);

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加请求拦截器，自动添加签名
    this.client.interceptors.request.use(async config => {
      if (config.data) {
        let signedRequest;

        // 根据请求类型选择签名方法
        if (config.url === '/' && config.method === 'post') {
          if (
            config.data.req_key === JIMENG_API_CONSTANTS.REQ_KEY_T2I ||
            config.data.req_key === JIMENG_API_CONSTANTS.REQ_KEY_I2I
          ) {
            if (config.data.task_id) {
              // 查询任务
              signedRequest = this.auth.signTaskQueryRequest(config.data);
            } else {
              // 提交任务（文生图或图生图）
              if (config.data.req_key === JIMENG_API_CONSTANTS.REQ_KEY_T2I) {
                signedRequest = this.auth.signImageGenerationRequest(
                  config.data
                );
              } else {
                signedRequest = this.auth.signImageToImageRequest(config.data);
              }
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
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          const { status, data } = error.response;
          console.error(`API请求失败: ${status}`, data);

          // 根据错误码判断是否需要重试
          if (status === 429 || status === 500) {
            console.log('建议重试此请求');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 生成图像（文生图，提交任务）
   * @param request 图像生成请求参数
   * @returns 任务提交响应
   */
  async generateImage(
    request: Partial<ImageGenerationRequest>
  ): Promise<ImageGenerationResponse> {
    try {
      // 构建请求体，使用官方文档的格式
      const payload: ImageGenerationRequest = {
        req_key: JIMENG_API_CONSTANTS.REQ_KEY_T2I,
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
    } catch (error: any) {
      quickLogError({ error, msg: 'Fail to generate image' });
      throw new Error(`文生图失败: ${error.message}`);
    }
  }

  /**
   * 图生图3.0智能参考（提交任务）
   * @param request 图生图请求参数
   * @returns 任务提交响应
   */
  async generateImageToImage(
    request: Partial<ImageToImageRequest>
  ): Promise<ImageToImageResponse> {
    try {
      // 验证输入参数
      this.validateImageToImageRequest(request);

      // 构建请求体
      const payload: ImageToImageRequest = {
        req_key: JIMENG_API_CONSTANTS.REQ_KEY_I2I,
        prompt: request.prompt || '',
        seed: request.seed ?? -1,
        scale: request.scale ?? JIMENG_API_CONSTANTS.SCALE_RANGE.DEFAULT,
      };

      // 图片输入（二选一）
      if (request.binary_data_base64 && request.binary_data_base64.length > 0) {
        payload.binary_data_base64 = request.binary_data_base64;
      } else if (request.image_urls && request.image_urls.length > 0) {
        payload.image_urls = request.image_urls;
      } else {
        throw new Error('必须提供图片输入：binary_data_base64 或 image_urls');
      }

      // 如果指定了宽高，则添加到请求中
      if (request.width && request.height) {
        payload.width = request.width;
        payload.height = request.height;
      }

      const response = await this.client.post('/', payload);
      return response.data;
    } catch (error: any) {
      quickLogError({ error, msg: 'Fail to generate image to image' });
      throw new Error(`图生图失败: ${error.message}`);
    }
  }

  /**
   * 查询任务状态和结果
   * @param taskId 任务ID
   * @param reqKey 服务标识（jimeng_t2i_v30 或 jimeng_i2i_v30）
   * @param config 查询配置（如水印、返回URL等）
   * @returns 任务查询响应
   */
  async queryTask(
    taskId: string,
    reqKey: string = JIMENG_API_CONSTANTS.REQ_KEY_T2I,
    config?: TaskQueryConfig
  ): Promise<TaskQueryResponse> {
    try {
      const payload: TaskQueryRequest = {
        req_key: reqKey,
        task_id: taskId,
      };

      // 如果提供了配置，构建req_json
      if (config) {
        const reqJson: any = {};

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
    } catch (error: any) {
      quickLogError({ error, msg: 'Fail to query task' });
      throw new Error(`任务查询失败: ${error.message}`);
    }
  }

  /**
   * 获取推荐尺寸配置（文生图）
   * @returns 推荐尺寸配置
   */
  getRecommendedSizes() {
    return JIMENG_API_CONSTANTS.RECOMMENDED_SIZES;
  }

  /**
   * 获取图生图推荐尺寸配置
   * @returns 图生图推荐尺寸配置
   */
  getImageToImageRecommendedSizes() {
    return JIMENG_API_CONSTANTS.I2I_RECOMMENDED_SIZES;
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
   * 获取编辑强度范围
   * @returns 编辑强度范围
   */
  getScaleRange() {
    return JIMENG_API_CONSTANTS.SCALE_RANGE;
  }

  /**
   * 获取图片输入限制
   * @returns 图片输入限制
   */
  getImageLimits() {
    return JIMENG_API_CONSTANTS.IMAGE_LIMITS;
  }

  /**
   * 验证图像尺寸是否有效（文生图）
   * @param width 宽度
   * @param height 高度
   * @returns 是否有效
   */
  validateImageSize(width: number, height: number): boolean {
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
   * 验证图生图图像尺寸是否有效
   * @param width 宽度
   * @param height 高度
   * @returns 是否有效
   */
  validateImageToImageSize(width: number, height: number): boolean {
    // 检查尺寸范围
    if (width < 512 || width > 2016 || height < 512 || height > 2016) {
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
  validatePrompt(prompt: string): boolean {
    return prompt.length > 0 && prompt.length <= 800;
  }

  /**
   * 验证编辑强度
   * @param scale 编辑强度
   * @returns 是否有效
   */
  validateScale(scale: number): boolean {
    return scale >= 0 && scale <= 1;
  }

  /**
   * 验证图生图请求参数
   * @param request 图生图请求参数
   */
  private validateImageToImageRequest(
    request: Partial<ImageToImageRequest>
  ): void {
    // 验证提示词
    if (!request.prompt || !this.validatePrompt(request.prompt)) {
      throw new Error('提示词不能为空且长度不能超过800字符');
    }

    // 验证图片输入
    if (!request.binary_data_base64 && !request.image_urls) {
      throw new Error('必须提供图片输入：binary_data_base64 或 image_urls');
    }

    if (request.binary_data_base64 && request.binary_data_base64.length === 0) {
      throw new Error('binary_data_base64 不能为空数组');
    }

    if (request.image_urls && request.image_urls.length === 0) {
      throw new Error('image_urls 不能为空数组');
    }

    // 验证编辑强度
    if (request.scale !== undefined && !this.validateScale(request.scale)) {
      throw new Error('编辑强度必须在0到1之间');
    }

    // 验证尺寸
    if (request.width && request.height) {
      if (!this.validateImageToImageSize(request.width, request.height)) {
        throw new Error(
          '图像尺寸无效，宽度和高度必须在512到2016之间，且宽高比在1:3到3:1之间'
        );
      }
    }
  }

  /**
   * 将图片文件转换为base64编码
   * @param filePath 图片文件路径
   * @returns base64编码字符串
   */
  async imageFileToBase64(filePath: string): Promise<string> {
    try {
      const fs = await import('fs');
      const imageBuffer = fs.readFileSync(filePath);
      return imageBuffer.toString('base64');
    } catch (error: any) {
      quickLogError({ error, msg: 'Fail to image file to base64' });
      throw new Error(`图片文件读取失败: ${error.message}`);
    }
  }

  /**
   * 验证图片文件
   * @param filePath 图片文件路径
   * @returns 验证结果
   */
  async validateImageFile(
    filePath: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: '文件不存在' };
      }

      // 检查文件扩展名
      const ext = path.extname(filePath).toLowerCase();
      if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
        return { valid: false, error: '只支持JPEG和PNG格式' };
      }

      // 检查文件大小
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > JIMENG_API_CONSTANTS.IMAGE_LIMITS.MAX_SIZE_MB) {
        return {
          valid: false,
          error: `文件大小超过${JIMENG_API_CONSTANTS.IMAGE_LIMITS.MAX_SIZE_MB}MB限制`,
        };
      }

      return { valid: true };
    } catch (error: any) {
      quickLogError({ error, msg: 'Fail to validate image file' });
      return { valid: false, error: `文件验证失败: ${error.message}` };
    }
  }
}
