import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const commit = (process.env.RENDER_GIT_COMMIT || process.env.BUILD_COMMIT || process.env.GIT_COMMIT || 'local').trim();
const buildId = (process.env.RENDER_SERVICE_ID || process.env.BUILD_ID || `${pkg.version}-${commit.slice(0, 12)}`).trim();
const builtAt = process.env.BUILD_TIMESTAMP?.trim() || new Date().toISOString();

function releaseManifest(): Plugin {
  return {
    name: 'shinobi-release-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'release.json',
        source: JSON.stringify({ frontendVersion: pkg.version, commit, buildId, builtAt }, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), releaseManifest()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: { proxy: { '/api': 'http://localhost:8787' } },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('html-to-image')) return 'vendor-image';
          return 'vendor';
        },
      },
    },
  },
});
