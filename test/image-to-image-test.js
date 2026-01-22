/**
 * 图生图功能测试
 */

import { JimengAPI } from '../dist/jimeng-api.js';
import { JIMENG_API_CONSTANTS } from '../dist/types.js';
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
  console.log('⚠️  未检测到真实的API密钥，跳过图生图测试');
  console.log('请设置以下环境变量进行真实API测试:');
  console.log('  JIMENG_ACCESS_KEY=your_real_access_key');
  console.log('  JIMENG_SECRET_KEY=your_real_secret_key');
  console.log('  JIMENG_ENDPOINT=https://visual.volcengineapi.com');
  process.exit(0);
}

// 使用环境变量配置
const config = {
  accessKey: process.env.JIMENG_ACCESS_KEY,
  secretKey: process.env.JIMENG_SECRET_KEY,
  endpoint: process.env.JIMENG_ENDPOINT || 'https://visual.volcengineapi.com',
  region: process.env.JIMENG_REGION || 'cn-north-1',
  service: process.env.JIMENG_SERVICE || 'cv',
};

// 创建API实例
const jimengAPI = new JimengAPI(config);

console.log('🚀 开始图生图功能测试...\n');
console.log('配置信息:');
console.log(`  端点: ${config.endpoint}`);
console.log(`  区域: ${config.region}`);
console.log(`  服务: ${config.service}`);
console.log('');

// 测试图生图请求参数验证
async function testValidation() {
  console.log('🧪 测试请求参数验证...');

  // 测试1：无效的提示词
  try {
    const valid = jimengAPI.validatePrompt('');
    if (!valid) {
      console.log('✅ 测试1通过：正确识别无效提示词');
    } else {
      console.log('❌ 测试1失败：未能识别无效提示词');
    }
  } catch (error) {
    console.log('❌ 测试1失败：抛出意外错误', error);
  }

  // 测试2：无效的尺寸
  try {
    const valid = jimengAPI.validateImageSize(100, 100);
    if (!valid) {
      console.log('✅ 测试2通过：正确识别无效尺寸');
    } else {
      console.log('❌ 测试2失败：未能识别无效尺寸');
    }
  } catch (error) {
    console.log('❌ 测试2失败：抛出意外错误', error);
  }
}

// 测试工具方法
function testUtilityMethods() {
  console.log('\n🔧 测试工具方法...');

  // 测试推荐尺寸
  const recommendedSizes = jimengAPI.getRecommendedSizes();
  console.log('推荐尺寸:', Object.keys(recommendedSizes).length, '种');

  // 测试编辑强度范围
  const scaleRange = jimengAPI.getScaleRange();
  console.log('编辑强度范围:', scaleRange);

  // 测试图片限制
  const imageLimits = jimengAPI.getImageLimits();
  console.log('图片输入限制:', imageLimits);

  // 测试水印选项
  const watermarkPositions = jimengAPI.getWatermarkPositions();
  const watermarkLanguages = jimengAPI.getWatermarkLanguages();
  console.log('水印位置选项:', watermarkPositions);
  console.log('水印语言选项:', watermarkLanguages);
}

// 测试真实的图生图功能
async function testRealImageToImage() {
  console.log('\n🎨 测试真实的图生图功能...');
  console.log('   ⏳ 等待 10 秒以避免 API 速率限制...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    // 第一步：先生成一张图片用于图生图测试
    console.log('   步骤1: 生成一张测试图片...');
    // 为了节省时间，如果我们有现成的URL可以使用（这里假设没有，必须生成）
    // 或者我们可以跳过这一步如果之前的测试已经生成了图片？
    // 为了完整性，还是生成吧。
    
    const generationResult = await jimengAPI.generateImage({
      prompt:
        'a beautiful landscape with mountains and lake, photorealistic style, high quality',
      seed: 42,
      width: 1024,
      height: 1024,
    });

    if (!generationResult.data?.task_id) {
      console.log('❌ 图片生成失败，无法获取任务ID');
      return;
    }

    console.log('✅ 图片生成请求成功，任务ID:', generationResult.data.task_id);

    // 等待图片生成完成
    console.log('   等待图片生成完成...');
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30; // 90 seconds

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;

      try {
        const queryResult = await jimengAPI.queryTask(
          generationResult.data.task_id,
          JIMENG_API_CONSTANTS.REQ_KEY_T2I,
          {
            return_url: true,
          }
        );

        if (
          queryResult.data?.status === 'done' &&
          queryResult.data?.image_urls?.length > 0
        ) {
          imageUrl = queryResult.data.image_urls[0];
          console.log('✅ 图片生成完成！URL:', imageUrl);
          break;
        } else if (queryResult.data?.status === 'failed') {
          console.log(
            '❌ 图片生成失败:',
            queryResult.data?.error_message || '未知错误'
          );
          return;
        } else {
          console.log(
            `   等待中... (${attempts}/${maxAttempts}) 状态: ${queryResult.data?.status}`
          );
        }
      } catch (error) {
        console.log(
          `   查询任务状态失败 (${attempts}/${maxAttempts}):`,
          error.message
        );
      }
    }

    if (!imageUrl) {
      console.log('❌ 图片生成超时，无法继续图生图测试');
      return;
    }

    // 第二步：使用生成的图片进行图生图
    if (imageUrl) {
      console.log('   步骤2: 使用生成的图片进行图生图...');
      console.log('   等待3秒确保图片URL可访问...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const i2iResult = await jimengAPI.generateImage({
        prompt: 'make it into a painting, van gogh style',
        image_urls: [imageUrl],
        scale: 0.6,
        width: 1024,
        height: 1024,
      });

      console.log('✅ 图生图请求成功');
      console.log('   任务ID:', i2iResult.data?.task_id);

      // 等待图生图完成
      console.log('   等待图生图完成...');
      attempts = 0;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;

        try {
          const queryResult = await jimengAPI.queryTask(
            i2iResult.data.task_id,
            JIMENG_API_CONSTANTS.REQ_KEY_T2I,
            { return_url: true }
          );

          if (queryResult.data?.status === 'done') {
            console.log('✅ 图生图完成！');
            if (queryResult.data.image_urls?.length > 0) {
              console.log('   结果URL:', queryResult.data.image_urls[0]);
            }
            break;
          } else if (queryResult.data?.status === 'failed') {
            console.log('❌ 图生图失败:', queryResult.data?.error_message);
            break;
          } else {
            console.log(`   等待中... (${attempts}/${maxAttempts}) 状态: ${queryResult.data?.status}`);
          }
        } catch (error) {
           console.log(`   查询失败: ${error.message}`);
        }
      }
    }

    console.log('🎉 图生图功能测试完成！');
  } catch (error) {
    console.log('❌ 图生图功能测试失败:', error.message);
  }
}

// 测试尺寸验证
function testSizeValidation() {
  console.log('\n📏 测试尺寸验证...');

  // 测试文生图尺寸验证
  console.log('尺寸验证:');
  console.log('1024x1024:', jimengAPI.validateImageSize(1024, 1024));
  console.log('2048x2048:', jimengAPI.validateImageSize(2048, 2048));
  console.log('100x100:', jimengAPI.validateImageSize(100, 100));
  console.log('3000x3000:', jimengAPI.validateImageSize(3000, 3000));
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行图生图功能测试...\n');

  await testValidation();
  testUtilityMethods();
  testSizeValidation();

  // 运行真实的图生图测试
  await testRealImageToImage();

  console.log('\n🎉 所有测试完成！');
}

// 如果直接运行此文件，则执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  testValidation,
  testUtilityMethods,
  testSizeValidation,
  testRealImageToImage,
  runAllTests,
};
