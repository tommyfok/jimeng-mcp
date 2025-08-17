import axios, { AxiosInstance } from 'axios';
import { 
  JimengConfig, 
  ImageGenerationRequest, 
  ImageGenerationResponse,
  TaskQueryRequest,
  TaskQueryResponse 
} from './types.js';

export class JimengAPI {
  private client: AxiosInstance;
  private config: JimengConfig;

  constructor(config: JimengConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.endpoint || 'https://api.jimeng.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Secret-Key': config.secretKey
      }
    });

    // 添加请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making request to: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        console.log(`Response received: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 生成图像
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const response = await this.client.post('/v1/images/generations', {
        prompt: request.prompt,
        negative_prompt: request.negative_prompt || '',
        width: request.width || 1024,
        height: request.height || 1024,
        steps: request.steps || 20,
        guidance_scale: request.guidance_scale || 7.5,
        seed: request.seed || -1,
        sampler: request.sampler || 'DPM++ 2M Karras',
        model: request.model || 'jimeng-v1',
        aspect_ratio: request.aspect_ratio || '1:1',
        quality: request.quality || 'standard',
        style: request.style || 'natural'
      });

      return {
        success: true,
        data: {
          task_id: response.data.task_id,
          status: response.data.status || 'pending'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * 查询任务状态
   */
  async queryTask(request: TaskQueryRequest): Promise<TaskQueryResponse> {
    try {
      const response = await this.client.get(`/v1/tasks/${request.task_id}`);
      
      return {
        success: true,
        data: {
          task_id: response.data.task_id,
          status: response.data.status,
          progress: response.data.progress,
          images: response.data.images,
          error: response.data.error,
          created_at: response.data.created_at,
          completed_at: response.data.completed_at
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * 获取可用的模型列表
   */
  async getModels(): Promise<{ success: boolean; models?: string[]; error?: string }> {
    try {
      const response = await this.client.get('/v1/models');
      return {
        success: true,
        models: response.data.models || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * 获取可用的采样器列表
   */
  async getSamplers(): Promise<{ success: boolean; samplers?: string[]; error?: string }> {
    try {
      const response = await this.client.get('/v1/samplers');
      return {
        success: true,
        samplers: response.data.samplers || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error occurred'
      };
    }
  }
}
