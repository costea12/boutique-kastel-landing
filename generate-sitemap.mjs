import { readFileSync, writeFileSync } from 'fs';

const BASE = 'https://kastelboutique.ro';

const staticPages = [
  { url: '', priority: '1.0' },
  { url: 'parfumuri.html', priority: '0.8' },
  { url: 'parfumuri-niche.html', priority: '0.8' },
  { url: 'ingrijire-corporala.html', priority: '0.8' },
  { url: 'bauturi.html', priority: '0.8' },
  { url: 'dulciuri.html', priority: '0.8' },
  { url: 'cafea.html', priority: '0.8' },
  { url: 'despre-noi.html', priority: '0.5' },
  { url: 'contact.html', priority: '0.5' },
  { url: 'retur.html', priority: '0.3' },
  { url: 'termeni.html', priority: '0.3' },
  { url: 'confidentialitate.html', priority: '0.3' },
];

const catalog = JSON.parse(readFileSync('./catalog.json', 'utf8'));

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const staticUrls = staticPages.map(
  (p) => `  <url>\n    <loc>${BASE}/${p.url}</loc>\n    <priority>${p.priority}</priority>\n  </url>`
);

const productUrls = catalog.map((p) => {
  const loc = `${BASE}/produs.html?cod=${encodeURIComponent(p.cod)}`;
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <priority>0.6</priority>\n  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...productUrls].join('\n')}\n</urlset>\n`;

writeFileSync('./sitemap.xml', xml);
console.log(`sitemap.xml written with ${staticPages.length} static pages + ${catalog.length} products`);
