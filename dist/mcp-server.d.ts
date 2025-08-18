/**
 * 即梦MCP服务器
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */
export declare class JimengMCPServer {
    private server;
    private api;
    private isProcessing;
    constructor(config: {
        accessKey: string;
        secretKey: string;
        endpoint?: string;
        esEndpoint?: string;
    });
    /**
     * 检查是否为本地文件路径
     * @param path 文件路径
     * @returns 是否为本地文件路径
     */
    private isLocalFilePath;
    /**
     * 读取本地文件并转换为base64
     * @param filePath 文件路径
     * @returns base64编码的字符串
     */
    private readLocalFileAsBase64;
    /**
     * 验证图片输入格式
     * @param imageUrls 图片URL数组
     * @returns 验证结果
     */
    private validateImageInputs;
    /**
     * 处理图片输入，支持绝对路径、文件协议和远程URL，不支持相对路径
     * @param imageUrls 图片URL数组
     * @returns 处理后的请求对象
     */
    private processImageInput;
    /**
     * 简单的并发控制 - 确保同时只有一个图像生成相关的API调用
     */
    private withConcurrencyControl;
    private setupTools;
    private setupResources;
    run(): Promise<void>;
}
//# sourceMappingURL=mcp-server.d.ts.map