import { validImage, type Category, type Profile } from './domain';
import { nativeRequest, readImage, sourceToBlob } from './media';
import { attachGradioAbort } from './gradio-abort';
export const origins = {
  fashn: 'https://fashn-ai-fashn-vton-1-5.hf.space',
  idm: 'https://yisol-idm-vton.hf.space',
};
export interface TryonInput {
  person: string;
  garment: string;
  category: Category;
  provider: Profile['provider'];
  description?: string;
  apiKey?: string;
  apiBase?: string;
}
export function validateTryonInput(input: TryonInput) {
  if (!validImage(input.person) || !validImage(input.garment))
    throw new Error('请先选择有效的人像和衣物照片');
  if (['鞋履', '配饰'].includes(input.category))
    throw new Error('当前模型不支持鞋履和配饰，请选择服装');
  if (input.provider === 'idm' && input.category !== '上装')
    throw new Error('IDM-VTON 仅支持上装，请切换至 FASHN 服务');
  if (input.provider === 'aliyun' && !input.apiKey?.trim())
    throw new Error('请在我的档案中填写阿里云 API 密钥');
}
export function buildAliyunBody(person: string, garment: string, category: Category) {
  return {
    model: 'aitryon-plus',
    input: {
      person_image_url: person,
      [category === '下装' ? 'bottom_garment_url' : 'top_garment_url']: garment,
    },
    parameters: { resolution: -1, restore_face: true },
  };
}
export function normalizeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if ((error as Error)?.name === 'AbortError' || /cancel|abort|取消/i.test(message))
    return '已取消本次试衣；服务端已开始的任务可能仍会继续。';
  if (/quota|rate.?limit|too many|exceed|GPU.*time|429/i.test(message))
    return '公共试衣服务的 GPU 额度暂时用尽，请稍后再试，或在档案中切换服务。';
  if (/fetch|network|connect|socket|cors|网络/i.test(message))
    return '暂时无法连接试衣服务，请检查网络后重试。';
  if (/timeout|timed out|超时/i.test(message)) return '试衣服务等待超时，请稍后重试。';
  if (/auth|token|api.?key|401|密钥/i.test(message))
    return '服务认证失败，请检查密钥、地域及模型开通情况。';
  if (/error occurred|unexpected|empty|无结果/i.test(message))
    return '模型服务暂时没有生成结果，请稍后重试或切换服务。';
  if (
    /照片|图片|不支持|上装|请|失败|取消|服务/.test(message) &&
    !/sk-|Bearer|https?:/i.test(message)
  )
    return message.slice(0, 200);
  return '这次试衣未能完成，请重试或在我的档案中切换服务。';
}
export function readResultFile(file: unknown, provider: 'fashn' | 'idm'): string {
  if (!file || typeof file !== 'object') throw new Error('服务未返回有效的图片');
  const record = file as { url?: string; path?: string };
  const url = new URL(
    record.url ||
      `${origins[provider]}/${provider === 'fashn' ? 'gradio_api/' : ''}file=${record.path || ''}`,
  );
  if (
    url.origin !== origins[provider] ||
    !url.pathname.includes('file=') ||
    (!record.url && !record.path)
  )
    throw new Error('服务返回的图片地址无效');
  return url.href;
}
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('已取消', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
export async function runAliyun(
  input: TryonInput,
  signal: AbortSignal,
  status: (message: string) => void,
  transport = nativeRequest,
  delay = wait,
): Promise<string> {
  validateTryonInput(input);
  signal.throwIfAborted();
  const base = (input.apiBase || 'https://dashscope.aliyuncs.com/api/v1').replace(/\/$/, '');
  if (
    !/^https:\/\/(dashscope\.aliyuncs\.com|[a-zA-Z0-9-]+\.cn-beijing\.maas\.aliyuncs\.com)\/api\/v1$/.test(
      base,
    )
  )
    throw new Error('阿里云服务地址无效，请使用北京地域 HTTPS 地址');
  const headers = { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' };
  async function request(url: string, method: string, body?: string) {
    signal.throwIfAborted();
    const response = await transport(
      url,
      {
        method,
        headers: { ...headers, ...(method === 'POST' ? { 'X-DashScope-Async': 'enable' } : {}) },
        body,
      },
      signal,
    );
    if (response.status === 401 || response.status === 403)
      throw new Error('服务密钥无效或尚未开通模型');
    if (response.status === 429) throw new Error('服务额度不足或请求过于频繁');
    if (response.status >= 400)
      throw new Error(`试衣服务请求失败（${response.status}），请检查模型和图片要求`);
    const json = JSON.parse(response.body);
    if (json.code) throw new Error('试衣服务拒绝了请求，请检查密钥权限、图片要求与账户余额');
    return json;
  }
  status('正在向阿里云提交试衣任务');
  const submission = await request(
    `${base}/services/aigc/image2image/image-synthesis`,
    'POST',
    JSON.stringify(buildAliyunBody(input.person, input.garment, input.category)),
  );
  const taskId = submission.output?.task_id;
  if (!taskId || !/^[a-zA-Z0-9-]+$/.test(taskId)) throw new Error('服务未返回有效任务编号');
  for (let i = 0; i < 75; i++) {
    await delay(3000, signal);
    status('AI 正在生成试衣效果，请稍等');
    const result = await request(`${base}/tasks/${taskId}`, 'GET');
    const output = result.output;
    if (['FAILED', 'CANCELED', 'UNKNOWN'].includes(output?.task_status))
      throw new Error('试衣任务失败，请检查输入图片或稍后重试');
    if (output?.task_status === 'SUCCEEDED') {
      const image = output.image_url || output.results?.[0]?.url;
      if (typeof image !== 'string') throw new Error('服务完成但未返回图片');
      const url = new URL(image);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.aliyuncs.com'))
        throw new Error('服务返回的图片地址无效');
      return url.href;
    }
  }
  throw new Error('试衣等待超时，请稍后重试；云端任务可能仍在执行');
}
async function runGradio(
  input: TryonInput,
  signal: AbortSignal,
  status: (message: string) => void,
): Promise<string> {
  const provider = input.provider === 'idm' ? 'idm' : 'fashn';
  const { Client, handle_file } = await import('@gradio/client');
  signal.throwIfAborted();
  status('正在连接试衣服务');
  const client = await Client.connect(origins[provider], {
    events: ['status', 'data'],
    record_history: false,
  });
  attachGradioAbort(client, signal);
  let job: ReturnType<typeof client.submit> | undefined;
  const abort = () => {
    void job?.cancel();
    client.close();
  };
  try {
    signal.throwIfAborted();
    const person = await sourceToBlob(input.person);
    const garment = await sourceToBlob(input.garment);
    signal.throwIfAborted();
    status('正在上传所选照片');
    const category =
      input.category === '下装' ? 'bottoms' : input.category === '连衣裙' ? 'one-pieces' : 'tops';
    job =
      provider === 'fashn'
        ? client.submit('/try_on', [
            handle_file(person),
            handle_file(garment),
            category,
            'flat-lay',
            30,
            1.5,
            42,
            true,
          ])
        : client.submit('/tryon', [
            { background: handle_file(person), layers: [], composite: null },
            handle_file(garment),
            input.description || 'shirt',
            true,
            true,
            30,
            42,
          ]);
    signal.addEventListener('abort', abort, { once: true });
    let result = '';
    for await (const event of job) {
      signal.throwIfAborted();
      if (event.type === 'status') {
        if (event.stage === 'error')
          throw new Error(typeof event.message === 'string' ? event.message : 'An error occurred');
        const pos = event.position;
        status(
          event.stage === 'generating'
            ? 'AI 正在让新衣物自然上身'
            : pos !== undefined && pos > 0
              ? `正在排队，前面还有 ${pos} 个任务`
              : 'AI 正在生成试衣效果',
        );
      }
      if (event.type === 'data') result = readResultFile((event.data as unknown[])[0], provider);
    }
    signal.throwIfAborted();
    if (!result) throw new Error('服务无结果');
    return result;
  } finally {
    signal.removeEventListener('abort', abort);
    client.close();
  }
}
export async function generateTryon(
  input: TryonInput,
  signal: AbortSignal,
  status: (message: string) => void,
): Promise<string> {
  validateTryonInput(input);
  const aborted = new Promise<never>((_, reject) => {
    if (signal.aborted) reject(new DOMException('已取消', 'AbortError'));
    signal.addEventListener('abort', () => reject(new DOMException('已取消', 'AbortError')), {
      once: true,
    });
  });
  const task = async () => {
    const url =
      input.provider === 'aliyun'
        ? await runAliyun(input, signal, status)
        : await runGradio(input, signal, status);
    signal.throwIfAborted();
    status('正在把试衣图片存回本地');
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('试衣图片下载失败，请重试');
    const blob = await response.blob();
    const data = await readImage(
      new File([blob], 'tryon.webp', { type: blob.type || 'image/webp' }),
    );
    signal.throwIfAborted();
    return data;
  };
  return Promise.race([task(), aborted]);
}
