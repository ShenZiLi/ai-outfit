import { Client, handle_file } from '@gradio/client';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const origin = 'https://fashn-ai-fashn-vton-1-5.hf.space';
const evidence = { checkedAt: new Date().toISOString(), provider: origin, events: [] };
await mkdir('artifacts', { recursive: true });
let client;
try {
  client = await Client.connect(origin, { events: ['data', 'status'] });
  const person = new Blob([await readFile('public/images/editorial.png')], { type: 'image/png' });
  const garmentUrl = 'https://raw.githubusercontent.com/fashn-AI/fashn-vton-1.5/main/examples/data/garment.webp';
  const job = client.submit('/try_on', [handle_file(person), handle_file(garmentUrl), 'tops', 'model', 30, 1.5, 42, true]);
  const timer = setTimeout(() => job.cancel(), 240_000);
  try {
    for await (const event of job) {
      evidence.events.push(event);
      console.log(JSON.stringify(event));
      if (event.type === 'status' && event.stage === 'error') throw new Error(event.message || 'Public demo returned an error');
      if (event.type === 'data') {
        const file = event.data[0];
        const imageUrl = file.url || `${origin}/gradio_api/file=${file.path}`;
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Image download ${response.status}`);
        await writeFile('artifacts/fashn-live-result.webp', Buffer.from(await response.arrayBuffer()));
        evidence.result = 'artifacts/fashn-live-result.webp';
      }
    }
  } finally { clearTimeout(timer); }
  if (!evidence.result) throw new Error('Public demo returned no generated image');
} catch (error) {
  evidence.error = String(error);
  console.error(evidence.error);
  process.exitCode = 1;
} finally {
  await writeFile('artifacts/fashn-live-probe.json', JSON.stringify(evidence, null, 2));
  client?.close();
}
