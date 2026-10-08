import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve, relative } from 'node:path';

const root = resolve('offline-preview');
export default defineConfig({
  root, base: './', plugins: [react(), {
    name: 'assert-offline-isolation',
    generateBundle() {
      const modules = [...this.getModuleIds()].filter(id => !id.startsWith('\0')).map(id => relative(process.cwd(), id).replaceAll('\\', '/'));
      for (const id of modules) {
        if (/^(offline-preview\/|src\/(domain|application)\/)/.test(id)) continue;
        if (/^node_modules\/(react|react-dom|scheduler)\//.test(id)) continue;
        this.error(`OFFLINE_MODULE_NOT_ALLOWED:${id}`);
      }
      this.emitFile({ type: 'asset', fileName: 'isolation-report.json', source: JSON.stringify({ mode: 'SIMULATION', backend: 'NONE', canSend: false, modules: modules.sort() }, null, 2) });
    },
  }],
  build: { outDir: resolve('dist-offline'), emptyOutDir: true, sourcemap: false },
});
