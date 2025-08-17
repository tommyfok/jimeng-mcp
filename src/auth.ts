import crypto from 'crypto';
import { JIMENG_API_CONSTANTS } from './types.js';

/**
 * AWS V4签名认证工具
 * 基于火山引擎官方文档实现，专门用于即梦API
 */
export class VolcengineAuth {
  private accessKey: string;
  private secretKey: string;
  private region: string;
  private service: string;
  private host: string;
  private endpoint: string;

  constructor(config: {
    accessKey: string;
    secretKey: string;
    region?: string;
    service?: string;
    endpoint?: string;
  }) {
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.region = config.region || JIMENG_API_CONSTANTS.DEFAULT_REGION;
    this.service = config.service || JIMENG_API_CONSTANTS.DEFAULT_SERVICE;
    this.endpoint = config.endpoint || JIMENG_API_CONSTANTS.DEFAULT_ENDPOINT;
    this.host = new URL(this.endpoint).hostname;
  }

  /**
   * 生成HMAC-SHA256签名
   */
  private sign(key: Buffer, msg: string): Buffer {
    return crypto.createHmac('sha256', key).update(msg, 'utf8').digest();
  }

  /**
   * 生成签名密钥
   */
  private getSignatureKey(dateStamp: string): Buffer {
    const kDate = this.sign(Buffer.from(this.secretKey, 'utf8'), dateStamp);
    const kRegion = this.sign(kDate, this.region);
    const kService = this.sign(kRegion, this.service);
    return this.sign(kService, 'request');
  }

  /**
   * 格式化查询参数
   */
  private formatQuery(parameters: Record<string, string>): string {
    const sortedKeys = Object.keys(parameters).sort();
    const queryParts = sortedKeys.map(key => `${key}=${parameters[key]}`);
    return queryParts.join('&');
  }

  /**
   * 生成AWS V4签名请求头
   */
  public signRequest(
    method: string,
    path: string,
    queryParams: Record<string, string>,
    body: string,
    action: string,
    version: string
  ): {
    headers: Record<string, string>;
    url: string;
  } {
    // 1. 准备签名材料 - 使用火山引擎官方格式
    const now = new Date();
    // 使用官方格式：YYYYMMDDTHHMMSSZ
    const currentDate =
      now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
    const datestamp = now.toISOString().slice(0, 10).replace(/-/g, '');

    // 2. 构建查询参数
    const allQueryParams = {
      ...queryParams,
      Action: action,
      Version: version,
    };
    const canonicalQueryString = this.formatQuery(allQueryParams);

    // 3. 计算请求体哈希
    const payloadHash = crypto
      .createHash('sha256')
      .update(body, 'utf8')
      .digest('hex');

    // 4. 构建规范请求 - 按照官方示例的头部顺序
    const signedHeaders = 'content-type;host;x-content-sha256;x-date';
    const canonicalHeaders =
      [
        `content-type:application/json`,
        `host:${this.host}`,
        `x-content-sha256:${payloadHash}`,
        `x-date:${currentDate}`,
      ].join('\n') + '\n';

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // 5. 构建待签名字符串 - 使用官方算法名称
    const algorithm = 'HMAC-SHA256';
    const credentialScope = `${datestamp}/${this.region}/${this.service}/request`;
    const hashedCanonicalRequest = crypto
      .createHash('sha256')
      .update(canonicalRequest, 'utf8')
      .digest('hex');

    const stringToSign = [
      algorithm,
      currentDate,
      credentialScope,
      hashedCanonicalRequest,
    ].join('\n');

    // 6. 计算签名
    const signingKey = this.getSignatureKey(datestamp);
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign, 'utf8')
      .digest('hex');

    // 7. 构建授权头
    const authorizationHeader = `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // 8. 构建请求头 - 按照官方示例的格式
    const headers = {
      'Content-Type': 'application/json',
      Host: this.host,
      'X-Date': currentDate,
      'X-Content-Sha256': payloadHash,
      Authorization: authorizationHeader,
    };

    // 9. 构建完整URL - 确保查询参数正确编码
    const url = `${this.endpoint}${path}${canonicalQueryString ? '?' + canonicalQueryString : ''}`;

    return { headers, url };
  }

  /**
   * 生成图像生成请求的签名（提交任务）
   */
  public signImageGenerationRequest(body: any): {
    headers: Record<string, string>;
    url: string;
  } {
    const bodyString = JSON.stringify(body);
    return this.signRequest(
      'POST',
      '/',
      {},
      bodyString,
      JIMENG_API_CONSTANTS.ACTION_SUBMIT,
      JIMENG_API_CONSTANTS.VERSION
    );
  }

  /**
   * 生成任务查询请求的签名
   */
  public signTaskQueryRequest(body: any): {
    headers: Record<string, string>;
    url: string;
  } {
    const bodyString = JSON.stringify(body);
    return this.signRequest(
      'POST',
      '/',
      {},
      bodyString,
      JIMENG_API_CONSTANTS.ACTION_QUERY,
      JIMENG_API_CONSTANTS.VERSION
    );
  }

  /**
   * 生成通用API请求的签名
   */
  public signGenericRequest(
    method: string,
    path: string,
    queryParams: Record<string, string>,
    body: any,
    action: string,
    version: string
  ): {
    headers: Record<string, string>;
    url: string;
  } {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return this.signRequest(
      method,
      path,
      queryParams,
      bodyString,
      action,
      version
    );
  }
}
