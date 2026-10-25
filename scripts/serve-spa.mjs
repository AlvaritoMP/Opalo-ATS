import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.PORT || 3000);
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.wasm': 'application/wasm',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json',
    '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
    res.writeHead(status, headers);
    res.end(body);
}

function fileFor(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const full = path.normalize(path.join(root, relative));
    if (!full.startsWith(root)) return null;
    return full;
}

const server = http.createServer((req, res) => {
    const requested = fileFor(req.url || '/');
    if (!requested) {
        send(res, 400, 'Bad request');
        return;
    }
    const asset = path.extname(requested) && requested !== path.join(root, 'index.html');
    fs.readFile(requested, (error, data) => {
        if (!error) {
            const ext = path.extname(requested);
            const cache = ext === '.html'
                ? 'no-store'
                : 'public, max-age=31536000, immutable';
            send(res, 200, data, {
                'Content-Type': types[ext] || 'application/octet-stream',
                'Cache-Control': cache,
            });
            return;
        }
        if (asset) {
            send(res, 404, 'Not found');
            return;
        }
        fs.readFile(path.join(root, 'index.html'), (indexError, indexHtml) => {
            if (indexError) {
                send(res, 500, 'Build not found');
                return;
            }
            send(res, 200, indexHtml, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
            });
        });
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`SPA listening on ${port}`);
});
