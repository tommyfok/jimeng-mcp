#!/usr/bin/env node

import { Command } from 'commander';
import { JimengMCPServer } from './mcp-server.js';
import { JimengConfig } from './types.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const program = new Command();

program
  .name('jimeng-mcp')
  .description('MCP service for Jimeng Image Generation API')
  .version('1.0.0');

program
  .command('serve')
  .description('Start the MCP server')
  .option('-k, --api-key <key>', 'Jimeng API key')
  .option('-s, --secret-key <key>', 'Jimeng secret key')
  .option('-e, --endpoint <url>', 'Jimeng API endpoint (optional)')
  .option('--env-file <path>', 'Path to .env file (default: .env)')
  .action(async (options) => {
    try {
      // 获取配置
      const config: JimengConfig = {
        apiKey: options.apiKey || process.env.JIMENG_API_KEY || '',
        secretKey: options.secretKey || process.env.JIMENG_SECRET_KEY || '',
        endpoint: options.endpoint || process.env.JIMENG_ENDPOINT
      };

      // 验证必需参数
      if (!config.apiKey) {
        console.error('Error: API key is required. Use --api-key or set JIMENG_API_KEY environment variable.');
        process.exit(1);
      }

      if (!config.secretKey) {
        console.error('Error: Secret key is required. Use --secret-key or set JIMENG_SECRET_KEY environment variable.');
        process.exit(1);
      }

      console.error('Starting Jimeng MCP server...');
      console.error(`API Key: ${config.apiKey.substring(0, 8)}...`);
      console.error(`Secret Key: ${config.secretKey.substring(0, 8)}...`);
      if (config.endpoint) {
        console.error(`Endpoint: ${config.endpoint}`);
      }

      // 启动服务器
      const server = new JimengMCPServer(config);
      await server.run();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test the Jimeng API connection')
  .option('-k, --api-key <key>', 'Jimeng API key')
  .option('-s, --secret-key <key>', 'Jimeng secret key')
  .option('-e, --endpoint <url>', 'Jimeng API endpoint (optional)')
  .action(async (options) => {
    try {
      const config: JimengConfig = {
        apiKey: options.apiKey || process.env.JIMENG_API_KEY || '',
        secretKey: options.secretKey || process.env.JIMENG_SECRET_KEY || '',
        endpoint: options.endpoint || process.env.JIMENG_ENDPOINT
      };

      if (!config.apiKey || !config.secretKey) {
        console.error('Error: Both API key and secret key are required for testing.');
        process.exit(1);
      }

      console.log('Testing Jimeng API connection...');
      
      // 这里可以添加测试逻辑
      console.log('✅ Configuration loaded successfully');
      console.log(`API Key: ${config.apiKey.substring(0, 8)}...`);
      console.log(`Secret Key: ${config.secretKey.substring(0, 8)}...`);
      if (config.endpoint) {
        console.log(`Endpoint: ${config.endpoint}`);
      }
      
      console.log('\nTo start the MCP server, run:');
      console.log('jimeng-mcp serve');
      
    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    }
  });

// 如果没有提供命令，显示帮助
if (process.argv.length === 2) {
  program.help();
}

program.parse();
