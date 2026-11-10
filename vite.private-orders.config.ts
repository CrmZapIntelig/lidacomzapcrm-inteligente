import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolve, relative } from 'node:path';

export default defineConfig({ root: resolve('private-orders'), base: './', plugins: [react(), tailwindcss(), {
  name: 'assert-private-orders-isolation',
  generateBundle() {
    const modules = [...this.getModuleIds()].filter(id => !id.startsWith('\0')).map(id => relative(process.cwd(), id).replaceAll('\\', '/'));
    for (const id of modules) {
      if (/^(private-orders\/|src\/(application|domain)\/|node_modules\/(react\/|react-dom\/|scheduler\/|firebase\/(app|auth)\/|@firebase\/(app|auth|component|logger|util)\/|idb\/|tslib\/))/.test(id) ||
          ['src/components/OrdersView.tsx', 'src/components/TestOrdersView.tsx'].includes(id)) continue;
      this.error(`PRIVATE_ORDERS_MODULE_NOT_ALLOWED:${id}`);
    }
    this.emitFile({ type: 'asset', fileName: 'isolation-report.json', source: JSON.stringify({ mode: 'PRIVATE TEST ENTRY', operationalAppImported: false,
      firestoreImported: false, providerMessagingImported: false, deployed: false, modules: modules.sort() }, null, 2) });
  },
}], build: { outDir: resolve('dist-private-orders'), emptyOutDir: true, sourcemap: false } });
