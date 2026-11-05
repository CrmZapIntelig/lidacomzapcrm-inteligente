export interface ThermalDocument {
  mode: 'SIMULATION' | 'PRODUCTION';
  title: string;
  reference: string;
  lines: readonly string[];
  paperWidth?: 58 | 80;
}

/** Shared escaping/layout only; callers supply validated documents, never commands. */
export function renderThermalDocument(document: ThermalDocument): string {
  const width = document.paperWidth ?? 80;
  if (!['SIMULATION', 'PRODUCTION'].includes(document.mode) || ![58, 80].includes(width) ||
      typeof document.title !== 'string' || typeof document.reference !== 'string' ||
      !Array.isArray(document.lines) || document.lines.some(line => typeof line !== 'string')) throw new Error('UNSUPPORTED_PRINT_DOCUMENT');
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const simulated = document.mode === 'SIMULATION';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(document.title)}</title><style>@page{size:${width}mm auto;margin:3mm}body{max-width:${width - 6}mm;margin:0 auto;font:12px monospace;color:#000;background:#fff}h1{font-size:16px;overflow-wrap:anywhere}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0}@media print{body{width:${width - 6}mm}}</style></head><body><h1>${escape(document.title)}${simulated ? ' · DEMO' : ''}</h1><p>${simulated ? 'SIMULAÇÃO — sem valor fiscal' : 'Documento não fiscal'}</p><p>${escape(document.reference)}</p>${document.lines.map(line => `<p>${escape(line)}</p>`).join('')}</body></html>`;
}
