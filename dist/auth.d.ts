/**
 * AWS V4签名认证工具
 * 基于火山引擎官方文档实现，专门用于即梦API
 */
export declare class VolcengineAuth {
    private accessKey;
    private secretKey;
    private region;
    private service;
    private host;
    private endpoint;
    constructor(config: {
        accessKey: string;
        secretKey: string;
        region?: string;
        service?: string;
        endpoint?: string;
    });
    /**
     * 生成HMAC-SHA256签名
     */
    private sign;
    /**
     * 生成签名密钥
     */
    private getSignatureKey;
    /**
     * 格式化查询参数
     */
    private formatQuery;
    /**
     * 生成AWS V4签名请求头
     */
    signRequest(method: string, path: string, queryParams: Record<string, string>, body: string, action: string, version: string): {
        headers: Record<string, string>;
        url: string;
    };
    /**
     * 生成图像生成请求的签名（提交任务）
     */
    signImageGenerationRequest(body: any): {
        headers: Record<string, string>;
        url: string;
    };
    /**
     * 生成图生图请求的签名（提交任务）
     */
    signImageToImageRequest(body: any): {
        headers: Record<string, string>;
        url: string;
    };
    /**
     * 生成任务查询请求的签名
     */
    signTaskQueryRequest(body: any): {
        headers: Record<string, string>;
        url: string;
    };
    /**
     * 生成通用API请求的签名
     */
    signGenericRequest(method: string, path: string, queryParams: Record<string, string>, body: any, action: string, version: string): {
        headers: Record<string, string>;
        url: string;
    };
}
//# sourceMappingURL=auth.d.ts.map