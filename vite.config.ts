import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * In development, serve the Vercel function in api/ through Vite so
 * `npm run dev` has a working /api/brew without the Vercel CLI. Reads
 * ANTHROPIC_API_KEY from .env.local.
 */
function devApi(): Plugin {
  return {
    name: 'wavecauldron-dev-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

      server.middlewares.use('/api/brew', async (req, res) => {
        try {
          const mod = (await server.ssrLoadModule('/api/brew.ts')) as { POST: (r: Request) => Promise<Response> };
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const request = new Request(`http://localhost${req.url ?? '/'}`, {
            method: req.method,
            headers: Object.entries(req.headers).filter(([, v]) => typeof v === 'string') as [string, string][],
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          });
          const response = req.method === 'POST' ? await mod.POST(request) : new Response('Method not allowed', { status: 405 });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error(error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Dev API error, see the terminal.', kind: 'other' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
