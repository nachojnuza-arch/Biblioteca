// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const proxyPlugin = {
  name: 'proxy-download',
  configureServer(server) {
    server.middlewares.use('/api/save-book', (req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const fs = await import('fs/promises');
          const data = JSON.parse(body);
          const { slug, bookMd, chapters } = data;
          
          const bookDir = path.join(__dirname, 'src', 'content', 'books', slug);
          const chapDir = path.join(bookDir, 'capitulos');
          
          await fs.mkdir(chapDir, { recursive: true });
          await fs.writeFile(path.join(bookDir, 'book.md'), bookMd);
          for (const chap of chapters) {
            await fs.writeFile(path.join(chapDir, chap.filename), chap.content);
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    });
    server.middlewares.use('/api/delete-book', (req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const fs = await import('fs/promises');
          const data = JSON.parse(body);
          const { slug } = data;
          
          if (!slug) throw new Error('Missing slug');
          const bookDir = path.join(__dirname, 'src', 'content', 'books', slug);
          
          await fs.rm(bookDir, { recursive: true, force: true });
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    });
    server.middlewares.use('/api/proxy', (req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const target = url.searchParams.get('url');
      if (!target) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Falta el parámetro url' }));
        return;
      }
      fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(async (response) => {
          if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `HTTP ${response.status}` }));
            return;
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
          res.setHeader('Content-Disposition', 'attachment');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(buffer);
        })
        .catch((err) => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        });
    });
  },
};

export default defineConfig({
  site: 'https://athenaeum.example.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss(), proxyPlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      include: ['jszip', 'turndown'],
    },
  },
});
