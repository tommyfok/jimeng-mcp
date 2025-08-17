import { JimengMCPServer } from './mcp-server.js';
import dotenv from 'dotenv';
// 加载环境变量
dotenv.config();
async function main() {
    try {
        // 从环境变量获取配置
        const config = {
            accessKey: process.env.JIMENG_ACCESS_KEY || '',
            secretKey: process.env.JIMENG_SECRET_KEY || '',
            endpoint: process.env.JIMENG_ENDPOINT,
        };
        // 验证必需参数
        if (!config.accessKey) {
            console.error('Error: JIMENG_ACCESS_KEY environment variable is required');
            process.exit(1);
        }
        if (!config.secretKey) {
            console.error('Error: JIMENG_SECRET_KEY environment variable is required');
            process.exit(1);
        }
        console.error('Starting Jimeng MCP server...');
        console.error(`API Key: ${config.accessKey.substring(0, 8)}...`);
        console.error(`Secret Key: ${config.secretKey.substring(0, 8)}...`);
        if (config.endpoint) {
            console.error(`Endpoint: ${config.endpoint}`);
        }
        // 启动服务器
        const server = new JimengMCPServer(config);
        await server.run();
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// 如果直接运行此文件，启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=index.js.map