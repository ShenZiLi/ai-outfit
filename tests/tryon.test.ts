import { describe, it, expect, vi } from 'vitest';
import { buildAliyunBody, validateTryonInput, normalizeProviderError, readResultFile, runAliyun } from '../src/tryon';

const image = 'data:image/jpeg;base64,aGVsbG8=';
describe('真实试衣服务协议', () => {
  it('要求有效照片、正确品类及阿里云密钥', () => {
    expect(() => validateTryonInput({ person: '', garment: image, category: '上装', provider: 'fashn' })).toThrow('照片');
    expect(() => validateTryonInput({ person: image, garment: image, category: '鞋履', provider: 'fashn' })).toThrow('不支持');
    expect(() => validateTryonInput({ person: image, garment: image, category: '下装', provider: 'idm' })).toThrow('上装');
    expect(() => validateTryonInput({ person: image, garment: image, category: '上装', provider: 'aliyun' })).toThrow('密钥');
  });
  it('下装使用 bottom_garment_url；连衣裙使用 top_garment_url', () => {
    expect(buildAliyunBody(image, image, '下装').input).toEqual({ person_image_url: image, bottom_garment_url: image });
    expect(buildAliyunBody(image, image, '连衣裙').input).toEqual({ person_image_url: image, top_garment_url: image });
    expect(buildAliyunBody(image, image, '上装').model).toBe('aitryon-plus');
  });
  it('仅接受对应服务的 HTTPS 文件结果', () => {
    expect(readResultFile({ url: 'https://fashn-ai-fashn-vton-1-5.hf.space/gradio_api/file=x' }, 'fashn')).toContain('/gradio_api/file=');
    expect(() => readResultFile({ url: 'javascript:alert(1)' }, 'fashn')).toThrow();
    expect(() => readResultFile({ url: 'https://evil.example/x' }, 'fashn')).toThrow();
    expect(() => readResultFile(null, 'fashn')).toThrow();
  });
  it('限流、网络及取消错误可理解且不伪造成功', () => {
    expect(normalizeProviderError(new Error('GPU quota exceeded'))).toContain('额度');
    expect(normalizeProviderError(new Error('Failed to fetch'))).toContain('网络');
    expect(normalizeProviderError(new DOMException('abort', 'AbortError'))).toContain('取消');
  });
  it('阿里云提交后轮询直到成功，并处理失败与取消', async () => {
    const responses = [
      { status: 200, body: JSON.stringify({ output: { task_id: 'abc' } }) },
      { status: 200, body: JSON.stringify({ output: { task_status: 'SUCCEEDED', image_url: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.png' } }) },
    ];
    const transport = vi.fn(async () => responses.shift()!);
    const result = await runAliyun({ person: image, garment: image, category: '上装', provider: 'aliyun', apiKey: 'secret', apiBase: 'https://dashscope.aliyuncs.com/api/v1' }, new AbortController().signal, () => {}, transport, async () => {});
    expect(result).toContain('https://');
    expect(transport).toHaveBeenCalledTimes(2);
    const failed = vi.fn(async () => ({ status: 401, body: '{"code":"InvalidApiKey","message":"bad key"}' }));
    await expect(runAliyun({ person: image, garment: image, category: '上装', provider: 'aliyun', apiKey: 'bad' }, new AbortController().signal, () => {}, failed)).rejects.toThrow('密钥');
    const controller = new AbortController(); controller.abort();
    await expect(runAliyun({ person: image, garment: image, category: '上装', provider: 'aliyun', apiKey: 'key' }, controller.signal, () => {}, failed)).rejects.toThrow();
  });
});
