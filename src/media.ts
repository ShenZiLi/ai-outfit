declare global {
  interface Window {
    YixuNative?: {
      saveFile: (name: string, mime: string, base64: string, requestId: string) => void;
      request: (json: string, id: string) => void;
    };
    yixuNativeResult?: (id: string, response: string, error: string) => void;
    yixuHandleBack?: () => boolean;
  }
}
const nativePending = new Map<
  string,
  { resolve: (v: string) => void; reject: (e: Error) => void }
>();
if (typeof window !== 'undefined')
  window.yixuNativeResult = (id, response, error) => {
    const pending = nativePending.get(id);
    if (!pending) return;
    nativePending.delete(id);
    if (error) pending.reject(new Error(error));
    else pending.resolve(response);
  };
export async function nativeRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
  signal?: AbortSignal,
): Promise<{ status: number; body: string }> {
  if (!window.YixuNative) {
    const response = await fetch(url, { ...options, signal });
    return { status: response.status, body: await response.text() };
  }
  const raw = await new Promise<string>((resolve, reject) => {
    const id = crypto.randomUUID();
    if (signal?.aborted) {
      reject(new DOMException('已取消', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      nativePending.delete(id);
      reject(new Error('网络请求超时，请稍后重试'));
    }, 90_000);
    const abort = () => {
      clearTimeout(timer);
      nativePending.delete(id);
      reject(new DOMException('已取消', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    };
    nativePending.set(id, {
      resolve: (v) => {
        finish();
        resolve(v);
      },
      reject: (e) => {
        finish();
        reject(e);
      },
    });
    window.YixuNative!.request(JSON.stringify({ url, ...options }), id);
  });
  return JSON.parse(raw);
}
export async function readImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('请选择 JPG、PNG 或 WebP 图片');
  if (file.size > 20 * 1024 * 1024) throw new Error('图片超过 20MB，请选择较小的照片');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    bitmap.close();
  }
}
export async function rasterImage(source: string): Promise<string> {
  if (source.startsWith('data:image/') && !source.startsWith('data:image/svg')) return source;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f7f6f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}
export async function sourceToBlob(source: string): Promise<Blob> {
  if (source.startsWith('data:')) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(source);
    if (!match) throw new Error('图片数据格式无效');
    const decoded = atob(match[2].replace(/\s/g, ''));
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    return new Blob([bytes], { type: match[1] });
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error('图片读取失败');
  return response.blob();
}
export async function downloadFile(name: string, mime: string, content: string, base64 = false) {
  const blob = base64 ? await sourceToBlob(content) : new Blob([content], { type: mime });
  if (window.YixuNative) {
    const payload = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    await new Promise<string>((resolve, reject) => {
      const id = crypto.randomUUID();
      nativePending.set(id, { resolve, reject });
      window.YixuNative!.saveFile(name, mime, payload, id);
    });
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
