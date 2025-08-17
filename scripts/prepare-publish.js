#!/usr/bin/env node

/**
 * 发布前检查脚本
 * 确保所有必要的文件都已准备好
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 开始发布前检查...\n');

try {
  // 1. 检查 package.json
  console.log('📋 检查 package.json...');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  // 检查必要字段
  const requiredFields = [
    'name',
    'version',
    'description',
    'main',
    'bin',
    'files',
  ];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      throw new Error(`缺少必要字段: ${field}`);
    }
  }
  console.log('✅ package.json 检查通过');

  // 2. 检查构建文件
  console.log('\n🔨 检查构建文件...');
  if (!existsSync('dist/index.js')) {
    throw new Error('dist/index.js 不存在，请先运行 npm run build');
  }
  if (!existsSync('dist/cli.js')) {
    throw new Error('dist/cli.js 不存在，请先运行 npm run build');
  }
  console.log('✅ 构建文件检查通过');

  // 3. 检查文档文件
  console.log('\n📚 检查文档文件...');
  if (!existsSync('README.md')) {
    throw new Error('README.md 不存在');
  }
  if (!existsSync('LICENSE')) {
    throw new Error('LICENSE 不存在');
  }
  console.log('✅ 文档文件检查通过');

  // 4. 运行构建测试
  console.log('\n🧪 运行构建测试...');
  execSync('npm run test:build', { stdio: 'inherit' });
  console.log('✅ 构建测试通过');

  // 5. 检查 npm 登录状态
  console.log('\n🔐 检查 npm 登录状态...');
  try {
    execSync('npm whoami', { stdio: 'pipe' });
    console.log('✅ npm 已登录');
  } catch (error) {
    console.log('⚠️  npm 未登录，请运行 npm login');
  }

  // 6. 显示发布信息
  console.log('\n📦 发布信息:');
  console.log(`包名: ${packageJson.name}`);
  console.log(`版本: ${packageJson.version}`);
  console.log(`描述: ${packageJson.description}`);
  console.log(`入口文件: ${packageJson.main}`);
  console.log(`CLI 工具: ${packageJson.bin['jimeng-mcp']}`);
  console.log(`包含文件: ${packageJson.files.join(', ')}`);

  console.log('\n🎉 所有检查通过！可以发布到 npm 了');
  console.log('\n📝 发布命令:');
  console.log('  npm publish                    # 发布当前版本');
  console.log('  npm run publish:patch          # 发布补丁版本');
  console.log('  npm run publish:minor          # 发布次要版本');
  console.log('  npm run publish:major          # 发布主要版本');
} catch (error) {
  console.error('\n❌ 检查失败:', error.message);
  process.exit(1);
}
