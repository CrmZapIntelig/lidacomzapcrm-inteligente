import { createServer } from 'node:http';
import { once } from 'node:events';
import type { MetaWhatsAppCloudProvider } from './metaWhatsAppCloudProvider';
import type { LocalInboundJournal } from './localInboundJournal';

/** Explicit opt-in loopback runtime. No public listener, cloud SDK, send or automatic worker. */
export async function startSyntheticWebhookRuntime(provider: MetaWhatsAppCloudProvider, journal: LocalInboundJournal, port = 4180) {
  if (provider.configuration.mode !== 'MOCK' || provider.configuration.tenantId !== journal.tenantId || provider.configuration.wabaId !== journal.accountId || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error('LOCAL_SYNTHETIC_RUNTIME_REQUIRED');
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const address = server.address(); const boundPort = typeof address === 'object' && address ? address.port : port;
    if (req.headers.host !== `127.0.0.1:${boundPort}` && req.headers.host !== `localhost:${boundPort}`) { res.writeHead(403).end(); return; }
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${boundPort}`);
    if (url.pathname !== '/webhooks/meta') { res.writeHead(404).end(); return; }
    try {
      if (req.method === 'GET') {
        const fields = Object.fromEntries(url.searchParams); const challenge = await provider.verifyChallenge(fields, journal.tenantId);
        res.writeHead(challenge ? 200 : 403).end(challenge ?? ''); return;
      }
      if (req.method !== 'POST') { res.writeHead(405).end(); return; }
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) { res.writeHead(415).end(); return; }
      const chunks: Buffer[] = []; let length = 0;
      for await (const chunk of req) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); length += bytes.length;
        if (length > 1048576) { res.writeHead(413).end(); return; } chunks.push(bytes);
      }
      const raw = Buffer.concat(chunks); const signature = req.headers['x-hub-signature-256'];
      if (typeof signature !== 'string' || !(await provider.verifyWebhook(raw, signature, journal.tenantId))) { res.writeHead(403).end(); return; }
      let events;
      try { events = provider.parseWebhook(raw, journal.tenantId, 'SIMULATION'); } catch { res.writeHead(400).end(); return; }
      try { await journal.admitBatch(events, new Date().toISOString()); } catch { res.writeHead(503).end(); return; }
      // ACK only after durable admission. No event payload or identifiers echoed.
      res.writeHead(200).end('LOCAL_SYNTHETIC_ACK');
    } catch { if (!res.headersSent) res.writeHead(503); res.end(); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000;
  server.listen(port, '127.0.0.1'); await once(server, 'listening');
  return server;
}
