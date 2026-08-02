import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

// MIME types for static files
const mimeTypes = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
};

// Import the Vite SSR server
const { default: serverEntry } = await import('./dist/server/server.js');

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Serve static files from dist/client
    if (pathname.startsWith('/assets/') || 
        pathname.startsWith('/favicon.ico') ||
        extname(pathname) && pathname !== '/') {
      
      const filePath = join(__dirname, 'dist/client', pathname);
      
      if (existsSync(filePath)) {
        const ext = extname(pathname);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        const file = readFileSync(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.end(file);
        return;
      }
    }

    // Convert Node.js request to Fetch API Request
    const headers = new Headers();
    
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else if (value !== undefined) {
        headers.set(key, value);
      }
    }

    const body = req.method !== 'GET' && req.method !== 'HEAD' 
      ? new Promise((resolve) => {
          const chunks = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => resolve(Buffer.concat(chunks)));
        })
      : undefined;

    const fetchRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: await body,
    });

    // Call the server entry
    const response = await serverEntry.fetch(fetchRequest, {}, {});

    // Convert Fetch API Response to Node.js response
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.text();
    res.end(responseBody);
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Frontend server listening on port ${PORT}`);
});
