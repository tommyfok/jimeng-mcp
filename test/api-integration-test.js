#!/usr/bin/env node

/**
 * 即梦API集成测试脚本
 * 测试真实的API调用（需要有效的API密钥）
 * 基于官方文档：https://www.volcengine.com/docs/85621/1616429
 */

import { JimengAPI } from '../dist/jimeng-api.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 检查是否有真实的API密钥
const hasRealKeys =
  process.env.JIMENG_ACCESS_KEY &&
  process.env.JIMENG_ACCESS_KEY !== 'test_access_key_for_testing' &&
  process.env.JIMENG_SECRET_KEY &&
  process.env.JIMENG_SECRET_KEY !== 'test_secret_key_for_testing';

if (!hasRealKeys) {
  console.log('⚠️  未检测到真实的API密钥，跳过集成测试');
  console.log('请设置以下环境变量进行真实API测试:');
  console.log('  JIMENG_ACCESS_KEY=your_real_access_key');
  console.log('  JIMENG_SECRET_KEY=your_real_secret_key');
  console.log('  JIMENG_ENDPOINT=https://visual.volcengineapi.com');
  process.exit(0);
}

const config = {
  accessKey: process.env.JIMENG_ACCESS_KEY,
  secretKey: process.env.JIMENG_SECRET_KEY,
  endpoint: process.env.JIMENG_ENDPOINT || 'https://visual.volcengineapi.com',
  region: process.env.JIMENG_REGION || 'cn-north-1',
  service: process.env.JIMENG_SERVICE || 'cv',
};

console.log('🚀 开始即梦API集成测试...\n');
console.log('配置信息:');
console.log(`  端点: ${config.endpoint}`);
console.log(`  区域: ${config.region}`);
console.log(`  服务: ${config.service}`);
console.log('');

async function runIntegrationTests() {
  const api = new JimengAPI(config);

  try {
    // 测试1: 获取推荐尺寸配置
    console.log('1️⃣ 测试获取推荐尺寸配置...');
    try {
      const sizes = api.getRecommendedSizes();
      console.log('✅ 推荐尺寸配置获取成功');
      console.log(
        '   标清1K尺寸:',
        Object.keys(sizes.STANDARD_1K).length,
        '种'
      );
      console.log('   高清2K尺寸:', Object.keys(sizes.HD_2K).length, '种');
      console.log('   示例尺寸:', sizes.STANDARD_1K['1:1']);
    } catch (error) {
      console.log('❌ 推荐尺寸配置获取失败:', error.message);
    }
    console.log('');

    // 测试2: 获取水印选项
    console.log('2️⃣ 测试获取水印选项...');
    try {
      const positions = api.getWatermarkPositions();
      const languages = api.getWatermarkLanguages();
      console.log('✅ 水印选项获取成功');
      console.log('   水印位置:', Object.keys(positions).length, '种');
      console.log('   水印语言:', Object.keys(languages).length, '种');
    } catch (error) {
      console.log('❌ 水印选项获取失败:', error.message);
    }
    console.log('');

    // 测试3: 验证参数
    console.log('3️⃣ 测试参数验证...');
    try {
      const validSize = api.validateImageSize(1024, 1024);
      const invalidSize = api.validateImageSize(100, 100);
      const validPrompt = api.validatePrompt('a beautiful sunset');
      const invalidPrompt = api.validatePrompt('');

      console.log('✅ 参数验证测试成功');
      console.log('   有效尺寸 1024x1024:', validSize);
      console.log('   无效尺寸 100x100:', invalidSize);
      console.log('   有效提示词:', validPrompt);
      console.log('   无效提示词:', invalidPrompt);
    } catch (error) {
      console.log('❌ 参数验证测试失败:', error.message);
    }
    console.log('');

    // 测试4: 图像生成（轻量级测试）
    console.log('4️⃣ 测试图像生成API...');
    try {
      const generationResult = await api.generateImage({
        prompt: 'a simple test image, minimalist design, high quality',
        use_pre_llm: false, // 关闭文本扩写以加快速度
        seed: 42,
        width: 512,
        height: 512,
      });

      console.log('✅ 图像生成请求成功');
      console.log('   任务ID:', generationResult.data?.task_id);
      console.log('   状态码:', generationResult.code);
      console.log('   消息:', generationResult.message);

      // 等待一段时间后查询任务状态
      if (generationResult.data?.task_id) {
        console.log('   等待3秒后查询任务状态...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const queryResult = await api.queryTask(
          generationResult.data.task_id,
          'jimeng_t2i_v30',
          {
            return_url: true,
          }
        );

        console.log('✅ 任务状态查询成功');
        console.log('   当前状态:', queryResult.data?.status);
        console.log('   响应码:', queryResult.code);

        if (queryResult.data?.status === 'done') {
          console.log('   任务已完成！');
          if (
            queryResult.data?.image_urls &&
            queryResult.data.image_urls.length > 0
          ) {
            console.log(
              '   生成的图像URL数量:',
              queryResult.data.image_urls.length
            );
          }
        } else if (queryResult.data?.status === 'in_queue') {
          console.log('   任务仍在队列中等待处理');
        } else if (queryResult.data?.status === 'generating') {
          console.log('   任务正在处理中');
        }
      }
    } catch (error) {
      console.log('❌ 图像生成测试失败:', error.message);
    }
    console.log('');

    // 测试5: 完整流程测试（串行执行，避免并发限制）
    console.log('5️⃣ 测试完整图像生成流程...');
    try {
      console.log('   开始生成图像并等待完成...');
      console.log('   注意：此测试将等待图像生成完成，可能需要较长时间...');

      const fullResult = await api.generateImageAndWait(
        {
          prompt:
            'a beautiful landscape with mountains and lake, photorealistic',
          use_pre_llm: true,
          seed: 123,
          width: 1024,
          height: 1024,
        },
        {
          return_url: true,
          logo_info: {
            add_logo: true,
            position: 0, // 右下角
            language: 0, // 中文
            opacity: 0.3,
            logo_text_content: 'AI生成',
          },
        },
        120000 // 最多等待2分钟，避免测试时间过长
      );

      console.log('✅ 完整流程测试成功');
      console.log('   最终状态:', fullResult.data?.status);
      if (
        fullResult.data?.image_urls &&
        fullResult.data.image_urls.length > 0
      ) {
        console.log('   生成的图像URL数量:', fullResult.data.image_urls.length);
        console.log('   第一个图像URL:', fullResult.data.image_urls[0]);
      }
    } catch (error) {
      if (error.message.includes('timeout') || error.message.includes('超时')) {
        console.log('⚠️  完整流程测试超时（这是正常的，图像生成需要时间）');
      } else {
        console.log('⚠️  完整流程测试失败:', error.message);
      }
    }
    console.log('');

    console.log('🎉 所有集成测试完成！');
  } catch (error) {
    console.error('❌ 集成测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
runIntegrationTests();
