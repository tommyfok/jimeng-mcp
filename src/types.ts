export interface JimengConfig {
  apiKey: string;
  secretKey: string;
  endpoint?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  seed?: number;
  sampler?: string;
  model?: string;
  aspect_ratio?: string;
  quality?: string;
  style?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  data?: {
    task_id: string;
    status: string;
    images?: string[];
    error?: string;
  };
  error?: string;
}

export interface TaskQueryRequest {
  task_id: string;
}

export interface TaskQueryResponse {
  success: boolean;
  data?: {
    task_id: string;
    status: string;
    progress?: number;
    images?: string[];
    error?: string;
    created_at?: string;
    completed_at?: string;
  };
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPCallRequest {
  name: string;
  arguments: any;
}

export interface MCPCallResponse {
  content: any[];
  isError?: boolean;
}
