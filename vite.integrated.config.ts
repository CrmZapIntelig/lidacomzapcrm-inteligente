import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve, relative } from 'node:path';
export default defineConfig({
  root: resolve('integrated-preview'), base: './', plugins: [react(), {
    name: 'assert-integrated-isolation',
    generateBundle() {
      const modules = [...this.getModuleIds()].filter(id => !id.startsWith('\0')).map(id => relative(process.cwd(), id).replaceAll('\\', '/'));
      for (const id of modules) {
        if (/^(integrated-preview\/|src\/(domain|application)\/|node_modules\/(react|react-dom|scheduler)\/)/.test(id) || id === 'offline-preview/scenario.ts') continue;
        this.error(`INTEGRATED_MODULE_NOT_ALLOWED:${id}`);
      }
      this.emitFile({ type: 'asset', fileName: 'isolation-report.json', source: JSON.stringify({ mode: 'OFFLINE PREVIEW', backend: 'NONE', canSend: false, synthetic: true, modules: modules.sort() }, null, 2) });
    },
  }], build: { outDir: resolve('dist-integrated'), emptyOutDir: true, sourcemap: false },
});
