// Only public author-provided samples are sent. No personal images or credentials.
import { Client, handle_file } from '@gradio/client';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = 'https://yisol-idm-vton.hf.space';
const config = await fetch(`${origin}/config`).then((r) => r.json());
const datasets = config.components.filter((c) => c.type === 'dataset');
const person = datasets[0].props.samples[0][0].background.url;
const garment = datasets[1].props.samples[0][0].url;
const evidence = {
  checkedAt: new Date().toISOString(),
  provider: origin,
  person,
  garment,
  events: [],
};
await mkdir('artifacts', { recursive: true });
let client;
try {
  client = await Client.connect(origin, { events: ['data', 'status', 'log'] });
  const job = client.submit('/tryon', [
    { background: handle_file(person), layers: [], composite: null },
    handle_file(garment),
    'short sleeve shirt',
    true,
    true,
    20,
    42,
  ]);
  const timer = setTimeout(() => job.cancel(), 240_000);
  try {
    for await (const event of job) {
      evidence.events.push(event);
      console.log(JSON.stringify(event));
      if (event.type === 'data') {
        const file = event.data[0];
        const imageUrl = file.url || `${origin}/file=${file.path}`;
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Image download ${response.status}`);
        await writeFile(
          'artifacts/idm-live-result.webp',
          Buffer.from(await response.arrayBuffer()),
        );
        evidence.result = 'artifacts/idm-live-result.webp';
      }
      if (event.type === 'status' && event.stage === 'error')
        throw new Error(event.message || 'Public demo returned an error');
    }
  } finally {
    clearTimeout(timer);
  }
  if (!evidence.result) throw new Error('Public demo returned no generated image');
} catch (error) {
  evidence.error = String(error);
  console.error(evidence.error);
  process.exitCode = 1;
} finally {
  await writeFile('artifacts/idm-live-probe.json', JSON.stringify(evidence, null, 2));
  client?.close();
}
