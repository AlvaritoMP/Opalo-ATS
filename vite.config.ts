import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const pdfWorkerPath = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs');

/** Sirve el worker de pdf.js con nombre fijo. El hash de Vite mete caracteres que el hosting no entrega como módulo. */
function pdfWorkerPlugin() {
    return {
        name: 'pdfjs-worker-file',
        configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0];
                if (url !== '/pdf.worker.min.mjs') return next();
                fs.readFile(pdfWorkerPath, (err, data) => {
                    if (err) {
                        res.statusCode = 404;
                        res.end('pdf worker not found');
                        return;
                    }
                    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
                    res.end(data);
                });
            });
        },
        generateBundle(this: { emitFile: (file: { type: 'asset'; fileName: string; source: Buffer }) => void }) {
            this.emitFile({
                type: 'asset',
                fileName: 'pdf.worker.min.mjs',
                source: fs.readFileSync(pdfWorkerPath),
            });
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true, // Falla si el puerto está ocupado en lugar de usar otro
    },
      plugins: [react(), pdfWorkerPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'ui-vendor': ['lucide-react', 'recharts', 'react-big-calendar'],
            }
          }
        }
      }
    };
});
