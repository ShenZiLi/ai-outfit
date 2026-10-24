import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  build: { target: 'chrome111' },
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
