import { Client } from '@gradio/client';
import { describe, expect, it, vi } from 'vitest';
import { attachGradioAbort } from '../src/gradio-abort';

function gradioFixture() {
  const calls: string[] = [];
  const client = new Client('https://example.invalid', {
    events: ['status', 'data'],
    record_history: false,
  });
  Object.assign(client, {
    config: {
      root: 'https://example.invalid',
      protocol: 'sse_v3',
      components: [],
      dependencies: [{ id: 0, api_name: 'try_on', inputs: [], outputs: [], queue: true }],
    },
    api_info: {
      named_endpoints: { '/try_on': { parameters: [], returns: [] } },
      unnamed_endpoints: {},
    },
    api_map: { try_on: 0 },
  });
  let finishUpload!: () => void;
  client.handle_blob = () =>
    new Promise((resolve) => {
      finishUpload = () => resolve([]);
    });
  client.fetch = async (resource) => {
    calls.push(new URL(String(resource)).pathname);
    return new Response(JSON.stringify({ event_id: 'late-job' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  client.open_stream = async () => {};
  return { client, calls, finishUpload: () => finishUpload() };
}

describe('试衣上传取消', () => {
  it('真实 Gradio 客户端在延迟上传时取消，不再提交 queue/join，仍发送清理请求', async () => {
    const { client, calls, finishUpload } = gradioFixture();
    const controller = new AbortController();
    attachGradioAbort(client, controller.signal);
    const job = client.submit('/try_on', []);
    const silenceExpectedSdkError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      controller.abort();
      await job.cancel();
      client.close();
      finishUpload();
      // Flush the real SDK's upload -> post_data chain; no network or remote GPU involved.
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(calls).toContain('/cancel');
      expect(calls).toContain('/reset');
      expect(calls).not.toContain('/queue/join');
    } finally {
      silenceExpectedSdkError.mockRestore();
      client.close();
    }
  });

  it('真实 SDK 在未取消时确实提交 queue/join，作为回归断言的正向对照', async () => {
    const { client, calls, finishUpload } = gradioFixture();
    attachGradioAbort(client, new AbortController().signal);
    const job = client.submit('/try_on', []);
    try {
      finishUpload();
      await job.wait_for_id();
      expect(calls).toContain('/queue/join');
    } finally {
      await job.cancel();
      client.close();
    }
  });

  it('取消会中断正在传输的照片，并拒绝后续任务', async () => {
    const client = {
      fetch: vi.fn(
        (_resource: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('aborted', 'AbortError')),
              { once: true },
            );
          }),
      ),
    };
    const controller = new AbortController();
    attachGradioAbort(client, controller.signal);
    const uploading = client.fetch('https://example.invalid/upload');
    controller.abort();
    await expect(uploading).rejects.toMatchObject({ name: 'AbortError' });
    await expect(client.fetch('https://example.invalid/queue/join')).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('正常请求保持可用，客户端自己的关闭信号也能中止请求', async () => {
    const client = {
      fetch: vi.fn(
        async (_resource: RequestInfo | URL, _init?: RequestInit) =>
          new Response('{"ok":true}', { status: 200 }),
      ),
    };
    const controller = new AbortController();
    attachGradioAbort(client, controller.signal);
    expect(await (await client.fetch('https://example.invalid/queue/join')).json()).toEqual({
      ok: true,
    });
    const transportSignal = new AbortController();
    transportSignal.abort();
    await expect(
      client.fetch('https://example.invalid/upload', { signal: transportSignal.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
