#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

const baseUrl = (process.env.SITE_URL || 'https://weatherflow.app').replace(/\/$/, '');

const routes = [
  { path: '/', changefreq: 'hourly', priority: 1.0 },
];

const now = new Date().toISOString();

const xmlEntries = routes
  .map(({ path: routePath, changefreq, priority }) => {
    const resolvedPath = routePath.startsWith('http') ? routePath : `${baseUrl}${routePath}`;
    return `  <url>\n    <loc>${resolvedPath}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n    <lastmod>${now}</lastmod>\n  </url>`;
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>\n`;

await writeFile(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');

console.log(`Sitemap generated with ${routes.length} route(s) at ${now}`);
