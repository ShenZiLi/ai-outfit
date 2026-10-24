import { it, expect, vi } from 'vitest';
import { sourceToBlob } from '../src/media';
it('本地图片直接解码为 Blob，不受 connect-src 限制且不发起网络读取', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  try {
    const blob = await sourceToBlob('data:image/jpeg;base64,aGVsbG8=');
    expect(await blob.text()).toBe('hello');
    expect(blob.type).toBe('image/jpeg');
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally { fetchSpy.mockRestore(); }
});
