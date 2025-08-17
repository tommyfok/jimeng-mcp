/**
 * 即梦图像生成API类型定义
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */
export interface JimengConfig {
    accessKey: string;
    secretKey: string;
    endpoint?: string;
    region?: string;
    service?: string;
}
export interface ImageGenerationRequest {
    req_key: string;
    prompt: string;
    use_pre_llm?: boolean;
    seed?: number;
    width?: number;
    height?: number;
}
export interface ImageGenerationResponse {
    code: string;
    data: {
        task_id: string;
    };
    message: string;
    request_id: string;
    status: string;
    time_elapsed: string;
}
export interface TaskQueryRequest {
    req_key: string;
    task_id: string;
    req_json?: string;
}
export interface LogoInfo {
    add_logo?: boolean;
    position?: number;
    language?: number;
    opacity?: number;
    logo_text_content?: string;
}
export interface TaskQueryConfig {
    return_url?: boolean;
    logo_info?: LogoInfo;
}
export interface TaskQueryResponse {
    code: string;
    data: {
        binary_data_base64: string[] | null;
        image_urls: string[] | null;
        status: 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired';
    };
    message: string;
    request_id: string;
    status: string;
    time_elapsed: string;
}
export interface JimengError {
    HttpCode: number;
    错误码: string;
    错误消息: string;
    描述: string;
    是否需要重试: string;
}
export declare const JIMENG_API_CONSTANTS: {
    readonly REQ_KEY: "jimeng_t2i_v30";
    readonly ACTION_SUBMIT: "CVSync2AsyncSubmitTask";
    readonly ACTION_QUERY: "CVSync2AsyncGetResult";
    readonly VERSION: "2022-08-31";
    readonly DEFAULT_REGION: "cn-north-1";
    readonly DEFAULT_SERVICE: "cv";
    readonly DEFAULT_ENDPOINT: "https://visual.volcengineapi.com";
    readonly RECOMMENDED_SIZES: {
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
    readonly WATERMARK_POSITIONS: {
        readonly BOTTOM_RIGHT: 0;
        readonly BOTTOM_LEFT: 1;
        readonly TOP_LEFT: 2;
        readonly TOP_RIGHT: 3;
    };
    readonly WATERMARK_LANGUAGES: {
        readonly CHINESE: 0;
        readonly ENGLISH: 1;
    };
};
//# sourceMappingURL=types.d.ts.map