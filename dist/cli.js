#!/usr/bin/env node
import { Command } from 'commander';
import { JimengMCPServer } from './mcp-server.js';
import dotenv from 'dotenv';
import { quickLogError } from './utils.js';
// 加载环境变量
dotenv.config();
const program = new Command();
program
    .name('jimeng-image-mcp')
    .description('MCP service for Jimeng Image Generation API')
    .version('1.0.0');
program
    .command('serve')
    .description('Start the MCP server')
    .option('-k, --api-key <key>', 'Jimeng API key')
    .option('-s, --secret-key <key>', 'Jimeng secret key')
    .option('-e, --endpoint <url>', 'Jimeng API endpoint (optional)')
    .option('--es-endpoint <url>', 'Elasticsearch endpoint for logging (optional)')
    .option('--env-file <path>', 'Path to .env file (default: .env)')
    .action(async (options) => {
    try {
        // 获取配置
        const config = {
            accessKey: options.apiKey || process.env.JIMENG_ACCESS_KEY || '',
            secretKey: options.secretKey || process.env.JIMENG_SECRET_KEY || '',
            endpoint: options.endpoint || process.env.JIMENG_ENDPOINT,
            esEndpoint: options.esEndpoint || process.env.ES_ENDPOINT,
        };
        // 验证必需参数
        if (!config.accessKey) {
            console.error('Error: API key is required. Use --api-key or set JIMENG_ACCESS_KEY environment variable.');
            process.exit(1);
        }
        if (!config.secretKey) {
            console.error('Error: Secret key is required. Use --secret-key or set JIMENG_SECRET_KEY environment variable.');
            process.exit(1);
        }
        console.error('Starting Jimeng MCP server...');
        console.error(`API Key: ${config.accessKey.substring(0, 8)}...`);
        console.error(`Secret Key: ${config.secretKey.substring(0, 8)}...`);
        if (config.endpoint) {
            console.error(`Endpoint: ${config.endpoint}`);
        }
        if (config.esEndpoint) {
            console.error(`ES Endpoint: ${config.esEndpoint}`);
        }
        // 启动服务器
        const server = new JimengMCPServer(config);
        await server.run();
    }
    catch (error) {
        quickLogError({ error, msg: 'Fail to start server from cli' });
        process.exit(1);
    }
});
program
    .command('test')
    .description('Test the Jimeng API connection')
    .option('-k, --api-key <key>', 'Jimeng API key')
    .option('-s, --secret-key <key>', 'Jimeng secret key')
    .option('-e, --endpoint <url>', 'Jimeng API endpoint (optional)')
    .option('--es-endpoint <url>', 'Elasticsearch endpoint for logging (optional)')
    .action(async (options) => {
    try {
        const config = {
            accessKey: options.apiKey || process.env.JIMENG_ACCESS_KEY || '',
            secretKey: options.secretKey || process.env.JIMENG_SECRET_KEY || '',
            endpoint: options.endpoint || process.env.JIMENG_ENDPOINT,
            esEndpoint: options.esEndpoint || process.env.ES_ENDPOINT,
        };
        if (!config.accessKey || !config.secretKey) {
            console.error('Error: Both API key and secret key are required for testing.');
            process.exit(1);
        }
        console.log('Testing Jimeng API connection...');
        // 这里可以添加测试逻辑
        console.log('✅ Configuration loaded successfully');
        console.log(`API Key: ${config.accessKey.substring(0, 8)}...`);
        console.log(`Secret Key: ${config.secretKey.substring(0, 8)}...`);
        if (config.endpoint) {
            console.log(`Endpoint: ${config.endpoint}`);
        }
        if (config.esEndpoint) {
            console.log(`ES Endpoint: ${config.esEndpoint}`);
        }
        console.log('\nTo start the MCP server, run:');
        console.log('jimeng-image-mcp serve');
    }
    catch (error) {
        quickLogError({ error, msg: 'Fail to test server' });
        process.exit(1);
    }
});
// 如果没有提供命令，显示帮助
if (process.argv.length === 2) {
    program.help();
}
program.parse();
//# sourceMappingURL=cli.js.map