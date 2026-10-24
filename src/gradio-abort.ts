/** Gradio submit can continue after cancel() while a file upload is still pending.
 * Gate every request, not only the queue iterator. Cleanup remains independent.
 * Merge signals manually because the supported Chrome 111 lacks AbortSignal.any.
 */
export function attachGradioAbort(client: { fetch: typeof fetch }, signal: AbortSignal) {
  const original = client.fetch.bind(client);
  client.fetch = async (resource, init) => {
    const address = resource instanceof Request ? resource.url : String(resource);
    const cleanup = /\/(cancel|reset)\/?$/.test(new URL(address).pathname);
    if (cleanup) return original(resource, init);
    signal.throwIfAborted();
    const ownSignal = init?.signal || (resource instanceof Request ? resource.signal : null);
    ownSignal?.throwIfAborted();
    const combined = new AbortController();
    const abort = () => combined.abort();
    signal.addEventListener('abort', abort, { once: true });
    ownSignal?.addEventListener('abort', abort, { once: true });
    try {
      return await original(resource, { ...init, signal: combined.signal });
    } finally {
      signal.removeEventListener('abort', abort);
      ownSignal?.removeEventListener('abort', abort);
    }
  };
}
