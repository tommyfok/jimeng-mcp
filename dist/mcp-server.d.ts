/**
 * 即梦MCP服务器
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */
export declare class JimengMCPServer {
    private server;
    private api;
    private isProcessing;
    private processingQueue;
    constructor(config: {
        accessKey: string;
        secretKey: string;
        endpoint?: string;
    });
    /**
     * 并发控制包装器 - 确保同时只有一个图像生成相关的API调用
     */
    private withConcurrencyControl;
    /**
     * 检查是否为图像生成相关的操作
     */
    private isImageGenerationOperation;
    private setupTools;
    private setupResources;
    run(): Promise<void>;
}
//# sourceMappingURL=mcp-server.d.ts.map