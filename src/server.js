'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const { sendError, readJSONBody } = require('./http-utils');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent path traversal outside the public directory
  const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, safePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const { pathname } = parsed;
  const method = req.method;

  try {
    // ---- Auth ----
    if (pathname === '/api/auth/register' && method === 'POST') {
      return await authRoutes.register(req, res);
    }
    if (pathname === '/api/auth/login' && method === 'POST') {
      return await authRoutes.login(req, res);
    }
    if (pathname === '/api/auth/logout' && method === 'POST') {
      return authRoutes.logout(req, res);
    }
    if (pathname === '/api/auth/me' && method === 'GET') {
      return authRoutes.me(req, res);
    }

    // ---- Employees ----
    if (pathname === '/api/employees' && method === 'GET') {
      return employeeRoutes.list(req, res);
    }
    if (pathname === '/api/employees' && method === 'POST') {
      return await employeeRoutes.create(req, res);
    }
    let m = pathname.match(/^\/api\/employees\/(\d+)$/);
    if (m && method === 'PUT') {
      return await employeeRoutes.update(req, res, Number(m[1]));
    }
    if (m && method === 'DELETE') {
      return employeeRoutes.remove(req, res, Number(m[1]));
    }

    // ---- Payroll runs ----
    if (pathname === '/api/payroll/runs' && method === 'GET') {
      return payrollRoutes.listRuns(req, res);
    }
    if (pathname === '/api/payroll/runs' && method === 'POST') {
      let body;
      try {
        body = await readJSONBody(req);
      } catch (err) {
        return sendError(res, 400, err.message);
      }
      return await payrollRoutes.runPayroll(req, res, body);
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)$/);
    if (m && method === 'GET') {
      return payrollRoutes.getRun(req, res, Number(m[1]));
    }
    if (m && method === 'DELETE') {
      return payrollRoutes.deleteRun(req, res, Number(m[1]));
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)\/export\.csv$/);
    if (m && method === 'GET') {
      return payrollRoutes.exportRunCSV(req, res, Number(m[1]));
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)\/payslip\/(\d+)$/);
    if (m && method === 'GET') {
      return payrollRoutes.payslip(req, res, Number(m[1]), Number(m[2]));
    }

    // ---- Static frontend ----
    if (pathname.startsWith('/api/')) {
      return sendError(res, 404, 'Unknown API route.');
    }
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error('Unhandled error:', err);
    sendError(res, 500, 'Internal server error.');
  }
});

server.listen(PORT, () => {
  console.log(`Habesha Payroll MVP running at http://localhost:${PORT}`);
});
