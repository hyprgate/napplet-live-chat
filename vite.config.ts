import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from '@unocss/vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    UnoCSS(),
    svelte(),
    nip5aManifest({
      nappletType: 'live-chat',
      requires: ['identity', 'relay', 'inc', 'outbox', 'storage'],
      optional: ['theme'],
      icon: { data: readFileSync(new URL('./icon.png', import.meta.url)), mimeType: 'image/png' },
      artifactMode: 'single-file',
    }),
  ],
  resolve: {
    dedupe: ['svelte'],
  },
  server: {
    port: 5181,
    cors: true,
  },
  build: {
    outDir: 'dist',
  },
});
