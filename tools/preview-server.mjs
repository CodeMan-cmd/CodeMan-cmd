#!/usr/bin/env node
/**
 * preview-server.mjs — 本地静态服务，用于在真浏览器里预览 README 渲染效果
 *
 * 为什么需要它：预览页要用 fetch 读取 README.md，而 file:// 协议会被 CORS 拦截，
 * 因此必须走 HTTP。服务只读、只绑定回环地址、只暴露仓库根目录内的文件。
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, normalize, extname } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8123);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/') urlPath = '/preview/index.html';

    // 目录逃逸防护：规范化后必须仍在 ROOT 之内
    const filePath = normalize(resolve(ROOT, '.' + urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('403 Forbidden');
      return;
    }

    const st = await stat(filePath).catch(() => null);
    if (!st || !st.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`404 Not Found: ${urlPath}`);
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('500 ' + e.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`预览服务已启动：http://127.0.0.1:${PORT}/  （根目录 ${ROOT}）`);
});
